import { useMemo, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import { C } from '@/constants/theme';
import { webGeometry, type WebParams } from '@/lib/web-art';
import type { MoodLevel } from '@/lib/types';

const MOOD_COLOR: Record<MoodLevel, string> = { 1: C.purple, 2: C.water, 3: C.cyan, 4: C.green, 5: C.yellow };

export const webColor = (mood: MoodLevel | null) => (mood ? MOOD_COLOR[mood] : C.dim);

/**
 * The day's web drawn with plain views (no SVG in this build). One self-contained, opaque,
 * non-collapsable view, so it can be captured as an image later (react-native-view-shot).
 */
export function DayWeb({ params, size, seed, ref }: { params: WebParams; size: number; seed: string; ref?: Ref<View> }) {
  const { segs, dots } = useMemo(() => webGeometry(params, size, seed), [params, size, seed]);
  const color = webColor(params.mood);
  return (
    <View ref={ref} collapsable={false} style={[styles.frame, { width: size, height: size, opacity: params.empty ? 0.35 : 1 }]}>
      {segs.map((g, i) => {
        const dx = g.x2 - g.x1;
        const dy = g.y2 - g.y1;
        const len = Math.hypot(dx, dy);
        return (
          <View
            key={i}
            style={[
              styles.seg,
              {
                left: (g.x1 + g.x2) / 2 - len / 2,
                top: (g.y1 + g.y2) / 2 - g.w / 2,
                width: len,
                height: g.w,
                borderRadius: g.w / 2,
                backgroundColor: g.kind === 'fray' ? C.red : color,
                opacity: g.kind === 'ring' ? 0.75 : g.kind === 'fray' ? 0.85 : 0.95,
                transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
              },
            ]}
          />
        );
      })}
      {dots.map((d, i) => (
        <View
          key={`d${i}`}
          style={[
            styles.seg,
            {
              left: d.x - d.r,
              top: d.y - d.r,
              width: d.r * 2,
              height: d.r * 2,
              borderRadius: d.r,
              backgroundColor: d.kind === 'dew' ? C.water : C.text,
              opacity: d.kind === 'dew' ? 0.9 : 0.8,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { backgroundColor: C.card, overflow: 'hidden', borderRadius: 12 },
  seg: { position: 'absolute', pointerEvents: 'none' },
});
