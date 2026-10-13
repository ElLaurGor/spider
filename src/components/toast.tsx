import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/theme';
import { useStore, type Tone } from '@/lib/store';

const TONE_COLOR: Record<Tone, string> = { info: C.blue, good: C.green, bad: C.red, epic: C.yellow };

/** S.P.I.D.E.R.'s pop-up comments, shown one at a time at the top of the screen. */
export function ToastHost() {
  const { toast, dismissToast, actions } = useStore();
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!toast) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
    const ms = toast.action ? 9000 : Math.min(6000, 2600 + toast.text.length * 35); // a button gets time to be pressed
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => dismissToast());
    }, ms);
    return () => clearTimeout(t);
  }, [toast, anim, dismissToast]);

  if (!toast) return null;
  const color = TONE_COLOR[toast.tone];
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
      <Pressable onPress={dismissToast} style={[styles.toast, { borderColor: color }]}>
        <View style={[styles.dot, { backgroundColor: color }]}>
          <Text style={{ fontSize: 16 }}>🕷️</Text>
        </View>
        <Text style={styles.text}>{toast.text}</Text>
        {toast.action === 'catchFly' ? (
          <Pressable
            onPress={() => {
              actions.catchFly();
              dismissToast();
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.action, { borderColor: color, opacity: pressed ? 0.7 : 1 }]}>
            <Text style={styles.actionText}>Catch it!</Text>
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 100, elevation: 100, pointerEvents: 'box-none' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#121826F2',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
  },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card2 },
  text: { flex: 1, color: C.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  action: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: C.card2 },
  actionText: { color: C.text, fontSize: 13, fontWeight: '800' },
});
