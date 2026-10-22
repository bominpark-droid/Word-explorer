// Which common words the app cannot find, or finds without a Korean meaning.
// Word list: python3 -c "from wordfreq import top_n_list; print('\n'.join(w for w in top_n_list('en', 30000) if w.isalpha() and w.isascii()))" > top.txt
// Usage: npx tsx scripts/coverage.ts top.txt [count=20000] [out_dir=.]  -> prints totals, writes miss.txt and noko.txt (word>headword)
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync } from 'node:fs';
import { getEntry, lookup, type Db } from '../src/db';

const raw = new DatabaseSync('assets/db/dict.db', { readOnly: true });
const db: Db = {
  async getAllAsync<T>(sql: string, ...p: (string | number)[]) {
    return raw.prepare(sql).all(...p) as T[];
  },
  async getFirstAsync<T>(sql: string, ...p: (string | number)[]) {
    return (raw.prepare(sql).get(...p) as T) ?? null;
  },
};

(async () => {
  const [list, count = '20000', out = '.'] = process.argv.slice(2);
  const words = readFileSync(list, 'utf8').split('\n').filter(Boolean).slice(0, Number(count));
  const miss: string[] = [];
  const noko: string[] = [];
  for (const w of words) {
    const r = await lookup(db, w);
    if (!r) {
      miss.push(w);
      continue;
    }
    const e = await getEntry(db, r.id);
    if (!e!.kidSenses.length && !e!.dictSenses.some((s) => s.ko)) noko.push(w + '>' + r.word);
  }
  for (const n of [1000, 3000, 5000, 10000, 20000].filter((n) => n <= words.length)) {
    const top = new Set(words.slice(0, n));
    const m = miss.filter((x) => top.has(x)).length;
    const k = noko.filter((x) => top.has(x.split('>')[0])).length;
    console.log(`top ${n}: not found ${m}, found without Korean ${k}`);
  }
  writeFileSync(`${out}/miss.txt`, miss.join('\n'));
  writeFileSync(`${out}/noko.txt`, noko.join('\n'));
})();
