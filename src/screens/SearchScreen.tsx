import { useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { kidCount, koWordCount, lookup, randomKidWord, spellSuggest, suggest, withKorean } from '../db';
import { useDict } from '../dbProvider';
import { C, shadow } from '../theme';
import type { WordRow } from '../types';
import { naverUrl } from './WordScreen';

type Props = { onOpen: (id: number) => void; recent: WordRow[] };

export default function SearchScreen({ onOpen, recent }: Props) {
  const db = useDict();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<WordRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [spell, setSpell] = useState<WordRow[]>([]);
  const [daily, setDaily] = useState<WordRow | null>(null);
  const [recentKo, setRecentKo] = useState<WordRow[]>(recent);
  const [count, setCount] = useState(0);
  const [koCount, setKoCount] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    randomKidWord(db).then((w) => (w ? withKorean(db, [w]).then((r) => setDaily(r[0])) : null));
    kidCount(db).then(setCount);
    koWordCount(db).then(setKoCount);
  }, [db]);

  useEffect(() => {
    withKorean(db, recent).then(setRecentKo);
  }, [db, recent]);

  useEffect(() => {
    const n = ++seq.current;
    setSearched(false);
    suggest(db, q)
      .then((r) => withKorean(db, r))
      .then(async (r) => {
        if (n !== seq.current) return;
        setRows(r);
        // Nothing starts with these letters: offer close spellings right away.
        const s = q.trim() && !r.length ? await withKorean(db, await spellSuggest(db, q)) : [];
        if (n === seq.current) setSpell(s);
      });
  }, [db, q]);

  const submit = async () => {
    if (!q.trim()) return;
    const row = await lookup(db, q);
    if (row) {
      Keyboard.dismiss();
      onOpen(row.id);
    } else {
      setSearched(true);
      setSpell(await withKorean(db, await spellSuggest(db, q)));
    }
  };

  const notFound = q.trim() !== '' && (searched || !rows.length);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.logo}>📘</Text>
          <View>
            <Text style={styles.title}>Word Explorer</Text>
            <Text style={styles.subtitle}>쉬운 영영한 사전 · 인터넷 없이도 돼요</Text>
          </View>
        </View>
        <View style={styles.inputWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={submit}
            placeholder="영어 단어를 써 보세요"
            placeholderTextColor={C.faint}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel="Clear">
              <Text style={styles.clear}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {notFound ? (
        <FlatList
          data={spell}
          keyExtractor={(r) => 's' + r.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.missBox}>
              <Text style={styles.missTitle}>“{q.trim()}” 단어를 찾지 못했어요</Text>
              <Text style={styles.missText}>
                {spell.length ? '혹시 이 단어인가요? 철자를 한 번 더 확인해 보세요.' : '철자를 한 번 더 확인해 보세요.'}
              </Text>
              <Pressable style={styles.naverBtn} onPress={() => Linking.openURL(naverUrl(q.trim()))}>
                <Text style={styles.naverText}>🌐 네이버 사전에서 찾아보기 (인터넷 필요)</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => <Row item={item} onPress={() => onOpen(item.id)} />}
        />
      ) : q.trim() ? (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <Row item={item} onPress={() => onOpen(item.id)} />}
        />
      ) : (
        <FlatList
          data={recentKo}
          keyExtractor={(r) => 'r' + r.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              {daily ? (
                <Pressable style={styles.daily} onPress={() => onOpen(daily.id)}>
                  <Text style={styles.dailyLabel}>✨ Word of the day 오늘의 단어</Text>
                  <Text style={styles.dailyWord}>{daily.word}</Text>
                  {daily.ko ? <Text style={styles.dailyKo}>{daily.ko}</Text> : null}
                  <Text style={styles.dailyGo}>눌러서 뜻 보기 ›</Text>
                </Pressable>
              ) : null}
              <Text style={styles.info}>
                {koCount ? `${koCount.toLocaleString()}개 단어에 한국어 뜻이 있어요. ` : ''}⭐ {count.toLocaleString()}개는 4학년 눈높이로
                쉬운 설명과 예문을 따로 만들었어요.
              </Text>
              {recent.length ? <Text style={styles.section}>Recent 최근 찾은 단어</Text> : null}
            </View>
          }
          renderItem={({ item }) => <Row item={item} onPress={() => onOpen(item.id)} />}
        />
      )}
    </View>
  );
}

function Row({ item, onPress }: { item: WordRow; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.blueSoft }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowWord}>
          {item.word}
          {item.kid === 2 ? <Text style={styles.star}> ⭐</Text> : null}
        </Text>
        {item.ko ? (
          <Text style={styles.rowKo} numberOfLines={1}>
            {item.ko}
          </Text>
        ) : null}
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { fontSize: 34 },
  title: { fontSize: 28, fontWeight: '800', color: C.ink },
  subtitle: { fontSize: 14, color: C.sub, marginTop: 1 },
  inputWrap: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: C.blue,
    paddingHorizontal: 14,
    ...shadow,
  },
  searchIcon: { fontSize: 20, marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 22, color: C.ink, minWidth: 0, outlineWidth: 0 },
  clear: { fontSize: 18, color: C.faint, paddingHorizontal: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow,
  },
  rowWord: { fontSize: 20, color: C.ink, fontWeight: '700' },
  star: { fontSize: 14 },
  rowKo: { fontSize: 15, color: C.koInk, marginTop: 2 },
  chev: { fontSize: 24, color: C.faint, marginLeft: 8 },
  missBox: { backgroundColor: C.card, borderRadius: 18, padding: 16, marginTop: 8, ...shadow },
  missTitle: { fontSize: 18, fontWeight: '800', color: C.ink },
  missText: { fontSize: 15, color: C.sub, marginTop: 6, lineHeight: 21 },
  naverBtn: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#03C75A', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9 },
  naverText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  daily: { marginTop: 8, backgroundColor: C.blue, borderRadius: 24, padding: 20, ...shadow },
  dailyLabel: { color: '#DDE1FF', fontSize: 14, fontWeight: '700' },
  dailyWord: { color: '#fff', fontSize: 36, fontWeight: '800', marginTop: 4 },
  dailyKo: { color: '#FFE3C2', fontSize: 19, fontWeight: '700', marginTop: 2 },
  dailyGo: { color: '#DDE1FF', fontSize: 14, marginTop: 10 },
  info: { marginTop: 12, color: C.sub, fontSize: 13, lineHeight: 19 },
  section: { marginTop: 18, marginBottom: 2, fontSize: 15, fontWeight: '800', color: C.sub },
});
