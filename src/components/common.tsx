import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { C } from '../theme';
import * as wordbook from '../wordbook';

// In the browser, talk to the Web Speech API directly and prefer a voice that is
// installed on the device (works offline; iPad/Mac/Windows/Chromebook all have one).
function webSpeak(text: string): boolean {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return false;
  if (synth.speaking || synth.pending) synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices().filter((v) => /^en[-_]US/i.test(v.lang));
  const voice = voices.find((v) => v.localService) ?? voices[0];
  if (voice) u.voice = voice;
  u.lang = 'en-US';
  u.rate = 0.85;
  synth.speak(u);
  return true;
}

// Chrome loads its voice list lazily; ask once early so the first tap already has it.
if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.getVoices();

export function speak(text: string) {
  if (Platform.OS === 'web') {
    webSpeak(text);
    return;
  }
  Speech.stop();
  Speech.speak(text, { language: 'en-US', rate: 0.85 });
}

// Big "listen" button next to a word; small round one next to example sentences.
export function SpeakButton({ text, big = false }: { text: string; big?: boolean }) {
  return (
    <Pressable
      hitSlop={10}
      onPress={() => speak(text)}
      accessibilityLabel={`Say ${text}`}
      style={({ pressed }) => [big ? styles.speakBig : styles.speakSmall, pressed && { opacity: 0.6 }]}
    >
      <Text style={big ? styles.speakBigText : styles.speakSmallText}>{big ? '🔊 듣기' : '🔊'}</Text>
    </Pressable>
  );
}

export function useSaved(word: string): [boolean, () => void] {
  const [saved, setSaved] = useState(() => wordbook.isSaved(word));
  useEffect(() => {
    setSaved(wordbook.isSaved(word));
    return wordbook.subscribe(() => setSaved(wordbook.isSaved(word)));
  }, [word]);
  return [saved, () => setSaved(wordbook.toggle(word))];
}

// One tap adds the word to the wordbook (and one more tap removes it).
export function SaveButton({ word }: { word: string }) {
  const [saved, toggle] = useSaved(word);
  return (
    <Pressable
      onPress={toggle}
      style={[styles.save, saved && styles.saveOn]}
      accessibilityLabel={saved ? 'Remove from wordbook' : 'Add to wordbook'}
    >
      <Text style={[styles.saveText, saved && { color: '#fff' }]}>{saved ? '★ 단어장에 있어요' : '☆ 단어장에 넣기'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  speakBig: { backgroundColor: C.blue, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 9 },
  speakBigText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  speakSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakSmallText: { fontSize: 16 },
  save: {
    borderWidth: 2,
    borderColor: C.star,
    backgroundColor: C.starSoft,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  saveOn: { backgroundColor: C.star },
  saveText: { color: '#8A5E00', fontWeight: '800', fontSize: 16 },
});
