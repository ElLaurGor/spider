import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable } from 'react-native';

import { Btn, Card, Field, H, Icon, Row, T, useNow } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { dayKey } from '@/lib/dates';
import { careOffer, seenCare, type CareStep } from '@/lib/care-step';
import { bookedText, joyAsk, joyFits, joyOf, joyPick, joySlot, liftText, sizeLabel } from '@/lib/joy';
import type { LineKey } from '@/lib/lines';
import { dayOf, lowBattery } from '@/lib/selectors';
import { KIND_CHARS, lastKindWord, slipCard } from '@/lib/slips';
import { useStore } from '@/lib/store';
import { slotText, WORRY_CHARS } from '@/lib/worry';

const STEP_LINE: Record<CareStep, LineKey> = {
  breathe: 'stepBreathe',
  park: 'stepPark',
  social: 'stepSocial',
  joy: 'stepJoy',
  rest: 'stepRest',
  move: 'stepMove',
};

/**
 * step 9 care: the quiet offers after a check-in and the morning after a slip, in HQ's care area (and the matched
 * step on the Mood screen). Each is an offer: × or "Not now" closes it for good, nothing is counted but the joy
 * menu's own "did it help?", and nothing pays XP.
 */
export function CareOffers({ here = 'hq' }: { here?: 'hq' | 'mood' }) {
  return (
    <>
      {here === 'hq' ? <JoyFollowUp /> : null}
      <MatchedStep />
      {here === 'hq' ? <SlipCard /> : null}
    </>
  );
}

/**
 * A line from a care pool, picked once for what it's given (a re-render, say every minute, doesn't re-pick it).
 * Only plain strings come in, so the pick never depends on objects from the state.
 */
function Say({ pool, title = '', time = '', happened = '', color }: { pool: LineKey; title?: string; time?: string; happened?: string; color?: string }) {
  const { quip } = useStore();
  const text = useMemo(() => quip(pool, { title, time, happened }), [quip, pool, title, time, happened]);
  return (
    <T small style={color ? { color } : undefined}>
      {text}
    </T>
  );
}

const closeBtn = (onPress: () => void, label = 'Not now') => (
  <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={label}>
    <Icon name="close" size={18} color={C.faint} />
  </Pressable>
);

/** After a check-in with words: the one tool they point at (care-step.ts). A low one without words: the joy menu. */
function MatchedStep() {
  const { state, actions } = useStore();
  const now = useNow(60_000);
  const offer = careOffer(state, now);
  if (!offer) return null;
  const today = dayOf(state, dayKey(now));
  const restOn = lowBattery(today);
  const slot = slotText(state);
  const { key, step } = offer;
  const named = offer.mood.emotions;
  const close = () => actions.seeCare(key);
  return (
    <Card accent={C.purple}>
      <H right={closeBtn(close)}>🫶 One small step</H>
      <Say key={key} pool={step ? STEP_LINE[step] : 'stepJoy'} time={slot} />
      {step === 'breathe' ? (
        <>
          <Row>
            <Btn
              label="Breathe 2 min"
              icon="air"
              kind="blue"
              small
              onPress={() => {
                close();
                router.push('/breathe');
              }}
              style={{ flex: 1 }}
            />
            <Btn label="A short walk" icon="directions_walk" kind="ghost" small onPress={close} style={{ flex: 1 }} />
          </Row>
          {named.includes('Stressed') ? <ParkIt hint={`Or park what's on your mind until ${slot}.`} /> : null}
        </>
      ) : null}
      {step === 'park' ? <ParkIt onParked={close} /> : null}
      {step === 'rest' ? (
        restOn ? (
          <>
            <T dim small>
              Low-battery mode is already on: one quest, no gym guilt.
            </T>
            <Btn label="Okay" kind="ghost" small onPress={close} />
          </>
        ) : (
          <Row>
            <Btn
              label={today.energy != null ? `Low-battery mode (energy ${today.energy} → 2)` : 'Low-battery mode today'}
              icon="battery_low"
              kind="ghost"
              small
              onPress={() => actions.restToday(key)}
              style={{ flex: 1 }}
            />
            <Btn label="Not now" kind="ghost" small onPress={close} />
          </Row>
        )
      ) : null}
      {step === 'move' ? (
        <Row>
          <Btn label="On it" icon="directions_walk" kind="ghost" small onPress={close} style={{ flex: 1 }} />
          <Btn label="Not now" kind="ghost" small onPress={close} style={{ flex: 1 }} />
        </Row>
      ) : null}
      {step === 'social' ? <JoyChoice seed={key} seenKey={key} social fallback="Okay" /> : null}
      {step === 'joy' || step === null ? <JoyChoice seed={key} seenKey={key} fallback={step === 'joy' ? 'Okay' : undefined} /> : null}
    </Card>
  );
}

/**
 * One item from the joy menu that fits today's energy: do it now, or book it into the first free calendar slot.
 * `social`: only items tagged social. With nothing that fits, `fallback` closes the offer (and an empty menu
 * gets a pointer to set one up).
 */
