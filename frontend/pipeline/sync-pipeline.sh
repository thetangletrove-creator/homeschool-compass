#!/bin/bash
# /opt/homeschool-compass/scripts/sync-pipeline.sh
# Shell wrapper that runs the sync-to-neon.py pipeline with proper environment.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="/opt/homeschool-compass/.env"
LOG_DIR="/opt/homeschool-compass/logs"

mkdir -p "$LOG_DIR"

# Load environment
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

LOG_FILE="$LOG_DIR/sync-$(date +%Y%m%d-%H%M%S).log"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting Homeschool Compass sync..." | tee -a "$LOG_FILE"

cd "$SCRIPT_DIR"
python3 sync-to-neon.py 2>&1 | tee -a "$LOG_FILE"
EXIT_CODE=$?

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Sync completed with exit code $EXIT_CODE" | tee -a "$LOG_FILE"

# Keep only last 30 log files
find "$LOG_DIR" -name 'sync-*.log' -mtime +30 -delete 2>/dev/null || true

exit $EXIT_CODE
