import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { C } from '../theme';
import * as wordbook from '../wordbook';

export function speak(text: string) {
  Speech.stop();
  Speech.speak(text, { language: 'en-US', rate: 0.85 });
}

export function SpeakButton({ text, size = 22 }: { text: string; size?: number }) {
  return (
    <Pressable hitSlop={10} onPress={() => speak(text)} accessibilityLabel={`Say ${text}`}>
      <Text style={{ fontSize: size }}>🔊</Text>
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
  save: {
    borderWidth: 2,
    borderColor: C.star,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  saveOn: { backgroundColor: C.star },
  saveText: { color: '#9A6B00', fontWeight: '700', fontSize: 15 },
});
