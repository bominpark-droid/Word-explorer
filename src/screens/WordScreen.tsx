import { useNetworkState } from 'expo-network';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SaveButton, SpeakButton } from '../components/common';
import { getEntry, lookup, relatedBase } from '../db';
import { useDict } from '../dbProvider';
import { koreanLabel } from '../online';
import { C, POS_KO, TOPIC_LABEL, shadow } from '../theme';
import type { DictSense, Entry, WordRow } from '../types';

type Props = { id: number; onBack: () => void; onOpen: (id: number) => void };

// One meaning as the child sees it: Korean, easy English, and examples, all visible at once.
type Meaning = { pos: string; ko: string; en: string; koSimple?: string; examples: { en: string; ko?: string }[] };

export const naverUrl = (w: string) => `https://en.dict.naver.com/#/search?query=${encodeURIComponent(w)}`;

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
      relatedBase(db, e.word, e.id).then((b) => alive && setBase(b));
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
  // Main cards: hand-written senses, else the common-word glosses. Everything else
  // (the raw WordNet senses) waits behind one "more meanings" button.
  const meanings: Meaning[] = hasKid
    ? entry.kidSenses.map((s) => ({ pos: s.pos, ko: s.ko, en: s.simple, koSimple: s.ko_simple, examples: s.examples }))
    : entry.dictSenses
        .filter((s) => s.ko && s.easy)
        .map((s) => ({
          pos: s.pos,
          ko: s.ko!,
          en: s.easy!,
          examples: s.exampleEn ? [{ en: s.exampleEn, ko: s.exampleKo ?? undefined }] : [],
        }));
  const rest = hasKid ? entry.dictSenses : entry.dictSenses.filter((s) => !(s.ko && s.easy));
  const openWord = async (w: string) => {
    const row = await lookup(db, w);
    if (row) onOpen(row.id);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.topbar}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.back}>‹ 뒤로</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.word}>{entry.word}</Text>
          {entry.ipa ? <Text style={styles.ipa}>/{entry.ipa}/</Text> : null}
          {meanings.length > 1 ? <Text style={styles.heroKo}>{uniqueKo(meanings)}</Text> : null}
          <View style={styles.heroBtns}>
            <SpeakButton text={entry.word} big />
            <SaveButton word={entry.word} />
          </View>
          {entry.topic && TOPIC_LABEL[entry.topic] ? <Text style={styles.topic}>{TOPIC_LABEL[entry.topic]}</Text> : null}
        </View>
        {base ? (
          <Pressable onPress={() => onOpen(base.id)} style={styles.baseLink}>
            <Text style={styles.baseText}>
              기본형 Base word: <Text style={{ fontWeight: '800' }}>{base.word}</Text> 보기 ›
            </Text>
          </Pressable>
        ) : null}

        {meanings.map((m, i) => (
          <MeaningCard key={i} m={m} index={i} total={meanings.length} />
        ))}

        {!meanings.length ? (
          <View style={styles.note}>
            <Text style={styles.noteText}>
              이 단어는 아직 한국어 뜻을 준비하지 못했어요. 아래 영어 뜻을 보거나, 인터넷이 되면 네이버 사전에서 한국어 뜻을 볼 수 있어요.
            </Text>
            <Pressable style={styles.naverBtn} onPress={() => Linking.openURL(naverUrl(entry.word))}>
              <Text style={styles.naverText}>🌐 네이버 사전에서 한국어 뜻 보기</Text>
            </Pressable>
          </View>
        ) : null}

        {rest.length > 0 ? (
          meanings.length && !showDict ? (
            <Pressable style={styles.moreBtn} onPress={() => setShowDict(true)}>
              <Text style={styles.moreText}>다른 뜻 더 보기 (영어 사전, {rest.length}) ▾</Text>
            </Pressable>
          ) : (
            <DictSenses senses={rest} onWord={openWord} />
          )
        ) : null}

        <Text style={styles.credit}>
          {hasKid ? 'Easy definitions, Korean & examples: written for this app (AI-assisted). ' : ''}
          {entry.dictSenses.some((s) => s.ko) ? 'Common-word easy meanings and Korean: AI-written, not human-reviewed. ' : ''}
          Dictionary: Open English WordNet (CC BY 4.0), based on Princeton WordNet.
        </Text>
      </ScrollView>
    </View>
  );
}

// "달리다 · 경주" — the Korean meanings of a several-meaning word at a glance, without repeats.
function uniqueKo(ms: Meaning[]): string {
  const seen: string[] = [];
  for (const m of ms) if (!seen.includes(m.ko)) seen.push(m.ko);
  return seen.slice(0, 3).join(' · ');
}

function MeaningCard({ m, index, total }: { m: Meaning; index: number; total: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.posRow}>
        {total > 1 ? <Text style={styles.num}>{index + 1}</Text> : null}
        <Text style={styles.pos}>
          {m.pos} · {POS_KO[m.pos] ?? m.pos}
        </Text>
      </View>
      <View style={styles.koBox}>
        <Text style={styles.koFlag}>🇰🇷</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.koMain}>{m.ko}</Text>
          {m.koSimple ? <Text style={styles.koSimple}>{m.koSimple}</Text> : null}
        </View>
      </View>
      <Text style={styles.enLabel}>English 영어 뜻</Text>
      <Text style={styles.simple}>{m.en}</Text>
      {m.examples.length ? <Text style={styles.exLabel}>{m.examples.length > 1 ? 'Examples' : 'Example'} 예문</Text> : null}
      {m.examples.map((e, i) => (
        <View key={i} style={styles.exRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.exText}>{e.en}</Text>
            {e.ko ? <Text style={styles.exKo}>{e.ko}</Text> : null}
          </View>
          <SpeakButton text={e.en} />
        </View>
      ))}
    </View>
  );
}

