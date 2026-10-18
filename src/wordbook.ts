import * as SQLite from 'expo-sqlite';

// The child's saved words live in their own database so that shipping a new
// dictionary file never touches them. Words are keyed by spelling, not id,
// because ids change when the dictionary is rebuilt.
export type Saved = { word: string; added_at: number; known: number };

let db: SQLite.SQLiteDatabase | null = null;
const listeners = new Set<() => void>();

function open(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('wordbook.db');
    db.execSync(
      `CREATE TABLE IF NOT EXISTS saved(
         word TEXT PRIMARY KEY, added_at INTEGER NOT NULL, known INTEGER NOT NULL DEFAULT 0)`,
    );
  }
  return db;
}

function changed() {
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function isSaved(word: string): boolean {
  return !!open().getFirstSync('SELECT 1 FROM saved WHERE word = ?', word);
}

export function toggle(word: string): boolean {
  const d = open();
  if (isSaved(word)) {
    d.runSync('DELETE FROM saved WHERE word = ?', word);
    changed();
    return false;
  }
  d.runSync('INSERT INTO saved(word, added_at) VALUES (?, ?)', word, Date.now());
  changed();
  return true;
}

export function remove(word: string) {
  open().runSync('DELETE FROM saved WHERE word = ?', word);
  changed();
}

export function setKnown(word: string, known: boolean) {
  open().runSync('UPDATE saved SET known = ? WHERE word = ?', known ? 1 : 0, word);
  changed();
}

export function list(): Saved[] {
  return open().getAllSync<Saved>('SELECT word, added_at, known FROM saved ORDER BY added_at DESC');
}
