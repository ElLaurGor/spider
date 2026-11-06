// The due-back shelf (step 9 admin, lib/shelf.ts): parcels to pick up with their code in big digits, return
// windows and library loans. HQ shows what's open; Plan has the list and the add form; the share screen fills the
// same form from a shared text.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, Chip, Field, H, Icon, Row, Stepper, T } from '@/components/ui';
import { noonOf, useToday } from '@/components/use-today';
import { C, MONO } from '@/constants/theme';
import { addDays, dayKey } from '@/lib/dates';
import { daysTo, deadlineText, dayWord, openShelf, returnBy, RETURN_DAYS, SHELF_KINDS, shelfList, shelfTitle, type ShelfParse } from '@/lib/shelf';
import { useStore } from '@/lib/store';
import type { ShelfItem, ShelfKind } from '@/lib/types';

const KINDS: ShelfKind[] = ['parcel', 'return', 'loan'];

/** A day picked as "days from today", with − and +. */
function DayStepper({ value, onChange, today, min = 0, label }: { value: string; onChange: (key: string) => void; today: string; min?: number; label: string }) {
  const offset = daysTo(value, today);
  return (
    <Stepper
      value={offset}
      min={min}
      max={365}
      onChange={(n) => onChange(dayKey(addDays(noonOf(today), n)))}
      format={(n) => dayWord(dayKey(addDays(noonOf(today), n)), today)}
      label={label}
    />
  );
}

/** The code, spaced out and big, for reading off at the counter or typing into the box. */
function BigCode({ code }: { code: string }) {
  const spaced = code.length > 4 && /^\d+$/.test(code) ? code.replace(/(\d{3})(?=\d)/g, '$1 ') : code.split('').join(' ');
  return (
    <View style={styles.codeBox} accessible accessibilityLabel={`Code ${code.split('').join(' ')}`}>
      <Text style={styles.code} selectable>
        {spaced}
      </Text>
    </View>
  );
}

