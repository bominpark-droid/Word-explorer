# Word Explorer — notes for Claude

Offline English-English-Korean dictionary app for a US 4th grader (Korean family).
The owner edits this app by chatting with Claude ("vibe coding"), so keep changes small,
verify them, and explain results in plain Korean.

Also read AGENTS.md (Expo's generic notes). Exception: this app does NOT use Expo Router;
navigation is a small state machine in `App.tsx` (tabs + a stack of word ids). Keep it that way
unless the owner asks for something it cannot do.

## Layout
- `App.tsx` — SQLiteProvider (bundled dictionary), tabs, word stack, Android back button.
- `src/screens/` — Search, Word (definition / Korean / examples / picture), Wordbook, Cards.
- `src/db.ts` — all dictionary queries (search, lemmatizing lookups, entry loading).
- `src/wordbook.ts` — the child's saved words in a separate `wordbook.db` (never overwritten).
- `src/online.ts` — pictures (Wikidata P18 → Commons, then Wikipedia summary) and Korean Wikidata labels; only when online.
- `data/curated/*.json` — hand-written kid entries (easy definition, Korean, 2 examples). Schema in `data/curated/BRIEF.md`.
- `scripts/build_db.py` — builds `assets/db/dict.db` from Open English WordNet + WordNet exception lists + curated JSON.

## Common tasks
- **Add or fix a word's easy definition / Korean / examples**: edit or append to `data/curated/<topic>-N.json`
  following BRIEF.md, then rebuild (below). Check Korean and facts carefully; the owner prefers "I don't know" to a wrong answer.
- **Rebuild the dictionary**: `npm run build:dict` (downloads sources into `.cache/` the first time, then runs tests).
  After any rebuild, bump `DICT_DB` in `App.tsx` (`dict-v1.db` → `dict-v2.db`) or phones keep the old copy.
- **UI change**: edit `src/screens/*`, keep large kid-friendly text, Korean labels next to English.

## Verify before saying done
1. `npm run typecheck`
2. `npm test` (lookup smoke tests against the built db)
3. Visual check: `npm run web:export`, then
   `node scripts/preview/serve.mjs dist 8081 &` and
   `CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/preview/shot.mjs <outdir> valley`
   (needs `npm i -D playwright` once; COOP/COEP headers from serve.mjs are required for expo-sqlite on web).
   Look at the screenshots. Pictures cannot load in cloud sessions (Wikimedia is blocked there), so say so instead of claiming they work.

## Data licenses (keep attribution in the app footer and README)
- Open English WordNet: CC BY 4.0 + WordNet License (`licenses/`).
- WordNet 3.0 exception lists: WordNet License.
- Curated entries: AI-written for this app, not human-reviewed.
- Kengdic was evaluated and rejected (too noisy for a child).

## Running on a phone
`npx expo start` + Expo Go app (all native modules used are in Expo Go). Standalone Android APK:
`npx eas-cli@latest build -p android --profile preview` (needs an Expo account).
