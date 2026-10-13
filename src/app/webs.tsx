import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { DayWeb } from '@/components/day-web';
import { Card, H, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { dayKey } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { webDays, webParams } from '@/lib/web-art';

const label = (key: string) => new Date(`${key}T12:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export default function WebsScreen() {
  const { state } = useStore();
  const { width } = useWindowDimensions();
  const days = webDays(state);
  const [picked, setPicked] = useState(() => days[0] ?? dayKey());
  const big = Math.min(width - 32, 320);
  const thumb = Math.floor((width - 32 - 16) / 3);
  const p = webParams(state, picked);

  return (
    <FlatList
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 48 }}
      columnWrapperStyle={{ gap: 8 }}
      data={days}
      numColumns={3}
      keyExtractor={(k) => k}
      initialNumToRender={9}
      windowSize={5}
      ListHeaderComponent={
        <View style={{ gap: 14, marginBottom: 6 }}>
          <Card>
            <H right={<Text style={styles.date}>{label(picked)}</Text>}>🕸️ Spun on this day</H>
            <View style={{ alignItems: 'center' }}>
              <DayWeb params={p} size={big} seed={picked} />
            </View>
            <T dim small>
              Threads are glasses of water, spiral rings are habits and quests, thick silk is training, dew drops are hours of sleep, white bundles are finished
              tasks, red frayed strands are gaming over budget. The color is the mood.
            </T>
          </Card>
          {days.length === 0 ? <T dim small>No webs yet. Log something today and the first one gets spun.</T> : null}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => setPicked(item)} style={[styles.cell, item === picked && { borderColor: C.red }]}>
          <DayWeb params={webParams(state, item)} size={thumb - 10} seed={item} />
          <Text style={styles.date}>{label(item)}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1 / 3, alignItems: 'center', gap: 4, padding: 4, borderRadius: 14, borderWidth: 1, borderColor: 'transparent' },
  date: { color: C.dim, fontFamily: MONO, fontSize: 11 },
});
