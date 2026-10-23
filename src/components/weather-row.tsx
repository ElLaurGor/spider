import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, T, useNow } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { dayKey, fmtDuration, fmtTime, MIN } from '@/lib/dates';
import { aqiBand, LEVEL_LABEL, pollenInfo, pollenLevel } from '@/lib/outside';
import { useStore } from '@/lib/store';
import { daylightGain, describe, forecastText, rainNote, staleNote, weatherKey } from '@/lib/weather';

export function WeatherRow() {
  const { state, weather, outside, quip } = useStore();
  const now = useNow(60_000); // for the "updated" note once the data gets old
  const w = weather.data;
  const airToday = outside.air?.days.find((d) => d.date === dayKey());
  const worst = airToday
    ? state.settings.allergies.map((t) => ({ t, level: pollenLevel(t, airToday.pollen[t] ?? 0) })).sort((a, b) => b.level - a.level)[0]
    : undefined;
  const today = w?.days.find((d) => d.date === dayKey()) ?? w?.days[0];
  const key = today ? weatherKey(today) : null;
  const forecast = today ? forecastText(today) : '';
  const comment = useMemo(() => (key ? quip(key, { forecast: '' }).replace(/^[.\s]+/, '') : ''), [quip, key]);
  const gain = w ? daylightGain(w.days, dayKey()) : null;
  const rain = w ? rainNote(w.soon) : null;

  if (!state.settings.weather) {
    return (
      <Pressable onPress={() => router.push('/settings')}>
        <T dim small>
          🌤️ Set your city in Settings to get weather in your briefing.
        </T>
      </Pressable>
    );
  }
  if (!w || !today) return null;

  return (
    <Pressable onPress={() => router.push('/outside')} style={styles.row}>
      <Text style={{ fontSize: 30 }}>{describe(w.code).emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.temp}>
          {w.temp}° <Text style={styles.dim}>feels {w.feels}° · {forecast}</Text>
        </Text>
        <T dim small>
          {state.settings.weather.name.split(',')[0]}
          {staleNote(w.fetchedAt, now)} · {comment}
        </T>
        <Text style={styles.dim}>
          🌅 {fmtTime(today.sunrise)} · 🌇 {fmtTime(today.sunset)} · {fmtDuration(today.daylightMin * MIN)} daylight
          {gain ? ` (+${gain} min tomorrow)` : ''}
          {rain ? ` · ${rain}` : ''}
        </Text>
        {outside.air ? (
          <Text style={styles.dim}>
            <Text style={{ color: aqiBand(outside.air.aqi).color }}>AQI {outside.air.aqi}</Text>
            {staleNote(outside.air.fetchedAt, now)}
            {worst && worst.level > 0 ? ` · ${pollenInfo(worst.t).label.split(' ')[0]} pollen ${LEVEL_LABEL[worst.level]}` : ''}
            {outside.warnings.length ? ` · \u26A0\uFE0F ${outside.warnings.length} warning${outside.warnings.length > 1 ? 's' : ''}` : ''}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron_right" color={C.dim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border },
  temp: { color: C.text, fontSize: 18, fontWeight: '800', fontFamily: MONO },
  dim: { color: C.dim, fontSize: 12, fontWeight: '600' },
});
