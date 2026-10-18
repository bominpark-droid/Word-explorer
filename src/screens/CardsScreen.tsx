import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SpeakButton } from '../components/common';
import { getEntry, lookup } from '../db';
import { useDict } from '../dbProvider';
import { C } from '../theme';
import type { Entry } from '../types';
import * as wordbook from '../wordbook';

// Flashcards over the words in the wordbook that are not marked known yet.
export default function CardsScreen({ onBack }: { onBack: () => void }) {
  const db = useDict();
  const deck = useMemo(() => shuffle(wordbook.list().filter((w) => !w.known).map((w) => w.word)), []);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [knownCount, setKnownCount] = useState(0);

  useEffect(() => {
    setFlipped(false);
    setEntry(null);
    if (i >= deck.length) return;
    lookup(db, deck[i]).then((r) => (r ? getEntry(db, r.id).then(setEntry) : null));
  }, [db, deck, i]);

  if (deck.length === 0 || i >= deck.length) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.done}>{deck.length ? '🎉 끝! Great job!' : '외울 단어가 없어요'}</Text>
        {deck.length ? <Text style={styles.doneSub}>이번에 {knownCount}개를 외웠어요.</Text> : null}
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>단어장으로</Text>
        </Pressable>
      </View>
    );
  }

  const word = deck[i];
  const kid = entry?.kidSenses[0];
  const dict = entry?.dictSenses[0];

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.link}>‹ 단어장</Text>
        </Pressable>
        <Text style={styles.progress}>
          {i + 1} / {deck.length}
        </Text>
      </View>
      <Pressable style={styles.card} onPress={() => setFlipped(!flipped)}>
        <View style={styles.wordRow}>
          <Text style={styles.word}>{word}</Text>
          <SpeakButton text={word} size={26} />
        </View>
        {!flipped ? (
          <Text style={styles.tap}>뜻이 생각나면 카드를 탭해서 확인해요</Text>
        ) : kid ? (
          <View>
            <Text style={styles.simple}>{kid.simple}</Text>
            <Text style={styles.ko}>{kid.ko}</Text>
            {kid.examples[0] ? <Text style={styles.ex}>“{kid.examples[0].en}”</Text> : null}
          </View>
        ) : dict ? (
          <Text style={styles.simple}>{dict.def}</Text>
        ) : null}
      </Pressable>
      <View style={styles.btns}>
        <Pressable style={[styles.btn, { backgroundColor: C.koBg }]} onPress={() => setI(i + 1)}>
          <Text style={[styles.btnText, { color: C.koInk }]}>다시 볼래요</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, { backgroundColor: C.green }]}
          onPress={() => {
            wordbook.setKnown(word, true);
            setKnownCount(knownCount + 1);
            setI(i + 1);
          }}
        >
          <Text style={[styles.btnText, { color: '#fff' }]}>알아요 ✓</Text>
        </Pressable>
      </View>
    </View>
  );
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 18 },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  link: { color: C.blue, fontSize: 18, fontWeight: '600' },
  progress: { color: C.sub, fontSize: 16 },
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 24,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.line,
  },
  wordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 18 },
  word: { fontSize: 40, fontWeight: '800', color: C.ink, textAlign: 'center' },
  tap: { textAlign: 'center', color: C.faint, fontSize: 15 },
  simple: { fontSize: 20, lineHeight: 28, color: C.ink, textAlign: 'center' },
  ko: { fontSize: 22, color: C.koInk, fontWeight: '800', textAlign: 'center', marginTop: 14 },
  ex: { fontSize: 16, color: C.sub, textAlign: 'center', marginTop: 14, fontStyle: 'italic' },
  btns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  btnText: { fontSize: 18, fontWeight: '700' },
  done: { fontSize: 30, fontWeight: '800', color: C.ink, textAlign: 'center', marginTop: 120 },
  doneSub: { fontSize: 17, color: C.sub, textAlign: 'center', marginTop: 10 },
  backBtn: { marginTop: 30, alignSelf: 'center', backgroundColor: C.blue, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14 },
  backText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
