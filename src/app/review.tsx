// The War room (step 9 admin, lib/review.ts): a guided Sunday review, about ten minutes. Sealing it pays coins
// once a week, never XP. A skipped Sunday counts for nothing.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BossPick } from '@/components/boss-pick';
import { ContractCard } from '@/components/contract-card';
import { Btn, Card, Chip, Field, H, Icon, Row, SpiderSays, T, useNow } from '@/components/ui';
import { noonOf, useToday } from '@/components/use-today';
import { C, MONO } from '@/constants/theme';
import { choreTitle, grimText, dueOn } from '@/lib/chores';
import { dayKey, fmtTime, startOfWeek, WEEKDAYS } from '@/lib/dates';
import { doneTitle } from '@/lib/done-list';
import { activeTasks } from '@/lib/horizons';
import { taskAgeDays } from '@/lib/memory';
import { BIG_MAX, choresForWeek, gymClashes, planWeekOf, REVIEW_COINS, reviewed, reviewOpen, reviewWeek, weekAhead, weekDone, zombiesOf } from '@/lib/review';
import { dayWord } from '@/lib/shelf';
import { useStore } from '@/lib/store';
import { moveDayName } from '@/lib/workout-move';

const DONE_SHOWN = 12;

export default function WarRoom() {
  const { state, actions, quip, cal } = useStore();
  const [intro] = useState(() => quip('reviewIntro'));
  const now = useNow(60_000);
  const today = useToday();
  const date = new Date(now);
  const closing = reviewWeek(date) ?? dayKey(startOfWeek(date)); // the week looked back on: this one so far, on Monday morning the last
  const sunday = date.getDay() === 0;
  const plan = planWeekOf(date);
  const open = reviewOpen(state, date);
  const sealed = reviewed(state, closing);
  const done = weekDone(state, closing, date);

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <SpiderSays text={intro} />

      <Card>
        <H right={<T dim small>{done.length}</T>}>{date.getDay() === 1 && closing !== dayKey(startOfWeek(date)) ? '1 · Done last week' : '1 · Done this week'}</H>
        {done.length === 0 ? (
          <T dim small>
            Nothing ticked off on the list this week. The list is still here, and so are you.
          </T>
        ) : null}
        {done.slice(-DONE_SHOWN).map((x) => (
          <Row key={`${x.day}:${x.id}`}>
            <Icon name="check_circle" size={18} color={C.green} />
            <T style={{ flex: 1 }} dim={!x.title}>
              {doneTitle(x)}
            </T>
            <T dim small mono>
              {WEEKDAYS[noonOf(x.day).getDay()]}
            </T>
          </Row>
        ))}
        {done.length > DONE_SHOWN ? (
          <T dim small>
            …and {done.length - DONE_SHOWN} more before those.
          </T>
        ) : null}
      </Card>

      <Zombies now={now} />

      <Card>
        <H>{sunday ? '3 · Next week' : '3 · This week'}</H>
        {cal.status !== 'granted' ? (
          <T dim small>
            Connect your calendars on Plan to see the week&apos;s meetings here.
          </T>
        ) : null}
        {weekAhead(state, cal.events, plan).map((d) => (
          <Row key={d.day}>
            <Text style={styles.day}>{WEEKDAYS[noonOf(d.day).getDay()]}</Text>
            <T small style={{ flex: 1 }}>
              {[d.workout ? `🏋️ ${d.workout}` : null, cal.status === 'granted' ? (d.meetings ? `${d.meetings} meeting${d.meetings > 1 ? 's' : ''}` : 'no meetings') : null, d.off, d.paused ? 'paused' : null]
                .filter(Boolean)
                .join(' · ') || 'rest'}
            </T>
          </Row>
        ))}
        <Clashes plan={plan} now={now} />
      </Card>

      <Card>
        <H>4 · Chores due</H>
        <ChoresDue plan={plan} today={today} />
      </Card>

      <Card>
        <H>5 · Boss and contract</H>
        <BossPick at={now} />
        {sunday ? (
          <T dim small>
            Contracts open Monday to Wednesday: sign next week&apos;s on HQ tomorrow.
          </T>
        ) : (
          <ContractCard bare />
        )}
      </Card>

      <BigOnes plan={plan} today={today} />

      <Card accent={C.purple}>
        <H>7 · Seal the week</H>
        {sealed ? (
          <T small style={{ color: C.green }}>
            Sealed. +{REVIEW_COINS} 🪙 paid for this week.
          </T>
        ) : open ? (
          <>
            <T dim small>
              Done for today? Sealing pays +{REVIEW_COINS} 🪙, once a week.
            </T>
            <Btn label={`Seal the week · +${REVIEW_COINS} 🪙`} icon="verified" onPress={() => actions.sealReview()} />
          </>
        ) : (
          <T dim small>
            The War room pays on Sundays (and Monday mornings). Any other day it&apos;s just a good look at the week.
          </T>
        )}
        <Btn label="Back to HQ" kind="ghost" onPress={() => router.back()} />
      </Card>
    </ScrollView>
  );
}

