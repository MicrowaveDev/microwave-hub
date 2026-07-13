#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contracts = JSON.parse(fs.readFileSync(path.join(root, 'bash/agent-route-contracts.json'), 'utf8'));
const agentsPath = path.join(root, 'AGENTS.md');
const agentsText = fs.readFileSync(agentsPath, 'utf8');
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
})}\n`);
