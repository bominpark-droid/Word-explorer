#!/bin/bash
# Rebuilds assets/db/dict.db from Open English WordNet + data/curated/*.json.
# Source data is downloaded into .cache/ (not committed) the first time.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .cache
if [ ! -d .cache/english-wordnet/src/yaml ]; then
  GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/globalwordnet/english-wordnet .cache/english-wordnet
fi
if [ ! -f .cache/wndb/package/data/verb.exc ]; then
  mkdir -p .cache/wndb
  (cd .cache/wndb && npm pack wndb-with-exceptions@3.0.2 >/dev/null && tar xzf wndb-with-exceptions-3.0.2.tgz)
fi
python3 -c "import yaml" 2>/dev/null || python3 -m pip install -q pyyaml
python3 scripts/build_db.py .cache/english-wordnet .cache/wndb/package/data data/curated assets/db/dict.db
npx tsx scripts/test_queries.ts
