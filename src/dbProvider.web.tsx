// Browser version: expo-sqlite's web build needs special server headers that
// GitHub Pages cannot send, so the browser uses sql.js (SQLite compiled to
// WebAssembly) and downloads the same dict.db file once.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Loading from './components/Loading';
import type { Db } from './db';

type SqlJsDatabase = {
  prepare(sql: string): {
    bind(params: unknown[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): boolean;
  };
};
type SqlJs = { Database: new (data: Uint8Array) => SqlJsDatabase };
declare global {
  // eslint-disable-next-line no-var
  var initSqlJs: ((config: { locateFile: (file: string) => string }) => Promise<SqlJs>) | undefined;
}

const Ctx = createContext<Db | null>(null);

// All files are fetched relative to the page so the app works under a
// sub-path such as https://<user>.github.io/Word-explorer/.
const asset = (name: string) => new URL(name, document.baseURI).toString();

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load ' + src));
    document.head.appendChild(s);
  });
}

function wrap(sqlDb: SqlJsDatabase): Db {
  const run = <T,>(sql: string, params: (string | number)[], first: boolean): T[] => {
    const stmt = sqlDb.prepare(sql);
    try {
      stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as T);
        if (first) break;
      }
      return rows;
    } finally {
      stmt.free();
    }
  };
  return {
    async getAllAsync<T>(sql: string, ...params: (string | number)[]) {
      return run<T>(sql, params, false);
    },
    async getFirstAsync<T>(sql: string, ...params: (string | number)[]) {
      return run<T>(sql, params, true)[0] ?? null;
    },
  };
}

// The dictionary (about 27MB) is saved in the browser's Cache Storage so that
// later visits, even without Wi-Fi, do not download it again. version.json
// holds a fingerprint of the file; a new fingerprint means a new download.
const DICT_CACHE = 'word-explorer-dict';

async function fetchDict(): Promise<ArrayBuffer> {
  const cache = await caches.open(DICT_CACHE).catch(() => null);
  let version: string | null = null;
  try {
    const r = await fetch(asset('version.json'), { cache: 'no-cache' });
    if (r.ok) version = (await r.json()).dict ?? null;
  } catch {
    // Offline: fall through to whatever copy is saved.
  }
  const url = asset('dict.db') + (version ? '?v=' + version : '');
  if (cache) {
    let hit = version ? await cache.match(url) : undefined;
    if (!hit && !version) {
      const keys = await cache.keys();
      if (keys.length) hit = await cache.match(keys[keys.length - 1]);
    }
    if (hit) return hit.arrayBuffer();
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('dict.db ' + res.status);
  if (cache) {
    try {
      await cache.put(url, res.clone());
      for (const k of await cache.keys()) if (k.url !== url) await cache.delete(k);
    } catch {
      // Not enough storage: the dictionary just downloads again next time.
    }
  }
  return res.arrayBuffer();
}

export function DictProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Db | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Lets the page open offline later (files saved by web-extras/sw.template.js).
      navigator.serviceWorker?.register(asset('sw.js')).catch(() => {});
      await loadScript(asset('sql-wasm-browser.js'));
      const SQL = await globalThis.initSqlJs!({ locateFile: asset });
      const bytes = new Uint8Array(await fetchDict());
      if (alive) setDb(wrap(new SQL.Database(bytes)));
    })().catch((e) => alive && setError(String(e?.message ?? e)));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <Loading message={'사전을 불러오지 못했어요. 새로고침 해 주세요.\n' + error} />;
  if (!db) return <Loading message={'사전을 내려받고 있어요.\n처음 한 번만 오래 걸려요 (약 27MB).'} />;
  return <Ctx.Provider value={db}>{children}</Ctx.Provider>;
}

export function useDict(): Db {
  const db = useContext(Ctx);
  if (!db) throw new Error('useDict outside DictProvider');
  return db;
}
