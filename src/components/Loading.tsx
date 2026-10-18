import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { C } from '../theme';

export default function Loading({ message = '사전을 준비하고 있어요…' }: { message?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={C.blue} size="large" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { color: C.sub, marginTop: 12, textAlign: 'center', lineHeight: 22 },
});
