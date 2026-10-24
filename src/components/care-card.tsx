import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, Text } from 'react-native';

import { PauseCard } from '@/components/pause-card';
import { Btn, Card, Chip, H, Icon, Row, T } from '@/components/ui';
import { noonOf, useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { EMOTIONS, nameItFor } from '@/lib/mood';
import { patchSummary, roughPatch, showRoughPatch } from '@/lib/rough-patch';
import { dayOf, lowBattery, moodsOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';

/** HQ's quiet check-ins: "Want to name it?" after a low one-tap check-in, and the rough-patch card. Usually nothing. */
export function CareCard() {
  return (
    <>
      <NameItCard />
      <RoughPatchCard />
    </>
  );
}

/** After a low check-in logged without words: an optional, one-time offer to name the feeling. */
function NameItCard() {
  const { state, actions } = useStore();
  const today = useToday();
  const [words, setWords] = useState<string[]>([]);
  const entry = nameItFor(moodsOf(dayOf(state, today)));
  if (!entry) return null;
  const toggle = (name: string) => setWords(words.includes(name) ? words.filter((w) => w !== name) : [...words, name]);
  const done = (picked: string[]) => {
    actions.nameMood(entry.id, picked, today);
    setWords([]);
  };
  return (
    <Card accent={C.purple}>
      <H
        right={
          <Pressable onPress={() => done([])} hitSlop={10} accessibilityRole="button" accessibilityLabel="Not now">
            <Icon name="close" size={18} color={C.faint} />
          </Pressable>
        }>
        Want to name it?
      </H>
      <T dim small>
        Optional. Putting a word on a feeling tends to take a little weight off it.
      </T>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {EMOTIONS.filter((e) => e.low).map((e) => (
          <Chip key={e.name} label={`${e.emoji} ${e.name}`} active={words.includes(e.name)} color={C.purple} onPress={() => toggle(e.name)} />
        ))}
      </Row>
      <Row>
        <Btn label="Save" icon="check" small disabled={!words.length} onPress={() => done(words)} style={{ flex: 1 }} />
        <Btn label="Not now" kind="ghost" small onPress={() => done([])} style={{ flex: 1 }} />
      </Row>
    </Card>
  );
}

/**
 * When the last two weeks look heavy (rough-patch.ts): what was seen, in plain counts, and some slack on offer.
 * No XP, no verdict, closed for a week with × or once an offer is taken.
 */
function RoughPatchCard() {
  const { state, actions, health } = useStore();
  const today = useToday();
  const [pausing, setPausing] = useState(false);
  const patch = roughPatch(state, health.data?.restingDays ?? [], noonOf(today));
  if (!patch || !showRoughPatch(state)) return null;
  const close = actions.closeRoughPatch;
  return (
    <Card accent={C.cyan}>
      <H
        right={
          <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close for a week">
            <Icon name="close" size={18} color={C.faint} />
          </Pressable>
        }>
        🫖 Checking in
      </H>
      <T small>{patchSummary(patch)}</T>
      <T dim small>
        That&apos;s a lot to carry. No verdict from me, just some slack if you want it:
      </T>
      {!lowBattery(dayOf(state, today)) ? (
        <Btn
          label="Low-battery mode today"
          icon="battery_low"
          kind="ghost"
          small
          onPress={() => {
            actions.rateEnergy(2); // energy 1–2 is what turns it on
            close();
          }}
        />
      ) : null}
      <Btn label={pausing ? 'Not now' : 'Take a sick or away pause'} icon="healing" kind="ghost" small onPress={() => setPausing(!pausing)} />
      {pausing ? <PauseCard /> : null}
      <Btn
        label="Breathe for two minutes"
        icon="air"
        kind="blue"
        small
        onPress={() => {
          close();
          router.push('/breathe');
        }}
      />
      {patch.heavy ? (
        <>
          <T dim small>
            If it&apos;s been heavy for a while, talking to someone can help. 1177 is there day and night: call 1177, or start at 1177.se.
          </T>
          <Pressable onPress={() => void Linking.openURL('https://www.1177.se')} hitSlop={8} accessibilityRole="link">
            <Text style={{ color: C.cyan, fontWeight: '700', fontSize: 13 }}>Open 1177.se →</Text>
          </Pressable>
        </>
      ) : null}
    </Card>
  );
}
