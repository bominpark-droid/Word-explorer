import { useNetworkState } from 'expo-network';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SaveButton, SpeakButton } from '../components/common';
import { getEntry, lookup, relatedBase } from '../db';
import { useDict } from '../dbProvider';
import { koreanLabel } from '../online';
import { C, POS_KO, TOPIC_LABEL } from '../theme';
import type { DictSense, Entry, KidSense, WordRow } from '../types';

type Props = { id: number; onBack: () => void; onOpen: (id: number) => void };

export default function WordScreen({ id, onBack, onOpen }: Props) {
  const db = useDict();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [showDict, setShowDict] = useState(false);
  const [base, setBase] = useState<WordRow | null>(null);

  useEffect(() => {
    let alive = true;
    setEntry(null);
    setShowDict(false);
    setBase(null);
    getEntry(db, id).then((e) => {
      if (!alive || !e) return;
      setEntry(e);
      relatedBase(db, e.word).then((b) => alive && setBase(b));
    });
    return () => {
      alive = false;
    };
  }, [db, id]);

  if (!entry) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.blue} />
      </View>
    );
  }

  const hasKid = entry.kidSenses.length > 0;
  const openWord = async (w: string) => {
    const row = await lookup(db, w);
    if (row) onOpen(row.id);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.topbar}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headRow}>
          <Text style={styles.word}>{entry.word}</Text>
          <SpeakButton text={entry.word} size={28} />
        </View>
        {entry.ipa ? <Text style={styles.ipa}>/{entry.ipa}/</Text> : null}
        {entry.topic && TOPIC_LABEL[entry.topic] ? <Text style={styles.topic}>{TOPIC_LABEL[entry.topic]}</Text> : null}
        {base ? (
          <Pressable onPress={() => onOpen(base.id)} style={styles.baseLink}>
            <Text style={styles.baseText}>
              기본형 보기 Base word: <Text style={{ fontWeight: '800' }}>{base.word}</Text> {base.kid ? '⭐' : ''} ›
            </Text>
          </Pressable>
        ) : null}
        <View style={{ marginTop: 12 }}>
          <SaveButton word={entry.word} />
        </View>

        {hasKid ? (
          entry.kidSenses.map((s, i) => <KidSenseCard key={i} sense={s} index={i} total={entry.kidSenses.length} />)
        ) : (
          <View style={styles.note}>
            <Text style={styles.noteText}>
              이 단어는 아직 쉬운 설명이 없어서 영어 사전(WordNet)의 뜻을 보여줘요.
            </Text>
          </View>
        )}

        {entry.dictSenses.length > 0 ? (
          hasKid && !showDict ? (
            <Pressable style={styles.moreBtn} onPress={() => setShowDict(true)}>
              <Text style={styles.moreText}>More meanings from the dictionary ({entry.dictSenses.length}) ▾</Text>
            </Pressable>
          ) : (
            <DictSenses senses={entry.dictSenses} onWord={openWord} />
          )
        ) : null}

        <Text style={styles.credit}>
          {hasKid ? 'Easy definitions, Korean & examples: written for this app (AI-assisted). ' : ''}
          Dictionary: Open English WordNet (CC BY 4.0), based on Princeton WordNet.
        </Text>
      </ScrollView>
    </View>
  );
}

function KidSenseCard({ sense, index, total }: { sense: KidSense; index: number; total: number }) {
  const [ko, setKo] = useState(false);
  return (
    <View style={styles.card}>
      <View style={styles.posRow}>
        {total > 1 ? <Text style={styles.num}>{index + 1}</Text> : null}
        <Text style={styles.pos}>
          {sense.pos} · {POS_KO[sense.pos] ?? sense.pos}
        </Text>
      </View>
      <Text style={styles.simple}>{sense.simple}</Text>
      <Pressable style={[styles.koBtn, ko && styles.koBtnOn]} onPress={() => setKo(!ko)}>
        <Text style={styles.koBtnText}>{ko ? '한국어 뜻 숨기기' : '🇰🇷 한국어로 보기'}</Text>
      </Pressable>
      {ko ? (
        <View style={styles.koBox}>
          <Text style={styles.koMain}>{sense.ko}</Text>
          <Text style={styles.koSimple}>{sense.ko_simple}</Text>
        </View>
      ) : null}
      <Text style={styles.exLabel}>Examples 예문</Text>
      {sense.examples.map((e, i) => (
        <ExampleRow key={i} en={e.en} ko={e.ko} />
      ))}
    </View>
  );
}

function ExampleRow({ en, ko }: { en: string; ko?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => ko && setOpen(!open)} style={styles.exRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.exText}>“{en}”</Text>
        {open && ko ? <Text style={styles.exKo}>{ko}</Text> : null}
        {ko && !open ? <Text style={styles.exHint}>탭하면 한국어</Text> : null}
      </View>
      <SpeakButton text={en} size={18} />
    </Pressable>
  );
}

