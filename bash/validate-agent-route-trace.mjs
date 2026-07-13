#!/usr/bin/env node

import fs from 'node:fs';
import { resolveRoute } from './resolve-agent-route.mjs';

function actionText(action) {
  if (typeof action === 'string') return action;
  return [action?.command, action?.path, action?.tool, action?.input].filter(Boolean).join(' ');
}

export function validateTrace(trace) {
  const route = resolveRoute(trace?.prompt || '');
  if (!route.matched) {
    return { schemaVersion: 1, valid: true, routed: false, violations: [] };
  }

  const actions = Array.isArray(trace.actions) ? trace.actions.map(actionText) : [];
  const firstRouteIndex = actions.findIndex((action) => action.includes(route.firstCommand));
  const violations = [];
  if (firstRouteIndex !== 0) {
    violations.push({
      code: 'required_first_action_missing',
      expected: route.firstCommand,
      actual: actions[0] || null,
    });
  }

  const preRouteActions = firstRouteIndex < 0 ? actions : actions.slice(0, firstRouteIndex);
  for (const action of preRouteActions) {
    for (const forbidden of route.forbiddenBeforeRoute) {
      if (action.includes(forbidden)) {
        violations.push({ code: 'forbidden_pre_route_probe', probe: forbidden });
      }
    }
  }

  return {
    schemaVersion: 1,
    valid: violations.length === 0,
    routed: true,
    routeId: route.id,
    expectedFirstCommand: route.firstCommand,
    violations,
  };
}

function readInput(argv) {
  const inputIndex = argv.indexOf('--input');
  if (inputIndex >= 0) return fs.readFileSync(argv[inputIndex + 1], 'utf8');
  return fs.readFileSync(0, 'utf8');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = validateTrace(JSON.parse(readInput(process.argv.slice(2))));
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (!result.valid) process.exitCode = 1;
  } catch (error) {
    console.error(`Invalid route trace: ${error.message}`);
    process.exit(2);
  }
}
