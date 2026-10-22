// Phone version: the bundled dictionary file is copied once into the app's
// SQLite folder and opened with expo-sqlite. The web version lives in
// dbProvider.web.tsx (Metro picks that file automatically for the browser).
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { Suspense, type ReactNode } from 'react';
import Loading from './components/Loading';
import type { Db } from './db';

// Bump the file name whenever assets/db/dict.db is rebuilt, so phones copy the
// new bundled dictionary instead of keeping the old one.
const DICT_DB = 'dict-v3.db';

export function DictProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      <SQLiteProvider databaseName={DICT_DB} assetSource={{ assetId: require('../assets/db/dict.db') }} useSuspense>
        {children}
      </SQLiteProvider>
    </Suspense>
  );
}

export function useDict(): Db {
  return useSQLiteContext();
}
