#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  PROJECT_ROOT,
  FlowStateError,
  checkpointPaths,
  initCheckpoint,
  readCheckpoint,
  resumeCheckpoint,
  sha256,
  updateCheckpoint,
} from './agent-flow-checkpoint.mjs';
import {
  PacketError,
  generatePacket,
  validateHandoff,
  validatePacketEnvironment,
  writePacket,
} from './agent-work-packet.mjs';

const TEST_PARENT = path.join(PROJECT_ROOT, 'temp', 'agent-flow-checkpoints');
fs.mkdirSync(TEST_PARENT, { recursive: true });
const TEST_ROOT = fs.mkdtempSync(path.join(TEST_PARENT, 'state-test-'));
let sequence = 0;
const CHECKPOINT_CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), 'agent-flow-checkpoint.mjs');
const PACKET_CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), 'agent-work-packet.mjs');

function git(repo, args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function makeRepo() {
  sequence += 1;
  const repo = path.join(TEST_ROOT, `repo-${sequence}`);
  fs.mkdirSync(repo, { recursive: true });
  git(repo, ['init', '-q']);
  git(repo, ['config', 'user.email', 'agent-flow-test@example.invalid']);
  git(repo, ['config', 'user.name', 'Agent Flow Test']);
  fs.writeFileSync(path.join(repo, 'plan.md'), '# Frozen plan\n');
  fs.writeFileSync(path.join(repo, 'interface.json'), '{"version":1}\n');
  fs.writeFileSync(path.join(repo, 'evidence.txt'), 'accepted evidence\n');
  fs.writeFileSync(path.join(repo, '.gitignore'), 'temp/context-efficiency-implementation/\n');
  git(repo, ['add', '.']);
  git(repo, ['commit', '-qm', 'fixture']);
  return { repo, head: git(repo, ['rev-parse', 'HEAD']) };
}

function stateFor(repo, head, overrides = {}) {
  return {
    objective: 'Resume a bounded multi-agent flow without replay.',
    acceptanceCriteria: ['Checkpoint validates', 'Resume names an exact action'],
    constraints: ['Do not reread full transcripts'],
    canonicalPlanPaths: ['plan.md'],
    referencedArtifacts: ['evidence.txt'],
    phase: 'implementation',
    workstream: 'H-O',
    versions: { behavior: '1', scoring: '1' },
    ids: { rootTaskId: 'replaced-by-init', coordinatorId: 'coordinator-1', children: [], mappings: {} },
    repos: [{ path: repo, head }],
    dependencies: [{ id: 'G-H1', disposition: 'accepted' }],
    files: { ownedChanged: ['bash/agent-flow-checkpoint.mjs'], evidence: ['evidence.txt'] },
    validations: [],
    blocker: null,
    externalState: { concurrency: 'available' },
    retryBudget: 2,
    nextActions: ['Run the declared checkpoint test.'],
    ...overrides,
  };
}

function init(id, state) {
  return initCheckpoint({ rootTaskId: id, input: state, writer: 'test-suite', projectRoot: TEST_ROOT });
}

function packetFor(repo, head, overrides = {}) {
  return {
    taskId: 'issue-6',
    runId: 'run-1',
    lane: 'H-O',
    sliceId: 'H3',
    priority: 'high',
    repoRoot: repo,
    baseRevision: head,
    allowedPaths: ['bash/agent-flow-checkpoint.mjs', 'bash/agent-work-packet.mjs'],
    forbiddenPaths: ['package.json', '.gitignore'],
    planAnchors: ['Phase 6.3', 'Phase 6.4'],
    dependencies: [{ id: 'G-H1', disposition: 'accepted' }],
    interfaces: [{ id: 'checkpoint-schema', path: 'interface.json', sha256: sha256(fs.readFileSync(path.join(repo, 'interface.json'))) }],
    acceptanceCriteria: ['Checkpoint resumes without replay'],
    validations: { required: ['node --test bash/test-agent-flow-state.mjs'], optional: ['node --check bash/agent-work-packet.mjs'] },
    budget: { promptTokens: 2000, handoffLines: 100, handoffEstimatedTokens: 3000, reviewBytes: 49152 },
    artifactDirectory: 'temp/context-efficiency-implementation/run-1',
    handoffSchemaVersion: 1,
    stopConditions: ['Stop on frozen interface drift'],
    nextMergeBarrier: 'B2',
    ...overrides,
  };
}

function handoffFor(repo, packet, overrides = {}) {
  const artifact = path.join(repo, 'temp', 'context-efficiency-implementation', 'run-1', 'result.txt');
  fs.mkdirSync(path.dirname(artifact), { recursive: true });
  fs.writeFileSync(artifact, 'bounded result\n');
  return {
    schemaVersion: 1,
    baseRevision: packet.baseRevision,
    dirtyState: 'two owned files changed',
    scopeCompleted: 'Implemented checkpoint and packet validators.',
    changedFiles: ['bash/agent-flow-checkpoint.mjs'],
    diffstat: '1 file changed, 10 insertions(+)',
    verdict: { status: 'passed', summary: 'Acceptance behavior is covered.' },
    validations: [{ command: 'node --test bash/test-agent-flow-state.mjs', status: 'passed' }],
    skippedTests: [],
    decisions: [],
    artifacts: ['temp/context-efficiency-implementation/run-1/result.txt'],
    disposition: 'completed',
    blocker: null,
    nextAction: 'Coordinator verifies the slice.',
    commitSha: null,
    changedPathAllowlistPassed: true,
    acceptanceResults: [{ criterion: 'Checkpoint resumes without replay', status: 'passed' }],
    ...overrides,
  };
}

function completedChildFor(repo, packet, overrides = {}) {
  const handoff = handoffFor(repo, packet);
  const packetArtifact = path.join(repo, 'temp', 'context-efficiency-implementation', 'run-1', 'packet.json');
  const artifact = path.join(repo, 'temp', 'context-efficiency-implementation', 'run-1', 'handoff.json');
  const packetRaw = `${JSON.stringify(packet, null, 2)}\n`;
  const raw = `${JSON.stringify(handoff, null, 2)}\n`;
  fs.writeFileSync(packetArtifact, packetRaw);
  fs.writeFileSync(artifact, raw);
  return {
    id: 'child-1',
    parentId: 'coordinator-1',
    taskId: packet.taskId,
    disposition: 'completed',
    completionReceipt: {
      repoPath: repo,
      packetArtifact: path.relative(repo, packetArtifact),
      packetSha256: sha256(packetRaw),
      artifact: path.relative(repo, artifact),
      artifactSha256: sha256(raw),
      validation: validateHandoff(packet, handoff, raw),
    },
    ...overrides,
  };
}

test.after(() => fs.rmSync(TEST_ROOT, { recursive: true, force: true }));

test('rejects SHA-256 sidecar corruption', () => {
  const { repo, head } = makeRepo();
  const id = 'hash-corruption';
  const result = init(id, stateFor(repo, head));
  fs.writeFileSync(result.paths.sidecar, `${'0'.repeat(64)}  active.json\n`);
  assert.throws(() => readCheckpoint({ rootTaskId: id, projectRoot: TEST_ROOT }), /sidecar mismatch/);
});

test('rejects an oversized active checkpoint before writing it', () => {
  const { repo, head } = makeRepo();
  assert.throws(
    () => init('oversize', stateFor(repo, head, { objective: 'x'.repeat(17000) })),
    (error) => error instanceof FlowStateError && /exceeds 16384 bytes/.test(error.message),
  );
  assert.equal(fs.existsSync(checkpointPaths('oversize', TEST_ROOT).active), false);
});

test('rejects repo-relative path escape and symlink escape', () => {
  const { repo, head } = makeRepo();
  const outside = path.join(TEST_ROOT, 'outside.txt');
  fs.writeFileSync(outside, 'outside\n');
  fs.symlinkSync(outside, path.join(repo, 'escaped-link'));
  assert.throws(() => init('path-escape', stateFor(repo, head, { referencedArtifacts: ['../outside.txt'] })), /init validation failed/);
  assert.throws(() => init('symlink-escape', stateFor(repo, head, { referencedArtifacts: ['escaped-link'] })), /init validation failed/);
});

test('fails closed when a recorded repo head is stale', () => {
  const { repo, head } = makeRepo();
  init('stale-head', stateFor(repo, head));
  fs.writeFileSync(path.join(repo, 'later.txt'), 'new revision\n');
  git(repo, ['add', 'later.txt']);
  git(repo, ['commit', '-qm', 'move head']);
  assert.throws(
    () => readCheckpoint({ rootTaskId: 'stale-head', projectRoot: TEST_ROOT }),
    (error) => /recovery manifest/.test(error.message) && error.details.some((detail) => detail.includes('stale repo head')),
  );
});

test('advances a checkpoint only to a verified descendant at the current repo head', () => {
  const { repo, head } = makeRepo();
  init('advance-head', stateFor(repo, head));
  fs.writeFileSync(path.join(repo, 'next.txt'), 'next revision\n');
  git(repo, ['add', 'next.txt']);
  git(repo, ['commit', '-qm', 'next']);
  const nextHead = git(repo, ['rev-parse', 'HEAD']);
  const result = updateCheckpoint({
    rootTaskId: 'advance-head',
    patch: { repos: [{ path: repo, head: nextHead }], nextActions: ['Continue from the accepted descendant.'] },
    writer: 'test-suite',
    projectRoot: TEST_ROOT,
  });
  assert.equal(result.state.repos[0].head, nextHead);
  assert.equal(readCheckpoint({ rootTaskId: 'advance-head', projectRoot: TEST_ROOT }).state.repos[0].head, nextHead);
});

test('atomically updates active state and appends a hash-chained event', () => {
  const { repo, head } = makeRepo();
  const id = 'atomic-update';
  init(id, stateFor(repo, head));
  updateCheckpoint({
    rootTaskId: id,
    patch: { phase: 'verification', validations: [{ command: 'node --test', status: 'passed' }], nextActions: ['Review the bounded handoff.'] },
    writer: 'test-suite',
    eventType: 'validation',
    projectRoot: TEST_ROOT,
  });
  const result = readCheckpoint({ rootTaskId: id, projectRoot: TEST_ROOT });
  assert.equal(result.state.phase, 'verification');
  assert.equal(fs.readFileSync(result.paths.sidecar, 'utf8').split(/\s+/)[0], sha256(result.bytes));
  assert.equal(fs.readFileSync(result.paths.ledger, 'utf8').trim().split('\n').length, 2);
  assert.deepEqual(fs.readdirSync(result.paths.base).filter((name) => name.endsWith('.tmp') || name === '.update-lock'), []);
});

test('accepts child completion backed by a validated structured handoff', () => {
  const { repo, head } = makeRepo();
  const packet = generatePacket(packetFor(repo, head)).packet;
  const child = completedChildFor(repo, packet);
  const result = init('completed-child-receipt', stateFor(repo, head, {
    ids: { rootTaskId: 'replaced-by-init', coordinatorId: 'coordinator-1', children: [child], mappings: {} },
  }));
  assert.equal(result.state.ids.children[0].completionReceipt.validation.disposition, 'completed');
});

test('rejects new child completion without an accepted validation receipt', () => {
  const { repo, head } = makeRepo();
  const packet = generatePacket(packetFor(repo, head)).packet;
  const child = completedChildFor(repo, packet);
  const ids = (completed) => ({ rootTaskId: 'replaced-by-init', coordinatorId: 'coordinator-1', children: [completed], mappings: {} });
  init('completed-child-transition', stateFor(repo, head, { ids: ids({ id: child.id, parentId: child.parentId, taskId: child.taskId, disposition: 'planned' }) }));
  assert.throws(
    () => updateCheckpoint({
      rootTaskId: 'completed-child-transition',
      patch: { ids: { children: [{ id: child.id, parentId: child.parentId, taskId: child.taskId, disposition: 'completed' }] } },
      writer: 'test-suite',
      projectRoot: TEST_ROOT,
    }),
    (error) => error.details.some((detail) => detail.includes('requires a structured completionReceipt')),
  );
  assert.throws(
    () => init('completed-child-no-receipt', stateFor(repo, head, { ids: ids({ id: child.id, parentId: child.parentId, taskId: child.taskId, disposition: 'completed' }) })),
    (error) => error.details.some((detail) => detail.includes('requires a structured completionReceipt')),
  );
  assert.throws(
    () => init('completed-child-rejected-receipt', stateFor(repo, head, { ids: ids({ ...child, completionReceipt: { ...child.completionReceipt, validation: { ...child.completionReceipt.validation, disposition: 'failed' } } }) })),
    (error) => error.details.some((detail) => detail.includes('validation disposition is not accepted')),
  );
});

test('rejects child completion when its handoff artifact is malformed or changed', () => {
  const { repo, head } = makeRepo();
  const packet = generatePacket(packetFor(repo, head)).packet;
  const child = completedChildFor(repo, packet);
  const artifact = path.join(repo, child.completionReceipt.artifact);
  const ids = { rootTaskId: 'replaced-by-init', coordinatorId: 'coordinator-1', children: [child], mappings: {} };
  fs.writeFileSync(artifact, '{"disposition":"completed"}\n');
  assert.throws(
    () => init('completed-child-malformed-artifact', stateFor(repo, head, { ids })),
    (error) => error.details.some((detail) => detail.includes('handoff artifact is missing schemaVersion'))
      && error.details.some((detail) => detail.includes('SHA-256 mismatch')),
  );
});

test('keeps resume output bounded and omits frozen plan prose', () => {
  const { repo, head } = makeRepo();
  const id = 'resume-bound';
  init(id, stateFor(repo, head, { acceptanceCriteria: Array.from({ length: 40 }, (_, index) => `Long frozen criterion ${index} ${'detail '.repeat(10)}`) }));
  const { output, summary } = resumeCheckpoint({ rootTaskId: id, projectRoot: TEST_ROOT });
  assert.ok(Buffer.byteLength(output) <= 16384);
  assert.equal(Object.hasOwn(summary, 'acceptanceCriteria'), false);
  assert.deepEqual(summary.nextActions, ['Run the declared checkpoint test.']);
});

test('exposes init, update, validate, and resume commands', () => {
  const { repo, head } = makeRepo();
  const input = path.join(TEST_ROOT, 'cli-state.json');
  const patch = path.join(TEST_ROOT, 'cli-patch.json');
  fs.writeFileSync(input, JSON.stringify(stateFor(repo, head)));
  fs.writeFileSync(patch, JSON.stringify({ phase: 'handoff', nextActions: ['Send the compact receipt.'] }));
  const invoke = (args) => JSON.parse(execFileSync(process.execPath, [CHECKPOINT_CLI, ...args, '--project-root', TEST_ROOT], { encoding: 'utf8' }));
  assert.equal(invoke(['init', '--root-task-id', 'cli-commands', '--state', input]).ok, true);
  assert.equal(invoke(['update', '--id', 'cli-commands', '--patch', patch]).ok, true);
  assert.equal(invoke(['validate', '--id', 'cli-commands']).ok, true);
  const resumed = invoke(['resume', '--id', 'cli-commands']);
  assert.equal(resumed.status, 'ready_to_resume');
  assert.equal(resumed.phase, 'handoff');
});

test('generates and validates a project-local work packet', () => {
  const { repo, head } = makeRepo();
  const input = packetFor(repo, head);
  const result = writePacket(input, { writer: 'test-suite' });
  assert.ok(result.output.startsWith(path.join(repo, 'temp', 'context-efficiency-implementation')));
  assert.equal(validatePacketEnvironment(result.packet).disposition, 'ready');
  assert.equal(JSON.parse(fs.readFileSync(result.output, 'utf8')).packetHash, result.packet.packetHash);
});

test('exposes packet generation, validation, and handoff validation commands', () => {
  const { repo, head } = makeRepo();
  const source = path.join(TEST_ROOT, 'packet-source.json');
  fs.writeFileSync(source, JSON.stringify(packetFor(repo, head)));
  const generated = JSON.parse(execFileSync(process.execPath, [PACKET_CLI, 'generate', '--input', source], { encoding: 'utf8' }));
  assert.equal(generated.ok, true);
  assert.equal(JSON.parse(execFileSync(process.execPath, [PACKET_CLI, 'validate', '--packet', generated.packet], { encoding: 'utf8' })).disposition, 'ready');
  const packet = JSON.parse(fs.readFileSync(generated.packet, 'utf8'));
  const handoffFile = path.join(TEST_ROOT, 'handoff.json');
  fs.writeFileSync(handoffFile, `${JSON.stringify(handoffFor(repo, packet), null, 2)}\n`);
  const handoffReceipt = JSON.parse(execFileSync(process.execPath, [PACKET_CLI, 'validate-handoff', '--packet', generated.packet, '--input', handoffFile], { encoding: 'utf8' }));
  assert.equal(handoffReceipt.disposition, 'completed');
  assert.ok(handoffReceipt.lines <= 100);
});

test('returns blocked_interface_drift for dependency and interface drift', () => {
  const { repo, head } = makeRepo();
  const dependencyPacket = generatePacket(packetFor(repo, head, { dependencies: [{ id: 'G-H1', disposition: 'pending' }] })).packet;
  assert.throws(
    () => validatePacketEnvironment(dependencyPacket),
    (error) => error instanceof PacketError && error.disposition === 'blocked_interface_drift' && error.details.some((detail) => detail.includes('dependency G-H1')),
  );
  const interfacePacket = generatePacket(packetFor(repo, head)).packet;
  fs.writeFileSync(path.join(repo, 'interface.json'), '{"version":2}\n');
  assert.throws(
    () => validatePacketEnvironment(interfacePacket),
    (error) => error.disposition === 'blocked_interface_drift' && error.details.some((detail) => detail.includes('interface hash drift')),
  );
});

test('blocks a work packet when its artifact directory is trackable', () => {
  const { repo, head } = makeRepo();
  fs.writeFileSync(path.join(repo, '.gitignore'), '');
  const packet = generatePacket(packetFor(repo, head)).packet;
  assert.throws(
    () => validatePacketEnvironment(packet),
    (error) => error instanceof PacketError && error.disposition === 'blocked_interface_drift' && error.details.some((detail) => detail.includes('ignored by Git')),
  );
});

test('rejects work-packet ownership path escape', () => {
  const { repo, head } = makeRepo();
  assert.throws(
    () => generatePacket(packetFor(repo, head, { allowedPaths: ['../outside'] })),
    (error) => error instanceof PacketError && error.details.some((detail) => detail.includes('escapes repo root')),
  );
});

test('validates compact handoffs and enforces line and token budgets', () => {
  const { repo, head } = makeRepo();
  const packet = generatePacket(packetFor(repo, head)).packet;
  const handoff = handoffFor(repo, packet);
  const validRaw = `${JSON.stringify(handoff, null, 2)}\n`;
  const receipt = validateHandoff(packet, handoff, validRaw);
  assert.ok(receipt.lines <= 100);
  assert.ok(receipt.estimatedTokens <= 3000);

  const tooManyLines = `${validRaw}${'\n'.repeat(101)}`;
  assert.throws(() => validateHandoff(packet, handoff, tooManyLines), /handoff validation failed/);
  const tooManyTokens = JSON.stringify({ ...handoff, scopeCompleted: 'x'.repeat(13000) });
  assert.throws(
    () => validateHandoff(packet, { ...handoff, scopeCompleted: 'x'.repeat(13000) }, tooManyTokens),
    (error) => error.details.some((detail) => detail.includes('estimated tokens')),
  );
});
