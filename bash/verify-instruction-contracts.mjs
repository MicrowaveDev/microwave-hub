#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contracts = JSON.parse(fs.readFileSync(path.join(root, 'bash/agent-route-contracts.json'), 'utf8'));
const agentsPath = path.join(root, 'AGENTS.md');
const agentsText = fs.readFileSync(agentsPath, 'utf8');
const portableText = fs.readFileSync(path.join(root, 'portable-agent-instructions.md'), 'utf8');
const gitWorkflowText = fs.readFileSync(path.join(root, 'docs/agent-playbook/hub-git-workflow.md'), 'utf8');
const errors = [];
const instructionBytes = Buffer.byteLength(agentsText);

if (instructionBytes > contracts.instructionByteLimit) {
  errors.push(`AGENTS.md is ${instructionBytes} bytes; limit is ${contracts.instructionByteLimit}`);
}

for (const route of contracts.routes) {
  for (const trigger of route.triggers) {
    if (!agentsText.includes(trigger)) errors.push(`Missing route trigger ${JSON.stringify(trigger)}`);
  }
  if (!agentsText.includes(route.firstCommand)) {
    errors.push(`Missing first command for ${route.id}: ${route.firstCommand}`);
  }
}

for (const match of agentsText.matchAll(/\[[^\]]+\]\((\/Users\/microwavedev\/workspace\/microwave-hub\/[^)]+)\)/g)) {
  if (!fs.existsSync(match[1])) errors.push(`Broken local instruction link: ${match[1]}`);
}

const mergePolicyContracts = [
  [agentsText, 'Never merge a pull request.', 'AGENTS.md'],
  [portableText, '**Never merge a pull request.**', 'portable-agent-instructions.md'],
  [gitWorkflowText, 'Agents must never merge pull requests', 'docs/agent-playbook/hub-git-workflow.md'],
];
for (const [text, requiredText, file] of mergePolicyContracts) {
  if (!text.includes(requiredText)) errors.push(`Missing user-only PR merge policy in ${file}`);
}

const obsoleteMergeExceptions = [
  'unless the user explicitly asked you to merge',
  'if the user explicitly asked you to merge',
];
for (const phrase of obsoleteMergeExceptions) {
  for (const [text, , file] of mergePolicyContracts) {
    if (text.toLowerCase().includes(phrase)) errors.push(`Obsolete agent merge exception in ${file}: ${phrase}`);
  }
}

if (errors.length) {
  errors.forEach((error) => console.error(`ERROR: ${error}`));
  process.exit(1);
}

process.stdout.write(`${JSON.stringify({
  schemaVersion: 1,
  valid: true,
  instructionBytes,
  instructionByteLimit: contracts.instructionByteLimit,
  routeCount: contracts.routes.length,
  userOnlyPrMergePolicy: true,
})}\n`);