function DictSenses({ senses, onWord }: { senses: DictSense[]; onWord: (w: string) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? senses : senses.slice(0, 6);
  return (
    <View style={[styles.card, { backgroundColor: '#FAFAFC' }]}>
      <Text style={styles.dictTitle}>Dictionary meanings</Text>
      {shown.map((s, i) => (
        <View key={i} style={styles.dictSense}>
          <Text style={styles.dictPos}>
            {i + 1}. {s.pos} · {POS_KO[s.pos] ?? s.pos}
          </Text>
          <Text style={styles.dictDef}>{s.def}</Text>
          {s.wikidata ? <OnlineKorean qid={s.wikidata} /> : null}
          {s.examples.slice(0, 2).map((e, j) => (
            <Text key={j} style={styles.dictEx}>
              “{e}”
            </Text>
          ))}
          {s.synonyms.length > 0 ? (
            <View style={styles.synRow}>
              <Text style={styles.synLabel}>Same as: </Text>
              {s.synonyms.slice(0, 5).map((w) => (
                <Pressable key={w} onPress={() => onWord(w)}>
                  <Text style={styles.syn}>{w}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ))}
      {!all && senses.length > shown.length ? (
        <Pressable onPress={() => setAll(true)}>
          <Text style={styles.moreText}>Show all {senses.length} ▾</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function OnlineKorean({ qid }: { qid: string }) {
  const net = useNetworkState();
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    if (net.isConnected) koreanLabel(qid).then(setLabel);
  }, [qid, net.isConnected]);
  if (!label) return null;
  return <Text style={styles.onlineKo}>🇰🇷 {label} (위키데이터, 온라인)</Text>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topbar: { paddingHorizontal: 16, paddingVertical: 10 },
  back: { color: C.blue, fontSize: 18, fontWeight: '600' },
  scroll: { paddingHorizontal: 18, paddingBottom: 48 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  word: { fontSize: 38, fontWeight: '800', color: C.ink, flexShrink: 1 },
  ipa: { fontSize: 17, color: C.sub, marginTop: 2 },
  topic: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: C.greenSoft,
    color: C.green,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: '600',
    overflow: 'hidden',
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: C.line,
  },
  posRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  num: {
    backgroundColor: C.blue,
    color: '#fff',
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '700',
    overflow: 'hidden',
  },
  pos: { color: C.blue, fontWeight: '700', fontSize: 14 },
  simple: { fontSize: 21, lineHeight: 30, color: C.ink, marginTop: 8, fontWeight: '500' },
  koBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: C.koBg,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  koBtnOn: { backgroundColor: '#FBE3D2' },
  koBtnText: { color: C.koInk, fontWeight: '700', fontSize: 15 },
  koBox: { marginTop: 10, backgroundColor: C.koBg, borderRadius: 12, padding: 12 },
  koMain: { fontSize: 20, fontWeight: '800', color: C.koInk },
  koSimple: { fontSize: 16, color: C.ink, marginTop: 4, lineHeight: 23 },
  exLabel: { marginTop: 16, fontSize: 13, fontWeight: '700', color: C.sub },
  exRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginTop: 8,
    backgroundColor: C.blueSoft,
    padding: 12,
    borderRadius: 12,
  },
  exText: { fontSize: 17, lineHeight: 24, color: C.ink },
  exKo: { fontSize: 15, color: C.koInk, marginTop: 6, lineHeight: 21 },
  exHint: { fontSize: 11, color: C.faint, marginTop: 4 },
  note: { marginTop: 16, backgroundColor: C.blueSoft, borderRadius: 12, padding: 12 },
  noteText: { color: C.sub, fontSize: 14, lineHeight: 20 },
  moreBtn: { marginTop: 16, padding: 12 },
  moreText: { color: C.blue, fontWeight: '600', fontSize: 15 },
  dictTitle: { fontSize: 15, fontWeight: '700', color: C.sub, marginBottom: 4 },
  dictSense: { marginTop: 10 },
  dictPos: { fontSize: 13, color: C.blue, fontWeight: '700' },
  dictDef: { fontSize: 16, color: C.ink, lineHeight: 23, marginTop: 2 },
  dictEx: { fontSize: 14, color: C.sub, fontStyle: 'italic', marginTop: 3 },
  onlineKo: { fontSize: 14, color: C.koInk, marginTop: 3 },
  synRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, alignItems: 'center' },
  synLabel: { fontSize: 13, color: C.faint },
  syn: { fontSize: 13, color: C.blue, marginRight: 10, textDecorationLine: 'underline' },
  baseLink: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: C.blueSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  baseText: { color: C.blue, fontSize: 15 },
  credit: { marginTop: 28, fontSize: 11, color: C.faint, lineHeight: 16 },
});
