import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { kidCount, lookup, randomKidWord, suggest } from '../db';
import { C } from '../theme';
import type { WordRow } from '../types';

type Props = { onOpen: (id: number) => void; recent: WordRow[] };

export default function SearchScreen({ onOpen, recent }: Props) {
  const db = useSQLiteContext();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<WordRow[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [daily, setDaily] = useState<WordRow | null>(null);
  const [count, setCount] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    randomKidWord(db).then(setDaily);
    kidCount(db).then(setCount);
  }, [db]);

  useEffect(() => {
    const n = ++seq.current;
    setNotFound(false);
    suggest(db, q).then((r) => {
      if (n === seq.current) setRows(r);
    });
  }, [db, q]);

  const submit = async () => {
    if (!q.trim()) return;
    const row = await lookup(db, q);
    if (row) {
      Keyboard.dismiss();
      onOpen(row.id);
    } else setNotFound(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Word Explorer</Text>
        <Text style={styles.subtitle}>쉬운 영영한 사전 · Wi-Fi 없이도 돼요</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={submit}
          placeholder="Type a word…  (예: valley)"
          placeholderTextColor={C.faint}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
          clearButtonMode="while-editing"
        />
        {notFound ? <Text style={styles.notFound}>“{q}” 단어를 찾지 못했어요. 철자를 확인해 볼까요?</Text> : null}
      </View>

      {q.trim() ? (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.id)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <Row item={item} onPress={() => onOpen(item.id)} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      ) : (
        <FlatList
          data={recent}
          keyExtractor={(r) => 'r' + r.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              {daily ? (
                <Pressable style={styles.daily} onPress={() => onOpen(daily.id)}>
                  <Text style={styles.dailyLabel}>✨ Word of the day 오늘의 단어</Text>
                  <Text style={styles.dailyWord}>{daily.word}</Text>
                </Pressable>
              ) : null}
              <Text style={styles.info}>
                ⭐ 표시 단어 {count.toLocaleString()}개는 4학년 수준의 쉬운 설명, 한국어 뜻, 예문이 있어요.
              </Text>
              {recent.length ? <Text style={styles.section}>Recent 최근 찾은 단어</Text> : null}
            </View>
          }
          renderItem={({ item }) => <Row item={item} onPress={() => onOpen(item.id)} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </View>
  );
}

function Row({ item, onPress }: { item: WordRow; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.blueSoft }]}>
      <Text style={styles.rowWord}>{item.word}</Text>
      {item.kid ? <Text style={styles.kidStar}>⭐ easy</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10 },
  title: { fontSize: 30, fontWeight: '800', color: C.ink },
  subtitle: { fontSize: 14, color: C.sub, marginTop: 2 },
  input: {
    marginTop: 14,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.blue,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 22,
    color: C.ink,
  },
  notFound: { marginTop: 8, color: C.red, fontSize: 14 },
  row: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' },
  rowWord: { fontSize: 20, color: C.ink, flex: 1 },
  kidStar: { fontSize: 13, color: '#9A6B00', fontWeight: '600' },
  sep: { height: 1, backgroundColor: C.line, marginLeft: 20 },
  daily: { margin: 18, marginBottom: 8, backgroundColor: C.blue, borderRadius: 20, padding: 18 },
  dailyLabel: { color: '#DCE7FF', fontSize: 14, fontWeight: '600' },
  dailyWord: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4 },
  info: { marginHorizontal: 18, marginTop: 6, color: C.sub, fontSize: 13, lineHeight: 19 },
  section: { marginHorizontal: 20, marginTop: 18, marginBottom: 4, fontSize: 14, fontWeight: '700', color: C.sub },
});