/** Step 2: the zombie tasks, one at a time: a first physical step, Someday, delete, the bonfire, or keep. */
function Zombies({ now }: { now: number }) {
  const { state, actions } = useStore();
  const [passed, setPassed] = useState<string[]>([]);
  const [step, setStep] = useState('');
  const zombies = zombiesOf(state, now);
  const left = zombies.filter((t) => !passed.includes(t.id));
  const t = left[0];
  const next = () => {
    if (t) setPassed([...passed, t.id]);
    setStep('');
  };
  const saveStep = () => {
    if (!t || !step.trim()) return;
    actions.setFirstStep(t.id, step);
    next();
  };
  return (
    <Card>
      <H right={zombies.length ? <T dim small>{Math.min(passed.length + 1, zombies.length)}/{zombies.length}</T> : undefined}>2 · Zombies</H>
      {!zombies.length ? (
        <T dim small>
          No task has been open a week. Nothing to raise from the dead.
        </T>
      ) : !t ? (
        <T small style={{ color: C.green }}>
          Every zombie looked at. The list is lighter.
        </T>
      ) : (
        <View style={{ gap: 8 }}>
          <T>🧟 {t.title}</T>
          <T dim small>
            Open {taskAgeDays(t, now)} days.{t.step ? ` First step: ${t.step}.` : ''}
          </T>
          <Row>
            <Field value={step} onChangeText={setStep} placeholder="The first physical step, e.g. open the form" maxLength={120} style={{ flex: 1 }} onSubmitEditing={saveStep} returnKeyType="done" />
            <Btn icon="check" a11yLabel="Save the first step" disabled={!step.trim()} onPress={saveStep} />
          </Row>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            <Chip label="🌙 Someday" color={C.cyan} onPress={() => actions.setHorizon(t.id, { kind: 'someday' })} />
            <Chip label="🔥 Bonfire" color={C.cyan} onPress={() => actions.burnZombie(t.id)} />
            <Chip label="🗑️ Delete" color={C.cyan} onPress={() => actions.deleteTask(t.id)} />
            <Chip label="Keep it →" color={C.cyan} onPress={next} />
          </Row>
        </View>
      )}
    </Card>
  );
}

