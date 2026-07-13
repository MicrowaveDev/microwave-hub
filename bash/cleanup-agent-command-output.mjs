#!/usr/bin/env node

import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_AGE_DAYS = 7;
const DEFAULT_MAX_BYTES = 200 * 1024 * 1024;

function fail(message, code = 64) { process.stderr.write(`cleanup-agent-command-output: ${message}\n`); process.exit(code); }
function parse(argv) {
  const out = { cwd: process.cwd(), apply: false, maxAgeDays: DEFAULT_AGE_DAYS, maxBytes: DEFAULT_MAX_BYTES, manifest: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--cwd') out.cwd = argv[++i];
    else if (arg === '--apply') out.apply = true;
    else if (arg === '--report-only') out.apply = false;
    else if (arg === '--max-age-days') out.maxAgeDays = Number(argv[++i]);
    else if (arg === '--max-bytes') out.maxBytes = Number(argv[++i]);
    else if (arg === '--manifest') out.manifest = argv[++i];
    else fail(`unknown option: ${arg}`);
  }
  if (!Number.isFinite(out.maxAgeDays) || out.maxAgeDays < 0) fail('--max-age-days must be non-negative');
  if (!Number.isSafeInteger(out.maxBytes) || out.maxBytes < 0) fail('--max-bytes must be a non-negative integer');
  return out;
}
function inside(root, path) { const rel = relative(root, path); return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel)); }
function rootFor(cwd) {
  let real;
  try { real = realpathSync(resolve(cwd)); } catch { fail('cwd does not exist', 73); }
  const git = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: real, encoding: 'utf8', shell: false });
  if (git.status !== 0) fail('cwd is not inside a Git worktree', 73);
  return realpathSync(git.stdout.trim());
}
function readPins(path, root) {
  if (!existsSync(path)) return new Set();
  const st = lstatSync(path);
  if (!st.isFile() || st.isSymbolicLink() || !inside(root, realpathSync(path))) fail('retention manifest must be a regular file inside the Git root', 73);
  let parsed;
  try { parsed = JSON.parse(readFileSync(path, 'utf8')); } catch { fail('retention manifest is invalid JSON', 65); }
  if (!Array.isArray(parsed.pinned) || parsed.pinned.some((item) => typeof item !== 'string' || item.includes('/') || item.includes('\\') || item === '.' || item === '..')) fail('retention manifest pinned must contain artifact basenames', 65);
  return new Set(parsed.pinned);
}
function main() {
  process.umask(0o077);
  const options = parse(process.argv.slice(2));
  const root = rootFor(options.cwd);
  const dir = join(root, 'temp', 'agent-command-output');
  if (!existsSync(dir)) { process.stdout.write(`${JSON.stringify({ mode: options.apply ? 'apply' : 'report', directory: relative(root, dir), pairs: 0, selected: 0, bytesBefore: 0, bytesAfter: 0, removedBytes: 0, skippedSymlinks: 0 })}\n`); return; }
  if (lstatSync(dir).isSymbolicLink() || !lstatSync(dir).isDirectory() || realpathSync(dir) !== dir || !inside(root, realpathSync(dir))) fail('artifact directory is unsafe', 73);
  const manifest = options.manifest ? resolve(root, options.manifest) : join(dir, 'retention-manifest.json');
  if (!inside(root, manifest)) fail('retention manifest escapes Git root', 73);
  const pins = readPins(manifest, root);
  const lock = join(dir, '.cleanup.lock');
  try { mkdirSync(lock, { mode: 0o700 }); } catch (error) { if (error.code === 'EEXIST') fail('cleanup lock is held', 75); throw error; }
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    const active = new Set(entries.filter((e) => e.isDirectory() && /^\..+\.reserve$/.test(e.name)).map((e) => e.name.slice(1, -8)));
    let skippedSymlinks = 0;
    const pairs = [];
    for (const entry of entries) {
      if (!entry.name.endsWith('.meta.json')) continue;
      const metaPath = join(dir, entry.name);
      const metaStat = lstatSync(metaPath);
      if (metaStat.isSymbolicLink()) { skippedSymlinks += 1; continue; }
      if (!metaStat.isFile()) continue;
      const base = entry.name.slice(0, -10);
      if (active.has(base)) continue;
      const logName = `${base}.log`;
      const logPath = join(dir, logName);
      if (!existsSync(logPath)) continue;
      const logStat = lstatSync(logPath);
      if (logStat.isSymbolicLink()) { skippedSymlinks += 1; continue; }
      if (!logStat.isFile()) continue;
      let meta;
      try { meta = JSON.parse(readFileSync(metaPath, 'utf8')); } catch { continue; }
      if (!meta.endedAt || !meta.sha256 || !Number.isFinite(Date.parse(meta.endedAt))) continue;
      const pinned = pins.has(base) || pins.has(logName) || pins.has(entry.name) || existsSync(join(dir, `${base}.keep`));
      pairs.push({ base, logName, metaName: entry.name, bytes: logStat.size + metaStat.size, endedMs: Date.parse(meta.endedAt), pinned });
    }
    pairs.sort((a, b) => a.endedMs - b.endedMs || a.base.localeCompare(b.base));
    const now = Date.now();
    const cutoff = now - options.maxAgeDays * 86400000;
    const selected = new Set(pairs.filter((p) => !p.pinned && p.endedMs < cutoff).map((p) => p.base));
    let retainedBytes = pairs.reduce((sum, p) => sum + p.bytes, 0) - pairs.filter((p) => selected.has(p.base)).reduce((sum, p) => sum + p.bytes, 0);
    for (const pair of pairs) {
      if (retainedBytes <= options.maxBytes) break;
      if (!pair.pinned && !selected.has(pair.base)) { selected.add(pair.base); retainedBytes -= pair.bytes; }
    }
    let removedBytes = 0;
    if (options.apply) {
      for (const pair of pairs.filter((p) => selected.has(p.base))) {
        for (const name of [pair.logName, pair.metaName]) {
          const path = join(dir, name);
          const st = lstatSync(path);
          if (!st.isFile() || st.isSymbolicLink()) fail(`artifact changed during cleanup: ${name}`, 74);
        }
        rmSync(join(dir, pair.logName));
        rmSync(join(dir, pair.metaName));
        removedBytes += pair.bytes;
      }
    }
    const selectedNames = [...selected];
    const report = { mode: options.apply ? 'apply' : 'report', directory: relative(root, dir), pairs: pairs.length, selected: selected.size, selectedPairs: selectedNames.slice(0, 100), selectedPairsOmitted: Math.max(0, selectedNames.length - 100), pinned: pairs.filter((p) => p.pinned).length, bytesBefore: pairs.reduce((sum, p) => sum + p.bytes, 0), bytesAfter: options.apply ? pairs.reduce((sum, p) => sum + p.bytes, 0) - removedBytes : retainedBytes, removedBytes, skippedSymlinks };
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally { rmSync(lock, { recursive: true, force: true }); }
}
main();
