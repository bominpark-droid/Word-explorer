# Word Explorer — notes for Claude

Offline English-English-Korean dictionary app for a US 4th grader (Korean family).
The owner edits this app by chatting with Claude ("vibe coding"), so keep changes small,
verify them, and explain results in plain Korean.

Also read AGENTS.md (Expo's generic notes). Exception: this app does NOT use Expo Router;
navigation is a small state machine in `App.tsx` (tabs + a stack of word ids). Keep it that way
unless the owner asks for something it cannot do.

## Layout
- `App.tsx` — tabs, word stack, Android back button. The dictionary comes from `DictProvider` / `useDict()` in `src/dbProvider.tsx` (phone: expo-sqlite) and `src/dbProvider.web.tsx` (browser: sql.js + IndexedDB). Metro picks the `.web.tsx` / `.web.ts` file for the browser automatically.
- `src/screens/` — Search, Word (definition / Korean / examples), Wordbook, Cards.
- `src/db.ts` — all dictionary queries (search, lemmatizing lookups, entry loading).
- `src/wordbook.ts` — the child's saved words in a separate `wordbook.db` (never overwritten). Browser version: `src/wordbook.web.ts` (localStorage). Keep both files' exports identical.
- `web-extras/`, `scripts/build_web.sh`, `scripts/finish_web.mjs` — web build extras (manifest, icons, offline service worker) and `.github/workflows/deploy-web.yml` (publishes to GitHub Pages on every push to main).
- `src/online.ts` — Korean Wikidata labels for dictionary senses, only when online. The picture feature (Wikidata P18 → Commons / Wikipedia summary) was removed on 2026-10-18 at the owner's request ("일단 없애자"); `picture` flags in the curated data and DB are kept so it can come back, and the code is in git history before that date.
- `data/curated/*.json` — hand-written kid entries (easy definition, Korean, 2 examples). Schema in `data/curated/BRIEF.md`.
- `scripts/build_db.py` — builds `assets/db/dict.db` from Open English WordNet + WordNet exception lists + curated JSON.
- `data/gloss/gloss-NNN.json` — AI-written easy English + Korean + one example per WordNet sense of the ~12,000 most common words (12,583 senses as of 2026-10-18; ~40% of candidate senses were skipped as rare/unsure, so some senses stay English-only; not human-reviewed). Agent brief: `data/gloss/BRIEF.md`. Produced from `scripts/gloss_batches.py` (batches) and `scripts/merge_gloss.py` (agent output -> data/gloss). Words with at least one gloss get kid=1 (🇰🇷 label); hand-written curated words are kid=2 (⭐).

## Common tasks
- **Add or fix a word's easy definition / Korean / examples**: edit or append to `data/curated/<topic>-N.json`
  following BRIEF.md, then rebuild (below). Check Korean and facts carefully; the owner prefers "I don't know" to a wrong answer.
- **Rebuild the dictionary**: `npm run build:dict` (downloads sources into `.cache/` the first time, then runs tests).
  After any rebuild, bump `DICT_DB` in `src/dbProvider.tsx` (`dict-v1.db` → `dict-v2.db`) or phones keep the old copy. (The web version needs nothing: it fingerprints dict.db automatically.)
- **Add more Korean meanings**: `python scripts/gloss_batches.py assets/db/dict.db <dir> ...` (see its header), have agents follow `data/gloss/BRIEF.md`, then `python scripts/merge_gloss.py <dir>` and rebuild.
- **English Store**: the wordbook's 📋 영어편의점으로 복사 button copies `word | Korean | definition | example` lines for that app's 학교 단어 관리 editor (`storeLine` in `src/db.ts`). The English Store repo itself is not touched.
- **UI change**: edit `src/screens/*`, keep large kid-friendly text, Korean labels next to English.

## Verify before saying done
1. `npm run typecheck`
2. `npm test` (lookup smoke tests against the built db)
3. Visual check of the web build (what the owner actually uses):
   `npm run web:build`, then `node scripts/preview/serve.mjs dist 8081 &` (mimics GitHub Pages: sub-path `/Word-explorer/`, no special headers), then
   `CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/preview/shot.mjs <outdir> valley` and
   `CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/preview/offline_test.mjs` (needs `npm i --no-save playwright` once; do NOT use `pkill -f serve.mjs`, it kills your own shell).
   Look at the screenshots. Wikimedia is blocked in cloud sessions, so the online Korean label cannot be checked there; say so instead of claiming it works.

## Web version (the owner's main way to use the app)
- Live at https://bominpark-droid.github.io/Word-explorer/ once GitHub Pages is switched on (Settings > Pages > Source: GitHub Actions). `app.json` `experiments.baseUrl` must equal `/<repo name>`.
- expo-sqlite's web build needs COOP/COEP headers that GitHub Pages cannot send, which is why the browser uses sql.js. Never import `expo-sqlite` from code that the web build reaches except through `src/dbProvider.tsx` / `src/wordbook.ts` (the `.web` files shadow them).
- After the first online visit the browser saves the app (service worker caches) and the dictionary (IndexedDB), so it opens offline. The dictionary is deliberately NOT in Cache Storage: the English Store app (`English-convinience-store`) lives on the same origin and its `sw.js` deletes every cache except its own. Changing the app publishes a new build; the browser picks it up on the next online visit.

## Data licenses (keep attribution in the app footer and README)
- Open English WordNet: CC BY 4.0 + WordNet License (`licenses/`).
- WordNet 3.0 exception lists: WordNet License.
- Curated entries: AI-written for this app, not human-reviewed.
- Kengdic was evaluated and rejected (too noisy for a child).

## Running on a phone
`npx expo start` + Expo Go app (all native modules used are in Expo Go). Standalone Android APK:
`npx eas-cli@latest build -p android --profile preview` (needs an Expo account).
