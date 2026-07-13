#!/usr/bin/env node

import assert from 'node:assert/strict';
import test from 'node:test';
import { outcomeFromSession } from './collect-context-strategy-experiment.mjs';

const manifest = { batchId: 'batch-a', expectedCommand: 'npm run task:context -- artist-helper' };
const arm = { strategy: 'fresh', agentId: '019f5c3c-3563-7d51-9c76-070679b5355e', interventions: 0 };
const session = {
  start: '2026-07-13T10:00:00.000Z',
  end: '2026-07-13T10:00:01.250Z',
  metrics: { inputTokens: 100, uncachedInputTokens: 25, toolCalls: 1 },
  assistantMessages: [{ text: JSON.stringify({ batchId: 'batch-a', strategy: 'fresh', command: manifest.expectedCommand, correct: true }) }],
};

test('collects bounded comparable telemetry and verifies the final answer', () => {
  assert.deepEqual(outcomeFromSession(manifest, arm, session), {
    strategy: 'fresh', batchId: 'batch-a', inputTokens: 100, uncachedInputTokens: 25,
    latencyMs: 1250, startupCalls: 1, interventions: 0, correct: true, agentId: arm.agentId,
  });
});

test('does not trust an incorrect self-reported result', () => {
  const changed = structuredClone(session);
  changed.assistantMessages[0].text = JSON.stringify({ batchId: 'batch-a', strategy: 'fresh', command: 'wrong', correct: true });
  assert.equal(outcomeFromSession(manifest, arm, changed).correct, false);
});
