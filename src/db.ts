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
  // Suffix guessing is only for headwords that are probably inflections: a word
  // with several senses of its own ("mother", "better") is not "moth" + er.
  const own = await db.getFirstAsync<{ nsenses: number }>('SELECT max(nsenses) AS nsenses FROM words WHERE w = ?', q);
  if (own && own.nsenses > 2) return null;
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
  if (exact.kid === 2) return exact;
  // "hiking" and "stopped" are WordNet headwords too, but a kid typing them
  // almost always wants "hike" / "stop". Prefer the base word when it is an
  // easier word (more Korean/easy help) or a much bigger entry; the word screen links back.
  const base = await findBase(db, q);
  if (base && base.id !== exact.id) {
    const n = await db.getFirstAsync<{ nsenses: number }>('SELECT nsenses FROM words WHERE id = ?', base.id);
    if (base.kid > exact.kid || (exact.nsenses <= 2 && (n?.nsenses ?? 0) >= 3)) return base;
  }
  return exact;
}

// The other headword a word screen should point to: the base word of an
// inflected headword, or nothing.
export async function relatedBase(db: Db, word: string): Promise<WordRow | null> {
  const base = await findBase(db, word.toLowerCase());
  return base && base.word.toLowerCase() !== word.toLowerCase() ? base : null;
}

type SynRow = { pos: string; def: string; ex: string | null; wd: string | null; members: string | null;
  easy: string | null; ko: string | null; xe: string | null; xk: string | null };

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
    `SELECT s.pos, s.def, s.ex, s.wd, s.members, s.easy, s.ko, s.xe, s.xk FROM senses x JOIN synsets s ON s.id = x.synset_id
     WHERE x.word_id = ? ORDER BY x.ord`,
    id,
  );
  const lower = w.word.toLowerCase();
  const dictSenses: DictSense[] = syns.map((s) => ({
    pos: s.pos,
    def: s.def,
    examples: s.ex ? JSON.parse(s.ex) : [],
    wikidata: s.wd,
    easy: s.easy,
    ko: s.ko,
    exampleEn: s.xe,
    exampleKo: s.xk,
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

// Words that have a Korean meaning (hand-written entries + the common-word glosses).
export async function koWordCount(db: Db): Promise<number> {
  const r = await db.getFirstAsync<{ v: string }>("SELECT v FROM meta WHERE k = 'ko_words'");
  return r ? Number(r.v) : 0;
}

// One line for the English Store app's school-spelling editor:
// "word | Korean | easy English definition | example".
export async function storeLine(db: Db, word: string): Promise<string> {
  const row = await lookup(db, word);
  const e = row ? await getEntry(db, row.id) : null;
  const clean = (t: string | null | undefined) => (t ?? '').replace(/[|\n]/g, ' ').trim();
  const k = e?.kidSenses[0];
  if (k) return [word, k.ko, k.simple, k.examples[0]?.en].map(clean).join(' | ');
  const g = e?.dictSenses.find((s) => s.ko);
  if (g) return [word, g.ko, g.easy, g.exampleEn].map(clean).join(' | ');
  const d = e?.dictSenses[0];
  return [word, '', d?.def, d?.examples[0]].map(clean).join(' | ');
}
