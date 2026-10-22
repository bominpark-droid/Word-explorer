// Smoke test for src/db.ts against the built dictionary: npx tsx scripts/test_queries.ts
import { DatabaseSync } from 'node:sqlite';
import { getEntry, lookup, suggest, type Db } from '../src/db';

const raw = new DatabaseSync(process.argv[2] ?? 'assets/db/dict.db', { readOnly: true });
const db: Db = {
  async getAllAsync<T>(sql: string, ...p: (string | number)[]) {
    return raw.prepare(sql).all(...p) as T[];
  },
  async getFirstAsync<T>(sql: string, ...p: (string | number)[]) {
    return (raw.prepare(sql).get(...p) as T) ?? null;
  },
};

let failed = 0;
async function expectLookup(q: string, want: string) {
  const r = await lookup(db, q);
  const ok = r?.word.toLowerCase() === want.toLowerCase();
  if (!ok) failed++;
  console.log(ok ? 'ok  ' : 'FAIL', q, '->', r?.word);
}

(async () => {
  for (const [q, w] of [
    ['valley', 'valley'], ['valleys', 'valley'], ['ran', 'run'], ['mice', 'mouse'], ['hiking', 'hike'],
    ['stopped', 'stop'], ['studies', 'study'], ['wolves', 'wolf'], ['Cherokee', 'Cherokee'], ['tepee', 'tepee'],
    ['bigger', 'big'], ['games', 'game'], ['died', 'die'], ['notes', 'note'], ['passed', 'pass'], ['hoped', 'hope'], ['priest', 'priest'], ['writer', 'writer'], ['policemen', 'policeman'], ['said', 'say'], ['happiest', 'happy'], ['eroded', 'eroded'], ['glaciers', 'glacier'], ['mother', 'mother'], ['teacher', 'teacher'],
  ]) await expectLookup(q, w);
  console.log('suggest(val):', (await suggest(db, 'val')).slice(0, 8).map((r) => r.word + (r.kid ? '*' : '')).join(', '));
  console.log('suggest(photo):', (await suggest(db, 'photo')).slice(0, 8).map((r) => r.word + (r.kid ? '*' : '')).join(', '));
  const v = await lookup(db, 'valley');
  const e = await getEntry(db, v!.id);
  console.log(JSON.stringify(e, null, 1).slice(0, 1200));
  // Common words without a hand-written entry should still show Korean (data/gloss).
  for (const w of ['laugh', 'garlic', 'walk', 'because', 'the', 'station', 'japan', 'new york']) {
    const r = await lookup(db, w);
    const en = r ? await getEntry(db, r.id) : null;
    const ko = en?.kidSenses[0]?.ko ?? en?.dictSenses.find((s) => s.ko)?.ko;
    if (!ko) failed++;
    console.log(ko ? 'ok  ' : 'FAIL', w, 'Korean:', ko);
  }
  const t0 = Date.now();
  for (const p of ['a', 'b', 'co', 's', 'th']) await suggest(db, p);
  console.log('5 short-prefix suggests took', Date.now() - t0, 'ms');
  process.exit(failed ? 1 : 0);
})();
