// HQ's dated cards: the Advent Web (first Advent to Trettondedag jul), the Julfrid offer (from the 23rd's
// evening) and the S.P.I.D.E.R. Prizes (10–12 December). Each shows only in its own window.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, H, Icon, Row, T, useNow } from '@/components/ui';
import { noonOf, useToday } from '@/components/use-today';
import { C, MONO } from '@/constants/theme';
import { ADVENT_DOORS, adventCandles, adventYear, doorOpenable, doorPrize, doorsOpened, julfridOffer } from '@/lib/advent';
import { cosmeticOf } from '@/lib/cosmetics';
import { prizeCardUp, prizesAccepted, prizesFor } from '@/lib/prizes';
import { useStore } from '@/lib/store';

/** Lit candles, and the ones still to come as dots. */
export const candleRow = (lit: number) => `${'🕯️'.repeat(lit)}${' ·'.repeat(4 - lit)}`;

/** The 24-door Advent Web: one tap opens the earliest waiting door, the grid shows them all. */
export function AdventCard() {
  const { state, actions } = useStore();
  const today = useToday();
  const date = noonOf(today);
  const [open, setOpen] = useState(false);
  const year = adventYear(date);
  if (year == null) return null;
  const opened = doorsOpened(state, year);
  const waiting = Array.from({ length: ADVENT_DOORS }, (_, i) => i + 1).filter((n) => doorOpenable(state, n, date));
  const lit = adventCandles(date);
  if (!lit && !waiting.length) return null; // after Christmas, only while a door is still shut
  const prizeEmoji = (n: number) => {
    const p = doorPrize(year, n);
    return p.cosmetic ? (cosmeticOf(p.cosmetic)?.emoji ?? '🎁') : '🪙';
  };

  return (
    <Card accent={C.yellow}>
      <H
        right={
          <Pressable onPress={() => setOpen(!open)} hitSlop={10} accessibilityRole="button" accessibilityLabel={open ? 'Hide the doors' : 'Show all doors'}>
            <Icon name={open ? 'expand_less' : 'expand_more'} color={C.dim} />
          </Pressable>
        }>
        Advent Web
      </H>
      {lit ? <Text style={styles.candles}>{candleRow(lit)}</Text> : null}
      <T dim small>
        {waiting.length
          ? `${waiting.length} door${waiting.length === 1 ? '' : 's'} to open. ${opened.length} of ${ADVENT_DOORS} open.`
          : date.getMonth() === 10
            ? 'Door 1 opens on 1 December. A missed door waits for you, so no day is ever lost.'
            : `${opened.length} of ${ADVENT_DOORS} open. The next door opens tomorrow.`}
      </T>
      {waiting.length ? <Btn label={`Open door ${waiting[0]}`} icon="redeem" small onPress={() => actions.openAdventDoor(waiting[0])} /> : null}
      {open ? (
        <View style={styles.grid}>
          {Array.from({ length: ADVENT_DOORS }, (_, i) => i + 1).map((n) => {
            const done = opened.includes(n);
            const ready = waiting.includes(n);
            return (
              <Pressable
                key={n}
                disabled={!ready}
                onPress={() => actions.openAdventDoor(n)}
                accessibilityRole="button"
                accessibilityLabel={done ? `Door ${n}, open` : ready ? `Open door ${n}` : `Door ${n}, opens on ${n} December`}
                style={[styles.door, ready && { borderColor: C.yellow, backgroundColor: C.card2 }, done && { opacity: 0.55 }]}>
                <Text style={done ? styles.doorPrize : [styles.doorNum, !ready && { color: C.faint }]}>{done ? prizeEmoji(n) : n}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}

/** From the 23rd's evening: Julfrid off in one tap (away mode to annandag jul). */
export function JulfridCard() {
  const { state, actions } = useStore();
  const today = useToday();
  const now = useNow(60_000); // the offer starts at 18:00 on the 23rd
  const offer = julfridOffer(state, new Date(now));
  const key = `julfrid:${today.slice(0, 4)}`;
  if (!offer || (state.dismissed ?? []).includes(key)) return null;
  return (
    <Card accent={C.green}>
      <Row style={{ alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 26 }}>🎄</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.title}>Julfrid</Text>
          <T dim small>
            Take the days off until the 27th? Away mode: no water, gym or habit nagging, and the boss shrinks to fit. No roasts either way.
          </T>
        </View>
        <Pressable onPress={() => actions.dismissBanner(key)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide the Julfrid card">
          <Icon name="close" size={18} color={C.faint} />
        </Pressable>
      </Row>
      <Btn label={offer.from === today ? 'Take Julfrid off' : 'Take Julfrid off from tomorrow'} icon="beach_access" small onPress={() => actions.startJulfrid()} />
    </Card>
  );
}

/** 10–12 December: the year's prizes, accepted once for a medal. */
export function PrizesCard() {
  const { state, actions } = useStore();
  const today = useToday();
  const date = noonOf(today);
  const year = date.getFullYear();
  if (!prizeCardUp(date) || prizesAccepted(state, year) || (state.dismissed ?? []).includes(`prizes:${year}`)) return null;
  const prizes = prizesFor(state, year, noonOf(today));
  if (!prizes.length) return null;
  return (
    <Card accent={C.yellow}>
      <H
        right={
          <Pressable onPress={() => actions.dismissBanner(`prizes:${year}`)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide the Prizes">
            <Icon name="close" size={18} color={C.faint} />
          </Pressable>
        }>
        {`🏅 The S.P.I.D.E.R. Prizes ${year}`}
      </H>
      <T dim small>
        Stockholm hands out its prizes today, and so do I. Counted days only. The committee was me.
      </T>
      {prizes.map((p) => (
        <Row key={p.id} style={{ alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 22 }}>{p.emoji}</Text>
          <View style={{ flex: 1 }}>
            <T>
              <Text style={{ fontWeight: '800' }}>{p.field}</Text> · <Text style={{ fontFamily: MONO }}>{p.stat}</Text>
            </T>
            <T dim small>
              {p.citation}
            </T>
          </View>
        </Row>
      ))}
      <Btn label="Accept on your behalf" icon="military_tech" small onPress={() => actions.acceptPrizes()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  candles: { fontSize: 20, letterSpacing: 2, color: C.faint },
  title: { color: C.text, fontSize: 15, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  door: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  doorNum: { color: C.text, fontSize: 15, fontWeight: '800', fontFamily: MONO },
  doorPrize: { fontSize: 20 },
});
