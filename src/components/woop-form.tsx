// Obstacle scouting at contract signing (step 8, lib/woop.ts): the best outcome, the obstacle most likely to
// wreck the week (situations the app can see, never the body) and a ready if-then plan on its cue.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip, Field, H, Row, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { cueSaid, planText } from '@/lib/if-then';
import { useStore } from '@/lib/store';
import type { Contract, ObstacleId } from '@/lib/types';
import { obstacleOf, woopTally, type ObstacleOption } from '@/lib/woop';

export type WoopDraft = { outcome: string; obstacle: ObstacleId | null; then: string; off: boolean };
export const blankWoop = (): WoopDraft => ({ outcome: '', obstacle: null, then: '', off: false });

/** The obstacle the owner picked, if any: scouting is opt-in, so nothing is saved (or pings) until one is tapped. */
export const woopPicked = (options: ObstacleOption[], w: WoopDraft) => options.find((o) => o.id === w.obstacle) ?? null;

const seenText = (o: ObstacleOption) =>
  o.rate <= 0
    ? "Not seen lately, but you know your week best."
    : o.calendar
      ? `In your calendar on ${Math.round(o.rate * 100)}% of the days left this week.`
      : `Showed up on ${Math.round(o.rate * 100)}% of your days lately.`;

/** The scouting part of the contract form: outcome, obstacle chips (likeliest first) and the plan's "I will". */
export function WoopForm({ options, value, onChange }: { options: ObstacleOption[]; value: WoopDraft; onChange: (w: WoopDraft) => void }) {
  const picked = woopPicked(options, value);
  if (!options.length) return null;
  if (value.off) {
    return (
      <Pressable onPress={() => onChange({ ...value, off: false })} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
        <T dim small>
          🧭 Scout the week&apos;s obstacle →
        </T>
      </Pressable>
    );
  }
  return (
    <View style={styles.box}>
      <H
        right={
          <Text style={styles.link} onPress={() => onChange({ ...value, off: true })}>
            Skip
          </Text>
        }>
        🧭 Scout the week
      </H>
      <Field value={value.outcome} onChangeText={(outcome) => onChange({ ...value, outcome })} placeholder="Best outcome, e.g. feeling strong by Sunday" maxLength={80} />
      <T dim small>
        What&apos;s most likely to get in the way?
      </T>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {options.map((o, i) => (
          <Chip
            key={o.id}
            label={`${o.label}${i === 0 && o.rate > 0 ? ' · likeliest' : ''}`}
            active={picked?.id === o.id}
            color={C.cyan}
            onPress={() => onChange({ ...value, obstacle: o.id, then: '' })}
          />
        ))}
      </Row>
      {picked ? (
        <>
          <T dim small>
            {seenText(picked)}
          </T>
          <T small>When {cueSaid(picked.plan.cue)}, I will…</T>
          <Field value={value.then} onChangeText={(then) => onChange({ ...value, then })} placeholder={picked.plan.then} maxLength={120} />
        </>
      ) : null}
    </View>
  );
}

/** A signed contract's scouting: the outcome, the plan, and how often the obstacle showed up so far. */
export function WoopLine({ c }: { c: Contract }) {
  const { state } = useStore();
  if (!c.woop) return null;
  const t = woopTally(state, c);
  return (
    <View style={{ gap: 2 }}>
      {c.woop.outcome ? <T small>🌟 {c.woop.outcome}</T> : null}
      <T dim small>
        🧭 {obstacleOf(c.woop.obstacle).label}: {planText(c.woop.plan)}
      </T>
      <T dim small>
        So far: the obstacle showed up {t.showed}×, your plan fired {t.fired}×. Rough days are left out.
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: C.card2, borderRadius: 12, padding: 10, gap: 8 },
  link: { color: C.red, fontWeight: '700', fontSize: 13 },
});
