#!/usr/bin/env bash
#
# bob2svg.sh — convert svgbob ASCII sources (.bob) to SVG using the project's
# house style. Each <name>.bob produces a sibling <name>.svg.
#
# Usage:
#   bob2svg.sh file1.bob [file2.bob ...]   # convert the given .bob files
#   bob2svg.sh --all <dir>                 # convert every *.bob under <dir>
#
# Why this script exists:
#   - svgbob_cli usually lives in ~/.cargo/bin, which is often not on a
#     non-login shell's PATH; this finds it either way.
#   - It always applies --font-family "Iosevka Fixed, monospace" so output
#     matches the rest of the book (reproduces committed SVGs byte-for-byte).

set -euo pipefail

FONT_FAMILY="Iosevka Fixed, monospace"

# Locate the svgbob binary (named svgbob_cli when installed via cargo).
find_svgbob() {
  for cand in svgbob_cli svgbob "$HOME/.cargo/bin/svgbob_cli" "$HOME/.cargo/bin/svgbob"; do
    if command -v "$cand" >/dev/null 2>&1; then
      command -v "$cand"
      return 0
    fi
  done
  echo "error: svgbob_cli not found on PATH or in ~/.cargo/bin." >&2
  echo "       Install it with: cargo install svgbob_cli" >&2
  return 1
}

convert_one() {
  local bob="$1"
  if [[ "$bob" != *.bob ]]; then
    echo "skip (not a .bob file): $bob" >&2
    return 0
  fi
  if [[ ! -f "$bob" ]]; then
    echo "error: no such file: $bob" >&2
    return 1
  fi
  local svg="${bob%.bob}.svg"
  "$SVGBOB" "$bob" -o "$svg" --font-family "$FONT_FAMILY"
  echo "wrote $svg"
}

main() {
  if [[ $# -eq 0 ]]; then
    echo "usage: bob2svg.sh <file.bob> [more.bob ...]" >&2
    echo "       bob2svg.sh --all <dir>" >&2
    return 2
  fi

  SVGBOB="$(find_svgbob)"

  if [[ "$1" == "--all" ]]; then
    local dir="${2:-.}"
    local found=0
    while IFS= read -r -d '' bob; do
      convert_one "$bob"
      found=1
    done < <(find "$dir" -type f -name '*.bob' -print0)
    if [[ "$found" -eq 0 ]]; then
      echo "no .bob files found under: $dir" >&2
    fi
  else
    for bob in "$@"; do
      convert_one "$bob"
    done
  fi
}

main "$@"
