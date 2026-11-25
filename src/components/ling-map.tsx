// Where the grown spiderlings live (the terrarium round): a dot map of Sweden with a pin for each spiderling that
// moved out (egg-sacs.ts GROW_UP_DAYS, its postcard in mail.ts). Tap a pin or a name for where it went.
// Plain Views, no SVG: the outline is a coarse polygon, filled as a grid of dots.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, H, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { LING_PLACES } from '@/lib/mail';
import type { Spiderling } from '@/lib/types';

type LatLon = [number, number];

// Sweden, roughly, clockwise from Smygehuk: the west coast, the Norwegian border, the Finnish border, the Bothnian and Baltic coasts.
const MAINLAND: LatLon[] = [
  [55.34, 13.36], [55.38, 12.85], [55.6, 12.98], [56.05, 12.65], [56.25, 12.45], [56.45, 12.9], [56.68, 12.85], [57.1, 12.25], [57.45, 12.05], [57.7, 11.9], [58.0, 11.55], [58.35, 11.25], [58.6, 11.2], [58.9, 11.1], [59.1, 11.4],
  [59.5, 11.75], [59.9, 12.35], [60.4, 12.6], [61.0, 12.45], [61.6, 12.15], [62.2, 12.3], [62.8, 12.1], [63.4, 12.2], [64.0, 13.9], [64.5, 14.1], [65.1, 14.5], [65.7, 14.6], [66.2, 15.4], [66.8, 16.2], [67.4, 16.6], [67.9, 17.5], [68.3, 18.2], [68.5, 19.0], [68.55, 20.0], [69.06, 20.55],
  [68.7, 21.5], [68.45, 22.3], [68.0, 23.2], [67.5, 23.6], [67.0, 23.65], [66.5, 23.8], [66.0, 24.0], [65.83, 24.15],
  [65.7, 23.0], [65.55, 22.2], [65.3, 21.6], [64.95, 21.3], [64.6, 21.25], [64.2, 20.9], [63.8, 20.35], [63.5, 19.7], [63.25, 18.9], [62.9, 18.3], [62.6, 17.95], [62.35, 17.45], [61.9, 17.4], [61.5, 17.15], [61.0, 17.2], [60.7, 17.25], [60.55, 17.6], [60.45, 18.3], [60.2, 18.6], [59.85, 19.0], [59.6, 18.95], [59.35, 18.9], [59.15, 18.5], [58.9, 17.95], [58.75, 17.4], [58.55, 16.9], [58.2, 16.85], [57.8, 16.7], [57.3, 16.55], [56.9, 16.45], [56.6, 16.3], [56.2, 15.85], [56.1, 15.3], [56.05, 14.7], [55.9, 14.3], [55.55, 14.3], [55.4, 13.95],
];
const GOTLAND: LatLon[] = [[57.95, 19.15], [57.75, 18.95], [57.5, 18.8], [57.2, 18.5], [56.92, 18.15], [57.1, 18.15], [57.4, 18.25], [57.65, 18.3], [57.85, 18.6]];
const OLAND: LatLon[] = [[57.37, 17.15], [57.1, 17.0], [56.8, 16.82], [56.45, 16.62], [56.2, 16.45], [56.35, 16.4], [56.65, 16.55], [56.95, 16.75], [57.25, 16.95]];

const LAT = { top: 69.2, bottom: 55.2 };
const LON = { left: 10.9, right: 24.4 };
const SQUASH = Math.cos((62 * Math.PI) / 180); // a degree of longitude is this much shorter up here
const COLS = 22;
const W = 132;
const H_PX = Math.round((W * (LAT.top - LAT.bottom)) / ((LON.right - LON.left) * SQUASH));
const ROWS = Math.round((COLS * H_PX) / W);

/** Where (lat, lon) lands on the map, in px. */
const toPx = ([lat, lon]: LatLon) => ({ x: ((lon - LON.left) / (LON.right - LON.left)) * W, y: ((LAT.top - lat) / (LAT.top - LAT.bottom)) * H_PX });

function inside([lat, lon]: LatLon, poly: LatLon[]) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ai, oi] = poly[i];
    const [aj, oj] = poly[j];
    if (oi > lon !== oj > lon && lat < ((aj - ai) * (lon - oi)) / (oj - oi) + ai) hit = !hit;
  }
  return hit;
}

/** The dots that draw Sweden, worked out once. The two big islands are thin, so each gets a dot of its own too. */
const DOTS: { x: number; y: number }[] = (() => {
  const out: { x: number; y: number }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const lat = LAT.top - ((r + 0.5) / ROWS) * (LAT.top - LAT.bottom);
      const lon = LON.left + ((c + 0.5) / COLS) * (LON.right - LON.left);
      if ([MAINLAND, GOTLAND, OLAND].some((p) => inside([lat, lon], p))) out.push({ x: ((c + 0.5) / COLS) * W, y: ((r + 0.5) / ROWS) * H_PX });
    }
  }
  for (const at of [[57.45, 18.5], [56.75, 16.62]] as LatLon[]) out.push(toPx(at));
  return out;
})();

const dateOf = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** The map card: shown once a spiderling has moved out. */
export function LingMap({ lings }: { lings: Spiderling[] }) {
  const away = lings.filter((x) => x.movedAt != null);
  const [picked, setPicked] = useState<string | null>(null);
  if (!away.length) return null;
  const placeOf = (x: Spiderling) => LING_PLACES.find((p) => p.id === x.place);
  return (
    <Card>
      <H>🗺️ Where your spiderlings live</H>
      <View style={styles.row}>
        <View style={{ width: W, height: H_PX }} accessible accessibilityLabel={`A map of Sweden with ${away.length} spiderling${away.length === 1 ? '' : 's'} on it`}>
          {DOTS.map((d) => (
            <View key={`${d.x}:${d.y}`} style={[styles.dot, { left: d.x - 2, top: d.y - 2 }]} />
          ))}
          {away.map((x) => {
            const p = placeOf(x);
            if (!p) return null;
            const at = toPx(p.at);
            return (
              <Pressable key={x.id} onPress={() => setPicked(picked === x.id ? null : x.id)} hitSlop={8} style={[styles.pin, { left: at.x - 8, top: at.y - 10 }]} accessibilityRole="button" accessibilityLabel={`${x.name ?? 'A spiderling'}, ${p.where}`}>
                <Text style={[styles.pinText, picked === x.id && { fontSize: 17 }]}>🕷️</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          {away.map((x) => {
            const p = placeOf(x);
            return (
              <Pressable key={x.id} onPress={() => setPicked(picked === x.id ? null : x.id)} accessibilityRole="button">
                <T small style={picked === x.id ? { color: C.cyan } : undefined}>
                  🕷️ {x.name ?? 'A spiderling'}
                </T>
                <T dim small>
                  {p?.where ?? 'somewhere in Sweden'} · since {dateOf(x.movedAt ?? x.hatchedAt)}
                </T>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  dot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: C.border },
  pin: { position: 'absolute', width: 16, height: 20, alignItems: 'center' },
  pinText: { fontSize: 13 },
});
