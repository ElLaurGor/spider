// Settings → Swedish calendar (step 8): name days on HQ, the fika almanac, Hesa Fredrik's heads-up, the tax
// return countdown, and the people days. Every people day is off until it's turned on or someone is added.
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { Btn, Card, Chip, Field, H, Icon, Row, Stepper, T } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { daysInMonth } from '@/lib/countdowns';
import { pad, uid } from '@/lib/dates';
import { mdLabel, nameDayOf, toMonthDay } from '@/lib/name-days';
import { loadNameDays } from '@/lib/name-days-cache';
import { nextPeopleDay, PEOPLE_DAYS, personTitle, type PeopleDayDef } from '@/lib/people-days';
import { useStore } from '@/lib/store';
import type { PeopleDayId, SwedenPrefs } from '@/lib/types';

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <T>{label}</T>
        {hint ? (
          <T dim small>
            {hint}
          </T>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: C.red, false: C.card2 }} thumbColor={C.text} />
    </Row>
  );
}

export function SwedenSettings() {
  const { state, actions } = useStore();
  const p: SwedenPrefs = state.settings.sweden ?? {};
  const set = (patch: Partial<SwedenPrefs>) => actions.setSweden((x) => ({ ...x, ...patch }));
  return (
    <Card>
      <H>Swedish calendar</H>
      <Toggle label="Name days on HQ" hint="today's names and flag day, from the Swedish almanac" value={p.nameDays !== false} onChange={(v) => set({ nameDays: v })} />
      <Toggle
        label="Fika almanac"
        hint="fettisdagen, kanelbullens dag and the rest: a banner on HQ and the day's food first on quick add (never logged for you)"
        value={p.fika !== false}
        onChange={(v) => set({ fika: v })}
      />
      <Toggle label="Hesa Fredrik heads-up" hint="14:50 on the siren's test Mondays: 15:00 is only the test (not while a VMA is out)" value={p.siren !== false} onChange={(v) => set({ siren: v })} />
      <Toggle label="Tax return countdown" hint="on HQ from 1 March, with nudges before the early refund and the deadline" value={p.deklaration !== false} onChange={(v) => set({ deklaration: v })} />
      <BuiltInDays />
      <People />
    </Card>
  );
}

/** Mors dag, Fars dag, Alla hjärtans dag: each off until turned on, with who it's for. */
function BuiltInDays() {
  const { state, actions } = useStore();
  const today = useToday();
  const days = state.settings.sweden?.days ?? {};
  const setDay = (id: PeopleDayId, on: { who: string; since: number } | null) =>
    actions.setSweden((x) => {
      const next = { ...x.days };
      if (on) next[id] = on;
      else delete next[id];
      return { ...x, days: next };
    });
  return (
    <View style={{ gap: 8 }}>
      <T small style={{ color: C.dim, fontWeight: '800', marginTop: 6 }}>
        PEOPLE DAYS
      </T>
      <T dim small>
        Off until you turn one on. Kind reminders only: a heads-up 3 days ahead with a one-tap task on HQ, and a nudge on the day.
      </T>
      {PEOPLE_DAYS.map((def) => (
        <BuiltInDay key={def.id} def={def} on={days[def.id] ?? null} today={today} onChange={(v) => setDay(def.id, v)} />
      ))}
    </View>
  );
}

function BuiltInDay({ def, on, today, onChange }: { def: PeopleDayDef; on: { who: string; since: number } | null; today: string; onChange: (v: { who: string; since: number } | null) => void }) {
  const [who, setWho] = useState(on?.who ?? '');
  const date = nextPeopleDay(def, today).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <View style={{ gap: 6 }}>
      <Toggle label={`${def.emoji} ${def.name}`} hint={`next: ${date}`} value={!!on} onChange={(v) => onChange(v ? { who: who.trim(), since: Date.now() } : null)} />
      {on ? (
        <Field
          value={who}
          onChangeText={setWho}
          onEndEditing={() => onChange({ ...on, who: who.trim() })}
          placeholder={`Who for? (${def.role})`}
        />
      ) : null}
    </View>
  );
}

/** People whose name day or date gets a morning reminder: "Vendela's name day today: a text counts." */
function People() {
  const { state, actions, say } = useStore();
  const today = useToday();
  const people = state.settings.sweden?.people ?? [];
  const [name, setName] = useState('');
  const [byDate, setByDate] = useState(false);
  const [what, setWhat] = useState('');
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const n = name.trim();
    if (!n || busy) return;
    let md = toMonthDay(month, Math.min(day, daysInMonth(2028, month))); // 2028: a leap year, so 29 Feb can be picked
    if (!byDate) {
      setBusy(true);
      const data = await loadNameDays(Number(today.slice(0, 4)));
      setBusy(false);
      const found = data ? nameDayOf(data, n) : null;
      if (!data) return say("Couldn't reach the almanac. Try again in a minute, or pick a date.", 'bad');
      if (!found) return say(`${n} isn't in the Swedish almanac. Pick a date instead.`, 'bad');
      md = found;
    }
    const person = { id: uid(), name: n, md, nameDay: !byDate, ...(byDate && what.trim() ? { what: what.trim() } : {}), since: Date.now() };
    actions.setSweden((x) => ({ ...x, people: [...(x.people ?? []), person] }));
    say(`${personTitle(person)}: ${mdLabel(md)}. I'll remind you that morning.`, 'good');
    setName('');
    setWhat('');
  };
  const remove = (id: string) => actions.setSweden((x) => ({ ...x, people: (x.people ?? []).filter((q) => q.id !== id) }));

  return (
    <View style={{ gap: 8 }}>
      <T small style={{ color: C.dim, fontWeight: '800', marginTop: 6 }}>
        NAME DAYS & DATES
      </T>
      {people.length === 0 ? (
        <T dim small>
          Nobody yet. Add someone and their name day (or a date) gets a morning reminder.
        </T>
      ) : null}
      {people.map((q) => (
        <Row key={q.id} style={{ justifyContent: 'space-between' }}>
          <T style={{ flex: 1 }}>
            {q.nameDay ? '📛' : '🗓️'} {personTitle(q)} · {mdLabel(q.md)}
          </T>
          <Pressable onPress={() => remove(q.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${q.name}`}>
            <Icon name="close" size={18} color={C.faint} />
          </Pressable>
        </Row>
      ))}
      <Field value={name} onChangeText={setName} placeholder="Name, e.g. Vendela" />
      <Row gap={8}>
        <Chip label="Their name day" active={!byDate} onPress={() => setByDate(false)} />
        <Chip label="Pick a date" active={byDate} onPress={() => setByDate(true)} />
      </Row>
      {byDate ? (
        <>
          <Row style={{ justifyContent: 'space-between' }}>
            <T small>Day</T>
            <Stepper value={day} min={1} max={daysInMonth(2028, month)} onChange={setDay} format={(v) => pad(v)} />
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <T small>Month</T>
            <Stepper value={month} min={1} max={12} onChange={setMonth} format={(v) => new Date(2000, v - 1, 1).toLocaleDateString('en-GB', { month: 'short' })} />
          </Row>
          <Field value={what} onChangeText={setWhat} placeholder="What is it? (e.g. birthday)" />
        </>
      ) : null}
      <Btn label={busy ? 'Looking it up…' : 'Add'} icon="add" kind="ghost" onPress={() => void add()} disabled={!name.trim() || busy} />
    </View>
  );
}