function ShelfRow({ x, today, big }: { x: ShelfItem; today: string; big?: boolean }) {
  const { actions } = useStore();
  const k = SHELF_KINDS[x.kind];
  const done = x.doneAt != null;
  const left = x.until ? daysTo(x.until, today) : null;
  const soon = left != null && left <= 1;
  return (
    <View style={[styles.item, done && { opacity: 0.5 }]}>
      <Row>
        <Text style={{ fontSize: 20 }}>{k.emoji}</Text>
        <View style={{ flex: 1 }}>
          <T style={done ? { textDecorationLine: 'line-through' } : undefined}>{x.title}</T>
          <T small style={{ color: done ? C.dim : soon ? C.yellow : C.dim }}>
            {done ? k.done : deadlineText(x, today)}
            {x.kind === 'return' && x.delivered && !done ? ` · delivered ${dayWord(x.delivered, today)}` : ''}
          </T>
        </View>
        {!done && x.until ? (
          <Pressable onPress={() => actions.shelfRemind(x.id, !x.remind)} hitSlop={8} accessibilityRole="switch" accessibilityState={{ checked: !!x.remind }} accessibilityLabel="Remind me the day before">
            <Icon name={x.remind ? 'notifications_active' : 'notifications_off'} size={20} color={x.remind ? C.cyan : C.faint} />
          </Pressable>
        ) : null}
        <Pressable onPress={() => actions.deleteShelf(x.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${x.title}`}>
          <Icon name="close" size={18} color={C.faint} />
        </Pressable>
      </Row>
      {big && x.code && !done ? <BigCode code={x.code} /> : x.code && !done ? <T mono small>Code {x.code}</T> : null}
      {done ? (
        <Pressable onPress={() => actions.shelfUndone(x.id)} hitSlop={6} accessibilityRole="button">
          <T dim small>
            Not yet? Put it back
          </T>
        </Pressable>
      ) : (
        <Btn small kind={soon ? 'primary' : 'ghost'} icon="check" label={k.done} onPress={() => actions.shelfDone(x.id)} />
      )}
    </View>
  );
}

/** HQ: what's open on the shelf, codes in big digits. Nothing when the shelf is empty. */
export function ShelfHqCard() {
  const { state } = useStore();
  const today = useToday();
  const open = openShelf(state);
  if (!open.length) return null;
  const list = shelfList(state).filter((x) => x.doneAt == null);
  return (
    <Card accent={list.some((x) => x.until && daysTo(x.until, today) <= 1) ? C.yellow : undefined}>
      <H>📦 Due-back shelf</H>
      {list.map((x) => (
        <ShelfRow key={x.id} x={x} today={today} big />
      ))}
    </Card>
  );
}

/** Plan: the shelf with the add form. */
export function ShelfCard() {
  const { state, actions } = useStore();
  const today = useToday();
  const [adding, setAdding] = useState(false);
  const list = shelfList(state);
  return (
    <Card>
      <H
        right={
          <Pressable onPress={() => setAdding(!adding)} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>{adding ? 'Cancel' : '+ Add'}</Text>
          </Pressable>
        }>
        📦 Due-back shelf
      </H>
      {list.length === 0 && !adding ? (
        <T dim small>
          Parcels to pick up, return windows, library loans. Share a PostNord, Instabox, DHL or Budbee text to S.P.I.D.E.R. and the code lands here.
        </T>
      ) : null}
      {list.map((x) => (
        <ShelfRow key={x.id} x={x} today={today} />
      ))}
      {adding ? (
        <ShelfForm
          onSave={(item) => {
            actions.addShelf(item);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : null}
    </Card>
  );
}

/**
 * An item for the shelf, filled in from a shared text (`parsed`) where it can be: kind, title, code, the last day,
 * the delivery day. What the text didn't have is asked for here; carrier hold times are never guessed.
 */
export function ShelfForm({ parsed, kind: startKind, onSave, onCancel }: { parsed?: ShelfParse | null; kind?: ShelfKind; onSave: (item: Omit<ShelfItem, 'id' | 'at'>) => void; onCancel?: () => void }) {
  const today = useToday();
  const [kind, setKind] = useState<ShelfKind>(startKind ?? parsed?.kind ?? 'parcel');
  const [title, setTitle] = useState(parsed?.title ?? '');
  const [touched, setTouched] = useState(false); // the title was typed: switching kinds keeps it
  const [code, setCode] = useState(parsed?.code ?? '');
  const [until, setUntil] = useState<string | null>(parsed?.until ?? null);
  const [delivered, setDelivered] = useState<string>(parsed?.delivered ?? today);
  const [remind, setRemind] = useState(false);
  const found = (parsed?.dates ?? []).filter((d) => d >= today);
  const pickKind = (k: ShelfKind) => {
    setKind(k);
    if (!touched) setTitle(shelfTitle(k, parsed?.carrier ?? null));
  };
  const lastDay = kind === 'return' ? (until ?? returnBy(delivered)) : until;
  const save = () =>
    onSave({
      kind,
      title: title.trim() || shelfTitle(kind, parsed?.carrier ?? null),
      ...(kind === 'parcel' && code.trim() ? { code } : {}),
      ...(parsed?.carrier ? { carrier: parsed.carrier } : {}),
      ...(lastDay ? { until: lastDay } : {}),
      ...(kind === 'return' ? { delivered } : {}),
      remind,
    });
  const recent = [0, 1, 2, 3].map((n) => dayKey(addDays(noonOf(today), -n)));
  return (
    <View style={styles.form}>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {KINDS.map((k) => (
          <Chip key={k} label={`${SHELF_KINDS[k].emoji} ${SHELF_KINDS[k].label}`} active={kind === k} color={C.cyan} onPress={() => pickKind(k)} />
        ))}
      </Row>
      <Field
        value={title}
        onChangeText={(t) => {
          setTitle(t);
          setTouched(true);
        }}
        placeholder={kind === 'loan' ? 'The book' : kind === 'return' ? 'What, from where' : 'Parcel from…'}
        maxLength={80}
      />
      {kind === 'parcel' ? <Field value={code} onChangeText={setCode} placeholder="Pickup code (if there is one)" autoCapitalize="characters" maxLength={12} /> : null}

      {kind === 'return' ? (
        <>
          <T small>Delivered</T>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {[...new Set([...(parsed?.delivered ? [parsed.delivered] : []), ...recent])].map((d) => (
              <Chip
                key={d}
                label={dayWord(d, today) === 'today' ? 'Today' : d === recent[1] ? 'Yesterday' : dayWord(d, today)}
                active={delivered === d}
                color={C.cyan}
                onPress={() => {
                  setDelivered(d);
                  setUntil(null);
                }}
              />
            ))}
          </Row>
          <T dim small>
            Ångerrätt: {RETURN_DAYS} days from the day after delivery. A last day on a weekend or a red day moves to the next weekday. The shop may give you longer.
          </T>
        </>
      ) : null}

      <Row style={{ justifyContent: 'space-between' }}>
        <T small>{kind === 'parcel' ? 'Pick up by' : kind === 'return' ? 'Return by' : 'Due back'}</T>
        {lastDay ? (
          <DayStepper value={lastDay} onChange={setUntil} today={today} label="last day" />
        ) : (
          <Btn small kind="ghost" label="Set the last day" onPress={() => setUntil(dayKey(addDays(noonOf(today), kind === 'loan' ? 21 : 7)))} />
        )}
      </Row>
      {found.length && kind !== 'return' ? (
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {found.map((d) => (
            <Chip key={d} label={`From the text: ${dayWord(d, today)}`} active={until === d} color={C.cyan} onPress={() => setUntil(d)} />
          ))}
        </Row>
      ) : null}
      {!lastDay ? (
        <T dim small>
          The text didn&apos;t say a last day. Set one, or add it later.
        </T>
      ) : null}
      {lastDay ? <Chip label={remind ? '🔔 One reminder before the last day' : '🔕 Remind me before the last day'} active={remind} color={C.cyan} onPress={() => setRemind(!remind)} /> : null}
      <Row gap={8}>
        <Btn label="Put it on the shelf" icon="inventory_2" onPress={save} style={{ flex: 1 }} />
        {onCancel ? <Btn kind="ghost" label="Cancel" onPress={onCancel} /> : null}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  link: { color: C.red, fontWeight: '700', fontSize: 13 },
  form: { gap: 10, backgroundColor: C.card2, borderRadius: 12, padding: 12 },
  item: { gap: 8 },
  codeBox: { backgroundColor: C.card2, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  code: { color: C.text, fontFamily: MONO, fontSize: 38, fontWeight: '900', letterSpacing: 4 },
});
