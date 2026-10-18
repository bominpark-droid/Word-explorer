#!/bin/bash
# Installs app dependencies so Claude can typecheck, test and preview in cloud sessions.
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi
cd "$CLAUDE_PROJECT_DIR"
npm install --no-audit --no-fund
python3 -c "import yaml" 2>/dev/null || python3 -m pip install -q pyyaml || true
