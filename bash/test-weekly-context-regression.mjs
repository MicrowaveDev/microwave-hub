#!/usr/bin/env node

import assert from 'node:assert/strict';
import test from 'node:test';
import { observationWindows, statusReceipt } from './run-weekly-context-regression.mjs';

const config = {
  schemaVersion: 1,
  programId: 'test-program',
  implementationCommit: 'a'.repeat(40),
  implementationCompletedAt: '2026-07-01T00:00:00.000Z',
  requiredWeeklyWindows: 2,
  windowDays: 7,
};

test('refuses closure before two complete observation windows', () => {
  const schedule = observationWindows(config, '2026-07-14T23:59:59.000Z');
  assert.equal(schedule.ready, false);
  assert.equal(schedule.completeWindows, 1);
  assert.equal(statusReceipt(config, schedule, '/tmp/out').status, 'waiting_for_observation_window');
  assert.equal(schedule.earliestReadyAt, '2026-07-15T00:00:00.000Z');
  assert.deepEqual(schedule.baseline, {
    id: 'pre-change-baseline',
    since: '2026-06-24T00:00:00.000Z',
    until: '2026-07-01T00:00:00.000Z',
  });
});

test('uses fixed contiguous post-change windows', () => {
  const schedule = observationWindows(config, '2026-07-15T00:00:00.000Z');
  assert.equal(schedule.ready, true);
  assert.deepEqual(schedule.windows, [
    { id: 'post-change-week-1', since: '2026-07-01T00:00:00.000Z', until: '2026-07-08T00:00:00.000Z' },
    { id: 'post-change-week-2', since: '2026-07-08T00:00:00.000Z', until: '2026-07-15T00:00:00.000Z' },
  ]);
});

test('rejects invalid program configuration', () => {
  assert.throws(() => observationWindows({ ...config, requiredWeeklyWindows: 1 }, '2026-07-15T00:00:00.000Z'), /at least 2/);
  assert.throws(() => observationWindows({ ...config, implementationCompletedAt: 'bad' }, '2026-07-15T00:00:00.000Z'), /valid date/);
});
