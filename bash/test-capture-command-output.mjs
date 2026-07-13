#!/usr/bin/env node

import assert from 'node:assert/strict';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const capture = join(here, 'capture-command-output.mjs');
const cleanup = join(here, 'cleanup-agent-command-output.mjs');
const boundedRead = join(here, 'read-agent-command-output.mjs');
const scratch = mkdtempSync(join(tmpdir(), 'capture-command-output-'));
let assertions = 0;
function ok(value, message) { assert.ok(value, message); assertions += 1; }
function equal(actual, expected, message) { assert.equal(actual, expected, message); assertions += 1; }
function repo(name = 'repo') {
  const root = join(scratch, name);
  mkdirSync(root);
  spawnSync('git', ['init', '-q'], { cwd: root });
  writeFileSync(join(root, '.gitignore'), 'temp/agent-command-output/\n');
  return root;
}
function run(root, args, options = {}) {
  return spawnSync(process.execPath, [capture, '--cwd', root, ...args], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024, ...options });
}
function artifacts(root) {
  const dir = join(root, 'temp', 'agent-command-output');
  const metas = readdirSync(dir).filter((name) => name.endsWith('.meta.json')).sort();
  return metas.map((name) => ({ name, meta: JSON.parse(readFileSync(join(dir, name), 'utf8')), log: readFileSync(join(dir, name.replace('.meta.json', '.log'))) }));
}
function node(code, ...args) { return ['--', process.execPath, '-e', code, ...(args.length ? ['--', ...args] : [])]; }
async function runAsync(root, args) {
  return await new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [capture, '--cwd', root, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = []; const stderr = [];
    child.stdout.on('data', (c) => stdout.push(c)); child.stderr.on('data', (c) => stderr.push(c));
    child.on('close', (code, signal) => resolvePromise({ code, signal, stdout: Buffer.concat(stdout).toString(), stderr: Buffer.concat(stderr).toString() }));
  });
}
async function interrupt(root) {
  return await new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [capture, '--cwd', root, ...node("process.stdout.write('ready\\n'); setInterval(() => {}, 1000)")], { stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = []; const stderr = [];
    child.stdout.on('data', (c) => stdout.push(c)); child.stderr.on('data', (c) => stderr.push(c));
    setTimeout(() => child.kill('SIGTERM'), 150);
    child.on('close', (code, signal) => resolvePromise({ code, signal, stdout: Buffer.concat(stdout).toString(), stderr: Buffer.concat(stderr).toString() }));
  });
}