function DictSenses({ senses, onWord }: { senses: DictSense[]; onWord: (w: string) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? senses : senses.slice(0, 6);
  return (
    <View style={[styles.card, { backgroundColor: '#FBFBFE' }]}>
      <Text style={styles.dictTitle}>Dictionary meanings 영어 사전 뜻</Text>
      {shown.map((s, i) => (
        <View key={i} style={styles.dictSense}>
          <Text style={styles.dictPos}>
            {i + 1}. {s.pos} · {POS_KO[s.pos] ?? s.pos}
          </Text>
          {s.ko ? <Text style={styles.dictKo}>🇰🇷 {s.ko}</Text> : null}
          <Text style={styles.dictDef}>{s.def}</Text>
          {s.wikidata && !s.ko ? <OnlineKorean qid={s.wikidata} /> : null}
          {s.examples.slice(0, 2).map((e, j) => (
            <Text key={j} style={styles.dictEx}>
              “{e}”
            </Text>
          ))}
          {s.synonyms.length > 0 ? (
            <View style={styles.synRow}>
              <Text style={styles.synLabel}>Same as 비슷한 말: </Text>
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
  topbar: { paddingHorizontal: 12, paddingVertical: 8 },
  backBtn: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: C.card, ...shadow },
  back: { color: C.blue, fontSize: 17, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingBottom: 48 },
  hero: { backgroundColor: C.card, borderRadius: 24, padding: 20, marginTop: 4, ...shadow },
  word: { fontSize: 40, fontWeight: '800', color: C.ink, letterSpacing: 0.3 },
  ipa: { fontSize: 17, color: C.sub, marginTop: 2 },
  heroKo: { fontSize: 22, fontWeight: '800', color: C.koInk, marginTop: 8, lineHeight: 30 },
  heroBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, alignItems: 'center' },
  topic: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: C.greenSoft,
    color: C.green,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: '700',
    overflow: 'hidden',
  },
  card: { backgroundColor: C.card, borderRadius: 20, padding: 18, marginTop: 14, ...shadow },
  posRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  num: {
    backgroundColor: C.blue,
    color: '#fff',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '800',
    overflow: 'hidden',
  },
  pos: {
    color: C.blue,
    fontWeight: '800',
    fontSize: 14,
    backgroundColor: C.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  koBox: { flexDirection: 'row', gap: 10, marginTop: 12, backgroundColor: C.koBg, borderRadius: 14, padding: 14 },
  koFlag: { fontSize: 20, lineHeight: 28 },
  koMain: { fontSize: 22, fontWeight: '800', color: C.koInk, lineHeight: 28 },
  koSimple: { fontSize: 16, color: C.ink, marginTop: 4, lineHeight: 23 },
  enLabel: { marginTop: 14, fontSize: 13, fontWeight: '800', color: C.sub },
  simple: { fontSize: 20, lineHeight: 29, color: C.ink, marginTop: 4, fontWeight: '500' },
  exLabel: { marginTop: 14, fontSize: 13, fontWeight: '800', color: C.sub },
  exRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: C.greenSoft,
    padding: 12,
    borderRadius: 14,
  },
  exText: { fontSize: 17, lineHeight: 24, color: C.ink },
  exKo: { fontSize: 15, color: C.green, marginTop: 4, lineHeight: 21 },
  note: { marginTop: 14, backgroundColor: C.blueSoft, borderRadius: 16, padding: 14 },
  noteText: { color: C.sub, fontSize: 15, lineHeight: 22 },
  naverBtn: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#03C75A', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9 },
  naverText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  moreBtn: { marginTop: 14, padding: 12, alignSelf: 'center' },
  moreText: { color: C.blue, fontWeight: '700', fontSize: 15 },
  dictTitle: { fontSize: 15, fontWeight: '800', color: C.sub, marginBottom: 4 },
  dictSense: { marginTop: 12 },
  dictPos: { fontSize: 13, color: C.blue, fontWeight: '800' },
  dictKo: { fontSize: 16, color: C.koInk, fontWeight: '800', marginTop: 2 },
  dictDef: { fontSize: 16, color: C.ink, lineHeight: 23, marginTop: 2 },
  dictEx: { fontSize: 14, color: C.sub, fontStyle: 'italic', marginTop: 3 },
  onlineKo: { fontSize: 14, color: C.koInk, marginTop: 3 },
  synRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, alignItems: 'center' },
  synLabel: { fontSize: 13, color: C.faint },
  syn: { fontSize: 13, color: C.blue, marginRight: 10, textDecorationLine: 'underline' },
  baseLink: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: C.blueSoft, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7 },
  baseText: { color: C.blue, fontSize: 15 },
  credit: { marginTop: 28, fontSize: 11, color: C.faint, lineHeight: 16 },
});
