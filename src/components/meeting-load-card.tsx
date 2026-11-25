// step 10 meetings: the calendar autopsy card (lib/meeting-load.ts) for the War room and the weekly Report. Read
// back from the phone's calendar, never saved, never graded: the line roasts the calendar, not her. "Calendars"
// picks which ones hold meetings (settings.meetingCalendars; unset = all the app reads).
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCalendarRange } from '@/components/use-calendar-range';
import { Bar, Card, Chip, H, Row, T } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { C, MONO } from '@/constants/theme';
import { fmtDuration, MIN, WEEKDAYS } from '@/lib/dates';
import { LOAD_LINE, loadFacts, loadMood, loadVars, meetingLoad, WORK_FROM, WORK_TO, type LoadMood } from '@/lib/meeting-load';
import { useStore } from '@/lib/store';

/** A working day's length, for the bars: a day full of meetings fills its bar. */
const DAY_MIN = (WORK_TO - WORK_FROM) * 60;

/** The meeting load of days `from`–`to` (never past today). Nothing without calendar access. */
export function MeetingLoadCard({ from, to, title = '📅 Meeting load' }: { from: string; to: string; title?: string }) {
  const { state, quip } = useStore();
  const today = useToday();
  const [picking, setPicking] = useState(false);
  const range = useCalendarRange(from, to);
  const load = range.events ? meetingLoad(state, range.events, from, to, today) : null;
  const mood = load ? loadMood(load) : null;
  const vars = load ? loadVars(load) : null;
  // The line is picked once per week's numbers, so it doesn't change on every render.
  const sig = mood && vars ? [mood, vars.hours, vars.day, vars.n].join('|') : '';
  const said = useMemo(() => {
    if (!sig) return null;
    const [m, hours, day, n] = sig.split('|');
    return quip(LOAD_LINE[m as LoadMood], { hours, day, n });
  }, [quip, sig]);

  if (range.status === 'off') return null;
  const workdays = load?.days.filter((d) => d.workday) ?? [];
  const top = Math.max(DAY_MIN, ...workdays.map((d) => d.minutes));

  return (
    <Card>
      <H
        right={
          <Pressable onPress={() => setPicking(!picking)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Which calendars hold meetings">
            <Text style={styles.link}>{picking ? 'Done' : 'Calendars'}</Text>
          </Pressable>
        }>
        {title}
      </H>
      {picking ? <MeetingCalendars /> : null}
      {range.status === 'failed' ? (
        <T dim small>
          The calendar couldn&apos;t be read just now.
        </T>
      ) : !load ? (
        <T dim small>
          Reading the calendar…
        </T>
      ) : !load.workdays ? (
        <T dim small>
          No workdays here: nothing for the calendar to answer for.
        </T>
      ) : (
        <>
          {loadFacts(load).map((f) => (
            <T key={f} small>
              · {f}
            </T>
          ))}
          {load.meetings ? (
            <View style={{ gap: 4 }}>
              {workdays.map((d) => (
                <Row key={d.day} gap={8}>
                  <Text style={styles.day}>{WEEKDAYS[new Date(`${d.day}T12:00`).getDay()]}</Text>
                  <View style={{ flex: 1 }}>
                    <Bar pct={d.minutes / top} color={d.focusGaps ? C.cyan : C.purple} height={6} />
                  </View>
                  <Text style={styles.hours}>{d.minutes ? fmtDuration(d.minutes * MIN) : '–'}</Text>
                </Row>
              ))}
            </View>
          ) : null}
          {said ? <T small style={{ color: C.yellow }}>🕷️ {said}</T> : null}
          <T dim small>
            Not graded: this is the calendar&apos;s report card, not yours. Purple days had no 90-minute gap.
          </T>
        </>
      )}
    </Card>
  );
}

/** Which of the calendars the app reads hold meetings (a personal one can be left out). */
function MeetingCalendars() {
  const { state, actions, cal } = useStore();
  const read = cal.calendars.filter((c) => !state.settings.calendarIds || state.settings.calendarIds.includes(c.id));
  const chosen = state.settings.meetingCalendars ?? null;
  const toggle = (id: string) => {
    const all = read.map((c) => c.id);
    const current = (chosen ?? all).filter((x) => all.includes(x));
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    actions.updateSettings({ meetingCalendars: next.length === all.length ? null : next });
  };
  return (
    <View style={{ gap: 6 }}>
      <T dim small>
        Which calendars hold meetings? Leave out a personal one and its events stop counting.
      </T>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {read.map((c) => (
          <Chip key={c.id} label={c.title} active={!chosen || chosen.includes(c.id)} color={C.purple} onPress={() => toggle(c.id)} />
        ))}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  link: { color: C.purple, fontWeight: '700', fontSize: 13 },
  day: { color: C.dim, fontFamily: MONO, fontWeight: '800', width: 34, fontSize: 12 },
  hours: { color: C.dim, fontFamily: MONO, fontSize: 12, width: 56, textAlign: 'right' },
});