try {
  const root = repo();
  for (const status of [1, 126, 127]) {
    const result = run(root, node(`process.exit(${status})`));
    equal(result.status, status, `preserves exit ${status}`);
  }
  const exit143 = run(root, node('process.exit(143)'));
  equal(exit143.status, 143, 'exit 143 remains an exit');
  equal(artifacts(root).at(-1).meta.signal, null, 'exit 143 is not a signal');

  const signaled = run(root, node("process.kill(process.pid, 'SIGTERM')"));
  equal(signaled.status, 143, 'signal maps to conventional status');
  equal(artifacts(root).at(-1).meta.signal, 'SIGTERM', 'signal is recorded distinctly');

  const raw = run(root, ['--raw-output', '--reason', 'debug fixture', ...node("process.stdout.write('explicit raw body')")]);
  ok(raw.stdout.includes('raw-output-begin: reason=debug fixture'), 'raw mode names its reason');
  ok(raw.stdout.includes('explicit raw body'), 'raw mode replays the captured body');
  equal(artifacts(root).at(-1).meta.rawOutputRequested, true, 'raw request is recorded');
  const rawWithoutReason = run(root, ['--raw-output', ...node("process.stdout.write('hidden')")]);
  equal(rawWithoutReason.status, 64, 'raw mode requires a bounded reason');
  const rawControlReason = run(root, ['--raw-output', '--reason', 'bad\nreason', ...node("process.stdout.write('hidden')")]);
  equal(rawControlReason.status, 64, 'raw reason rejects control characters');
  const interrupted = await interrupt(root);
  equal(interrupted.code, 143, 'wrapper signal preserves child-group signal status');
  equal(artifacts(root).at(-1).meta.forwardedSignal, 'SIGTERM', 'wrapper records forwarded signal');

  const ansi = run(root, ['--preview-lines', '3', ...node("process.stderr.write('\\u001b]8;;https://bad\\u0007secret\\u001b]8;;\\u0007\\u001b[31m red\\u001b[0m\\x01\\n'); process.exit(1)", '--token', 'secret')]);
  equal(ansi.status, 1);
  ok(!ansi.stdout.includes('\u001b') && !ansi.stdout.includes('\x01') && !ansi.stdout.includes('secret'), 'failure preview strips controls and learned secrets');
  ok(ansi.stdout.includes('<redacted>'), 'failure preview marks redaction');

  const giant = run(root, node("process.stdout.write('x'.repeat(20000)); process.exit(1)"));
  ok(Buffer.byteLength(giant.stdout) <= 4096 && giant.stdout.split('\n').length <= 20, 'giant-line receipt is bounded');
  const binary = run(root, node("process.stdout.write(Buffer.from([0,255,1,2])); process.exit(1)"));
  ok(binary.stdout.includes('unavailable') && !binary.stdout.includes('\u0000'), 'binary output gets path-only preview');

  const mixed = run(root, node("process.stdout.write('out\\n'); process.stderr.write('err\\n')"));
  equal(mixed.status, 0);
  const mixedArtifact = artifacts(root).at(-1);
  ok(mixedArtifact.log.includes(Buffer.from('out\n')) && mixedArtifact.log.includes(Buffer.from('err\n')), 'stdout and stderr share one log');
  ok(!mixed.stdout.split('\n').includes('out') && !mixed.stdout.split('\n').includes('err'), 'success receipt has no raw body');
  ok(Buffer.byteLength(mixed.stdout) <= 4096 && mixed.stdout.split('\n').length <= 20, 'success receipt is bounded');
  const mixedLog = join(root, 'temp', 'agent-command-output', artifacts(root).at(-1).name.replace('.meta.json', '.log'));
  const bounded = spawnSync(process.execPath, [boundedRead, '--cwd', root, '--log', mixedLog, '--lines', '1:2', '--reason', 'inspect mixed fixture'], { encoding: 'utf8' });
  equal(bounded.status, 0, 'bounded artifact read succeeds');
  ok(bounded.stdout.includes('out') && bounded.stdout.includes('err') && Buffer.byteLength(bounded.stdout) <= 4096, 'bounded artifact read returns only the requested range');
  ok(existsSync(join(root, 'temp', 'agent-command-output', 'access.ndjson')), 'bounded artifact read records an access event');
  const unbounded = spawnSync(process.execPath, [boundedRead, '--cwd', root, '--log', mixedLog, '--lines', '1:21', '--reason', 'too broad'], { encoding: 'utf8' });
  equal(unbounded.status, 64, 'artifact reader rejects an oversized line range');

  const collisionResults = await Promise.all(Array.from({ length: 8 }, () => runAsync(root, node("process.stdout.write('same')"))));
  ok(collisionResults.every((r) => r.code === 0), 'concurrent captures succeed');
  const names = artifacts(root).map((a) => a.name);
  equal(new Set(names).size, names.length, 'capture pair names are unique');

  const capped = run(root, ['--max-bytes', '1024', ...node("process.stdout.write('z'.repeat(4096)); setTimeout(() => {}, 5000)")]);
  equal(capped.status, 125, 'cap uses wrapper-specific status');
  const cappedArtifact = artifacts(root).at(-1);
  equal(cappedArtifact.meta.wrapperState, 'output_limit_exceeded');
  equal(cappedArtifact.log.length, 1024, 'log is capped exactly');
  const natural125 = run(root, node('process.exit(125)'));
  equal(natural125.status, 125, 'natural child exit 125 is preserved');
  equal(artifacts(root).at(-1).meta.wrapperState, 'completed', 'metadata distinguishes child 125 from cap failure');

  const dir = join(root, 'temp', 'agent-command-output');
  equal(lstatSync(dir).mode & 0o777, 0o700, 'artifact directory is private');
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.log') || n.endsWith('.meta.json'))) equal(lstatSync(join(dir, name)).mode & 0o777, 0o600, `${name} is private`);

  const unignored = repo('unignored');
  writeFileSync(join(unignored, '.gitignore'), '');
  const rejected = run(unignored, node("console.log('no')"));
  equal(rejected.status, 73, 'trackable artifact destination is rejected');
  const symlinkRepo = repo('symlink');
  mkdirSync(join(symlinkRepo, 'elsewhere'));
  mkdirSync(join(symlinkRepo, 'temp'));
  symlinkSync(join(symlinkRepo, 'elsewhere'), join(symlinkRepo, 'temp', 'agent-command-output'));
  equal(run(symlinkRepo, node("console.log('no')")).status, 73, 'symlink artifact destination is rejected');
  equal(run(root, ['--', 'ssh', 'example.invalid']).status, 64, 'interactive family is rejected');

  const cleanRoot = repo('cleanup');
  for (let i = 0; i < 3; i += 1) {
    const result = run(cleanRoot, node(`process.stdout.write('${i}'.repeat(200))`));
    equal(result.status, 0);
  }
  const cleanDir = join(cleanRoot, 'temp', 'agent-command-output');
  const cleanArtifacts = artifacts(cleanRoot);
  const pinnedBase = cleanArtifacts[0].name.replace('.meta.json', '');
  writeFileSync(join(cleanDir, 'retention-manifest.json'), `${JSON.stringify({ pinned: [pinnedBase] })}\n`);
  for (const item of cleanArtifacts) {
    item.meta.endedAt = '2000-01-01T00:00:00.000Z';
    writeFileSync(join(cleanDir, item.name), `${JSON.stringify(item.meta)}\n`, { mode: 0o600 });
  }
  symlinkSync(join(cleanDir, `${pinnedBase}.log`), join(cleanDir, 'unsafe.meta.json'));
  const report = spawnSync(process.execPath, [cleanup, '--cwd', cleanRoot, '--max-age-days', '1'], { encoding: 'utf8' });
  equal(report.status, 0);
  const reportJson = JSON.parse(report.stdout);
  equal(reportJson.mode, 'report');
  equal(reportJson.selected, 2, 'report selects old unpinned pairs');
  ok(cleanArtifacts.every((a) => existsSync(join(cleanDir, a.name))), 'report does not delete');
  ok(reportJson.skippedSymlinks >= 1, 'cleanup reports skipped symlink');
  const applied = spawnSync(process.execPath, [cleanup, '--cwd', cleanRoot, '--apply', '--max-age-days', '1'], { encoding: 'utf8' });
  equal(applied.status, 0);
  const appliedJson = JSON.parse(applied.stdout);
  equal(appliedJson.selected, 2);
  ok(existsSync(join(cleanDir, `${pinnedBase}.log`)) && existsSync(join(cleanDir, `${pinnedBase}.meta.json`)), 'manifest pin preserves pair');
  equal(readdirSync(cleanDir).filter((n) => n.endsWith('.log')).length, 1, 'apply removes selected logs');
  ok(!existsSync(join(cleanDir, '.cleanup.lock')), 'cleanup releases lock');

  const sizeRoot = repo('cleanup-size');
  for (let i = 0; i < 2; i += 1) equal(run(sizeRoot, node(`process.stdout.write('${i}'.repeat(300))`)).status, 0);
  const sizeDir = join(sizeRoot, 'temp', 'agent-command-output');
  const sizeArtifacts = artifacts(sizeRoot);
  const keepBase = sizeArtifacts[0].name.replace('.meta.json', '');
  writeFileSync(join(sizeDir, `${keepBase}.keep`), 'pinned\n');
  const sizeReport = spawnSync(process.execPath, [cleanup, '--cwd', sizeRoot, '--max-age-days', '999999', '--max-bytes', '1'], { encoding: 'utf8' });
  equal(sizeReport.status, 0);
  const sizeJson = JSON.parse(sizeReport.stdout);
  equal(sizeJson.selected, 1, 'size cap evicts oldest unpinned completed pair');
  equal(sizeJson.pinned, 1, '.keep sidecar pins a pair');

  process.stdout.write(`capture-command-output tests: ${assertions} assertions passed\n`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
