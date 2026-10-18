#!/bin/bash
# Builds the browser version into dist/ (published to GitHub Pages by
# .github/workflows/deploy-web.yml). The browser loads the same dict.db as the
# phone app, through sql.js (see src/dbProvider.web.tsx).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
CI=1 npx expo export --platform web --output-dir dist
node scripts/finish_web.mjs
