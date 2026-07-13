#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const MAX_OUTPUT_BYTES = 4096;
const MAX_CONTENT_BYTES = 3000;
const MAX_LINES = 20;

function fail(message, code = 64) {
  process.stderr.write(`read-agent-command-output: ${message}\n`);
  process.exit(code);
}

function parse(argv) {
  const options = { cwd: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--cwd') options.cwd = argv[++index];
    else if (arg === '--log') options.log = argv[++index];
    else if (arg === '--lines') options.lines = argv[++index];
    else if (arg === '--bytes') options.bytes = argv[++index];
    else if (arg === '--reason') options.reason = argv[++index];
    else fail(`unknown option: ${arg}`);
  }
  if (!options.log || !options.reason || Buffer.byteLength(options.reason) > 200 || /[\x00-\x1f\x7f]/.test(options.reason)) {
    fail('--log and a printable --reason of at most 200 bytes are required');
  }
  if (Boolean(options.lines) === Boolean(options.bytes)) fail('choose exactly one of --lines or --bytes');
  return options;
}

function gitRoot(cwd) {
  let realCwd;
  try { realCwd = fs.realpathSync(path.resolve(cwd)); } catch { fail('cwd does not exist', 73); }
  try {
    return fs.realpathSync(execFileSync('git', ['-C', realCwd, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
  } catch {
    fail('cwd is not inside a Git worktree', 73);
  }
}

function inside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function sanitize(buffer) {
  if (buffer.includes(0)) fail('requested range is binary; inspect it with a binary-aware tool', 65);
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); } catch { fail('requested range is not valid UTF-8', 65); }
  return text
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b(?:\[[0-?]*[ -/]*[@-~]|[@-_])/g, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '?');
}

function lineRange(spec, buffer) {
  const match = /^(\d+):(\d+)$/.exec(spec || '');
  if (!match) fail('--lines must be START:END using one-based inclusive lines');
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (start < 1 || end < start || end - start + 1 > MAX_LINES) fail(`--lines may request at most ${MAX_LINES} lines`);
  const text = sanitize(buffer);
  const selected = text.split(/\r?\n/).slice(start - 1, end).map((line) => {
    const value = Buffer.from(line);
    return value.length <= 300 ? line : `${value.subarray(0, 297).toString('utf8')}...`;
  }).join('\n');
  return { label: `lines ${start}:${end}`, content: selected };
}

function byteRange(spec, buffer) {
  const match = /^(\d+):(\d+)$/.exec(spec || '');
  if (!match) fail('--bytes must be OFFSET:LENGTH using a zero-based offset');
  const offset = Number(match[1]);
  const length = Number(match[2]);
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || length < 1 || length > MAX_CONTENT_BYTES) {
    fail(`--bytes length must be between 1 and ${MAX_CONTENT_BYTES}`);
  }
  return { label: `bytes ${offset}:${length}`, content: sanitize(buffer.subarray(offset, offset + length)) };
}

function main() {
  process.umask(0o077);
  const options = parse(process.argv.slice(2));
  const root = gitRoot(options.cwd);
  const artifactRoot = path.join(root, 'temp', 'agent-command-output');
  const requestedInput = path.resolve(root, options.log);
  if (!fs.existsSync(requestedInput) || fs.lstatSync(requestedInput).isSymbolicLink() || !fs.lstatSync(requestedInput).isFile()) fail('log is missing or unsafe', 73);
  const requested = fs.realpathSync(requestedInput);
  if (!inside(fs.realpathSync(artifactRoot), requested) || !requested.endsWith('.log')) fail('log must be a .log file under temp/agent-command-output', 73);
  const metadata = requested.replace(/\.log$/, '.meta.json');
  if (!fs.existsSync(metadata) || fs.lstatSync(metadata).isSymbolicLink() || !fs.lstatSync(metadata).isFile()) fail('completed metadata pair is missing or unsafe', 73);
  const buffer = fs.readFileSync(requested);
  const selected = options.lines ? lineRange(options.lines, buffer) : byteRange(options.bytes, buffer);
  let content = selected.content;
  if (Buffer.byteLength(content) > MAX_CONTENT_BYTES) content = `${Buffer.from(content).subarray(0, MAX_CONTENT_BYTES - 4).toString('utf8')}...`;
  const relativeLog = path.relative(root, requested);
  let output = `artifact: ${relativeLog}\nrange: ${selected.label}\nreason: ${options.reason}\n---\n${content}\n`;
  if (Buffer.byteLength(output) > MAX_OUTPUT_BYTES) output = `${Buffer.from(output).subarray(0, MAX_OUTPUT_BYTES - 4).toString('utf8')}...\n`;
  const auditPath = path.join(artifactRoot, 'access.ndjson');
  if (fs.existsSync(auditPath) && (fs.lstatSync(auditPath).isSymbolicLink() || !fs.lstatSync(auditPath).isFile())) fail('access ledger is unsafe', 73);
  fs.appendFileSync(auditPath, `${JSON.stringify({ timestamp: new Date().toISOString(), log: relativeLog, range: selected.label, reason: options.reason, returnedBytes: Buffer.byteLength(output) })}\n`, { mode: 0o600 });
  fs.chmodSync(auditPath, 0o600);
  process.stdout.write(output);
}

main();
