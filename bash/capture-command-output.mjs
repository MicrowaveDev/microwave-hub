#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { chmodSync, closeSync, constants, createReadStream, existsSync, fchmodSync, mkdirSync, openSync, realpathSync, renameSync, rmSync, statSync, writeFileSync, writeSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { constants as osConstants } from 'node:os';

const VERSION = 1;
const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;
const DEFAULT_RETENTION_DAYS = 7;
const OUTPUT_LIMIT_EXIT = 125;
const RECEIPT_BYTES = 4096;
const RECEIPT_LINES = 20;
const SIGNAL_NUMBERS = { SIGHUP: 1, SIGINT: 2, SIGTERM: 15 };

function usage(message) {
  if (message) process.stderr.write(`capture-command-output: ${message}\n`);
  process.stderr.write('usage: capture-command-output.sh --cwd <path> [--summary-only] [--preview-lines <n>] [--max-bytes <n>] [--raw-output --reason <text>] -- <command> [arg ...]\n');
  process.exit(64);
}

function parseArgs(argv) {
  const options = { cwd: process.cwd(), previewLines: 8, maxBytes: DEFAULT_MAX_BYTES, retentionDays: DEFAULT_RETENTION_DAYS, summaryOnly: false, rawOutput: false, reason: null };
  let i = 0;
  for (; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--') break;
    if (arg === '--cwd') options.cwd = argv[++i];
    else if (arg === '--summary-only') options.summaryOnly = true;
    else if (arg === '--preview-lines') options.previewLines = Number(argv[++i]);
    else if (arg === '--max-bytes') options.maxBytes = Number(argv[++i]);
    else if (arg === '--retention-days') options.retentionDays = Number(argv[++i]);
    else if (arg === '--raw-output') options.rawOutput = true;
    else if (arg === '--reason') options.reason = argv[++i];
    else usage(`unknown option: ${arg}`);
  }
  const command = argv.slice(i + 1);
  if (i === argv.length || command.length === 0) usage('missing -- or command');
  if (!options.cwd || !Number.isInteger(options.previewLines) || options.previewLines < 0 || options.previewLines > 12) usage('--preview-lines must be an integer from 0 to 12');
  if (!Number.isSafeInteger(options.maxBytes) || options.maxBytes < 1) usage('--max-bytes must be a positive integer');
  if (!Number.isFinite(options.retentionDays) || options.retentionDays <= 0) usage('--retention-days must be positive');
  if (options.rawOutput && (!options.reason || Buffer.byteLength(options.reason) > 200)) usage('--raw-output requires --reason of at most 200 bytes');
  if (options.reason && /[\x00-\x1f\x7f]/.test(options.reason)) usage('--reason must not contain control characters');
  return { options, command };
}

function inside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

function gitRoot(cwd) {
  let realCwd;
  try { realCwd = realpathSync(resolve(cwd)); } catch { throw new Error(`cwd does not exist: ${cwd}`); }
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: realCwd, encoding: 'utf8', shell: false });
  if (result.status !== 0) throw new Error('cwd is not inside a Git worktree');
  const root = realpathSync(result.stdout.trim());
  if (!inside(root, realCwd)) throw new Error('resolved cwd escapes its Git root');
  return { root, cwd: realCwd };
}

function ensureArtifactDir(root) {
  const temp = join(root, 'temp');
  const outputDir = join(temp, 'agent-command-output');
  for (const path of [temp, outputDir]) {
    if (existsSync(path)) {
      const st = statSync(path, { throwIfNoEntry: true });
      if (!st.isDirectory()) throw new Error(`artifact path is not a directory: ${path}`);
      if (realpathSync(path) !== path) throw new Error(`artifact path contains a symlink: ${path}`);
    } else {
      mkdirSync(path, { mode: 0o700 });
    }
  }
  chmodSync(outputDir, 0o700);
  const realDir = realpathSync(outputDir);
  if (!inside(root, realDir)) throw new Error('artifact directory escapes Git root');
  const ignored = spawnSync('git', ['check-ignore', '-q', '--', relative(root, outputDir)], { cwd: root, shell: false });
  if (ignored.status !== 0) throw new Error('temp/agent-command-output must be ignored by Git');
  return outputDir;
}

function interactive(command) {
  const family = basename(command[0]).toLowerCase();
  const args = command.slice(1);
  if (['ssh', 'top', 'htop', 'less', 'more', 'vi', 'vim', 'nano'].includes(family)) return true;
  return args.some((arg) => ['--interactive', '--tty', '-it', '-ti'].includes(arg)) || (['docker', 'podman'].includes(family) && args.includes('-t'));
}

