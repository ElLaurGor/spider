// The chore rota (step 9 admin, lib/chores.ts): each chore's freshness bar drains until it's done again. Plan has
// the whole rota, HQ only the ones that are due. Never a run of days, never "overdue": due is due.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bar, Btn, Card, Chip, Field, H, Row, Stepper, T } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { CHORE_PRESETS, CHORE_XP, choreTaskOf, EVERY_MAX, freshOf, grimText, isDue, rota, undoable } from '@/lib/chores';
import { useStore } from '@/lib/store';
import type { Chore } from '@/lib/types';

const EMOJIS = ['🧽', '🛏️', '🛁', '🧹', '🪴', '☕', '🧊', '💧', '🦷', '🧺', '🗑️', '🚗', '🔥', '🪟', '🐾'];

const barColor = (fresh: number) => (fresh > 0.5 ? C.green : fresh > 0.2 ? C.yellow : C.red);
function everyText(n: number) {
  if (n === 1) return 'every day';
  if (n === 7) return 'every week';
  if (n === 30) return 'every month';
  if (n % 7 === 0 && n <= 56) return `every ${n / 7} weeks`;
  if (n % 30 === 0) return `every ${n / 30} months`;
  return `every ${n} days`;
}

/** One chore: its bar, how grim it is, and Done (an undo for today's reset, a pass when it's due and one is waiting). */
function ChoreRow({ c, today, onEdit }: { c: Chore; today: string; onEdit?: () => void }) {
  const { state, actions } = useStore();
  const fresh = freshOf(state, c, today);
  const due = isDue(state, c, today);
  const undo = undoable(state, c.id, today);
  const task = choreTaskOf(state, c.id);
  const passes = state.choreSkips ?? 0;
  return (
    <View style={{ gap: 6 }}>
      <Row>
        <Pressable onLongPress={onEdit} onPress={onEdit} style={{ flex: 1, gap: 4 }} accessibilityRole="button" accessibilityLabel={`${c.name}, ${grimText(state, c, today)}. Edit`}>
          <Row gap={8}>
            <Text style={{ fontSize: 20 }}>{c.emoji}</Text>
            <T style={{ flex: 1 }}>{c.name}</T>
            <T small mono style={{ color: due ? C.yellow : C.dim }}>
              {grimText(state, c, today)}
            </T>
          </Row>
          <Bar pct={fresh} color={barColor(fresh)} height={6} />
          <T dim small>
            {everyText(c.every)}
            {task ? ' · on your task list' : ''}
          </T>
        </Pressable>
        {undo ? (
          <Btn small kind="ghost" icon="undo" a11yLabel={`Undo ${c.name}`} onPress={() => actions.undoChore(c.id)} />
        ) : (
          <Btn small kind={due ? 'primary' : 'ghost'} icon="check" a11yLabel={`${c.name} done`} onPress={() => actions.doChore(c.id)} />
        )}
      </Row>
      {due && passes > 0 && !undo ? (
        <Pressable onPress={() => actions.skipChore(c.id)} hitSlop={6} accessibilityRole="button">
          <T small style={{ color: C.cyan }}>
            🧹 Use a skip pass ({passes} left)
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Adding or editing a chore: a preset or your own, how often, and (new ones) whether it's due already. */
function ChoreForm({ chore, onClose }: { chore?: Chore; onClose: () => void }) {
  const { actions } = useStore();
  const [name, setName] = useState(chore?.name ?? '');
  const [emoji, setEmoji] = useState(chore?.emoji ?? EMOJIS[0]);
  const [every, setEvery] = useState(chore?.every ?? 14);
  const [due, setDue] = useState(false);
  const save = () => {
    if (chore) actions.editChore(chore.id, { name, emoji, every });
    else actions.addChore({ name, emoji, every, due });
    onClose();
  };
  return (
    <View style={styles.form}>
      {!chore ? (
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {CHORE_PRESETS.map((p) => (
            <Chip
              key={p.name}
              label={`${p.emoji} ${p.name}`}
              active={name === p.name}
              color={C.cyan}
              onPress={() => {
                setName(p.name);
                setEmoji(p.emoji);
                setEvery(p.every);
              }}
            />
          ))}
        </Row>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {EMOJIS.map((e) => (
          <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emoji, emoji === e && { borderColor: C.cyan }]} accessibilityRole="button" accessibilityLabel={`Icon ${e}`}>
            <Text style={{ fontSize: 20 }}>{e}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Field value={name} onChangeText={setName} placeholder="e.g. Change the sheets" maxLength={40} />
      <Row style={{ justifyContent: 'space-between' }}>
        <T small>Repeats</T>
        <Stepper value={every} min={1} max={EVERY_MAX} onChange={setEvery} format={everyText} label="days between" typeable />
      </Row>
      {!chore ? (
        <Row gap={6}>
          <Chip label="Just done" active={!due} color={C.cyan} onPress={() => setDue(false)} />
          <Chip label="Due already" active={due} color={C.cyan} onPress={() => setDue(true)} />
        </Row>
      ) : null}
      <Row gap={8}>
        <Btn label={chore ? 'Save' : 'Add chore'} icon="check" onPress={save} disabled={name.trim().length < 2} style={{ flex: 1 }} />
        {chore ? (
          <Btn
            kind="danger"
            icon="delete"
            a11yLabel={`Delete ${chore.name}`}
            onPress={() => {
              actions.deleteChore(chore.id);
              onClose();
            }}
          />
        ) : null}
        <Btn kind="ghost" label="Cancel" onPress={onClose} />
      </Row>
    </View>
  );
}

/** Plan: the whole rota, grimmest first, with the add form. */
export function ChoresCard() {
  const { state } = useStore();
  const today = useToday();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const list = rota(state, today);
  const passes = state.choreSkips ?? 0;
  return (
    <Card>
      <H
        right={
          <Pressable onPress={() => setAdding(!adding)} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>{adding ? 'Cancel' : '+ Add'}</Text>
          </Pressable>
        }>
        🧽 Chores
      </H>
      {list.length === 0 && !adding ? (
        <T dim small>
          Things that come round every so often: the sheets, descaling, the dentist. Each gets a bar that drains until it&apos;s done again.
        </T>
      ) : null}
      {list.map((c) =>
        editing === c.id ? <ChoreForm key={c.id} chore={c} onClose={() => setEditing(null)} /> : <ChoreRow key={c.id} c={c} today={today} onEdit={() => setEditing(c.id)} />,
      )}
      {adding ? <ChoreForm onClose={() => setAdding(false)} /> : null}
      {list.length ? (
        <T dim small>
          Done: +{CHORE_XP} XP, once a day each. Bars don&apos;t drain on paused days. Tap one to edit it.
          {passes ? ` ${passes} skip pass${passes > 1 ? 'es' : ''} from the shop waiting.` : ''}
        </T>
      ) : null}
    </Card>
  );
}

/** HQ: only the chores that are due (nothing when none are). */
export function ChoresDueCard() {
  const { state } = useStore();
  const today = useToday();
  const due = rota(state, today).filter((c) => isDue(state, c, today) || undoable(state, c.id, today));
  if (!due.length) return null;
  return (
    <Card>
      <H>🧽 Chores due</H>
      {due.map((c) => (
        <ChoreRow key={c.id} c={c} today={today} />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  link: { color: C.red, fontWeight: '700', fontSize: 13 },
  form: { gap: 10, backgroundColor: C.card2, borderRadius: 12, padding: 12 },
  emoji: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
});
