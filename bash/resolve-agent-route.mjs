#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const contracts = JSON.parse(fs.readFileSync(path.join(here, 'agent-route-contracts.json'), 'utf8'));

function normalize(value) {
  return String(value).toLocaleLowerCase('en-US').replace(/\s+/g, ' ').trim();
}

export function resolveRoute(prompt) {
  const normalizedPrompt = normalize(prompt);
  for (const route of contracts.routes) {
    const matchedTrigger = route.triggers.find((trigger) => normalizedPrompt.includes(normalize(trigger)));
    if (matchedTrigger) {
      return {
        schemaVersion: contracts.schemaVersion,
        matched: true,
        matchedTrigger,
        ...route,
      };
    }
  }
  return { schemaVersion: contracts.schemaVersion, matched: false };
}

function parsePrompt(argv) {
  const promptIndex = argv.indexOf('--prompt');
  if (promptIndex >= 0) return argv[promptIndex + 1] || '';
  return argv.filter((arg) => arg !== '--json').join(' ');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const prompt = parsePrompt(process.argv.slice(2));
  if (!prompt) {
    console.error('Usage: resolve-agent-route.mjs --prompt <text> [--json]');
    process.exit(2);
  }
  const result = resolveRoute(prompt);
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } else if (result.matched) {
    process.stdout.write(`${result.firstCommand}\n`);
  } else {
    process.stdout.write('no-exact-route\n');
  }
}
