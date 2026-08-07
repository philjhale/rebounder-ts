#!/usr/bin/env bash
# PostToolUse hook (Edit|Write): runs `eslint --fix` against just the file
# Claude edited, mirroring the PreToolUse/block-stale-branch-edit.sh pattern.
# Scoped to the single file — CI's `lint` job already covers the full tree.
# Exits non-zero with ESLint's error output when `--fix` leaves unfixable
# violations, so Claude sees and fixes them inline.
set -euo pipefail

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

[ -n "$file_path" ] || exit 0
[ -f "$file_path" ] || exit 0

case "$file_path" in
  *.js|*.jsx|*.ts|*.tsx) ;;
  *) exit 0 ;;
esac

repo_root=$(git -C "$(dirname "$file_path")" rev-parse --show-toplevel 2>/dev/null) || exit 0
[ -f "$repo_root/eslint.config.js" ] || exit 0

output=$(cd "$repo_root" && npx --no-install eslint --fix "$file_path" 2>&1) || {
  echo "$output" >&2
  exit 2
}

exit 0
