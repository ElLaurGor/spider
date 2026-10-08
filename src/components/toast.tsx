import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/theme';
import { useStore, type Tone } from '@/lib/store';

const TONE_COLOR: Record<Tone, string> = { info: C.blue, good: C.green, bad: C.red, epic: C.yellow };

/** S.P.I.D.E.R.'s pop-up comments, shown one at a time at the top of the screen. */
export function ToastHost() {
  const { toast, dismissToast } = useStore();
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!toast) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
    const ms = Math.min(6000, 2600 + toast.text.length * 35);
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
});