function JoyChoice({ seed, seenKey, social, fallback, compact }: { seed: string; seenKey: string; social?: boolean; fallback?: string; compact?: boolean }) {
  const { state, actions, cal } = useStore();
  const now = useNow(60_000);
  const [skip, setSkip] = useState(0);
  const item = joyPick(state, { seed, social, skip });
  const others = joyOf(state).items.length;
  const fitting = joyFits(state, { social }).length;
  const st = state.settings;
  const slot = item && cal.status === 'granted' ? joySlot(cal.events, item.size, st.wakeHour, st.sleepHour, new Date(now)) : null;
  const close = () => actions.seeCare(seenKey);
  if (!item) {
    if (!fallback) return null;
    return (
      <>
        {!others && !social ? (
          <T dim small>
            A joy menu helps here: a few small things that reliably lift you, like a call, a song or a walk.
          </T>
        ) : null}
        <Row>
          {!others && !social ? (
            <Btn
              label="Set one up"
              icon="add"
              kind="ghost"
              small
              onPress={() => {
                close();
                router.push('/joy');
              }}
              style={{ flex: 1 }}
            />
          ) : null}
          <Btn label={fallback} kind="ghost" small onPress={close} style={{ flex: 1 }} />
        </Row>
      </>
    );
  }
  return (
    <>
      <Say pool="joyOffer" title={item.title} color={C.green} />
      <T dim small>
        {sizeLabel(item.size)} · {liftText(item)}
      </T>
      <Row style={{ flexWrap: 'wrap' }} gap={8}>
        <Btn label="Do it now" icon="favorite" kind="blue" small onPress={() => actions.startJoy(item.id, seenKey)} />
        {slot ? <Btn label={`Book it ${bookedText(slot.at, new Date(now))}`} icon="event" kind="ghost" small onPress={() => actions.startJoy(item.id, seenKey, slot.at)} /> : null}
        {fitting > 1 ? <Btn label="Something else" kind="ghost" small onPress={() => setSkip(skip + 1)} /> : null}
        {!compact ? <Btn label="Not now" kind="ghost" small onPress={close} /> : null}
      </Row>
    </>
  );
}

/** The rough-patch card's joy offer: one item a day, gone once taken or the card is closed. */
export function PatchJoy() {
  const { state } = useStore();
  const today = useToday();
  const key = `joy:patch:${today}`;
  if (seenCare(state, key)) return null;
  return <JoyChoice seed={key} seenKey={key} compact />;
}

/** "Did it help?" once a joy item's time has passed: one tap, counted on the list as a plain total. */
function JoyFollowUp() {
  const { state, actions, quip } = useStore();
  const now = useNow(60_000);
  const ask = joyAsk(state, now);
  const title = ask?.item.title ?? '';
  const q = useMemo(() => (title ? quip('joyAsk', { title }) : ''), [quip, title]);
  if (!ask) return null;
  return (
    <Card accent={C.green}>
      <H right={closeBtn(() => actions.answerJoy(null), 'Skip')}>🌼 Joy menu</H>
      <T small>{q}</T>
      <Row>
        <Btn label="A bit better" kind="blue" small onPress={() => actions.answerJoy(true)} style={{ flex: 1 }} />
        <Btn label="Same" kind="ghost" small onPress={() => actions.answerJoy(false)} style={{ flex: 1 }} />
      </Row>
    </Card>
  );
}

/** "Park it": a worry off her mind until the worry slot (worry.ts). */
export function ParkIt({ onParked, hint }: { onParked?: () => void; hint?: string }) {
  const { actions } = useStore();
  const [text, setText] = useState('');
  const park = () => {
    if (!text.trim()) return;
    actions.parkWorry(text);
    setText('');
    onParked?.();
  };
  return (
    <>
      {hint ? (
        <T dim small>
          {hint}
        </T>
      ) : null}
      <Row>
        <Field value={text} onChangeText={setText} placeholder="What's on your mind?" maxLength={WORRY_CHARS} onSubmitEditing={park} returnKeyType="done" style={{ flex: 1 }} />
        <Btn label="Park it" small onPress={park} disabled={!text.trim()} />
      </Row>
    </>
  );
}

const upper = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** The morning after a real slip (opt-in): Neff's three steps, with an optional line for a friend. */
function SlipCard() {
  const { state, actions } = useStore();
  const now = useNow(60_000);
  const [text, setText] = useState('');
  const card = slipCard(state, new Date(now));
  if (!card) return null;
  const keys = card.slips.map((x) => x.key);
  const last = lastKindWord(state, card.day);
  const happened = upper(card.slips[0].happened);
  const close = (keep: boolean) => {
    actions.closeSlips(card.day, keys, keep ? text : '');
    setText('');
  };
  return (
    <Card accent={C.cyan}>
      <H right={closeBtn(() => close(false), 'Close')}>🫂 About yesterday</H>
      <Say pool="slipHard" happened={happened} />
      <Say pool="slipEveryone" />
      <Say pool="slipFriend" color={C.cyan} />
      {last ? (
        <T dim small>
          Last time you told yourself: “{last.text}”
        </T>
      ) : null}
      <Field value={text} onChangeText={setText} placeholder="One line, if you like (only you see it)" maxLength={KIND_CHARS} />
      <Row>
        <Btn label="Keep it" icon="check" small disabled={!text.trim()} onPress={() => close(true)} style={{ flex: 1 }} />
        <Btn label="Done" kind="ghost" small onPress={() => close(false)} style={{ flex: 1 }} />
      </Row>
    </Card>
  );
}
