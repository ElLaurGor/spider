import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/theme';
import { useStore } from '@/lib/store';

/** How long an if-then prompt stays before it gives up (the cue still counts if the habit's done later). */
const SHOW_MS = 2 * 60_000;

/**
 * An if-then cue that just went off in the app (if-then.ts): "You said after coffee. Coffee's logged.
 * Vitamins." Done checks the habit off (a gym plan opens Gym). Sits at the bottom, clear of the toasts.
 */
export function CuePromptHost() {
  const { cue } = useStore();
  const insets = useSafeAreaInsets();
  const p = cue.prompt;
  const { later } = cue;

  useEffect(() => {
    if (!p) return;
    const t = setTimeout(later, SHOW_MS);
    return () => clearTimeout(t);
  }, [p, later]);

  if (!p) return null;
  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 76 }]}>
      <View style={styles.card}>
        <Text style={styles.title}>🔗 {p.habit ? `${p.habit.emoji} ${p.habit.name}` : 'Gym plan'}</Text>
        <Text style={styles.text}>{p.text}</Text>
        <View style={styles.row}>
          <Pressable onPress={cue.done} style={({ pressed }) => [styles.btn, styles.done, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel="Done">
            <Text style={styles.btnText}>{p.habit ? 'Done ✓' : 'Open Gym'}</Text>
          </Pressable>
          <Pressable onPress={later} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel="Later">
            <Text style={[styles.btnText, { color: C.dim }]}>Later</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 90, elevation: 90, pointerEvents: 'box-none' },
  card: { backgroundColor: C.card, borderColor: C.green, borderWidth: 1.5, borderRadius: 14, padding: 12, gap: 8 },
  title: { color: C.green, fontWeight: '800', fontSize: 13 },
  text: { color: C.text, fontSize: 14, lineHeight: 19 },
  row: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingVertical: 9, alignItems: 'center' },
  done: { backgroundColor: C.green, borderColor: C.green },
  btnText: { color: C.bg, fontWeight: '800', fontSize: 14 },
});
