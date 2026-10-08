import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { Icon } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { useStore } from '@/lib/store';
import { monthWrapped } from '@/lib/wrapped';

export default function WrappedScreen() {
  const { state } = useStore();
  const { width } = useWindowDimensions();
  const now = new Date();
  // Early in the month, open on the month that just ended.
  const [offset, setOffset] = useState(now.getDate() <= 5 ? -1 : 0);
  const [page, setPage] = useState(0);
  const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const w = monthWrapped(state, target.getFullYear(), target.getMonth(), now);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  const go = (delta: number) => {
    setOffset(offset + delta);
    setPage(0);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={styles.top}>
        <Pressable onPress={() => go(-1)} hitSlop={10} style={styles.nav}>
          <Icon name="chevron_left" color={C.text} />
        </Pressable>
        <Text style={styles.month}>
          {w.label}
          {w.partial ? ' (so far)' : ''}
        </Text>
        <Pressable onPress={() => go(1)} hitSlop={10} style={[styles.nav, offset >= 0 && { opacity: 0.3 }]} disabled={offset >= 0}>
          <Icon name="chevron_right" color={C.text} />
        </Pressable>
      </View>

      <ScrollView key={w.label} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll}>
        {w.slides.map((s) => (
          <View key={s.id} style={{ width, padding: 16 }}>
            <View style={[styles.slide, { borderColor: C[s.color], backgroundColor: C.card }]}>
              <Text style={{ fontSize: 72 }}>{s.emoji}</Text>
              <Text style={[styles.title, { color: C[s.color] }]}>{s.title}</Text>
              <Text style={styles.big} adjustsFontSizeToFit numberOfLines={1}>
                {s.big}
              </Text>
              <Text style={styles.sub}>{s.sub}</Text>
              <View style={[styles.quipBox, { borderColor: C[s.color] }]}>
                <Text style={styles.quip}>🕷️ {s.quip}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {w.slides.map((s, i) => (
          <View key={s.id} style={[styles.dot, i === page && { backgroundColor: C.red, width: 18 }]} />
        ))}
      </View>
      <Text style={styles.hint}>Swipe →</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12 },
  nav: { padding: 8, borderRadius: 10, backgroundColor: C.card2 },
  month: { color: C.text, fontSize: 17, fontWeight: '800' },
  slide: { flex: 1, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 16, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  big: { color: C.text, fontSize: 52, fontWeight: '900', fontFamily: MONO, textAlign: 'center' },
  sub: { color: C.dim, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  quipBox: { marginTop: 12, borderWidth: 1, borderRadius: 16, padding: 14, backgroundColor: C.card2 },
  quip: { color: C.text, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.border },
  hint: { color: C.faint, fontSize: 11, textAlign: 'center', paddingVertical: 10 },
});
