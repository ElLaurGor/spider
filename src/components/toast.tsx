import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/theme';
import { lineIdFor } from '@/lib/lines';
import { useStore, type Tone } from '@/lib/store';

const TONE_COLOR: Record<Tone, string> = { info: C.blue, good: C.green, bad: C.red, epic: C.yellow };

/**
 * S.P.I.D.E.R.'s pop-up comments, shown one at a time at the top of the screen. A one-tap log gets an Undo
 * for as long as it shows; a long-press on a line asks whether it went too far (it's retired if so).
 */
export function ToastHost() {
  const { toast, dismissToast, actions } = useStore();
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));
  const [asking, setAsking] = useState<number | null>(null); // the toast whose "too far?" question is open
  const open = toast != null && asking === toast.id;
  const undo = toast?.action && toast.action !== 'catchFly' ? toast.action.undo : null;

  useEffect(() => {
    if (!toast) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
  }, [toast, anim]);

  // Stays up while the question is open; otherwise goes after a while (longer for a button to be pressed).
  useEffect(() => {
    if (!toast || open) return;
    const read = Math.min(6000, 2600 + toast.text.length * 35);
    const ms = toast.action === 'catchFly' ? 9000 : undo ? Math.max(4500, read) : read;
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => dismissToast());
    }, ms);
    return () => clearTimeout(t);
  }, [toast, open, undo, anim, dismissToast]);

  if (!toast) return null;
  const color = TONE_COLOR[toast.tone];
  const lineId = lineIdFor(toast.text);
  const close = () => {
    setAsking(null);
    dismissToast();
  };
  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          top: insets.top + 8,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
        },
      ]}>
      <Pressable
        onPress={open ? undefined : close}
        onLongPress={lineId ? () => setAsking(toast.id) : undefined}
        accessibilityHint={lineId ? 'Long-press if this line went too far' : undefined}
        style={[styles.toast, { borderColor: color }]}>
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: color }]}>
            <Text style={{ fontSize: 16 }}>🕷️</Text>
          </View>
          <Text style={styles.text}>{toast.text}</Text>
          {toast.action === 'catchFly' ? (
            <Pressable
              onPress={() => {
                actions.catchFly();
                close();
              }}
              hitSlop={8}
              style={({ pressed }) => [styles.action, { borderColor: color, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={styles.actionText}>Catch it!</Text>
            </Pressable>
          ) : undo && !open ? (
            <Pressable
              onPress={() => {
                actions.undo(undo);
                close();
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Undo"
              style={({ pressed }) => [styles.action, { borderColor: color, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={styles.actionText}>Undo</Text>
            </Pressable>
          ) : null}
        </View>
        {open && lineId ? (
          <View style={styles.ask}>
            <Text style={styles.askText}>Too far? I&apos;ll never say this one again.</Text>
            <Pressable
              onPress={() => {
                actions.retireLine(lineId);
                close();
              }}
              hitSlop={8}
              accessibilityRole="button"
              style={({ pressed }) => [styles.action, { borderColor: C.red, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={styles.actionText}>Retire it</Text>
            </Pressable>
            <Pressable
              onPress={() => setAsking(null)}
              hitSlop={8}
              accessibilityRole="button"
              style={({ pressed }) => [styles.action, { borderColor: C.dim, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={styles.actionText}>Keep</Text>
            </Pressable>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 100, elevation: 100, pointerEvents: 'box-none' },
  toast: {
    gap: 10,
    backgroundColor: '#121826F2',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card2 },
  text: { flex: 1, color: C.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  action: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: C.card2 },
  actionText: { color: C.text, fontSize: 13, fontWeight: '800' },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  askText: { flex: 1, minWidth: 140, color: C.dim, fontSize: 13 },
});
