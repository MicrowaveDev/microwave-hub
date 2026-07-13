#!/usr/bin/env node

import assert from 'node:assert/strict';
import test from 'node:test';
import { compareStrategies } from './compare-agent-context-strategies.mjs';

const run = (strategy, batchId, overrides = {}) => ({
  strategy,
  batchId,
  inputTokens: strategy === 'reused' ? 100 : 80,
  uncachedInputTokens: strategy === 'reused' ? 40 : 35,
  latencyMs: strategy === 'reused' ? 1000 : 800,
  startupCalls: strategy === 'reused' ? 1 : 2,
  interventions: 0,
  correct: true,
  ...overrides,
});

test('adopts the lowest-input faster strategy with equal correctness', () => {
  const runs = ['a', 'b'].flatMap((batch) => [
    run('reused', batch),
    run('reset', batch),
    run('fresh', batch, { inputTokens: 70, latencyMs: 750 }),
  ]);
  assert.equal(compareStrategies({ schemaVersion: 1, runs }).verdict, 'adopt_fresh');
});

test('retains reuse when a cheaper strategy weakens correctness', () => {
  const runs = ['a'].flatMap((batch) => [
    run('reused', batch),
    run('reset', batch, { correct: false }),
    run('fresh', batch, { latencyMs: 1200 }),
  ]);
  assert.equal(compareStrategies({ schemaVersion: 1, runs }).verdict, 'retain_reuse');
});

test('refuses a decision from non-comparable batches', () => {
  const runs = [run('reused', 'a'), run('reset', 'b'), run('fresh', 'a')];
  assert.equal(compareStrategies({ schemaVersion: 1, runs }).verdict, 'insufficient_data');
});