function commandPrefix(command) {
  const clean = basename(command[0]).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return clean || 'command';
}

function utcStamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace('T', '-').replace('Z', 'Z');
}

function reservePair(outputDir, prefix, date) {
  const stem = `${prefix}-${utcStamp(date)}`;
  for (let collision = 0; collision < 10000; collision += 1) {
    const base = collision === 0 ? stem : `${stem}-${collision}`;
    const reservation = join(outputDir, `.${base}.reserve`);
    try {
      mkdirSync(reservation, { mode: 0o700 });
      const log = join(outputDir, `${base}.log`);
      const meta = join(outputDir, `${base}.meta.json`);
      if (existsSync(log) || existsSync(meta)) { rmSync(reservation, { recursive: true }); continue; }
      return { base, reservation, log, meta, partialLog: join(reservation, 'output.log'), partialMeta: join(reservation, 'metadata.json') };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
  throw new Error('could not reserve a unique artifact pair');
}

function redactArgv(command) {
  const secretNames = /(?:pass(?:word)?|token|secret|api[-_]?key|auth|credential|cookie)/i;
  const learned = [];
  const display = [];
  for (let i = 0; i < command.length; i += 1) {
    const arg = command[i];
    const equal = arg.match(/^(--?[^=]+)=(.*)$/s);
    if (equal && secretNames.test(equal[1])) { if (equal[2]) learned.push(equal[2]); display.push(`${equal[1]}=<redacted>`); continue; }
    if (/^--?[^-]/.test(arg) && secretNames.test(arg) && i + 1 < command.length) { display.push(arg, '<redacted>'); if (command[i + 1]) learned.push(command[i + 1]); i += 1; continue; }
    display.push(arg);
  }
  const redactedDisplay = display.map((arg) => {
    let value = arg;
    for (const secret of learned) if (secret.length >= 3) value = value.split(secret).join('<redacted>');
    return value;
  });
  return { display: redactedDisplay, learned };
}

function sanitizePreview(buffer, secrets, lineLimit) {
  if (lineLimit === 0 || buffer.includes(0)) return null;
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); } catch { return null; }
  text = text
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b(?:\[[0-?]*[ -/]*[@-~]|[@-_])/g, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '?');
  for (const secret of secrets.sort((a, b) => b.length - a.length)) {
    if (secret.length >= 3) text = text.split(secret).join('<redacted>');
  }
  const lines = text.split(/\r?\n/).slice(-lineLimit).map((line) => {
    const bytes = Buffer.from(line);
    return bytes.length <= 512 ? line : `${bytes.subarray(0, 509).toString('utf8')}...`;
  });
  let result = lines.join('\n');
  while (Buffer.byteLength(result) > 3000) result = Buffer.from(result).subarray(Buffer.byteLength(result) - 3000).toString('utf8');
  return result || null;
}

function boundedReceipt(lines) {
  let kept = lines.slice(0, RECEIPT_LINES);
  while (Buffer.byteLength(`${kept.join('\n')}\n`) > RECEIPT_BYTES && kept.length > 1) kept.splice(kept.length - 2, 1);
  let output = `${kept.join('\n')}\n`;
  if (Buffer.byteLength(output) > RECEIPT_BYTES) output = `${Buffer.from(output).subarray(0, RECEIPT_BYTES - 4).toString('utf8')}...\n`;
  process.stdout.write(output);
}

