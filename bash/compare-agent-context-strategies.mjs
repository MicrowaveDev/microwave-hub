#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const STRATEGIES = ['reused', 'reset', 'fresh'];

function fail(message, code = 2) {
  process.stderr.write(`compare-agent-context-strategies: ${message}\n`);
  process.exit(code);
}

function parse(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--input') options.input = argv[++index];
    else if (argv[index] === '--output') options.output = argv[++index];
    else fail(`unknown option: ${argv[index]}`);
  }
  if (!options.input) fail('--input is required');
  return options;
}

function number(value, field) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${field} must be a non-negative number`);
  return value;
}

export function compareStrategies(input) {
  if (input?.schemaVersion !== 1 || !Array.isArray(input.runs)) throw new Error('input must use schemaVersion 1 and contain runs');
  const grouped = new Map(STRATEGIES.map((strategy) => [strategy, []]));
  for (const [index, run] of input.runs.entries()) {
    if (!STRATEGIES.includes(run.strategy)) throw new Error(`runs[${index}].strategy is unsupported`);
    if (typeof run.batchId !== 'string' || !run.batchId) throw new Error(`runs[${index}].batchId is required`);
    for (const field of ['inputTokens', 'uncachedInputTokens', 'latencyMs', 'startupCalls', 'interventions']) number(run[field], `runs[${index}].${field}`);
    if (typeof run.correct !== 'boolean') throw new Error(`runs[${index}].correct must be boolean`);
    grouped.get(run.strategy).push(run);
  }
  const batchSets = STRATEGIES.map((strategy) => [...new Set(grouped.get(strategy).map((run) => run.batchId))].sort());
  const comparable = batchSets[0].length > 0 && batchSets.every((set) => JSON.stringify(set) === JSON.stringify(batchSets[0]));
  const summaries = Object.fromEntries(STRATEGIES.map((strategy) => {
    const runs = grouped.get(strategy);
    const sum = (field) => runs.reduce((total, run) => total + run[field], 0);
    return [strategy, {
      runs: runs.length,
      batches: new Set(runs.map((run) => run.batchId)).size,
      inputTokens: sum('inputTokens'),
      uncachedInputTokens: sum('uncachedInputTokens'),
      latencyMs: sum('latencyMs'),
      startupCalls: sum('startupCalls'),
      interventions: sum('interventions'),
      correctnessRate: runs.length ? runs.filter((run) => run.correct).length / runs.length : 0,
    }];
  }));
  if (!comparable) {
    return { schemaVersion: 1, verdict: 'insufficient_data', reason: 'Strategies do not cover the same non-empty batch set.', summaries };
  }
  const baseline = summaries.reused;
  const eligible = ['reset', 'fresh'].filter((strategy) => {
    const candidate = summaries[strategy];
    return candidate.correctnessRate >= baseline.correctnessRate
      && candidate.interventions <= baseline.interventions
      && candidate.inputTokens < baseline.inputTokens
      && candidate.latencyMs < baseline.latencyMs;
  }).sort((left, right) => summaries[left].inputTokens - summaries[right].inputTokens || summaries[left].latencyMs - summaries[right].latencyMs);
  const selected = eligible[0] || 'reused';
  return {
    schemaVersion: 1,
    verdict: selected === 'reused' ? 'retain_reuse' : `adopt_${selected}`,
    reason: selected === 'reused'
      ? 'No alternative improved total input and latency without weaker correctness or more intervention.'
      : `${selected} improved total input and latency without weaker correctness or more intervention.`,
    comparableBatches: batchSets[0],
    summaries,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const options = parse(process.argv.slice(2));
    const result = compareStrategies(JSON.parse(fs.readFileSync(path.resolve(options.input), 'utf8')));
    const output = `${JSON.stringify(result, null, 2)}\n`;
    if (Buffer.byteLength(output) > 16384) throw new Error('comparison report exceeds 16 KB');
    if (options.output) {
      fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
      fs.writeFileSync(path.resolve(options.output), output);
      process.stdout.write(`${JSON.stringify({ ok: true, output: path.resolve(options.output), verdict: result.verdict })}\n`);
    } else process.stdout.write(output);
    if (result.verdict === 'insufficient_data') process.exitCode = 3;
  } catch (error) {
    fail(error.message);
  }
}
