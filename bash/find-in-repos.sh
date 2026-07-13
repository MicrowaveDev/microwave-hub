#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib.sh"

MODE="content"
LIMIT=40
FULL=false
REASON=""

while [[ "${1:-}" == --* ]]; do
  case "$1" in
    --files)
      MODE="files"
      shift
      ;;
    --limit)
      LIMIT="${2:-}"
      shift 2
      ;;
    --full)
      FULL=true
      shift
      ;;
    --reason)
      REASON="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 [--files] [--limit N] [--full --reason TEXT] <pattern> [repo ...]" >&2
  exit 1
fi

if ! [[ "$LIMIT" =~ ^[0-9]+$ ]] || (( LIMIT < 1 || LIMIT > 100 )); then
  echo "--limit must be an integer from 1 to 100" >&2
  exit 1
fi

if [[ "$FULL" == true && ( -z "$REASON" || ${#REASON} -gt 200 || "$REASON" == *$'\n'* ) ]]; then
  echo "--full requires a printable --reason of at most 200 characters" >&2
  exit 1
fi

PATTERN="$1"
shift

TARGETS=()

if [[ $# -eq 0 ]]; then
  TARGETS+=("$HUB_ROOT")
  while read -r path; do
    TARGETS+=("$HUB_ROOT/$path")
  done < <(repo_specs)
else
  for alias in "$@"; do
    TARGETS+=("$(resolve_repo "$alias")")
  done
fi

OUTPUT="$(mktemp -t find-in-repos.XXXXXX)"
trap 'rm -f "$OUTPUT"' EXIT

set +e
if [[ "$MODE" == "content" ]]; then
  rg --no-messages -n "$PATTERN" "${TARGETS[@]}" >"$OUTPUT"
  STATUS=$?
else
  rg --files "${TARGETS[@]}" 2>/dev/null | rg "$PATTERN" >"$OUTPUT"
  STATUS=${PIPESTATUS[1]}
fi
set -e

if (( STATUS > 1 )); then
  echo "Search failed with status $STATUS" >&2
  exit "$STATUS"
fi

LINES="$(wc -l < "$OUTPUT" | tr -d ' ')"
BYTES="$(wc -c < "$OUTPUT" | tr -d ' ')"

if [[ "$FULL" == true ]]; then
  echo "find: mode=$MODE total_lines=$LINES bytes=$BYTES raw=true reason=$REASON"
  cat "$OUTPUT"
  exit 0
fi

SHOWING="$LINES"
if (( SHOWING > LIMIT )); then SHOWING="$LIMIT"; fi
echo "find: mode=$MODE total_lines=$LINES bytes=$BYTES showing=$SHOWING limit=$LIMIT"
LC_ALL=C awk -v limit="$LIMIT" '
  NR > limit { exit }
  {
    if (length($0) > 400) print substr($0, 1, 397) "..."
    else print
  }
' "$OUTPUT"
if (( LINES > LIMIT )); then
  echo "find: omitted=$((LINES - LIMIT)); narrow the repo/pattern or use --full --reason <text>"
fi
