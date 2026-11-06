// Step 9 tank: what goes round the terrarium. The sten, sax, påse panel under the tank, HQ's party banner (which
// also settles nights out and guests: useTankSync), the terrarium card's news (back from a night out, today's
// guest) and the shop's lists (souvenirs, the guestbook, the week's matches).
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Btn, Icon, Row, T, useNow } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { cosmeticOf } from '@/lib/cosmetics';
import { dayKey } from '@/lib/dates';
import { backThisMorning, SOUVENIR_BY_ID, tripsDue } from '@/lib/expeditions';
import { GUESTS, guestAwake, guestOn, guestsDue, narrating } from '@/lib/guests';
import { firstsOf, partyKey, partyOn } from '@/lib/hatch-day';
import { coinsLeftToday, outcomeOf, ROUNDS, rpsFinding, rpsOf, RPS_DAILY_COINS, scoreOf, THROW_EMOJI, THROW_NAME, weekTally } from '@/lib/rps';
import { useStore } from '@/lib/store';
import { tankLifeOf, wakeAtOf } from '@/lib/tank-life';
import type { GuestVisit, RpsThrow } from '@/lib/types';

const shortDate = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const longDate = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dayDate = (key: string) => shortDate(new Date(`${key}T12:00`).getTime());

/** Settles the tank's nights out and guests once something is due (souvenirs on the shelf, a guest's gift). On HQ, which stays mounted. */
function useTankSync() {
  const { state, actions, weather, health } = useStore();
  const now = useNow(60_000);
  const at = new Date(now);
  const wakeAt = wakeAtOf(state, dayKey(at), health.data?.nights ?? null);
  const due = state.onboarded && (tripsDue(state, at, wakeAt) || guestsDue(state, at));
  const forecast = weather.data?.days ?? null;
  useEffect(() => {
    if (due) actions.tankSync({ forecast, wakeAt });
  }, [due, forecast, wakeAt, actions]);
}

/** The party's line, picked once per kind of party and number. */
function PartyLine({ lineKey, n }: { lineKey: 'partyGentle' | 'partyYear' | 'partyHundred'; n: number }) {
  const { quip } = useStore();
  const text = useMemo(() => quip(lineKey, { n }), [quip, lineKey, n]);
  return (
    <T dim small>
      {text}
    </T>
  );
}

/**
 * HQ: hatch day's anniversary or a hundredth day used (hatch-day.ts), with the scroll of firsts; gentle on a rough
 * day. Closed through State.dismissed. It also keeps the tank's nights out and guests settled.
 */
export function TankBanner() {
  useTankSync();
  const { state, actions } = useStore();
  const today = useToday();
  const now = useNow(60_000);
  const party = partyOn(state, today, new Date(now));
  const firsts = party ? firstsOf(state, { now, gentle: party.gentle }).slice(0, 8) : [];
  const key = partyKey(today);
  const closed = (state.dismissed ?? []).includes(key);
  const n = party?.n ?? 0;
  const gentle = !!party?.gentle;
  const yearly = party?.kind === 'year';
  const shown = !!party && !closed;
  const title = yearly ? `Hatch day · ${n} ${n === 1 ? 'year' : 'years'}` : `Day ${n} · a party in the tank`;
  const lineKey = gentle ? 'partyGentle' : yearly ? 'partyYear' : 'partyHundred';
  if (!shown) return null;
  return (
    <View style={styles.banner}>
      <Text style={{ fontSize: 26 }}>{gentle ? '🧁' : '🎂'}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.bannerTitle}>{title}</Text>
        <PartyLine lineKey={lineKey} n={n} />
        {firsts.length ? (
          <View style={{ marginTop: 4, gap: 1 }}>
            <T small style={{ color: C.yellow }}>
              📜 The scroll of firsts
            </T>
            {firsts.map((f) => (
              <T key={f.label} dim small>
                {f.emoji} {f.label}
                {f.emoji === '🧟' ? '' : ` · ${longDate(f.at)}`}
              </T>
            ))}
          </View>
        ) : null}
      </View>
      <Pressable onPress={() => actions.dismissBanner(key)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide the party banner">
        <Icon name="close" size={18} color={C.faint} />
      </Pressable>
    </View>
  );
}

