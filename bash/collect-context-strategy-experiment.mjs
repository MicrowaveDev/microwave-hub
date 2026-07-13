#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeLog } from '../agent-viewer/scripts/rank-context-waste.mjs';
import { compareStrategies } from './compare-agent-context-strategies.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message, code = 2) {
  process.stderr.write(`collect-context-strategy-experiment: ${message}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const options = { sessionsRoot: path.join(process.env.HOME || '', '.codex/sessions') };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--manifest') options.manifest = path.resolve(argv[++index]);
    else if (arg === '--output') options.output = path.resolve(argv[++index]);
    else if (arg === '--root') options.sessionsRoot = path.resolve(argv[++index]);
    else if (arg === '--help' || arg === '-h') options.help = true;
    else fail(`unknown option: ${arg}`);
  }
  return options;
}

function usage() {
  return 'Usage: npm run context:collect-strategy-experiment -- --manifest file.json --output report.json [--root sessions-dir]';
}

function stableJson(value) {
  const sort = (item) => {
    if (Array.isArray(item)) return item.map(sort);
    if (!item || typeof item !== 'object') return item;
    return Object.fromEntries(Object.keys(item).sort().map((key) => [key, sort(item[key])]));
  };
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}

function findRollout(directory, agentId) {
  if (!fs.existsSync(directory)) throw new Error(`sessions root does not exist: ${directory}`);
  const matches = [];
  const stack = [directory];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(target);
      else if (entry.isFile() && entry.name.endsWith(`${agentId}.jsonl`)) matches.push(target);
    }
  }
  if (matches.length !== 1) throw new Error(`expected one rollout for ${agentId}; found ${matches.length}`);
  return matches[0];
}

function parseFinalJson(messages) {
  const text = messages.at(-1)?.text?.trim() || '';
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('final response does not contain a JSON object');
  return JSON.parse(text.slice(start, end + 1));
}

export function outcomeFromSession(manifest, arm, session) {
  const final = parseFinalJson(session.assistantMessages || []);
  const correct = final.batchId === manifest.batchId
    && final.strategy === arm.strategy
    && final.command === manifest.expectedCommand
    && final.correct === true;
  const start = new Date(session.start);
  const end = new Date(session.end);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end < start) throw new Error(`invalid timestamps for ${arm.agentId}`);
  for (const field of ['inputTokens', 'uncachedInputTokens', 'toolCalls']) {
    if (!Number.isFinite(session.metrics?.[field])) throw new Error(`missing ${field} telemetry for ${arm.agentId}`);
  }
  return {
    strategy: arm.strategy,
    batchId: manifest.batchId,
    inputTokens: session.metrics.inputTokens,
    uncachedInputTokens: session.metrics.uncachedInputTokens,
    latencyMs: end.valueOf() - start.valueOf(),
    startupCalls: session.metrics.toolCalls,
    interventions: arm.interventions,
    correct,
    agentId: arm.agentId,
  };
}

function validateManifest(manifest) {
  if (manifest?.schemaVersion !== 1 || typeof manifest.batchId !== 'string' || typeof manifest.expectedCommand !== 'string') throw new Error('manifest must use schemaVersion 1 with batchId and expectedCommand');
  if (!Array.isArray(manifest.arms) || manifest.arms.length !== 3) throw new Error('manifest requires exactly three arms');
  const strategies = manifest.arms.map((arm) => arm.strategy).sort();
  if (JSON.stringify(strategies) !== JSON.stringify(['fresh', 'reset', 'reused'])) throw new Error('manifest requires fresh, reset, and reused arms');
  for (const arm of manifest.arms) {
    if (!/^[0-9a-f-]{36}$/.test(arm.agentId || '')) throw new Error(`invalid agentId for ${arm.strategy}`);
    if (!Number.isInteger(arm.interventions) || arm.interventions < 0) throw new Error(`invalid interventions for ${arm.strategy}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (!options.manifest || !options.output) throw new Error('--manifest and --output are required');
  const manifest = JSON.parse(fs.readFileSync(options.manifest, 'utf8'));
  validateManifest(manifest);
  const runs = [];
  for (const arm of manifest.arms) {
    const session = await analyzeLog(findRollout(options.sessionsRoot, arm.agentId));
    runs.push(outcomeFromSession(manifest, arm, session));
  }
  const comparison = compareStrategies({ schemaVersion: 1, runs });
  const report = {
    schemaVersion: 1,
    batchId: manifest.batchId,
    expectedCommand: manifest.expectedCommand,
    collectedAt: new Date().toISOString(),
    interpretation: 'One prospective equivalent-task sample. Do not generalize the selected strategy without repeated representative batches.',
    runs,
    comparison,
  };
  const output = stableJson(report);
  if (Buffer.byteLength(output) > 16_384) throw new Error('experiment report exceeds 16 KB');
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, output, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ ok: true, output: options.output, verdict: comparison.verdict })}\n`);
  if (!runs.every((run) => run.correct) || comparison.verdict === 'insufficient_data') process.exitCode = 3;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => fail(error.message, 1));
}
