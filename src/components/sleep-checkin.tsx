import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { EntryEditor } from '@/components/entry-editor';
import { Card, H, Icon, Row, T, useNow } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { SLEEP_RATINGS } from '@/lib/body';
import { dayKey, fmtDuration, fmtTime, MIN, WEEKDAYS_LONG } from '@/lib/dates';
import { dayOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { Rating } from '@/lib/types';

const ENERGY: { rating: Rating; emoji: string; label: string }[] = [
  { rating: 1, emoji: '🪫', label: 'Empty' },
  { rating: 2, emoji: '🔋', label: 'Low' },
  { rating: 3, emoji: '🔋', label: 'OK' },
  { rating: 4, emoji: '🔋', label: 'Good' },
  { rating: 5, emoji: '⚡', label: 'Full' },
];

/** Morning card on HQ: hours slept, how last night felt, and today's energy. Hidden once all are done or after 14:00. */
export function SleepCheckIn() {
  const { state, actions, quip } = useStore();
  const [editing, setEditing] = useState(false);
  // On HQ for days: the clock ticks, so the card moves on to a new morning and goes at 14:00 by itself.
  const now = useNow(60_000);
  const todayKey = dayKey(now);
  const today = dayOf(state, todayKey);
  // Phone in bed last night (cluster F, night.ts); picked once so it doesn't change on every render.
  const night = today.night;
  const nightText = useMemo(
    () => (night?.lastAt && night.top ? quip('phoneInBed', { time: fmtTime(night.lastAt), app: night.top, minutes: night.lateMin }) : null),
    [quip, night],
  );
  if ((today.sleepRating != null && today.energy != null && today.sleepMin != null) || new Date(now).getHours() >= 14) return null;
  const slept = today.sleepMin;

  return (
    <Card accent={C.purple}>
      {today.sleepRating == null ? (
        <>
          <H>How did you sleep?</H>
          <Row gap={6}>
            {SLEEP_RATINGS.map((r) => (
              <Pressable key={r.rating} onPress={() => actions.rateSleep(r.rating)} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}>
                <Text style={{ fontSize: 26 }}>{r.emoji}</Text>
                <Text style={styles.label}>{r.label}</Text>
              </Pressable>
            ))}
          </Row>
        </>
      ) : null}
      <Pressable onPress={() => setEditing(true)} style={({ pressed }) => [styles.hours, pressed && { opacity: 0.7 }]}>
        <Icon name="bedtime" size={18} color={C.purple} />
        <T style={{ flex: 1 }}>{slept != null ? `Slept ${fmtDuration(slept * MIN)}` : 'Hours slept?'}</T>
        <T dim small>
          {slept == null ? 'Log hours' : today.sleepManual ? 'Edit' : '⌚ Edit'}
        </T>
      </Pressable>
      {nightText ? (
        <T dim small>
          {nightText}
        </T>
      ) : null}
      {today.energy == null ? (
        <>
          <H>Energy today?</H>
          <Row gap={6}>
            {ENERGY.map((e) => (
              <Pressable key={e.rating} onPress={() => actions.rateEnergy(e.rating)} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}>
                <Text style={{ fontSize: 24, opacity: e.rating === 1 || e.rating === 5 ? 1 : 0.4 + e.rating * 0.15 }}>{e.emoji}</Text>
                <Text style={styles.label}>{e.label}</Text>
              </Pressable>
            ))}
          </Row>
          <T dim small>
            1–2 turns on low-battery mode: one quest and gentler roasts.
          </T>
        </>
      ) : null}
      {editing ? <SleepEditor day={todayKey} onClose={() => setEditing(false)} /> : null}
    </Card>
  );
}

/** "Last night" for today's log, otherwise the night before that morning. */
export function nightLabel(key: string, today = dayKey()) {
  if (key === today) return 'Last night';
  return `Night before ${WEEKDAYS_LONG[new Date(`${key}T12:00`).getDay()]}`;
}

/** Sheet for typing in hours slept. `day` is the morning after, where the watch puts its number too. */
export function SleepEditor({ day, onClose }: { day: string; onClose: () => void }) {
  const { state, actions, health } = useStore();
  const today = useToday();
  const log = dayOf(state, day);
  const min = log.sleepMin ?? 7.5 * 60;
  const watchRefills = health.status === 'connected' && day === today;
  const note =
    log.sleepMin != null && !log.sleepManual
      ? 'From your watch. Saving replaces it, and the watch leaves your number alone.'
      : log.sleepManual && watchRefills
        ? 'Delete hands this night back to your watch.'
        : undefined;

  return (
    <EntryEditor
      title={`Sleep · ${nightLabel(day, today)}`}
      numbers={[
        { key: 'h', label: 'Hours', value: Math.floor(min / 60), step: 1, min: 0, max: 16, suffix: 'h' },
        { key: 'm', label: 'Minutes', value: Math.round(min % 60), step: 5, min: 0, max: 59, suffix: 'min' },
      ]}
      note={note}
      onSave={(_, v) => actions.logSleep(day, v.numbers.h * 60 + v.numbers.m)}
      onDelete={log.sleepManual ? () => actions.logSleep(day, null) : undefined}
      onClose={onClose}
    />
  );
}

const styles = StyleSheet.create({
  btn: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: 12, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border },
  label: { color: C.dim, fontSize: 10, fontWeight: '700' },
  hours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.border,
  },
});
