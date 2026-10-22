import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { koreanFor, lookup, storeLine } from '../db';
import { useDict } from '../dbProvider';
import { C, shadow } from '../theme';
import * as wordbook from '../wordbook';

// The owner's English Store app (same github.io address). Its 학교 단어 관리 editor takes
// one "word | Korean | definition | example" line per word.
const STORE_URL = 'https://bominpark-droid.github.io/English-convinience-store/';

type Props = { onOpen: (id: number) => void; onCards: () => void };

export function useWordbook(): wordbook.Saved[] {
  const [items, setItems] = useState(wordbook.list);
  useEffect(() => wordbook.subscribe(() => setItems(wordbook.list())), []);
  return items;
}

export default function WordbookScreen({ onOpen, onCards }: Props) {
  const db = useDict();
  const items = useWordbook();
  const learning = items.filter((i) => !i.known).length;
  const [ko, setKo] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<string[]>([]);
  const [copied, setCopied] = useState<'' | 'ok' | 'fail'>('');

  // Prepared ahead of the tap, so the copy happens right inside the tap
  // (browsers only allow clipboard writes there).
  useEffect(() => {
    let alive = true;
    Promise.all(items.map((i) => storeLine(db, i.word))).then((l) => alive && setLines(l));
    Promise.all(items.map(async (i) => [i.word, await koreanFor(db, i.word)] as const)).then(
      (pairs) => alive && setKo(Object.fromEntries(pairs)),
    );
    return () => {
      alive = false;
    };
  }, [db, items]);

  const copyForStore = () => {
    Clipboard.setStringAsync(lines.join('\n'))
      .then((ok) => setCopied(ok ? 'ok' : 'fail'))
      .catch(() => setCopied('fail'));
  };

  const open = async (w: string) => {
    const row = await lookup(db, w);
    if (row) onOpen(row.id);
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.word}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.logo}>⭐</Text>
              <View>
                <Text style={styles.title}>My Wordbook</Text>
                <Text style={styles.subtitle}>
                  내 단어장 · {items.length}개 (외우는 중 {learning}개)
                </Text>
              </View>
            </View>
            {items.length ? (
              <View style={styles.actions}>
                <Pressable style={styles.cardsBtn} onPress={onCards}>
                  <Text style={styles.cardsText}>🃏 카드로 외우기</Text>
                </Pressable>
                <View style={styles.storeBox}>
                  <Text style={styles.storeTitle}>🏪 영어편의점으로 옮기기</Text>
                  <Text style={styles.storeStep}>① 아래 버튼을 눌러 단어 {items.length}개를 복사해요.</Text>
                  <Text style={styles.storeStep}>② 영어편의점을 열고 학교 단어 관리에 붙여 넣은 뒤 저장해요.</Text>
                  <View style={styles.storeBtns}>
                    <Pressable
                      style={[styles.copyBtn, lines.length !== items.length && { opacity: 0.5 }]}
                      disabled={lines.length !== items.length}
                      onPress={copyForStore}
                    >
                      <Text style={styles.copyText}>📋 단어 복사하기</Text>
                    </Pressable>
                    <Pressable style={styles.openBtn} onPress={() => Linking.openURL(STORE_URL)}>
                      <Text style={styles.openText}>영어편의점 열기 ›</Text>
                    </Pressable>
                  </View>
                  {copied === 'ok' ? (
                    <Text style={styles.copied}>✓ {lines.length}개 복사했어요. 이제 영어편의점을 열어 붙여 넣으세요.</Text>
                  ) : copied === 'fail' ? (
                    <Text style={[styles.copied, { color: C.red }]}>복사가 안 됐어요. 다시 눌러 주세요.</Text>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.empty}>
              아직 단어가 없어요.{'\n'}단어 화면에서 ☆ 단어장에 넣기를 누르면 여기로 와요.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              hitSlop={8}
              onPress={() => wordbook.setKnown(item.word, !item.known)}
              style={[styles.check, item.known ? styles.checkOn : null]}
              accessibilityLabel={item.known ? 'Mark as learning' : 'Mark as known'}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>{item.known ? '✓' : ''}</Text>
            </Pressable>
            <Pressable style={{ flex: 1 }} onPress={() => open(item.word)}>
              <Text style={[styles.word, item.known ? styles.known : null]}>{item.word}</Text>
              {ko[item.word] ? (
                <Text style={styles.ko} numberOfLines={1}>
                  {ko[item.word]}
                </Text>
              ) : null}
            </Pressable>
            <Pressable hitSlop={10} onPress={() => wordbook.remove(item.word)} accessibilityLabel="Delete">
              <Text style={styles.del}>✕</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  header: { paddingTop: 12, paddingBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { fontSize: 32 },
  title: { fontSize: 28, fontWeight: '800', color: C.ink },
  subtitle: { fontSize: 14, color: C.sub, marginTop: 1 },
  actions: { marginTop: 14, gap: 12 },
  cardsBtn: { backgroundColor: C.green, borderRadius: 18, padding: 15, alignItems: 'center', ...shadow },
  cardsText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  storeBox: { backgroundColor: C.card, borderRadius: 18, padding: 16, ...shadow },
  storeTitle: { fontSize: 17, fontWeight: '800', color: C.ink, marginBottom: 6 },
  storeStep: { fontSize: 14, color: C.sub, lineHeight: 21 },
  storeBtns: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  copyBtn: { backgroundColor: C.blue, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11 },
  copyText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  openBtn: { borderWidth: 2, borderColor: C.blue, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9 },
  openText: { color: C.blue, fontSize: 16, fontWeight: '800' },
  copied: { marginTop: 10, color: C.green, fontSize: 14, fontWeight: '700' },
  emptyBox: { alignItems: 'center', marginTop: 40 },
  emptyIcon: { fontSize: 44 },
  empty: { textAlign: 'center', color: C.sub, marginTop: 10, lineHeight: 24, fontSize: 15, paddingHorizontal: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
    gap: 14,
    ...shadow,
  },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: C.green, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.green },
  word: { fontSize: 20, color: C.ink, fontWeight: '700' },
  known: { color: C.faint, textDecorationLine: 'line-through' },
  ko: { fontSize: 15, color: C.koInk, marginTop: 2 },
  del: { fontSize: 18, color: C.faint, padding: 4 },
});
