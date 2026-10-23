import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, H, Icon, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { dayKey, WEEKDAYS } from '@/lib/dates';
import { ALERT_COLOR, ALERT_LABEL, alertWhen, aqiBand, LEVEL_LABEL, POLLEN, pollenLevel, shortDate, sourceNote, sourceOk, type Alert } from '@/lib/outside';
import { useStore } from '@/lib/store';

const LEVEL_COLOR = ['#545C6E', '#33D17A', '#FFC53D', '#E23636'];

export function AlertRow({ a }: { a: Alert }) {
  const when = alertWhen(a);
  return (
    <Pressable onPress={() => Linking.openURL(a.url).catch(() => {})} style={[styles.alert, { borderLeftColor: ALERT_COLOR[a.level] }]}>
      <Text style={[styles.badge, { color: ALERT_COLOR[a.level] }]}>
        {a.source === 'VMA' ? '🚨 VMA' : `⚠️ ${ALERT_LABEL[a.level]}`}
      </Text>
      <T>{a.title}</T>
      {a.text ? (
        <T dim small>
          {a.text}
        </T>
      ) : null}
      <T dim small>
        {a.source === 'VMA' ? 'krisinformation.se' : 'SMHI'}
        {when ? ` · ${when}` : ''}
        {a.updated ? ` · updated ${shortDate(a.updated)}` : ''} · tap for details
      </T>
    </Pressable>
  );
}

const dayLabel = (date: string) => {
  if (date === dayKey()) return 'Today';
  const d = new Date(`${date}T12:00`);
  return date === dayKey(new Date(Date.now() + 86_400_000)) ? 'Tomorrow' : WEEKDAYS[d.getDay()];
};

export default function OutsideScreen() {
  const { state, outside } = useStore();
  const place = state.settings.weather;
  const allergies = state.settings.allergies;

  if (!place) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: 16, gap: 14 }}>
        <T>Set your city first, so I know where to check pollen, air quality and warnings.</T>
        <Btn label="Open Settings" icon="settings" onPress={() => router.push('/settings')} />
      </View>
    );
  }
  const a = outside.air;
  const band = a ? aqiBand(a.aqi) : null;
  // A failed check is never an all-clear: the green check needs both sources reached within the hour.
  const notes = place.county
    ? [sourceNote('SMHI', outside.status.smhi), sourceNote('Krisinformation (VMA)', outside.status.vma)].filter((x): x is string => !!x)
    : ['Looking up your county, so I know which SMHI warnings and VMA are yours…'];
  const allClear = !!place.county && sourceOk(outside.status.smhi) && sourceOk(outside.status.vma);

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Card>
        <H
          right={
            <Pressable onPress={outside.refresh} hitSlop={8}>
              <Icon name="refresh" size={20} color={C.dim} />
            </Pressable>
          }>
          Warnings · {place.county ?? place.name}
        </H>
        {outside.alerts.map((x) => (
          <AlertRow key={x.id} a={x} />
        ))}
        {notes.map((n) => (
          <T key={n} dim small>
            📡 {n}
          </T>
        ))}
        {outside.alerts.length === 0 && allClear ? (
          <T dim small>
            ✓ No SMHI warnings or VMA for your county right now.
          </T>
        ) : null}
      </Card>

      {a && band ? (
        <Card accent={band.color}>
          <H>Air right now</H>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <Text style={[styles.big, { color: band.color }]}>{a.aqi}</Text>
              <T dim small>
                European AQI · {band.label}
              </T>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <T small mono>
                PM2.5 {a.pm25.toFixed(1)} µg/m³
              </T>
              <T small mono>
                PM10 {a.pm10.toFixed(1)} µg/m³
              </T>
              <T small mono>
                UV {a.uv.toFixed(1)}
              </T>
            </View>
          </Row>
        </Card>
      ) : null}

      {a?.days.map((d) => {
        const anyPollen = POLLEN.some((p) => (d.pollen[p.type] ?? 0) >= 1);
        const dBand = aqiBand(d.aqi);
        return (
          <Card key={d.date}>
            <H right={<T small style={{ color: dBand.color }}>{`AQI ${d.aqi} ${dBand.label} · UV ${d.uv}`}</T>}>{dayLabel(d.date)}</H>
            {!anyPollen ? (
              <T dim small>
                No pollen in the air (off-season).
              </T>
            ) : (
              POLLEN.map((p) => {
                const v = d.pollen[p.type] ?? 0;
                const lvl = pollenLevel(p.type, v);
                const mine = allergies.includes(p.type);
                return (
                  <Row key={p.type} style={[{ justifyContent: 'space-between' }, !mine && allergies.length > 0 && { opacity: 0.45 }]}>
                    <T small>
                      {p.emoji} {p.label}
                      {mine ? ' ★' : ''}
                    </T>
                    <Text style={[styles.level, { color: LEVEL_COLOR[lvl] }]}>
                      {LEVEL_LABEL[lvl]} · {v}
                    </Text>
                  </Row>
                );
              })
            )}
          </Card>
        );
      })}

      <T dim small style={{ textAlign: 'center' }}>
        Pollen & air: Open-Meteo / Copernicus CAMS (levels are approximate, grains/m³). Warnings: SMHI. VMA: Krisinformation.se. ★ = your allergies
        (Settings).
      </T>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  alert: { borderLeftWidth: 4, paddingLeft: 10, gap: 3, paddingVertical: 4 },
  badge: { fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  big: { fontSize: 40, fontWeight: '900', fontFamily: MONO },
  level: { fontFamily: MONO, fontSize: 12, fontWeight: '800' },
});
