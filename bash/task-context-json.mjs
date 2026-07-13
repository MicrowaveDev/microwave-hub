#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'submodules.manifest.json'), 'utf8'));

function git(repo, args) {
  try {
    return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function repoConfig(alias) {
  if (alias === 'hub') return { name: 'hub', path: root, ...manifest.hub };
  const entry = manifest.submodules.find((repo) => repo.name === alias || repo.path === alias);
  if (!entry) throw new Error(`Unknown repo: ${alias}`);
  return { ...entry, path: path.join(root, entry.path) };
}

function instructionFor(repoPath) {
  const candidates = ['AGENTS.md', 'CLAUDE.md'];
  const name = candidates.find((candidate) => fs.existsSync(path.join(repoPath, candidate)));
  if (!name) return null;
  const absolutePath = path.join(repoPath, name);
  const content = fs.readFileSync(absolutePath, 'utf8');
  return {
    path: absolutePath,
    bytes: Buffer.byteLength(content),
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
    complete: true,
    content,
  };
}

function contextFor(alias) {
  const config = repoConfig(alias);
  const instruction = instructionFor(config.path);
  const porcelain = git(config.path, ['status', '--porcelain']);
  return {
    name: config.name,
    path: config.path,
    branch: git(config.path, ['rev-parse', '--abbrev-ref', 'HEAD']),
    head: git(config.path, ['rev-parse', 'HEAD']),
    dirty: Boolean(porcelain),
    baseBranch: config.defaultBranch || config.baseBranch || null,
    installCommand: config.installCommand || null,
    quickVerifyCommand: config.quickVerifyCommand || null,
    fullVerifyCommand: config.fullVerifyCommand || null,
    instructionsLoaded: instruction ? [instruction.path] : [],
    workflowLoaded: Boolean(instruction),
    instruction,
  };
}

const aliases = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const targets = (aliases.length ? aliases : ['hub']).map(contextFor);
const payload = {
  schemaVersion: 1,
  complete: true,
  truncated: false,
  generatedAt: new Date().toISOString(),
  hub: {
    path: root,
    head: git(root, ['rev-parse', 'HEAD']),
    dirty: Boolean(git(root, ['status', '--porcelain'])),
  },
  targets,
  omittedSections: [],
};

process.stdout.write(`${JSON.stringify(payload)}\n`);