/** Late meetings on gym days in the plan week, each with the free days the workout could move to. */
function Clashes({ plan, now }: { plan: string; now: number }) {
  const { state, actions, cal } = useStore();
  if (cal.status !== 'granted') return null;
  const clashes = gymClashes(state, cal.events, plan, new Date(now));
  if (!clashes.length) return <T dim small>No meeting runs into gym time. The week lets you train.</T>;
  return (
    <View style={{ gap: 8 }}>
      {clashes.map((c) => (
        <View key={c.day} style={styles.clash}>
          <T small>
            ⚠️ {WEEKDAYS[noonOf(c.day).getDay()]}: &quot;{c.event.title}&quot; until {fmtTime(c.event.end)} runs into {c.workout} at {fmtTime(c.gymAt)}.
          </T>
          {c.moveTo.length ? (
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              {c.moveTo.map((to) => (
                <Chip key={to} label={`Move to ${moveDayName(to)}`} color={C.yellow} onPress={() => actions.moveAhead(c.day, to)} />
              ))}
            </Row>
          ) : (
            <T dim small>
              No free day to move it to. Maybe gym earlier that day?
            </T>
          )}
        </View>
      ))}
    </View>
  );
}

function ChoresDue({ plan, today }: { plan: string; today: string }) {
  const { state } = useStore();
  const due = choresForWeek(state, plan, today);
  if (!state.chores?.length) {
    return (
      <Pressable onPress={() => router.navigate('/plan')} hitSlop={6}>
        <T dim small>
          No chores on the rota yet. Add some on Plan →
        </T>
      </Pressable>
    );
  }
  if (!due.length) return <T dim small>Nothing comes due by Sunday. Everything is fresh enough.</T>;
  return (
    <>
      {due.map((c) => {
        const on = dueOn(state, c, today);
        return (
          <Row key={c.id}>
            <T style={{ flex: 1 }}>{choreTitle(c)}</T>
            <T dim small mono>
              {on && on > today ? `due ${dayWord(on, today)}` : grimText(state, c, today)}
            </T>
          </Row>
        );
      })}
    </>
  );
}

/** Step 6: 1–3 big tasks for the plan week, shown on Plan. */
function BigOnes({ plan, today }: { plan: string; today: string }) {
  const { state, actions } = useStore();
  const [draft, setDraft] = useState('');
  const picks = state.weekBig?.week === plan ? state.weekBig.ids.filter((id) => state.tasks.some((t) => t.id === id && !t.done)) : [];
  const open = activeTasks(state, plan > today ? plan : today);
  const pick = (id: string) => {
    if (picks.includes(id)) actions.setWeekBig(plan, picks.filter((x) => x !== id));
    else if (picks.length < BIG_MAX) actions.setWeekBig(plan, [...picks, id]);
  };
  const add = () => {
    actions.addTask(draft);
    setDraft('');
  };
  return (
    <Card>
      <H right={<T dim small>{picks.length}/{BIG_MAX}</T>}>6 · The week&apos;s big ones</H>
      <T dim small>
        One to three tasks that would make the week count. They wait on Plan.
      </T>
      {open.slice(0, 20).map((t) => {
        const n = picks.indexOf(t.id);
        return (
          <Pressable key={t.id} onPress={() => pick(t.id)} style={{ opacity: n < 0 && picks.length >= BIG_MAX ? 0.4 : 1 }}>
            <Row>
              <View style={[styles.slot, n >= 0 && { backgroundColor: C.purple, borderColor: C.purple }]}>
                <Text style={styles.slotNum}>{n >= 0 ? n + 1 : ''}</Text>
              </View>
              <T style={{ flex: 1 }}>{t.title}</T>
            </Row>
          </Pressable>
        );
      })}
      <Row>
        <Field value={draft} onChangeText={setDraft} placeholder="Add a big one…" onSubmitEditing={add} returnKeyType="done" style={{ flex: 1 }} />
        <Btn icon="add" onPress={add} disabled={!draft.trim()} />
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, paddingBottom: 48 },
  day: { color: C.dim, fontFamily: MONO, fontWeight: '800', width: 34 },
  clash: { gap: 6, backgroundColor: C.card2, borderRadius: 12, padding: 10 },
  slot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.dim, alignItems: 'center', justifyContent: 'center' },
  slotNum: { color: C.bg, fontWeight: '900', fontSize: 13, fontFamily: MONO },
});
