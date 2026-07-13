#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultConfig = path.join(root, 'bash/context-efficiency-program.json');
const dayMs = 24 * 60 * 60 * 1000;

function fail(message, code = 2) {
  process.stderr.write(`weekly-context-regression: ${message}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const options = {
    config: defaultConfig,
    output: path.join(root, 'temp/context-efficiency-weekly'),
    sessionsRoot: path.join(process.env.HOME || '', '.codex/sessions'),
    asOf: new Date().toISOString(),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--config') options.config = path.resolve(argv[++index]);
    else if (arg === '--output') options.output = path.resolve(argv[++index]);
    else if (arg === '--root') options.sessionsRoot = path.resolve(argv[++index]);
    else if (arg === '--as-of') options.asOf = argv[++index];
    else if (arg === '--status-only') options.statusOnly = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else fail(`unknown option: ${arg}`);
  }
  return options;
}

function usage() {
  return 'Usage: npm run context:weekly-gate -- [--as-of ISO] [--root sessions-dir] [--output dir] [--status-only]';
}

function iso(value, field) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error(`${field} must be a valid date`);
  return date;
}

export function observationWindows(config, asOfValue) {
  if (config?.schemaVersion !== 1) throw new Error('config schemaVersion must be 1');
  if (!Number.isInteger(config.requiredWeeklyWindows) || config.requiredWeeklyWindows < 2) throw new Error('requiredWeeklyWindows must be at least 2');
  if (!Number.isInteger(config.windowDays) || config.windowDays < 1) throw new Error('windowDays must be positive');
  const start = iso(config.implementationCompletedAt, 'implementationCompletedAt');
  const asOf = iso(asOfValue, 'asOf');
  const width = config.windowDays * dayMs;
  const baseline = {
    id: 'pre-change-baseline',
    since: new Date(start.valueOf() - width).toISOString(),
    until: start.toISOString(),
  };
  const windows = Array.from({ length: config.requiredWeeklyWindows }, (_, index) => ({
    id: `post-change-week-${index + 1}`,
    since: new Date(start.valueOf() + index * width).toISOString(),
    until: new Date(start.valueOf() + (index + 1) * width).toISOString(),
  }));
  const earliestReadyAt = windows.at(-1).until;
  const completeWindows = windows.filter((window) => iso(window.until, 'window.until') <= asOf).length;
  return { baseline, windows, completeWindows, earliestReadyAt, ready: completeWindows === windows.length };
}

function stableJson(value) {
  const sort = (item) => {
    if (Array.isArray(item)) return item.map(sort);
    if (!item || typeof item !== 'object') return item;
    return Object.fromEntries(Object.keys(item).sort().map((key) => [key, sort(item[key])]));
  };
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, stableJson(value), { mode: 0o600 });
}

function runNode(script, args) {
  return execFileSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function manifestMatches(directory, window, sessionsRoot) {
  const file = path.join(directory, 'run-manifest.json');
  if (!fs.existsSync(file)) return false;
  const manifest = readJson(file);
  return manifest.since === window.since
    && manifest.until === window.until
    && Array.isArray(manifest.roots)
    && manifest.roots.map(path.resolve).includes(path.resolve(sessionsRoot));
}

export function statusReceipt(config, schedule, outputRoot) {
  return {
    schemaVersion: 1,
    programId: config.programId,
    implementationCommit: config.implementationCommit,
    status: schedule.ready ? 'ready_to_run' : 'waiting_for_observation_window',
    completedWindows: schedule.completeWindows,
    requiredWindows: schedule.windows.length,
    earliestReadyAt: schedule.earliestReadyAt,
    outputRoot,
    baseline: schedule.baseline,
    windows: schedule.windows,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const config = readJson(options.config);
  const schedule = observationWindows(config, options.asOf);
  const outputRoot = path.join(options.output, config.programId);
  const receipt = statusReceipt(config, schedule, outputRoot);
  if (!schedule.ready || options.statusOnly) {
    process.stdout.write(stableJson(receipt));
    if (!schedule.ready) process.exitCode = 3;
    return;
  }
  if (!fs.existsSync(options.sessionsRoot)) throw new Error(`sessions root does not exist: ${options.sessionsRoot}`);

  const ranker = path.join(root, 'agent-viewer/scripts/rank-context-waste.mjs');
  const comparer = path.join(root, 'agent-viewer/scripts/compare-context-measurements.mjs');
  const runReceipts = [];
  for (const window of [schedule.baseline, ...schedule.windows]) {
    const destination = path.join(outputRoot, window.id);
    let reused = manifestMatches(destination, window, options.sessionsRoot);
    if (!reused) {
      fs.rmSync(destination, { recursive: true, force: true });
      runNode(ranker, ['--since', window.since, '--until', window.until, '--output', destination, '--root', options.sessionsRoot]);
    }
    const manifest = readJson(path.join(destination, 'run-manifest.json'));
    runReceipts.push({ id: window.id, directory: destination, includedCount: manifest.includedCount, reused });
  }

  const comparisons = [];
  for (const postRun of runReceipts.slice(1)) {
    const comparisonPath = path.join(outputRoot, `baseline-vs-${postRun.id}.json`);
    const comparisonOutput = runNode(comparer, [
      '--before', runReceipts[0].directory,
      '--after', postRun.directory,
      '--output', comparisonPath,
    ]);
    const report = readJson(comparisonPath);
    comparisons.push({ postWindow: postRun.id, comparisonPath, comparisonOutput, compatibility: report.compatibility, gate: report.gate });
  }
  const finalReceipt = {
    ...receipt,
    status: 'observations_complete',
    runs: runReceipts,
    comparisons,
    interpretation: 'Production comparisons are informational. Deterministic fixture regressions remain blocking in the helper and analyzer test suites.',
  };
  writeJson(path.join(outputRoot, 'weekly-gate-receipt.json'), finalReceipt);
  process.stdout.write(stableJson(finalReceipt));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => fail(error.stderr?.toString().trim() || error.message, 1));
}
