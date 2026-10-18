import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import CardsScreen from './src/screens/CardsScreen';
import SearchScreen from './src/screens/SearchScreen';
import WordbookScreen from './src/screens/WordbookScreen';
import WordScreen from './src/screens/WordScreen';
import { C } from './src/theme';
import type { WordRow } from './src/types';

// Bump the file name whenever assets/db/dict.db is rebuilt, so phones copy the
// new bundled dictionary instead of keeping the old one.
const DICT_DB = 'dict-v1.db';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <Suspense fallback={<Loading />}>
          <SQLiteProvider
            databaseName={DICT_DB}
            assetSource={{ assetId: require('./assets/db/dict.db') }}
            useSuspense
          >
            <Main />
          </SQLiteProvider>
        </Suspense>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={C.blue} size="large" />
      <Text style={{ color: C.sub, marginTop: 12 }}>사전을 준비하고 있어요…</Text>
    </View>
  );
}

type Tab = 'search' | 'book';

function Main() {
  const db = useSQLiteContext();
  const [tab, setTab] = useState<Tab>('search');
  const [stack, setStack] = useState<number[]>([]);
  const [cards, setCards] = useState(false);
  const [recent, setRecent] = useState<WordRow[]>([]);

  const open = async (id: number) => {
    setStack((s) => [...s, id]);
    const row = await db.getFirstAsync<WordRow>('SELECT id, word, kid FROM words WHERE id = ?', id);
    if (row) setRecent((r) => [row, ...r.filter((x) => x.id !== id)].slice(0, 20));
  };
  const back = () => setStack((s) => s.slice(0, -1));

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (cards) {
        setCards(false);
        return true;
      }
      if (stack.length) {
        back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [cards, stack.length]);

  const top = stack[stack.length - 1];
  let body;
  if (cards) body = <CardsScreen onBack={() => setCards(false)} />;
  else if (top !== undefined) body = <WordScreen key={top} id={top} onBack={back} onOpen={open} />;
  else if (tab === 'search') body = <SearchScreen onOpen={open} recent={recent} />;
  else body = <WordbookScreen onOpen={open} onCards={() => setCards(true)} />;

  const go = (t: Tab) => {
    setCards(false);
    setStack([]);
    setTab(t);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>{body}</View>
      <SafeAreaView edges={['bottom']} style={styles.tabs}>
        <TabButton label="🔍 찾기" active={tab === 'search' && !cards && !stack.length} onPress={() => go('search')} />
        <TabButton label="⭐ 단어장" active={tab === 'book' && !cards && !stack.length} onPress={() => go('book')} />
      </SafeAreaView>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tab} onPress={onPress}>
      <Text style={[styles.tabText, active && { color: C.blue }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.card },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 17, fontWeight: '700', color: C.faint },
});
