import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { lookup, storeLine } from '../db';
import { useDict } from '../dbProvider';
import { C } from '../theme';
import * as wordbook from '../wordbook';

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
  const [copied, setCopied] = useState('');

  // Copies every saved word as "word | Korean | definition | example" for the English Store app.
  const copyForStore = async () => {
    const lines = await Promise.all(items.map((i) => storeLine(db, i.word)));
    const ok = await Clipboard.setStringAsync(lines.join('\n')).catch(() => false);
    setCopied(ok ? `${lines.length}개 복사했어요. 영어편의점 > 학교 단어 관리에 붙여 넣고 저장하세요.` : '복사가 안 됐어요. 다시 눌러 주세요.');
  };

  const open = async (w: string) => {
    const row = await lookup(db, w);
    if (row) onOpen(row.id);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.title}>My Wordbook</Text>
        <Text style={styles.subtitle}>
          내 단어장 · {items.length}개 (외우는 중 {learning}개)
        </Text>
        {items.length ? (
          <Pressable style={styles.cardsBtn} onPress={onCards}>
            <Text style={styles.cardsText}>🃏 카드로 외우기 Practice</Text>
          </Pressable>
        ) : null}
        {items.length ? (
          <Pressable style={styles.copyBtn} onPress={copyForStore}>
            <Text style={styles.copyText}>📋 영어편의점으로 복사</Text>
          </Pressable>
        ) : null}
        {copied ? <Text style={styles.copied}>{copied}</Text> : null}
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.word}
        ListEmptyComponent={
          <Text style={styles.empty}>
            아직 단어가 없어요.{'\n'}단어 화면에서 ☆ 단어장에 넣기를 한 번 누르면 여기로 와요.
          </Text>
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
              <Text style={styles.date}>{new Date(item.added_at).toLocaleDateString()}</Text>
            </Pressable>
            <Pressable hitSlop={10} onPress={() => wordbook.remove(item.word)} accessibilityLabel="Delete">
              <Text style={styles.del}>✕</Text>
            </Pressable>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 30, fontWeight: '800', color: C.ink },
  subtitle: { fontSize: 14, color: C.sub, marginTop: 2 },
  cardsBtn: { marginTop: 14, backgroundColor: C.green, borderRadius: 16, padding: 14, alignItems: 'center' },
  cardsText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  copyBtn: { marginTop: 10, borderWidth: 2, borderColor: C.blue, borderRadius: 16, padding: 12, alignItems: 'center' },
  copyText: { color: C.blue, fontSize: 16, fontWeight: '700' },
  copied: { marginTop: 8, color: C.green, fontSize: 14, textAlign: 'center' },
  empty: { textAlign: 'center', color: C.sub, marginTop: 40, lineHeight: 24, fontSize: 15, paddingHorizontal: 24 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, gap: 14 },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: C.green, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.green },
  word: { fontSize: 20, color: C.ink, fontWeight: '600' },
  known: { color: C.faint, textDecorationLine: 'line-through' },
  date: { fontSize: 12, color: C.faint, marginTop: 2 },
  del: { fontSize: 18, color: C.faint, padding: 4 },
  sep: { height: 1, backgroundColor: C.line, marginLeft: 60 },
});
