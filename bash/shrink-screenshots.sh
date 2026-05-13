#!/usr/bin/env bash
set -euo pipefail

# Downscale screenshots so they fit the many-image request dimension cap
# (2000px on any edge). Originals are never modified; shrunk copies land in a
# sibling `.shrunk/` dir by default. Prints the resulting path (shrunk copy or
# already-small original) for each input image, one per line.

MAX_PX=1800
OUT_DIR=""

usage() {
  cat >&2 <<'USAGE'
Usage: shrink-screenshots.sh [--max <px>] [--out <dir>] <path> [path ...]

Downscale screenshots to <= max px on the longest edge so they fit the
many-image request dimension cap (2000px). Each <path> may be an image file
or a directory of images (recursively scanned, .shrunk/ dirs skipped).
Originals are never modified.

Outputs one resulting path per line so the list can be fed directly to the
agent's Read tool.

  --max <px>   Longest-edge cap. Default: 1800 (gives 200px margin under 2000).
  --out <dir>  Output directory. Default: <input-dir>/.shrunk per input.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --max) MAX_PX="$2"; shift 2 ;;
    --out) OUT_DIR="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    --) shift; break ;;
    -*) echo "Unknown flag: $1" >&2; usage; exit 1 ;;
    *) break ;;
  esac
done

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

if ! command -v sips >/dev/null 2>&1; then
  echo "shrink-screenshots requires 'sips' (macOS built-in)." >&2
  exit 1
fi

process_file() {
  local src="$1"
  local target_dir="$2"

  local props
  props="$(sips -g pixelWidth -g pixelHeight "$src" 2>/dev/null || true)"
  local w h
  w="$(awk '/pixelWidth:/  {print $2}' <<<"$props")"
  h="$(awk '/pixelHeight:/ {print $2}' <<<"$props")"

  if ! [[ "$w" =~ ^[0-9]+$ ]] || ! [[ "$h" =~ ^[0-9]+$ ]]; then
    echo "skip (not a raster image): $src" >&2
    return
  fi

  local max=$(( w > h ? w : h ))
  if (( max <= MAX_PX )); then
    echo "$src"
    return
  fi

  mkdir -p "$target_dir"
  local dst="$target_dir/$(basename "$src")"
  sips -Z "$MAX_PX" "$src" --out "$dst" >/dev/null
  echo "$dst"
}

collect_images() {
  local path="$1"
  if [[ -f "$path" ]]; then
    printf '%s\n' "$path"
    return
  fi
  if [[ -d "$path" ]]; then
    find "$path" \
      -type d -name '.shrunk' -prune -o \
      -type f \( \
        -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \
        -o -iname '*.gif' -o -iname '*.webp' -o -iname '*.tiff' \
      \) -print | sort
    return
  fi
  echo "missing: $path" >&2
}

for input in "$@"; do
  default_out=""
  if [[ -d "$input" ]]; then
    default_out="$input/.shrunk"
  elif [[ -f "$input" ]]; then
    default_out="$(dirname "$input")/.shrunk"
  fi

  target_dir="${OUT_DIR:-$default_out}"
  if [[ -z "$target_dir" ]]; then
    echo "Cannot resolve output dir for input: $input" >&2
    continue
  fi

  while IFS= read -r img; do
    [[ -z "$img" ]] && continue
    process_file "$img" "$target_dir"
  done < <(collect_images "$input")
done
