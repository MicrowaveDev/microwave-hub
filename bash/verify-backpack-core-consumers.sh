#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib.sh"

MUSHROOM_DIR="$HUB_ROOT/mushroom-master"
MEAT_DIR="$HUB_ROOT/meat-master"
MUSHROOM_CORE_DIR="$MUSHROOM_DIR/vendor/backpack-game-core"
MEAT_CORE_DIR="$MEAT_DIR/vendor/backpack-game-core"

run_step() {
  local label="$1"
  local dir="$2"
  shift 2
  echo
  echo "== $label =="
  echo "+ (cd ${dir#$HUB_ROOT/} && $*)"
  (cd "$dir" && "$@")
}

run_shell_step() {
  local label="$1"
  local dir="$2"
  local command="$3"
  echo
  echo "== $label =="
  echo "+ (cd ${dir#$HUB_ROOT/} && $command)"
  (cd "$dir" && bash -lc "$command")
}

for dir in "$MUSHROOM_DIR" "$MEAT_DIR" "$MUSHROOM_CORE_DIR" "$MEAT_CORE_DIR"; do
  if [[ ! -d "$dir/.git" && ! -f "$dir/.git" ]]; then
    echo "Missing Git checkout: $dir" >&2
    exit 1
  fi
done

mushroom_core_sha="$(git -C "$MUSHROOM_CORE_DIR" rev-parse HEAD)"
meat_core_sha="$(git -C "$MEAT_CORE_DIR" rev-parse HEAD)"

echo "Mushroom core: $mushroom_core_sha"
echo "Meat core:     $meat_core_sha"

if [[ "$mushroom_core_sha" != "$meat_core_sha" ]]; then
  echo "Core commit mismatch between Mushroom and Meat consumers." >&2
  exit 1
fi

run_step "Core tests" "$MUSHROOM_CORE_DIR" npm test
run_step "Core package dry-run" "$MUSHROOM_CORE_DIR" npm pack --dry-run

run_step "Mushroom core submodule check" "$MUSHROOM_DIR" npm run game:core:check
run_step "Mushroom production build" "$MUSHROOM_DIR" npm run game:build
run_step "Mushroom game unit tests" "$MUSHROOM_DIR" npm run game:test
run_step "Mushroom screenshot checks" "$MUSHROOM_DIR" npm run game:test:screens

default_mushroom_e2e='npx playwright test --config=tests/game/playwright.config.js tests/game/support-admin-ui.spec.js --reporter=line'
mushroom_e2e_command="${BACKPACK_CORE_MUSHROOM_E2E_COMMAND:-$default_mushroom_e2e}"
if [[ -n "$mushroom_e2e_command" ]]; then
  run_shell_step "Mushroom focused E2E" "$MUSHROOM_DIR" "$mushroom_e2e_command"
fi

run_step "Meat game tests" "$MEAT_DIR" npm run game:test
run_step "Meat browser E2E" "$MEAT_DIR" npm run game:test:browser
run_shell_step "Meat deploy config check" "$MEAT_DIR" "MEAT_MASTER_ENV=production MEAT_MASTER_STORE=sqlite MEAT_MASTER_DB_PATH=.data/verify-deploy.sqlite TELEGRAM_BOT_TOKEN=verify-token MEAT_MASTER_PUBLIC_URL=https://meat.example.test MEAT_MASTER_SUPPORT_TOKEN=verify-support npm run game:deploy:check"
run_step "Meat production build" "$MEAT_DIR" npm run game:build

echo
echo "Backpack core consumer verification passed for $mushroom_core_sha."
