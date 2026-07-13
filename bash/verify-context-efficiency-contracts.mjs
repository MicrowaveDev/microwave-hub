#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'bash/context-efficiency-regression-contracts.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const errors = [];

if (manifest.schemaVersion !== 1) errors.push('schemaVersion must be 1');
if (!Array.isArray(manifest.fixtures) || manifest.fixtures.length === 0) errors.push('fixtures must be non-empty');
const ids = new Set();
for (const fixture of manifest.fixtures || []) {
  if (ids.has(fixture.id)) errors.push(`duplicate fixture id: ${fixture.id}`);
  ids.add(fixture.id);
  if (!['P0', 'P1'].includes(fixture.priority)) errors.push(`fixture ${fixture.id} must be P0 or P1`);
  const evidence = path.resolve(root, fixture.evidenceFile || '');
  if (!evidence.startsWith(`${root}${path.sep}`) || !fs.existsSync(evidence)) {
    errors.push(`fixture ${fixture.id} evidence file is missing`);
    continue;
  }
  if (!fs.readFileSync(evidence, 'utf8').includes(fixture.evidencePattern || '')) errors.push(`fixture ${fixture.id} evidence pattern is missing`);
}

const commands = new Set();
for (const contract of manifest.publicOutputContracts || []) {
  if (commands.has(contract.command)) errors.push(`duplicate output contract: ${contract.command}`);
  commands.add(contract.command);
  if (!Object.hasOwn(packageJson.scripts || {}, contract.command)) errors.push(`output contract command is not a package script: ${contract.command}`);
  const bounded = Number.isFinite(contract.maxEstimatedTokens) && contract.maxEstimatedTokens > 0 && contract.maxEstimatedTokens <= 5000;
  const justifiedRaw = contract.maxEstimatedTokens === null && typeof contract.rawModeReason === 'string' && contract.rawModeReason.length >= 40;
  if (!bounded && !justifiedRaw) errors.push(`output contract ${contract.command} must be at most 5000 tokens or document an explicit raw-mode reason`);
}

if (errors.length) {
  errors.forEach((error) => console.error(`ERROR: ${error}`));
  process.exit(1);
}

process.stdout.write(`${JSON.stringify({
  schemaVersion: 1,
  valid: true,
  p0Fixtures: manifest.fixtures.filter((fixture) => fixture.priority === 'P0').length,
  p1Fixtures: manifest.fixtures.filter((fixture) => fixture.priority === 'P1').length,
  publicOutputContracts: manifest.publicOutputContracts.length,
})}\n`);