function main() {
  process.umask(0o077);
  const { options, command } = parseArgs(process.argv.slice(2));
  if (interactive(command)) usage('interactive or TTY-requesting commands are not supported');
  let location;
  let paths;
  try {
    location = gitRoot(options.cwd);
    paths = reservePair(ensureArtifactDir(location.root), commandPrefix(command), new Date());
  } catch (error) {
    process.stderr.write(`capture-command-output: ${error.message}\n`);
    process.exit(73);
  }
  const { display, learned } = redactArgv(command);
  const started = new Date();
  const hash = createHash('sha256');
  let fd;
  try { fd = openSync(paths.partialLog, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600); fchmodSync(fd, 0o600); }
  catch (error) { rmSync(paths.reservation, { recursive: true, force: true }); throw error; }
  let bytes = 0;
  let lines = 0;
  let lastByte = null;
  let outputLimitExceeded = false;
  let spawnError = null;
  let previewTail = Buffer.alloc(0);
  let forwardedSignal = null;
  let killTimer = null;
  const child = spawn(command[0], command.slice(1), { cwd: location.cwd, detached: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });

  const terminateGroup = (signal) => {
    try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  };
  const handlers = {};
  for (const signal of Object.keys(SIGNAL_NUMBERS)) {
    handlers[signal] = () => { forwardedSignal = signal; terminateGroup(signal); };
    process.on(signal, handlers[signal]);
  }
  child.on('error', (error) => { spawnError = error; });
  const capture = (chunk) => {
    if (outputLimitExceeded) return;
    const remaining = options.maxBytes - bytes;
    const accepted = chunk.subarray(0, Math.max(0, remaining));
    if (accepted.length) {
      writeSync(fd, accepted); hash.update(accepted); bytes += accepted.length;
      for (const byte of accepted) if (byte === 10) lines += 1;
      lastByte = accepted[accepted.length - 1];
      previewTail = Buffer.concat([previewTail, accepted]).subarray(-8192);
    }
    if (accepted.length < chunk.length) {
      outputLimitExceeded = true;
      terminateGroup('SIGTERM');
      killTimer = setTimeout(() => terminateGroup('SIGKILL'), 1000);
      killTimer.unref();
    }
  };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);

  child.on('close', (code, signal) => {
    if (killTimer) clearTimeout(killTimer);
    for (const name of Object.keys(handlers)) process.off(name, handlers[name]);
    closeSync(fd);
    if (bytes > 0 && lastByte !== 10) lines += 1;
    const ended = new Date();
    const wrapperState = outputLimitExceeded ? 'output_limit_exceeded' : spawnError ? 'spawn_error' : 'completed';
    const expiry = new Date(ended.getTime() + options.retentionDays * 86400000);
    const metadata = {
      schemaVersion: VERSION,
      helperVersion: VERSION,
      commandFamily: commandPrefix(command),
      argv: display,
      cwd: location.cwd,
      gitRoot: location.root,
      startedAt: started.toISOString(),
      endedAt: ended.toISOString(),
      durationMs: ended - started,
      exitCode: code,
      signal,
      forwardedSignal,
      wrapperState,
      wrapperExitCode: outputLimitExceeded ? OUTPUT_LIMIT_EXIT : null,
      bytes,
      lines,
      estimatedTokens: Math.ceil(bytes / 4),
      sha256: hash.digest('hex'),
      expiresAt: expiry.toISOString(),
      rawOutputRequested: options.rawOutput,
      rawOutputReason: options.rawOutput ? options.reason : null
    };
    writeFileSync(paths.partialMeta, `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    renameSync(paths.partialLog, paths.log);
    renameSync(paths.partialMeta, paths.meta);
    rmSync(paths.reservation, { recursive: true, force: true });
    const relativeLog = relative(location.root, paths.log);
    const relativeMeta = relative(location.root, paths.meta);
    const status = outputLimitExceeded ? `wrapper=${wrapperState} exit=${OUTPUT_LIMIT_EXIT}` : signal ? `signal=${signal}` : `exit=${code ?? (spawnError ? 127 : 1)}`;
    const receipt = [
      `capture: ${metadata.commandFamily} ${status}`,
      `duration_ms: ${metadata.durationMs}`,
      `output: ${bytes} bytes, ${lines} lines, ~${metadata.estimatedTokens} tokens`,
      `log: ${relativeLog}`,
      `metadata: ${relativeMeta}`,
      `sha256: ${metadata.sha256}`,
      'next: inspect metadata or request a bounded range from the log'
    ];
    const failed = outputLimitExceeded || signal || spawnError || code !== 0;
    if (failed && !options.summaryOnly) {
      const preview = sanitizePreview(previewTail, learned, options.previewLines);
      if (preview) receipt.push('failure_preview:', ...preview.split('\n'));
      else receipt.push('failure_preview: unavailable (binary, undecodable, or disabled)');
    }
    boundedReceipt(receipt);
    if (options.rawOutput) {
      process.stdout.write(`raw-output-begin: reason=${options.reason}\n`);
      createReadStream(paths.log).pipe(process.stdout, { end: false });
    }
    if (outputLimitExceeded) process.exitCode = OUTPUT_LIMIT_EXIT;
    else if (signal) process.exitCode = 128 + (osConstants.signals[signal] || 0);
    else if (spawnError) process.exitCode = spawnError.code === 'EACCES' ? 126 : 127;
    else process.exitCode = code;
  });
}

main();
