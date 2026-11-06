import { File } from 'expo-file-system';
import { Image, StyleSheet, Text, View } from 'react-native';

import { C, MONO } from '@/constants/theme';
import type { TankSnap } from '@/lib/tank-life';

/** Whether a snapshot's file is still there (backups don't carry them, so a restored phone may not have it). */
const there = (uri: string) => {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
};

/** The snapshots whose files are still there. */
export const snapsThere = (snaps: TankSnap[]) => snaps.filter((x) => there(x.uri));

/** Wrapped's terrarium slide: the month's snapshot of the tank, or the year's first and last side by side (`snaps` from snapsThere). */
export function TankSnapSlide({ snaps: shown, year }: { snaps: TankSnap[]; year: boolean }) {
  if (!shown.length) return null;
  return (
    <View style={[styles.slide, { borderColor: C.green, backgroundColor: C.card }]}>
      <Text style={{ fontSize: 48 }}>🕸️</Text>
      <Text style={[styles.title, { color: C.green }]}>The terrarium</Text>
      <View style={styles.row}>
        {shown.map((x) => (
          <View key={x.month} style={styles.cell}>
            <Image source={{ uri: x.uri }} style={styles.img} resizeMode="cover" accessibilityLabel={`The terrarium in ${x.label}`} />
            <Text style={styles.label}>{x.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.sub}>{year && shown.length > 1 ? `Your tank in ${shown[0].label} vs ${shown[1].label}.` : `Your tank in ${shown[0].label}.`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { flex: 1, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 },
  title: { fontSize: 16, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  cell: { flex: 1, gap: 6, alignItems: 'center' },
  img: { width: '100%', aspectRatio: 16 / 10, borderRadius: 12, backgroundColor: C.card2 },
  label: { color: C.dim, fontSize: 12, fontFamily: MONO },
  sub: { color: C.dim, fontSize: 15, textAlign: 'center', lineHeight: 21 },
});
