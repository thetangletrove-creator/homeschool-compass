#!/usr/bin/env bash
# Phase C1 rollback — iPad app backend: public API routes + data exports
# Reverts commit 83b29e8 cleanly.
#
# Usage:
#   bash scripts/rollback-c1-app-backend.sh              # dry-run preview
#   bash scripts/rollback-c1-app-backend.sh --execute     # actually revert

set -euo pipefail

COMMIT="83b29e8"
DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Phase C1 Rollback — iPad App Backend ==="
echo "Reverting commit: $COMMIT"
echo "  ($(cd "$DIR" && git log --oneline -1 "$COMMIT"))"
echo ""

if [ "${1:-}" != "--execute" ]; then
    echo "[DRY-RUN] Files that will be deleted:"
    echo ""
    cd "$DIR" && git show --name-only --format="" "$COMMIT" | sed 's/^/  - /'
    echo ""
    echo "Usage: bash scripts/rollback-c1-app-backend.sh --execute"
    exit 0
fi

cd "$DIR"

echo "Reverting..."
git revert --no-edit "$COMMIT"

echo ""
echo "✅ Rollback complete. Git log:"
git log --oneline -3

echo ""
echo "To re-apply the commit: git cherry-pick $COMMIT"