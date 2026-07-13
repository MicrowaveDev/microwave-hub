#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMAS = JSON.parse(fs.readFileSync(path.join(HERE, 'agent-flow-schemas.json'), 'utf8'));
const PACKET = SCHEMAS.workPacket;
const HANDOFF = SCHEMAS.handoff;

export class PacketError extends Error {
  constructor(message, details = [], disposition = 'invalid') {
    super(message);
    this.name = 'PacketError';
    this.details = details;
    this.disposition = disposition;
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
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
  if (mustExist && !fs.existsSync(absolute)) errors.push(`${label} does not exist: ${absolute}`);
  if (fs.existsSync(absolute)) {
    try {
      if (!inside(fs.realpathSync(root), fs.realpathSync(absolute))) errors.push(`${label} resolves outside repo root: ${candidate}`);
    } catch (error) {
      errors.push(`${label} cannot be resolved: ${error.message}`);
    }
  }
  return absolute;
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

function gitIgnores(repoRoot, candidate) {
  try {
    execFileSync('git', ['-C', repoRoot, 'check-ignore', '-q', '--', path.relative(repoRoot, candidate)], {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function packetHash(packet) {
  const copy = structuredClone(packet);
  delete copy.packetHash;
  return sha256(canonicalJson(copy));
}

function normalizePathList(values) {
  return [...new Set(values.map((value) => value.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '')))];
}

function matchesOwnedPath(candidate, allowed) {
  const normalized = candidate.replaceAll('\\', '/').replace(/^\.\//, '');
  return allowed.some((entry) => normalized === entry || normalized.startsWith(`${entry}/`));
}

function matchesForbiddenPath(candidate, forbidden) {
  const normalized = candidate.replaceAll('\\', '/').replace(/^\.\//, '');
  return forbidden.some((entry) => normalized === entry || normalized.startsWith(`${entry}/`));
}

export function generatePacket(input, writer = 'agent-work-packet') {
  const packet = structuredClone(input);
  packet.schemaVersion = SCHEMAS.schemaVersion;
  packet.writer = writer;
  packet.generatedAt = new Date().toISOString();
  packet.allowedPaths = normalizePathList(packet.allowedPaths || []);
  packet.forbiddenPaths = normalizePathList(packet.forbiddenPaths || []);
  packet.dependencies ||= [];
  packet.interfaces ||= [];
  packet.planAnchors ||= [];
  packet.acceptanceCriteria ||= [];
  packet.validations = { required: [], optional: [], ...(packet.validations || {}) };
  packet.budget = { ...PACKET.defaultBudget, ...(packet.budget || {}) };
  packet.stopConditions ||= [];
  packet.handoffSchemaVersion ||= SCHEMAS.schemaVersion;
  packet.packetHash = packetHash(packet);
  const errors = validatePacketShape(packet);
  if (errors.length) throw new PacketError('work packet generation failed', errors);
  const bytes = `${JSON.stringify(packet, null, 2)}\n`;
  if (Buffer.byteLength(bytes) > PACKET.maxPacketBytes) throw new PacketError(`work packet exceeds ${PACKET.maxPacketBytes} bytes`);
  return { packet, bytes };
}

export function validatePacketShape(packet) {
  const errors = [];
  assert(isRecord(packet), 'packet must be a JSON object', errors);
  if (!isRecord(packet)) return errors;
  for (const field of PACKET.required) assert(Object.hasOwn(packet, field), `missing work packet field: ${field}`, errors);
  assert(packet.schemaVersion === SCHEMAS.schemaVersion, `unsupported schemaVersion: ${packet.schemaVersion}`, errors);
  for (const field of ['taskId', 'runId', 'lane', 'sliceId', 'priority', 'repoRoot', 'baseRevision', 'artifactDirectory', 'nextMergeBarrier', 'writer', 'generatedAt']) {
    assert(typeof packet[field] === 'string' && packet[field].length > 0, `${field} must be non-empty`, errors);
  }
  assert(path.isAbsolute(packet.repoRoot || ''), 'repoRoot must be absolute', errors);
  assert(/^[0-9a-f]{40,64}$/.test(packet.baseRevision || ''), 'baseRevision must be a full Git revision', errors);
  assert(Array.isArray(packet.allowedPaths) && packet.allowedPaths.length > 0, 'allowedPaths must be a non-empty array', errors);
  assert(Array.isArray(packet.forbiddenPaths), 'forbiddenPaths must be an array', errors);
  for (const item of [...(packet.allowedPaths || []), ...(packet.forbiddenPaths || [])]) {
    assert(typeof item === 'string' && item.length > 0 && !path.isAbsolute(item), `ownership path must be non-empty and repo-relative: ${item}`, errors);
    if (packet.repoRoot && typeof item === 'string') resolveContained(path.resolve(packet.repoRoot), item, 'ownership path', errors, false);
  }
  assert(Array.isArray(packet.dependencies), 'dependencies must be an array', errors);
  for (const item of packet.dependencies || []) assert(typeof item.id === 'string' && typeof item.disposition === 'string', 'dependencies require id and disposition', errors);
  assert(Array.isArray(packet.interfaces), 'interfaces must be an array', errors);
  for (const item of packet.interfaces || []) assert(typeof item.id === 'string' && typeof item.path === 'string' && /^[0-9a-f]{64}$/.test(item.sha256 || ''), 'interfaces require id, path, and sha256', errors);
  assert(Array.isArray(packet.planAnchors), 'planAnchors must be an array', errors);
  assert(Array.isArray(packet.acceptanceCriteria) && packet.acceptanceCriteria.length > 0, 'acceptanceCriteria must be non-empty', errors);
  assert(isRecord(packet.validations) && Array.isArray(packet.validations.required) && packet.validations.required.length > 0 && Array.isArray(packet.validations.optional), 'validations must include non-empty required and optional arrays', errors);
  assert(isRecord(packet.budget), 'budget must be an object', errors);
  for (const [key, ceiling] of Object.entries(PACKET.defaultBudget)) assert(Number.isInteger(packet.budget?.[key]) && packet.budget[key] > 0 && packet.budget[key] <= ceiling, `budget.${key} must be between 1 and ${ceiling}`, errors);
  assert(Array.isArray(packet.stopConditions) && packet.stopConditions.length > 0, 'stopConditions must be non-empty', errors);
  assert(packet.handoffSchemaVersion === SCHEMAS.schemaVersion, 'handoffSchemaVersion is unsupported', errors);
  assert(packet.packetHash === packetHash(packet), 'packetHash mismatch', errors);
  assert(Buffer.byteLength(`${JSON.stringify(packet, null, 2)}\n`) <= PACKET.maxPacketBytes, `work packet exceeds ${PACKET.maxPacketBytes} bytes`, errors);
  return errors;
}

export function validatePacketEnvironment(packet) {
  const shapeErrors = validatePacketShape(packet);
  if (shapeErrors.length) throw new PacketError('work packet is invalid', shapeErrors);
  const drift = [];
  const repoRoot = path.resolve(packet.repoRoot);
  assert(fs.existsSync(repoRoot), `repoRoot does not exist: ${repoRoot}`, drift);
  if (!fs.existsSync(repoRoot)) throw new PacketError('work packet blocked by interface drift', drift, 'blocked_interface_drift');
  const head = gitHead(repoRoot);
  assert(head === packet.baseRevision, `base revision drift: expected ${packet.baseRevision}, found ${head || 'unavailable'}`, drift);
  for (const dependency of packet.dependencies) {
    assert(PACKET.acceptedDependencyDispositions.includes(dependency.disposition), `dependency ${dependency.id} is ${dependency.disposition}`, drift);
    if (dependency.revision && dependency.repoRoot) {
      const dependencyRoot = path.resolve(dependency.repoRoot);
      assert(fs.existsSync(dependencyRoot), `dependency repo does not exist: ${dependencyRoot}`, drift);
      if (fs.existsSync(dependencyRoot)) assert(gitHead(dependencyRoot) === dependency.revision, `dependency revision drift: ${dependency.id}`, drift);
    }
  }
  for (const item of packet.interfaces) {
    const absolute = resolveContained(repoRoot, item.path, `interface ${item.id}`, drift, true);
    if (absolute && fs.existsSync(absolute)) {
      assert(fs.statSync(absolute).isFile(), `interface is not a file: ${item.id}`, drift);
      if (fs.statSync(absolute).isFile()) assert(sha256(fs.readFileSync(absolute)) === item.sha256, `interface hash drift: ${item.id}`, drift);
    }
  }
  const artifactDirectory = resolveContained(repoRoot, packet.artifactDirectory, 'artifactDirectory', drift, false);
  const ignoredArtifactRoot = path.join(repoRoot, 'temp', 'context-efficiency-implementation');
  assert(Boolean(artifactDirectory) && inside(ignoredArtifactRoot, artifactDirectory), `artifactDirectory must be under ${ignoredArtifactRoot}`, drift);
  if (artifactDirectory) assert(gitIgnores(repoRoot, artifactDirectory), 'artifactDirectory must be ignored by Git', drift);
  if (drift.length) throw new PacketError('work packet blocked by interface drift', drift, 'blocked_interface_drift');
  return { ok: true, disposition: 'ready', head, packetHash: packet.packetHash };
}

function atomicWrite(file, content) {
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temp = path.join(directory, `.${path.basename(file)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`);
  const fd = fs.openSync(temp, 'wx', 0o600);
  try { fs.writeFileSync(fd, content); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temp, file);
}

export function writePacket(input, { output, writer } = {}) {
  const generated = generatePacket(input, writer);
  validatePacketEnvironment(generated.packet);
  const artifactRoot = path.resolve(input.repoRoot, input.artifactDirectory);
  const target = output ? path.resolve(output) : path.join(artifactRoot, 'assignments', `${input.lane}-${input.sliceId}.json`);
  if (!inside(artifactRoot, target)) throw new PacketError(`output must stay inside artifactDirectory: ${target}`);
  atomicWrite(target, generated.bytes);
  return { ...generated, output: target };
}

export function validateHandoff(packet, handoff, rawText = `${JSON.stringify(handoff, null, 2)}\n`) {
  validatePacketEnvironment(packet);
  const errors = [];
  assert(isRecord(handoff), 'handoff must be a JSON object', errors);
  if (!isRecord(handoff)) throw new PacketError('handoff validation failed', errors);
  for (const field of HANDOFF.required) assert(Object.hasOwn(handoff, field), `missing handoff field: ${field}`, errors);
  assert(handoff.schemaVersion === packet.handoffSchemaVersion, 'handoff schemaVersion does not match packet', errors);
  assert(handoff.baseRevision === packet.baseRevision, 'handoff baseRevision does not match packet', errors);
  assert(typeof handoff.dirtyState === 'string', 'dirtyState must be a string', errors);
  assert(typeof handoff.scopeCompleted === 'string' && handoff.scopeCompleted.length > 0, 'scopeCompleted must be non-empty', errors);
  assert(Array.isArray(handoff.changedFiles), 'changedFiles must be an array', errors);
  for (const changed of handoff.changedFiles || []) {
    assert(typeof changed === 'string' && !path.isAbsolute(changed), `changed file must be repo-relative: ${changed}`, errors);
    if (typeof changed === 'string') {
      resolveContained(path.resolve(packet.repoRoot), changed, 'changed file', errors, false);
      assert(matchesOwnedPath(changed, packet.allowedPaths), `changed file is outside allowedPaths: ${changed}`, errors);
      assert(!matchesForbiddenPath(changed, packet.forbiddenPaths), `changed file is forbidden: ${changed}`, errors);
    }
  }
  assert(handoff.changedPathAllowlistPassed === true, 'changedPathAllowlistPassed must be true', errors);
  assert(typeof handoff.diffstat === 'string' && handoff.diffstat.length > 0, 'diffstat must be non-empty', errors);
  assert(isRecord(handoff.verdict) || typeof handoff.verdict === 'string', 'verdict must be a string or object', errors);
  assert(Array.isArray(handoff.validations), 'validations must be an array', errors);
  for (const required of packet.validations.required) assert(handoff.validations.some((item) => item.command === required && item.status === 'passed'), `required validation did not pass: ${required}`, errors);
  assert(Array.isArray(handoff.skippedTests), 'skippedTests must be an array', errors);
  assert(Array.isArray(handoff.decisions), 'decisions must be an array', errors);
  assert(Array.isArray(handoff.artifacts), 'artifacts must be an array', errors);
  for (const artifact of handoff.artifacts || []) resolveContained(path.resolve(packet.repoRoot), artifact, 'handoff artifact', errors, true);
  assert(HANDOFF.dispositions.includes(handoff.disposition), `unsupported handoff disposition: ${handoff.disposition}`, errors);
  assert(typeof handoff.nextAction === 'string' && handoff.nextAction.length > 0, 'nextAction must be non-empty', errors);
  assert(handoff.commitSha === null || /^[0-9a-f]{40,64}$/.test(handoff.commitSha || ''), 'commitSha must be null or a full revision', errors);
  assert(Array.isArray(handoff.acceptanceResults) && handoff.acceptanceResults.length === packet.acceptanceCriteria.length, 'acceptanceResults must map every acceptance criterion', errors);
  for (const [index, criterion] of packet.acceptanceCriteria.entries()) {
    const result = handoff.acceptanceResults?.[index];
    assert(result?.criterion === criterion && ['passed', 'failed'].includes(result?.status), `acceptanceResults[${index}] must map its criterion with passed or failed`, errors);
  }
  assert(handoff.blocker === undefined || handoff.blocker === null || isRecord(handoff.blocker), 'blocker must be null or an object', errors);
  if (handoff.disposition === 'completed') assert(handoff.blocker === undefined || handoff.blocker === null, 'completed handoff cannot retain a blocker', errors);
  if (handoff.disposition === 'blocked_interface_drift') assert(isRecord(handoff.blocker), 'blocked_interface_drift requires a structured blocker', errors);
  const lines = rawText === '' ? 0 : rawText.split(/\r?\n/).length - (rawText.endsWith('\n') ? 1 : 0);
  const estimatedTokens = Math.ceil(Buffer.byteLength(rawText) / 4);
  const maxLines = Math.min(HANDOFF.maxLines, packet.budget.handoffLines);
  const maxTokens = Math.min(HANDOFF.maxEstimatedTokens, packet.budget.handoffEstimatedTokens);
  assert(lines <= maxLines, `handoff exceeds ${maxLines} lines: ${lines}`, errors);
  assert(estimatedTokens <= maxTokens, `handoff exceeds ${maxTokens} estimated tokens: ${estimatedTokens}`, errors);
  if (errors.length) throw new PacketError('handoff validation failed', errors, handoff.disposition === 'blocked_interface_drift' ? handoff.disposition : 'invalid');
  return { ok: true, disposition: handoff.disposition, lines, estimatedTokens };
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
  const raw = fs.readFileSync(path.resolve(file), 'utf8');
  return { value: JSON.parse(raw), raw };
}

function usage() {
  return 'Usage: agent-work-packet.mjs <generate|validate|validate-handoff> --input <file> [--output file] [--packet file]';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  if (command === 'generate') {
    if (!args.input) throw new PacketError('generate requires --input');
    const result = writePacket(readJson(args.input).value, { output: args.output, writer: args.writer });
    process.stdout.write(`${JSON.stringify({ ok: true, packet: result.output, packetHash: result.packet.packetHash })}\n`);
  } else if (command === 'validate') {
    const file = args.packet || args.input;
    if (!file) throw new PacketError('validate requires --packet or --input');
    const packet = readJson(file).value;
    const result = validatePacketEnvironment(packet);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } else if (command === 'validate-handoff') {
    if (!args.packet || !args.input) throw new PacketError('validate-handoff requires --packet and --input');
    const packet = readJson(args.packet).value;
    const handoff = readJson(args.input);
    process.stdout.write(`${JSON.stringify(validateHandoff(packet, handoff.value, handoff.raw))}\n`);
  } else throw new PacketError(usage());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ ok: false, disposition: error.disposition || 'invalid', error: error.message, details: error.details || [] })}\n`);
    process.exitCode = error.disposition === 'blocked_interface_drift' ? 3 : error instanceof PacketError ? 2 : 1;
  });
}