/** The terrarium card's news: out for the night, back this morning with a souvenir and its story, today's guest. */
export function TankNews() {
  const { state, weather, health } = useStore();
  const today = useToday();
  const now = useNow(60_000);
  const at = new Date(now);
  const o = { wakeAt: wakeAtOf(state, today, health.data?.nights ?? null), forecast: weather.data?.days ?? null };
  const life = tankLifeOf(state, { now, forecast: weather.data?.days.find((d) => d.date === today) ?? null, nights: health.data?.nights ?? null });
  const back = backThisMorning(state, at, o);
  const guest = guestOn(state, today);
  const lines: string[] = [];
  if (life.mode === 'out') lines.push("📝 The tank's empty. A note on the moss: \"Out. Don't wait up.\"");
  if (back) lines.push(`🧳 Back from a night out with ${back.souvenir.emoji} ${back.souvenir.name}. ${back.story[0]} ${back.story[1]}`);
  if (guest) {
    const g = GUESTS[guest];
    lines.push(narrating(state, now) ? `${g.emoji} ${g.short} is narrating the spider's every move.` : guestAwake(state, today) ? `${g.emoji} ${g.short} is up. Tap it for a word.` : `${g.emoji} A guest: ${g.name}, asleep in the corner. Tap it to wake it.`);
  }
  if (!lines.length) return null;
  return (
    <>
      {lines.map((l) => (
        <T key={l} dim small>
          {l}
        </T>
      ))}
    </>
  );
}

const THROW_ORDER: RpsThrow[] = ['r', 's', 'p'];
const LABEL: Record<RpsThrow, string> = { r: 'Sten', s: 'Sax', p: 'Påse' };

/**
 * Sten, sax, påse against the spider (rps.ts), under the tank: a match is up to ten rounds. The spider guesses from
 * her past throws and taunts with the numbers. A won match pays coins within the day's cap; never XP.
 */
export function RpsPanel({ onClose }: { onClose: () => void }) {
  const { state, actions, quip, weather, health } = useStore();
  const now = useNow(60_000);
  const today = useToday();
  const rps = rpsOf(state);
  const last = rps.last;
  const live = scoreOf(rps.live);
  const life = tankLifeOf(state, { now, forecast: weather.data?.days.find((d) => d.date === today) ?? null, nights: health.data?.nights ?? null });
  const tally = weekTally(rps, new Date(now));
  const left = coinsLeftToday(rps, new Date(now));
  const fresh = last && !last.ended && rps.live;
  const out = life.mode === 'out';
  const lastAt = last?.at ?? 0;
  // One line per round (picked once, when the round lands): how it went, or how the match ended; and a taunt with her numbers.
  const finding = rpsFinding(rps);
  const ended = last?.ended;
  const paid = last?.coins ?? 0;
  const you = last?.you ?? 0;
  const spider = last?.spider ?? 0;
  const outcome = last ? outcomeOf(last.me, last.it) : null;
  const taunt = useMemo(() => (finding ? quip('rpsTaunt', { finding }) : ''), [quip, finding]);
  const round = useMemo(() => {
    if (!lastAt) return '';
    if (ended === 'won') return paid ? quip('rpsMatchWon', { count: you, n: spider, coins: paid }) : quip('rpsMatchWonFree', { count: you, n: spider });
    if (ended === 'lost') return quip('rpsMatchLost', { count: you, n: spider });
    if (ended === 'draw') return quip('rpsMatchDraw', { count: you, n: spider });
    return outcome === 'draw' ? quip('rpsRoundDraw') : outcome === 'win' ? quip('rpsRoundYou') : quip('rpsRoundSpider');
  }, [quip, lastAt, ended, paid, you, spider, outcome]);
  return (
    <View style={styles.panel} onStartShouldSetResponder={() => true}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={styles.panelTitle}>
          ✊ Sten, sax, påse{rps.live ? ` · round ${live.played + 1}/${ROUNDS}` : ''}
        </Text>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close the game">
          <Icon name="close" size={18} color={C.faint} />
        </Pressable>
      </Row>
      {out ? (
        <T dim small>
          The spider is out for the night. It plays again once you&apos;re up.
        </T>
      ) : (
        <>
          <T small mono>
            You {live.you} – {live.spider} Spider
          </T>
          <Row gap={8}>
            {THROW_ORDER.map((t) => (
              <Btn key={t} small kind="ghost" label={`${THROW_EMOJI[t]} ${LABEL[t]}`} a11yLabel={`Throw ${THROW_NAME[t]}`} onPress={() => actions.rpsThrow(t)} style={{ flex: 1 }} />
            ))}
          </Row>
          {last ? (
            <T small>
              {fresh || last.ended ? `You ${THROW_EMOJI[last.me]} · ${THROW_EMOJI[last.it]} Spider. ` : ''}
              {round}
            </T>
          ) : (
            <T dim small>
              Best of ten. It has watched every throw you ever made.
            </T>
          )}
          {taunt ? (
            <T small style={{ color: C.yellow }}>
              🕷️ {taunt}
            </T>
          ) : null}
        </>
      )}
      <T dim small>
        This week: {tally.w} won · {tally.l} lost · {tally.d} drawn · {left}/{RPS_DAILY_COINS} 🪙 left today
      </T>
    </View>
  );
}

