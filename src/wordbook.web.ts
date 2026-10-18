// Browser version of the wordbook: saved words are kept in localStorage
// (same exported functions as wordbook.ts, which uses SQLite on phones).
export type Saved = { word: string; added_at: number; known: number };

const KEY = 'wordbook.v1';
const listeners = new Set<() => void>();

function read(): Saved[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(items: Saved[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage can be blocked (private mode); the word list then lasts until reload only.
    memory = items;
  }
  listeners.forEach((l) => l());
}

let memory: Saved[] | null = null;
const load = () => memory ?? read();

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function isSaved(word: string): boolean {
  return load().some((i) => i.word === word);
}

export function toggle(word: string): boolean {
  const items = load();
  if (items.some((i) => i.word === word)) {
    write(items.filter((i) => i.word !== word));
    return false;
  }
  write([{ word, added_at: Date.now(), known: 0 }, ...items]);
  return true;
}

export function remove(word: string) {
  write(load().filter((i) => i.word !== word));
}

export function setKnown(word: string, known: boolean) {
  write(load().map((i) => (i.word === word ? { ...i, known: known ? 1 : 0 } : i)));
}

export function list(): Saved[] {
  return [...load()].sort((a, b) => b.added_at - a.added_at);
}
