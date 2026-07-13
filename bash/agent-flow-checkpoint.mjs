#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateHandoff } from './agent-work-packet.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(HERE, '..');
export const SCHEMAS = JSON.parse(fs.readFileSync(path.join(HERE, 'agent-flow-schemas.json'), 'utf8'));
const CHECKPOINT = SCHEMAS.checkpoint;
const HANDOFF = SCHEMAS.handoff;

export class FlowStateError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'FlowStateError';
    this.details = details;
  }
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function withoutHash(value, key) {
  const copy = structuredClone(value);
  delete copy[key];
  return copy;
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeId(value) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value || '')) {
    throw new FlowStateError('root task ID must use only letters, digits, dot, underscore, or hyphen');
  }
  return value;
}

function inside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveContained(root, candidate, label, errors, mustExist = false) {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    errors.push(`${label} must be a non-empty path`);
    return null;
  }
  const absolute = path.resolve(root, candidate);
  if (!inside(root, absolute)) {
    errors.push(`${label} escapes repo root: ${candidate}`);
    return null;
  }
  if (mustExist && !fs.existsSync(absolute)) {
    errors.push(`${label} does not exist: ${absolute}`);
    return absolute;
  }
  if (fs.existsSync(absolute)) {
    try {
      const realRoot = fs.realpathSync(root);
      const realTarget = fs.realpathSync(absolute);
      if (!inside(realRoot, realTarget)) errors.push(`${label} resolves outside repo root: ${candidate}`);
    } catch (error) {
      errors.push(`${label} cannot be resolved: ${error.message}`);
    }
  }
  return absolute;
}

function validateCompletionReceipt(child, repoRoots, errors, checkEnvironment) {
  const receipt = child.completionReceipt;
  assert(isRecord(receipt), `completed child ${child.id} requires a structured completionReceipt`, errors);
  if (!isRecord(receipt)) return;
  for (const field of CHECKPOINT.completionReceiptRequired) {
    assert(Object.hasOwn(receipt, field), `completed child ${child.id} completionReceipt is missing ${field}`, errors);
  }
  assert(typeof receipt.repoPath === 'string' && path.isAbsolute(receipt.repoPath), `completed child ${child.id} completionReceipt.repoPath must be absolute`, errors);
  const repoRoot = typeof receipt.repoPath === 'string' ? path.resolve(receipt.repoPath) : null;
  assert(repoRoot && repoRoots.has(repoRoot), `completed child ${child.id} completionReceipt.repoPath is not a checkpoint repo`, errors);
  assert(typeof receipt.packetArtifact === 'string' && receipt.packetArtifact.length > 0 && !path.isAbsolute(receipt.packetArtifact), `completed child ${child.id} completionReceipt.packetArtifact must be repo-relative`, errors);
  assert(/^[0-9a-f]{64}$/.test(receipt.packetSha256 || ''), `completed child ${child.id} completionReceipt.packetSha256 must be SHA-256`, errors);
  assert(typeof receipt.artifact === 'string' && receipt.artifact.length > 0 && !path.isAbsolute(receipt.artifact), `completed child ${child.id} completionReceipt.artifact must be repo-relative`, errors);
  assert(/^[0-9a-f]{64}$/.test(receipt.artifactSha256 || ''), `completed child ${child.id} completionReceipt.artifactSha256 must be SHA-256`, errors);
  assert(isRecord(receipt.validation), `completed child ${child.id} completionReceipt.validation must be structured`, errors);
  if (isRecord(receipt.validation)) {
    assert(receipt.validation.ok === true, `completed child ${child.id} completion validation must be successful`, errors);
    assert(CHECKPOINT.acceptedCompletionValidationDispositions.includes(receipt.validation.disposition), `completed child ${child.id} completion validation disposition is not accepted: ${receipt.validation.disposition}`, errors);
  }
  if (!checkEnvironment || !repoRoot || !repoRoots.has(repoRoot) || typeof receipt.artifact !== 'string' || path.isAbsolute(receipt.artifact)) return;
  const packetArtifact = resolveContained(repoRoot, receipt.packetArtifact, `completed child ${child.id} packet artifact`, errors, true);
  const artifact = resolveContained(repoRoot, receipt.artifact, `completed child ${child.id} handoff artifact`, errors, true);
  if (!packetArtifact || !artifact || !fs.existsSync(packetArtifact) || !fs.existsSync(artifact)) return;
  let raw;
  let packetRaw;
  let packet;
  let handoff;
  try {
    packetRaw = fs.readFileSync(packetArtifact);
    raw = fs.readFileSync(artifact);
    packet = JSON.parse(packetRaw);
    handoff = JSON.parse(raw);
  } catch (error) {
    errors.push(`completed child ${child.id} completion artifact is not valid JSON: ${error.message}`);
    return;
  }
  assert(sha256(packetRaw) === receipt.packetSha256, `completed child ${child.id} packet artifact SHA-256 mismatch`, errors);
  assert(isRecord(handoff), `completed child ${child.id} handoff artifact must be a JSON object`, errors);
  if (!isRecord(handoff)) return;
  for (const field of HANDOFF.required) {
    assert(Object.hasOwn(handoff, field), `completed child ${child.id} handoff artifact is missing ${field}`, errors);
  }
  assert(sha256(raw) === receipt.artifactSha256, `completed child ${child.id} handoff artifact SHA-256 mismatch`, errors);
  assert(handoff.disposition === receipt.validation?.disposition, `completed child ${child.id} handoff and validation dispositions do not match`, errors);
  assert(CHECKPOINT.acceptedCompletionValidationDispositions.includes(handoff.disposition), `completed child ${child.id} handoff disposition is not accepted: ${handoff.disposition}`, errors);
  try {
    const actual = validateHandoff(packet, handoff, raw.toString('utf8'));
    assert(actual.ok === receipt.validation?.ok && actual.disposition === receipt.validation?.disposition, `completed child ${child.id} stored validation does not match replayed validation`, errors);
  } catch (error) {
    errors.push(`completed child ${child.id} handoff replay validation failed: ${error.message}`);
  }
}

