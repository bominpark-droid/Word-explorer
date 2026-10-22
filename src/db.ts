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
  const base = (await inflected(db, q, exact.id)) ? await findBase(db, q) : null;
  if (base && base.id !== exact.id) {
    const n = await db.getFirstAsync<{ nsenses: number }>('SELECT nsenses FROM words WHERE id = ?', base.id);
    if (base.kid > exact.kid || (exact.nsenses <= 2 && (n?.nsenses ?? 0) >= 3)) return base;
  }
  return exact;
}

// Whether a headword is probably just a form of another word: "said", "valleys",
// "hiking", "bigger" are; "priest" and "writer" (nouns ending in -est / -er) are not.
async function inflected(db: Db, q: string, id: number): Promise<boolean> {
  if (/(s|ed|ing)$/.test(q)) return true;
  if (await db.getFirstAsync('SELECT 1 FROM forms WHERE form = ? LIMIT 1', q)) return true;
  if (!/(er|est)$/.test(q)) return false;
  const noun = await db.getFirstAsync(
    `SELECT 1 FROM senses x JOIN synsets s ON s.id = x.synset_id WHERE x.word_id = ? AND s.pos = 'noun' LIMIT 1`,
    id,
  );
  return !noun;
}

// The other headword a word screen should point to: the base word of an
// inflected headword, or nothing.
export async function relatedBase(db: Db, word: string, id: number): Promise<WordRow | null> {
  const q = word.toLowerCase();
  if (!(await inflected(db, q, id))) return null;
  const base = await findBase(db, q);
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

// Close spellings for a word that was not found ("vally" -> valley), among words
// that have Korean help. Same first letter, at most 1-2 letters different.
export async function spellSuggest(db: Db, query: string): Promise<WordRow[]> {
  const q = query.toLowerCase().trim();
  if (q.length < 3) return [];
  const rows = await db.getAllAsync<WordRow & { w: string }>(
    'SELECT id, word, kid, w FROM words WHERE w >= ? AND w < ? AND kid > 0 AND length(w) BETWEEN ? AND ?',
    q[0],
    q[0] + '￿',
    q.length - 2,
    q.length + 2,
  );
  const max = q.length <= 4 ? 1 : 2;
  const seen = new Set<string>();
  return rows
    .map((r) => ({ r, d: distance(q, r.w) }))
    .filter((x) => x.d <= max)
    .sort((a, b) => a.d - b.d || b.r.kid - a.r.kid)
    .filter((x) => !seen.has(x.r.w) && seen.add(x.r.w))
    .slice(0, 6)
    .map(({ r }) => ({ id: r.id, word: r.word, kid: r.kid }));
}

// Edit distance (letters added, removed, changed or swapped).
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

// Adds the main Korean meaning to each row of a word list (search results, recent words).
export async function withKorean(db: Db, rows: WordRow[]): Promise<WordRow[]> {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id);
  const marks = ids.map(() => '?').join(',');
  const ko = new Map<number, string>();
  const kid = await db.getAllAsync<{ word_id: number; data: string }>(`SELECT word_id, data FROM kid WHERE word_id IN (${marks})`, ...ids);
  for (const k of kid) {
    const first = JSON.parse(k.data).senses?.[0]?.ko;
    if (first) ko.set(k.word_id, first);
  }
  const gl = await db.getAllAsync<{ word_id: number; ko: string }>(
    `SELECT x.word_id, s.ko FROM senses x JOIN synsets s ON s.id = x.synset_id
     WHERE x.word_id IN (${marks}) AND s.ko IS NOT NULL ORDER BY x.word_id, x.ord`,
    ...ids,
  );
  for (const g of gl) if (!ko.has(g.word_id)) ko.set(g.word_id, g.ko);
  return rows.map((r) => ({ ...r, ko: ko.get(r.id) }));
}

// The main Korean meaning of a word, for lists (wordbook): hand-written first, then glosses.
export async function koreanFor(db: Db, word: string): Promise<string> {
  const row = await lookup(db, word);
  const e = row ? await getEntry(db, row.id) : null;
  return e?.kidSenses[0]?.ko ?? e?.dictSenses.find((s) => s.ko)?.ko ?? '';
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
