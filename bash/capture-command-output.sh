#!/usr/bin/env bash
set -euo pipefail

umask 077
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
exec node "$script_dir/capture-command-output.mjs" "$@"