function gitHead(repoRoot) {
  try {
    return execFileSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function gitIsAncestor(repoRoot, ancestor, descendant) {
  try {
    execFileSync('git', ['-C', repoRoot, 'merge-base', '--is-ancestor', ancestor, descendant], {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

export function checkpointPaths(rootTaskId, projectRoot = PROJECT_ROOT) {
  const id = safeId(rootTaskId);
  const base = path.join(path.resolve(projectRoot), 'temp', 'agent-flow-checkpoints', id);
  return {
    base,
    active: path.join(base, 'active.json'),
    sidecar: path.join(base, 'active.json.sha256'),
    ledger: path.join(base, 'events.ndjson'),
    recovery: path.join(base, 'recovery-manifest.json'),
    lock: path.join(base, '.update-lock'),
  };
}

function validatePathGroups(state, errors) {
  for (const repo of state.repos || []) {
    const repoRoot = typeof repo.path === 'string' ? path.resolve(repo.path) : '';
    assert(repoRoot && fs.existsSync(repoRoot), `repo path does not exist: ${repo.path}`, errors);
    if (!repoRoot || !fs.existsSync(repoRoot)) continue;
    const actual = gitHead(repoRoot);
    assert(Boolean(actual), `repo is not a readable Git worktree: ${repoRoot}`, errors);
    assert(actual === repo.head, `stale repo head for ${repoRoot}: expected ${repo.head}, found ${actual || 'unavailable'}`, errors);
  }
  const primary = state.repos?.[0]?.path ? path.resolve(state.repos[0].path) : null;
  if (!primary || !fs.existsSync(primary)) return;
  for (const [name, mustExist] of [['canonicalPlanPaths', true], ['referencedArtifacts', true]]) {
    for (const item of state[name] || []) resolveContained(primary, item, name, errors, mustExist);
  }
  for (const item of state.files?.ownedChanged || []) resolveContained(primary, item, 'files.ownedChanged', errors, false);
  for (const item of state.files?.evidence || []) resolveContained(primary, item, 'files.evidence', errors, true);
}

export function validateStateShape(state, { checkEnvironment = true, now = Date.now(), legacyCompletedChildIds = new Set() } = {}) {
  const errors = [];
  assert(isRecord(state), 'checkpoint must be a JSON object', errors);
  if (!isRecord(state)) return errors;
  for (const field of CHECKPOINT.required) assert(Object.hasOwn(state, field), `missing checkpoint field: ${field}`, errors);
  assert(state.schemaVersion === SCHEMAS.schemaVersion, `unsupported schemaVersion: ${state.schemaVersion}`, errors);
  assert(typeof state.objective === 'string' && state.objective.trim().length > 0, 'objective must be non-empty', errors);
  assert(Array.isArray(state.acceptanceCriteria) && state.acceptanceCriteria.length > 0 && state.acceptanceCriteria.every((item) => typeof item === 'string' && item.length > 0), 'acceptanceCriteria must be a non-empty string array', errors);
  assert(Array.isArray(state.constraints) && state.constraints.every((item) => typeof item === 'string'), 'constraints must be a string array', errors);
  assert(Array.isArray(state.canonicalPlanPaths), 'canonicalPlanPaths must be an array', errors);
  assert(Array.isArray(state.referencedArtifacts), 'referencedArtifacts must be an array', errors);
  assert(typeof state.phase === 'string' && state.phase.length > 0, 'phase must be non-empty', errors);
  assert(typeof state.workstream === 'string' && state.workstream.length > 0, 'workstream must be non-empty', errors);
  assert(isRecord(state.versions), 'versions must be an object', errors);
  assert(isRecord(state.ids) && typeof state.ids.rootTaskId === 'string' && typeof state.ids.coordinatorId === 'string', 'ids must name rootTaskId and coordinatorId', errors);
  assert(Array.isArray(state.ids?.children), 'ids.children must be an array', errors);
  const repoRoots = new Set((state.repos || []).map((repo) => repo.path).filter((repoPath) => typeof repoPath === 'string' && path.isAbsolute(repoPath)).map((repoPath) => path.resolve(repoPath)));
  for (const child of state.ids?.children || []) {
    assert(typeof child.id === 'string' && typeof child.parentId === 'string' && typeof child.taskId === 'string', 'every child must include id, parentId, and taskId', errors);
    assert(CHECKPOINT.childDispositions.includes(child.disposition), `invalid child disposition: ${child.disposition}`, errors);
    if (child.disposition === 'active') {
      const heartbeat = Date.parse(child.heartbeatAt || '');
      assert(Number.isFinite(heartbeat), `active child ${child.id} requires heartbeatAt`, errors);
      if (Number.isFinite(heartbeat)) assert(now - heartbeat <= (state.activeAgentMaxAgeSeconds || 3600) * 1000, `active child is stale: ${child.id}`, errors);
    }
    if (child.disposition === 'completed' && !(legacyCompletedChildIds.has(child.id) && !Object.hasOwn(child, 'completionReceipt'))) {
      validateCompletionReceipt(child, repoRoots, errors, checkEnvironment);
    }
  }
  assert(Array.isArray(state.repos) && state.repos.length > 0, 'repos must be a non-empty array', errors);
  for (const repo of state.repos || []) assert(typeof repo.path === 'string' && path.isAbsolute(repo.path) && /^[0-9a-f]{40,64}$/.test(repo.head || ''), 'each repo requires an absolute path and Git head', errors);
  assert(Array.isArray(state.dependencies), 'dependencies must be an array', errors);
  for (const dependency of state.dependencies || []) assert(typeof dependency.id === 'string' && CHECKPOINT.dependencyDispositions.includes(dependency.disposition), `invalid dependency: ${dependency.id || '<unknown>'}`, errors);
  assert(isRecord(state.files) && Array.isArray(state.files.ownedChanged) && Array.isArray(state.files.evidence), 'files must include ownedChanged and evidence arrays', errors);
  assert(Array.isArray(state.validations), 'validations must be an array', errors);
  assert(state.blocker === null || isRecord(state.blocker), 'blocker must be null or an object', errors);
  assert(Array.isArray(state.nextActions) && state.nextActions.length >= 1 && state.nextActions.length <= 3 && state.nextActions.every((item) => typeof item === 'string' && item.length > 0), 'nextActions must contain 1-3 exact string actions', errors);
  assert(typeof state.writer === 'string' && state.writer.length > 0, 'writer must be non-empty', errors);
  const updatedAt = Date.parse(state.updatedAt || '');
  assert(Number.isFinite(updatedAt), 'updatedAt must be an ISO timestamp', errors);
  if (Number.isFinite(updatedAt)) {
    assert(updatedAt - now <= 300000, 'updatedAt is implausibly far in the future', errors);
    assert(now - updatedAt <= (state.maxAgeSeconds || CHECKPOINT.defaultMaxAgeSeconds) * 1000, 'checkpoint is stale by timestamp', errors);
  }
  const expectedContentHash = sha256(canonicalJson(withoutHash(state, 'contentHash')));
  assert(state.contentHash === expectedContentHash, 'checkpoint contentHash mismatch', errors);
  if (checkEnvironment) validatePathGroups(state, errors);
  return errors;
}

function serializeState(input, writer) {
  const state = structuredClone(input);
  state.schemaVersion = SCHEMAS.schemaVersion;
  state.writer = writer;
  state.updatedAt = new Date().toISOString();
  delete state.contentHash;
  state.contentHash = sha256(canonicalJson(state));
  const bytes = `${JSON.stringify(state, null, 2)}\n`;
  if (Buffer.byteLength(bytes) > CHECKPOINT.maxActiveBytes) {
    throw new FlowStateError(`active checkpoint exceeds ${CHECKPOINT.maxActiveBytes} bytes`);
  }
  return { state, bytes, digest: sha256(bytes) };
}

function fsyncDirectory(directory) {
  const fd = fs.openSync(directory, 'r');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}

function atomicWrite(file, content, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`);
  const fd = fs.openSync(temp, 'wx', mode);
  try {
    fs.writeFileSync(fd, content);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(temp, file);
  fsyncDirectory(path.dirname(file));
}

function withLock(paths, operation) {
  fs.mkdirSync(paths.base, { recursive: true, mode: 0o700 });
  try {
    fs.mkdirSync(paths.lock, { mode: 0o700 });
  } catch (error) {
    if (error.code === 'EEXIST') throw new FlowStateError(`checkpoint update is locked: ${paths.lock}`);
    throw error;
  }
  try { return operation(); } finally { fs.rmdirSync(paths.lock); }
}

function ledgerTailHash(file) {
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) return null;
  const rows = fs.readFileSync(file, 'utf8').trim().split('\n');
  return JSON.parse(rows.at(-1)).eventHash;
}

function prepareLedgerEvent(paths, type, writer, state, details = {}) {
  const event = {
    schemaVersion: SCHEMAS.schemaVersion,
    type,
    writer,
    timestamp: new Date().toISOString(),
    stateHash: state.contentHash,
    previousEventHash: ledgerTailHash(paths.ledger),
    details,
  };
  event.eventHash = sha256(canonicalJson(event));
  const line = `${JSON.stringify(event)}\n`;
  const currentSize = fs.existsSync(paths.ledger) ? fs.statSync(paths.ledger).size : 0;
  if (currentSize + Buffer.byteLength(line) > CHECKPOINT.maxLedgerBytes) {
    throw new FlowStateError(`event ledger is full at ${CHECKPOINT.maxLedgerBytes} bytes; archive the run before continuing`);
  }
  return line;
}

function appendLedger(paths, line) {
  const fd = fs.openSync(paths.ledger, 'a', 0o600);
  try { fs.writeSync(fd, line); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}

function writePair(paths, serialized) {
  atomicWrite(paths.active, serialized.bytes);
  atomicWrite(paths.sidecar, `${serialized.digest}  active.json\n`);
}

function defaults(input, rootTaskId) {
  return {
    constraints: [],
    canonicalPlanPaths: [],
    referencedArtifacts: [],
    completedRuns: [],
    dependencies: [],
    files: { ownedChanged: [], evidence: [] },
    validations: [],
    blocker: null,
    externalState: {},
    retryBudget: 0,
    ...input,
    ids: { children: [], mappings: {}, ...(input.ids || {}), rootTaskId },
    versions: { behavior: '1', scoring: '1', ...(input.versions || {}) },
    files: { ownedChanged: [], evidence: [], ...(input.files || {}) },
  };
}

export function initCheckpoint({ rootTaskId, input, writer = 'agent-flow-checkpoint', projectRoot = PROJECT_ROOT }) {
  const paths = checkpointPaths(rootTaskId, projectRoot);
  if (fs.existsSync(paths.active)) throw new FlowStateError(`checkpoint already exists: ${paths.active}`);
  return withLock(paths, () => {
    const serialized = serializeState(defaults(input, rootTaskId), writer);
    const errors = validateStateShape(serialized.state);
    if (errors.length) throw new FlowStateError('checkpoint init validation failed', errors);
    const ledgerLine = prepareLedgerEvent(paths, 'init', writer, serialized.state);
    const recovery = {
      schemaVersion: SCHEMAS.schemaVersion,
      frozenAt: serialized.state.updatedAt,
      rootTaskId,
      checkpoint: paths.active,
      repos: serialized.state.repos,
      canonicalPlanPaths: serialized.state.canonicalPlanPaths,
    };
    atomicWrite(paths.recovery, `${JSON.stringify(recovery, null, 2)}\n`);
    writePair(paths, serialized);
    appendLedger(paths, ledgerLine);
    return { state: serialized.state, paths };
  });
}

function deepMerge(base, patch) {
  if (!isRecord(base) || !isRecord(patch)) return structuredClone(patch);
  const output = structuredClone(base);
  for (const [key, value] of Object.entries(patch)) output[key] = isRecord(value) && isRecord(output[key]) ? deepMerge(output[key], value) : structuredClone(value);
  return output;
}

export function readCheckpoint({ rootTaskId, projectRoot = PROJECT_ROOT, checkEnvironment = true, allowLocked = false }) {
  const paths = checkpointPaths(rootTaskId, projectRoot);
  const recoveryHint = `recovery manifest: ${paths.recovery}`;
  if (!allowLocked && fs.existsSync(paths.lock)) throw new FlowStateError(`checkpoint update is in progress; fail closed; ${recoveryHint}`);
  if (!fs.existsSync(paths.active) || !fs.existsSync(paths.sidecar) || !fs.existsSync(paths.recovery)) {
    throw new FlowStateError(`checkpoint, SHA-256 sidecar, or recovery manifest is missing; ${recoveryHint}`);
  }
  if (fs.statSync(paths.active).size > CHECKPOINT.maxActiveBytes) throw new FlowStateError(`active checkpoint exceeds ${CHECKPOINT.maxActiveBytes} bytes; ${recoveryHint}`);
  const bytes = fs.readFileSync(paths.active, 'utf8');
  const expected = fs.readFileSync(paths.sidecar, 'utf8').trim().split(/\s+/)[0];
  if (!/^[0-9a-f]{64}$/.test(expected) || sha256(bytes) !== expected) throw new FlowStateError(`checkpoint SHA-256 sidecar mismatch; ${recoveryHint}`);
  let state;
  try { state = JSON.parse(bytes); } catch (error) { throw new FlowStateError(`checkpoint JSON is corrupt: ${error.message}; ${recoveryHint}`); }
  const legacyCompletedChildIds = new Set((state.ids?.children || [])
    .filter((child) => child.disposition === 'completed' && !Object.hasOwn(child, 'completionReceipt'))
    .map((child) => child.id));
  const errors = validateStateShape(state, { checkEnvironment, legacyCompletedChildIds });
  if (errors.length) throw new FlowStateError(`checkpoint validation failed; ${recoveryHint}`, errors);
  let ledger;
  try { ledger = validateLedger(paths.ledger); } catch (error) {
    throw new FlowStateError(`${error.message}; ${recoveryHint}`, error.details || []);
  }
  if (ledger.stateHash !== state.contentHash) throw new FlowStateError(`event ledger does not describe active checkpoint; ${recoveryHint}`);
  return { state, paths, bytes };
}

export function updateCheckpoint({ rootTaskId, patch, writer = 'agent-flow-checkpoint', eventType = 'update', projectRoot = PROJECT_ROOT }) {
  const paths = checkpointPaths(rootTaskId, projectRoot);
  return withLock(paths, () => {
    const current = readCheckpoint({ rootTaskId, projectRoot, allowLocked: true, checkEnvironment: false });
    const merged = deepMerge(current.state, patch);
    if (merged.ids?.rootTaskId !== rootTaskId) throw new FlowStateError('update cannot change ids.rootTaskId');
    const previousRepos = new Map((current.state.repos || []).map((repo) => [path.resolve(repo.path), repo]));
    for (const repo of merged.repos || []) {
      const repoRoot = path.resolve(repo.path);
      const previous = previousRepos.get(repoRoot);
      const actual = gitHead(repoRoot);
      if (previous && previous.head !== repo.head) {
        if (actual !== repo.head || !gitIsAncestor(repoRoot, previous.head, repo.head)) {
          throw new FlowStateError(`repo head advance is not a verified fast-forward for ${repoRoot}: ${previous.head} -> ${repo.head}`);
        }
      }
    }
    const legacyCompletedChildIds = new Set((current.state.ids?.children || [])
      .filter((child) => child.disposition === 'completed' && !Object.hasOwn(child, 'completionReceipt'))
      .map((child) => child.id));
    const serialized = serializeState(merged, writer);
    const errors = validateStateShape(serialized.state, { legacyCompletedChildIds });
    if (errors.length) throw new FlowStateError('checkpoint update validation failed', errors);
    const ledgerLine = prepareLedgerEvent(paths, eventType, writer, serialized.state, { patchedFields: Object.keys(patch).sort() });
    writePair(paths, serialized);
    appendLedger(paths, ledgerLine);
    return { state: serialized.state, paths };
  });
}

export function validateLedger(file) {
  if (!fs.existsSync(file)) throw new FlowStateError(`event ledger is missing: ${file}`);
  if (fs.statSync(file).size > CHECKPOINT.maxLedgerBytes) throw new FlowStateError(`event ledger exceeds ${CHECKPOINT.maxLedgerBytes} bytes`);
  let previous = null;
  let stateHash = null;
  const rows = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  if (rows.length === 0) throw new FlowStateError('event ledger is empty');
  for (const [index, row] of rows.entries()) {
    let event;
    try { event = JSON.parse(row); } catch { throw new FlowStateError(`event ledger row ${index + 1} is corrupt`); }
    const hash = event.eventHash;
    delete event.eventHash;
    if (event.previousEventHash !== previous || sha256(canonicalJson(event)) !== hash) throw new FlowStateError(`event ledger hash chain breaks at row ${index + 1}`);
    previous = hash;
    stateHash = event.stateHash;
  }
  return { rows: rows.length, tailHash: previous, stateHash };
}

export function resumeCheckpoint(options) {
  const { state, paths } = readCheckpoint(options);
  const summary = {
    schemaVersion: SCHEMAS.schemaVersion,
    status: 'ready_to_resume',
    rootTaskId: state.ids.rootTaskId,
    objective: state.objective,
    phase: state.phase,
    workstream: state.workstream,
    blocker: state.blocker,
    repoHeads: state.repos.map((repo) => ({ path: repo.path, head: repo.head })),
    dependencies: state.dependencies.map(({ id, disposition }) => ({ id, disposition })),
    children: state.ids.children.map(({ id, taskId, disposition }) => ({ id, taskId, disposition })),
    latestValidations: state.validations.slice(-10),
    nextActions: state.nextActions,
    checkpoint: paths.active,
    recoveryManifest: paths.recovery,
  };
  const output = `${JSON.stringify(summary)}\n`;
  if (Buffer.byteLength(output) > CHECKPOINT.maxActiveBytes) throw new FlowStateError('resume summary exceeds checkpoint read budget');
  return { summary, output };
}

function parseArgs(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) result._.push(arg);
    else {
      const key = arg.slice(2);
      const next = argv[index + 1];
      if (next && !next.startsWith('--')) { result[key] = next; index += 1; } else result[key] = true;
    }
  }
  return result;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
}

function usage() {
  return 'Usage: agent-flow-checkpoint.mjs <init|update|validate|resume> --id <root-task-id> [--input file] [--writer name]';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const rootTaskId = args.id || args['root-task-id'];
  const inputFile = args.input || args.state || args.patch;
  const projectRoot = args['project-root'] ? path.resolve(args['project-root']) : PROJECT_ROOT;
  if (!command || !rootTaskId) throw new FlowStateError(usage());
  if (command === 'init') {
    if (!inputFile) throw new FlowStateError('init requires --input');
    const result = initCheckpoint({ rootTaskId, input: readJson(inputFile), writer: args.writer, projectRoot });
    process.stdout.write(`${JSON.stringify({ ok: true, checkpoint: result.paths.active, contentHash: result.state.contentHash })}\n`);
  } else if (command === 'update') {
    if (!inputFile) throw new FlowStateError('update requires --input');
    const result = updateCheckpoint({ rootTaskId, patch: readJson(inputFile), writer: args.writer, eventType: args.event || 'update', projectRoot });
    process.stdout.write(`${JSON.stringify({ ok: true, checkpoint: result.paths.active, contentHash: result.state.contentHash })}\n`);
  } else if (command === 'validate') {
    const result = readCheckpoint({ rootTaskId, projectRoot });
    process.stdout.write(`${JSON.stringify({ ok: true, checkpoint: result.paths.active, contentHash: result.state.contentHash })}\n`);
  } else if (command === 'resume') {
    process.stdout.write(resumeCheckpoint({ rootTaskId, projectRoot }).output);
  } else throw new FlowStateError(usage());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ ok: false, error: error.message, details: error.details || [] })}\n`);
    process.exitCode = error instanceof FlowStateError ? 2 : 1;
  });
}