const giftText = (v: GuestVisit) => {
  const c = v.gift?.cosmetic ? cosmeticOf(v.gift.cosmetic) : undefined;
  return c ? `${c.emoji} ${c.name}` : v.gift?.coins ? `${v.gift.coins} 🪙` : '';
};

/** The shop's terrarium card: souvenirs from nights out, the guestbook, the week's matches. */
export function TankShopFolk() {
  const { state } = useStore();
  const now = useNow(60_000);
  const shelf = state.trips?.shelf ?? [];
  const total = state.trips?.total ?? 0;
  const visits = state.guests?.visits ?? [];
  const tally = weekTally(rpsOf(state), new Date(now));
  return (
    <>
      <T dim small>
        {total
          ? `Souvenirs from nights out: ${total} in all (the newest five are on the shelf).`
          : 'Some nights, while you sleep, the spider sneaks out. It always brings something back.'}
      </T>
      {shelf
        .slice(-5)
        .reverse()
        .map((x) => {
          const d = SOUVENIR_BY_ID[x.id];
          return d ? (
            <Row key={x.night}>
              <Text style={{ fontSize: 18 }}>{d.emoji}</Text>
              <T small style={{ flex: 1 }}>
                {d.name.charAt(0).toUpperCase() + d.name.slice(1)}
              </T>
              <T small dim mono>
                {dayDate(x.night)}
              </T>
            </Row>
          ) : null;
        })}
      <T dim small>
        {visits.length ? `Guestbook: ${visits.length} ${visits.length === 1 ? 'visit' : 'visits'}.` : 'Now and then a guest drops by for a day. Tap it to wake it.'}
      </T>
      {visits
        .slice(-5)
        .reverse()
        .map((v) => (
          <Row key={v.day}>
            <Text style={{ fontSize: 18 }}>{GUESTS[v.guest]?.emoji ?? '🕷️'}</Text>
            <T small style={{ flex: 1 }}>
              {GUESTS[v.guest]?.short ?? 'A guest'}
              {v.woke ? '' : ' (slept through it)'}
              {v.gift ? ` · left ${giftText(v)}` : ''}
            </T>
            <T small dim mono>
              {dayDate(v.day)}
            </T>
          </Row>
        ))}
      <T dim small>
        ✊ Sten, sax, påse this week: {tally.w} won · {tally.l} lost · {tally.d} drawn. Tap ✊ Play on the tank.
      </T>
    </>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.yellow },
  bannerTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  panel: { gap: 8, padding: 10, borderRadius: 10, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border },
  panelTitle: { color: C.text, fontSize: 14, fontWeight: '800' },
});
