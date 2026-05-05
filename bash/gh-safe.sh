#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  gh-safe.sh check --kind issue|pr [--file FILE | --repo OWNER/REPO --issue N | --repo OWNER/REPO --pr N]
  gh-safe.sh issue create|edit ... --body BODY
  gh-safe.sh issue create|edit ... --body-file FILE
  gh-safe.sh pr create|edit ... --body BODY
  gh-safe.sh pr create|edit ... --body-file FILE

This wrapper validates Markdown bodies before they are sent to GitHub.
It rejects literal escaped newlines such as "\n", which GitHub renders as
broken one-line text instead of sectioned Markdown.
USAGE
}

fail() {
  echo "gh-safe: $*" >&2
  exit 1
}

require_gh() {
  command -v gh >/dev/null 2>&1 || fail "gh is not installed"
}

read_body_file() {
  local file="$1"
  if [[ "$file" == "-" ]]; then
    cat
  else
    [[ -f "$file" ]] || fail "body file not found: $file"
    cat "$file"
  fi
}

body_from_live_github() {
  local repo="$1"
  local item_kind="$2"
  local number="$3"

  require_gh
  case "$item_kind" in
    issue) gh issue view "$number" --repo "$repo" --json body --jq '.body' ;;
    pr) gh pr view "$number" --repo "$repo" --json body --jq '.body' ;;
    *) fail "unknown live body kind: $item_kind" ;;
  esac
}

validate_body() {
  local kind="$1"
  local body="$2"
  local issue_ref_re='#[0-9]+'

  [[ "$kind" == "issue" || "$kind" == "pr" ]] || fail "kind must be issue or pr"
  [[ -n "${body//[[:space:]]/}" ]] || fail "$kind body is empty"

  if [[ "$body" == *'\n'* ]]; then
    fail "$kind body contains literal \\n text; use real newlines and --body-file or ANSI-C quoting"
  fi

  if [[ "$body" == *'\r'* || "$body" == *$'\r'* ]]; then
    fail "$kind body contains escaped or carriage-return line endings"
  fi

  case "$kind" in
    issue)
      [[ "$body" == *"## Source of truth"* ]] || fail "issue body must contain a '## Source of truth' section"
      [[ "$body" == *"## Scope"* ]] || fail "issue body must contain a '## Scope' section"
      [[ "$body" == *"## Verification"* ]] || fail "issue body must contain a '## Verification' section"
      ;;
    pr)
      [[ "$body" == *"Summary"* ]] || fail "PR body must contain a Summary section"
      [[ "$body" == *"Verification"* ]] || fail "PR body must contain a Verification section"
      [[ "$body" =~ $issue_ref_re ]] || fail "PR body must reference the tracking issue, for example 'Closes #123'"
      ;;
  esac
}

run_check() {
  local kind=""
  local file=""
  local repo=""
  local issue=""
  local pr=""

  while (($#)); do
    case "$1" in
      --kind)
        shift
        kind="${1:-}"
        ;;
      --file)
        shift
        file="${1:-}"
        ;;
      --repo)
        shift
        repo="${1:-}"
        ;;
      --issue)
        shift
        issue="${1:-}"
        ;;
      --pr)
        shift
        pr="${1:-}"
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        fail "unknown check argument: $1"
        ;;
    esac
    shift || true
  done

  if [[ -n "$issue" ]]; then
    kind="${kind:-issue}"
  elif [[ -n "$pr" ]]; then
    kind="${kind:-pr}"
  fi

  [[ "$kind" == "issue" || "$kind" == "pr" ]] || fail "check requires --kind issue|pr, --issue, or --pr"

  local body=""
  if [[ -n "$file" ]]; then
    [[ -z "$repo$issue$pr" ]] || fail "--file cannot be combined with --repo/--issue/--pr"
    body="$(read_body_file "$file")"
  elif [[ -n "$repo" && -n "$issue" ]]; then
    body="$(body_from_live_github "$repo" issue "$issue")"
  elif [[ -n "$repo" && -n "$pr" ]]; then
    body="$(body_from_live_github "$repo" pr "$pr")"
  elif [[ -z "$repo$issue$pr" ]]; then
    body="$(cat)"
  else
    fail "live checks require --repo plus --issue or --pr"
  fi

  validate_body "$kind" "$body"
  echo "gh-safe: $kind body is valid"
}

extract_and_validate_body() {
  local kind="$1"
  shift

  local -a args=("$@")
  local body=""
  local body_file=""
  local has_body=0
  local has_body_file=0
  local has_fill=0
  local i

  for ((i = 0; i < ${#args[@]}; i++)); do
    case "${args[$i]}" in
      --body=*)
        has_body=1
        body="${args[$i]#--body=}"
        ;;
      --body|-b)
        has_body=1
        ((i + 1 < ${#args[@]})) || fail "${args[$i]} requires a value"
        body="${args[$((i + 1))]}"
        i=$((i + 1))
        ;;
      --body-file=*)
        has_body_file=1
        body_file="${args[$i]#--body-file=}"
        ;;
      --body-file|-F)
        has_body_file=1
        ((i + 1 < ${#args[@]})) || fail "${args[$i]} requires a value"
        body_file="${args[$((i + 1))]}"
        i=$((i + 1))
        ;;
      --fill)
        has_fill=1
        ;;
    esac
  done

  [[ "$has_body" -eq 0 || "$has_body_file" -eq 0 ]] || fail "use either --body or --body-file, not both"
  if [[ "$has_fill" -eq 1 && "$kind" == "pr" ]]; then
    [[ "$has_body" -eq 1 || "$has_body_file" -eq 1 ]] || fail "PR create/edit must provide an explicit validated body; do not rely on --fill alone"
  fi

  if [[ "$has_body" -eq 1 ]]; then
    validate_body "$kind" "$body"
  elif [[ "$has_body_file" -eq 1 ]]; then
    validate_body "$kind" "$(read_body_file "$body_file")"
  else
    fail "$kind create/edit must include --body or --body-file so content can be validated"
  fi
}

main() {
  (($# > 0)) || {
    usage
    exit 1
  }

  case "$1" in
    check)
      shift
      run_check "$@"
      ;;
    issue)
      (($# >= 3)) || fail "issue command requires create or edit"
      local action="$2"
      case "$action" in
        create|edit) extract_and_validate_body issue "${@:3}" ;;
      esac
      require_gh
      gh "$@"
      ;;
    pr)
      (($# >= 3)) || fail "pr command requires create or edit"
      local action="$2"
      case "$action" in
        create|edit) extract_and_validate_body pr "${@:3}" ;;
      esac
      require_gh
      gh "$@"
      ;;
    -h|--help)
      usage
      ;;
    *)
      require_gh
      gh "$@"
      ;;
  esac
}

main "$@"
