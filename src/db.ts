import type { DictSense, Entry, KidSense, WordRow } from './types';
import { baseCandidates } from './lemmatize';

// The subset of expo-sqlite's SQLiteDatabase this module uses, so the queries
// can also be exercised from Node in scripts/test_queries.mjs.
export interface Db {
  getAllAsync<T>(sql: string, ...params: (string | number)[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: (string | number)[]): Promise<T | null>;
}

const SUGGEST_LIMIT = 30;

export async function suggest(db: Db, query: string): Promise<WordRow[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  // Range scan on the words_w index: every key that starts with q.
  const rows = await db.getAllAsync<WordRow>(
    `SELECT id, word, kid FROM words WHERE w >= ? AND w < ?
     ORDER BY (w = ?) DESC, kid DESC, nsenses DESC, length(w) LIMIT ?`,
    q,
    q + '￿',
    q,
    SUGGEST_LIMIT,
  );
  // Inflections ("valleys", "ran", "hiking"): put the base word first.
  const base = await findBase(db, q);
  if (base) return [base, ...rows.filter((r) => r.id !== base.id)];
  return rows;
}

export async function findBase(db: Db, q: string): Promise<WordRow | null> {
  const fromForms = await db.getFirstAsync<WordRow>(
    `SELECT w.id, w.word, w.kid FROM forms f JOIN words w ON w.id = f.word_id
     WHERE f.form = ? ORDER BY w.kid DESC, w.nsenses DESC LIMIT 1`,
    q,
  );
  if (fromForms) return fromForms;
  for (const cand of baseCandidates(q)) {
    const row = await db.getFirstAsync<WordRow>(
      'SELECT id, word, kid FROM words WHERE w = ? ORDER BY kid DESC, nsenses DESC LIMIT 1',
      cand,
    );
    if (row) return row;
  }
  return null;
}

export async function lookup(db: Db, query: string): Promise<WordRow | null> {
  const q = query.toLowerCase().trim();
  const exact = await db.getFirstAsync<WordRow & { nsenses: number }>(
    'SELECT id, word, kid, nsenses FROM words WHERE w = ? ORDER BY kid DESC, nsenses DESC LIMIT 1',
    q,
  );
  if (!exact) return findBase(db, q);
  if (exact.kid) return exact;
  // "hiking" and "stopped" are WordNet headwords too, but a kid typing them
  // almost always wants "hike" / "stop". Prefer the base word when it is an
  // easy (curated) word or a much bigger entry; the word screen links back.
  const base = await findBase(db, q);
  if (base && base.id !== exact.id) {
    const n = await db.getFirstAsync<{ nsenses: number }>('SELECT nsenses FROM words WHERE id = ?', base.id);
    if (base.kid || (exact.nsenses <= 2 && (n?.nsenses ?? 0) >= 3)) return base;
  }
  return exact;
}

// The other headword a word screen should point to: the base word of an
// inflected headword, or nothing.
export async function relatedBase(db: Db, word: string): Promise<WordRow | null> {
  const base = await findBase(db, word.toLowerCase());
  return base && base.word.toLowerCase() !== word.toLowerCase() ? base : null;
}

type SynRow = { pos: string; def: string; ex: string | null; wd: string | null; members: string | null };

export async function getEntry(db: Db, id: number): Promise<Entry | null> {
  const w = await db.getFirstAsync<{ id: number; word: string; ipa: string | null }>(
    'SELECT id, word, ipa FROM words WHERE id = ?',
    id,
  );
  if (!w) return null;
  const kid = await db.getFirstAsync<{ topic: string | null; picture: number; data: string }>(
    'SELECT topic, picture, data FROM kid WHERE word_id = ?',
    id,
  );
  const syns = await db.getAllAsync<SynRow>(
    `SELECT s.pos, s.def, s.ex, s.wd, s.members FROM senses x JOIN synsets s ON s.id = x.synset_id
     WHERE x.word_id = ? ORDER BY x.ord`,
    id,
  );
  const lower = w.word.toLowerCase();
  const dictSenses: DictSense[] = syns.map((s) => ({
    pos: s.pos,
    def: s.def,
    examples: s.ex ? JSON.parse(s.ex) : [],
    wikidata: s.wd,
    synonyms: (s.members ? (JSON.parse(s.members) as string[]) : []).filter((m) => m.toLowerCase() !== lower),
  }));
  const kidSenses: KidSense[] = kid ? JSON.parse(kid.data).senses : [];
  return {
    id: w.id,
    word: w.word,
    ipa: w.ipa,
    topic: kid?.topic ?? null,
    picture: !!kid?.picture,
    kidSenses,
    dictSenses,
  };
}

export async function randomKidWord(db: Db): Promise<WordRow | null> {
  return db.getFirstAsync<WordRow>(
    'SELECT w.id, w.word, w.kid FROM kid k JOIN words w ON w.id = k.word_id ORDER BY random() LIMIT 1',
  );
}

export async function kidCount(db: Db): Promise<number> {
  const r = await db.getFirstAsync<{ v: string }>("SELECT v FROM meta WHERE k = 'kid_count'");
  return r ? Number(r.v) : 0;
}
