import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { dayKey } from '@/lib/dates';
import { ALERT_COLOR, ALERT_LABEL, aqiBand, LEVEL_LABEL, pollenInfo, pollenLevel } from '@/lib/outside';
import { useStore } from '@/lib/store';

/** HQ card: only shows up when something outside actually needs attention. */
export function OutsideAlerts() {
  const { state, outside } = useStore();
  const s = state.settings;
  const urgent = outside.alerts.filter((a) => a.level !== 'MESSAGE');
  const today = outside.air?.days.find((d) => d.date === dayKey());
  const worst =
    today && s.notify.pollen
      ? s.allergies.map((t) => ({ t, level: pollenLevel(t, today.pollen[t] ?? 0) })).sort((a, b) => b.level - a.level)[0]
      : undefined;
  const pollen = worst && worst.level >= s.pollenAlertLevel ? worst : null;
  const aqi = today && s.notify.air && today.aqi >= s.aqiAlert ? today.aqi : null;
  if (!urgent.length && !pollen && aqi == null) return null;

  const accent = urgent.length ? ALERT_COLOR[urgent[0].level] : aqi != null ? aqiBand(aqi).color : C.yellow;
  return (
    <Pressable onPress={() => router.push('/outside')} style={[styles.card, { borderColor: accent }]}>
      <View style={{ flex: 1, gap: 4 }}>
        {urgent.slice(0, 3).map((a) => (
          <Text key={a.id} style={styles.line} numberOfLines={2}>
            <Text style={{ color: ALERT_COLOR[a.level], fontWeight: '900' }}>{a.source === 'VMA' ? '🚨 VMA' : `⚠️ ${ALERT_LABEL[a.level]}`}</Text> {a.title}
          </Text>
        ))}
        {urgent.length > 3 ? (
          <T dim small>
            +{urgent.length - 3} more
          </T>
        ) : null}
        {pollen ? (
          <Text style={styles.line}>
            {pollenInfo(pollen.t).emoji} {pollenInfo(pollen.t).label.split(' ')[0]} pollen is {LEVEL_LABEL[pollen.level]} today
          </Text>
        ) : null}
        {aqi != null ? (
          <Text style={styles.line}>
            😷 Air quality {aqiBand(aqi).label} today (AQI {aqi})
          </Text>
        ) : null}
      </View>
      <Icon name="chevron_right" color={C.dim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1 },
  line: { color: C.text, fontSize: 14, lineHeight: 19, fontWeight: '600' },
});
