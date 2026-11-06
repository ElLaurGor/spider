import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, Chip, Field, H, Row, T, useNow } from '@/components/ui';
import { C } from '@/constants/theme';
import { partnerName } from '@/lib/coop';
import { cleanName, NAME_COST, NAME_MAX, PEEL_COST } from '@/lib/economy';
import { PEEL_XP, peelsOn, peelsUsed, PEELS_PER_WEEK, standings } from '@/lib/league';
import { bossFor } from '@/lib/quests';
import { useStore } from '@/lib/store';

type Mode = 'boss' | 'rename' | 'peel' | null;

/** Shop: name this week's boss, rename a rival for good, or slip one a banana peel. Coins only, never XP. */
export function BossRivalsCard() {
  const { state, actions } = useStore();
  const now = new Date(useNow(60_000));
  const [mode, setMode] = useState<Mode>(null);
  const [rival, setRival] = useState<string | null>(null);
  const [text, setText] = useState('');
  const boss = bossFor(state, now);
  const league = state.league;
  const partner = partnerName(state, now);
  const rivals = standings(state, now).filter((r) => !r.me);
  const peelable = rivals.filter((r) => r.name !== partner);
  const peelsLeft = league ? PEELS_PER_WEEK - peelsUsed(league) : 0;
  const name = cleanName(text);
  const picked = rivals.find((r) => r.id === rival);

  const reset = () => {
    setRival(null);
    setText('');
  };
  const toggle = (m: Mode) => {
    setMode(mode === m ? null : m);
    reset();
  };
  const confirm = (title: string, price: number, go: () => void) =>
    Alert.alert(title, `${price} 🪙 · you have ${state.coins} 🪙`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Buy',
        onPress: () => {
          go();
          setMode(null);
          reset();
        },
      },
    ]);
  const nameField = (placeholder: string) => (
    <Field value={text} onChangeText={setText} placeholder={placeholder} maxLength={NAME_MAX} autoCapitalize="words" />
  );

  return (
    <Card>
      <H>😈 Boss & rivals</H>
      <T dim small>
        Petty, and allowed. None of it touches your own XP.
      </T>

      <Row>
        <Text style={styles.emoji}>✏️</Text>
        <View style={{ flex: 1 }}>
          <T>Name this week&apos;s boss</T>
          <T dim small>
            Now: {boss.emoji} {boss.name}
          </T>
        </View>
        <Btn small kind={mode === 'boss' ? 'primary' : 'ghost'} label={`${NAME_COST} 🪙`} onPress={() => toggle('boss')} />
      </Row>
      {mode === 'boss' ? (
        <View style={styles.form}>
          {nameField('e.g. Sir Snoozealot')}
          <Btn
            label={name ? `Name it ${name}` : 'Type a name'}
            disabled={!name || name === boss.name}
            onPress={() => name && confirm(`Name the boss ${name}?`, NAME_COST, () => actions.nameBoss(name))}
          />
          <T dim small>
            The name holds all week, in the recap too. Next week&apos;s boss brings its own.
          </T>
        </View>
      ) : null}

      {league && rivals.length ? (
        <>
          <Row>
            <Text style={styles.emoji}>🏷️</Text>
            <View style={{ flex: 1 }}>
              <T>Rename a rival</T>
              <T dim small>
                For good: this league and every later one they turn up in.
              </T>
            </View>
            <Btn small kind={mode === 'rename' ? 'primary' : 'ghost'} label={`${NAME_COST} 🪙`} onPress={() => toggle('rename')} />
          </Row>
          {mode === 'rename' ? (
            <View style={styles.form}>
              <Row gap={6} style={{ flexWrap: 'wrap' }}>
                {rivals.map((r) => (
                  <Chip key={r.id} label={`${r.emoji} ${r.name}`} active={rival === r.id} onPress={() => setRival(r.id)} />
                ))}
              </Row>
              {picked ? (
                <>
                  {nameField(`A new name for ${picked.name}`)}
                  <Btn
                    label={name ? `Rename to ${name}` : 'Type a name'}
                    disabled={!name || name === picked.name}
                    onPress={() => name && confirm(`Rename ${picked.name} to ${name}?`, NAME_COST, () => actions.renameRival(picked.id, name))}
                  />
                </>
              ) : (
                <T dim small>
                  Pick who first.
                </T>
              )}
            </View>
          ) : null}

          <Row>
            <Text style={styles.emoji}>🍌</Text>
            <View style={{ flex: 1 }}>
              <T>Banana peel</T>
              <T dim small>
                -{PEEL_XP} XP off a rival&apos;s week · {peelsLeft} of {PEELS_PER_WEEK} left this week
              </T>
            </View>
            {peelsLeft > 0 ? <Btn small kind={mode === 'peel' ? 'primary' : 'ghost'} label={`${PEEL_COST} 🪙`} onPress={() => toggle('peel')} /> : null}
          </Row>
          {mode === 'peel' && peelsLeft > 0 ? (
            <View style={styles.form}>
              <Row gap={6} style={{ flexWrap: 'wrap' }}>
                {peelable.map((r) => (
                  <Chip
                    key={r.id}
                    label={`${r.emoji} ${r.name} · ${r.xp} XP${'🍌'.repeat(peelsOn(league, r.id))}`}
                    active={rival === r.id}
                    onPress={() => setRival(r.id)}
                  />
                ))}
              </Row>
              {partner ? (
                <T dim small>
                  {partner} is your co-op partner this week, so they&apos;re off the list.
                </T>
              ) : null}
              <Btn
                label={picked ? `Throw it at ${picked.name}` : 'Pick a rival'}
                disabled={!picked}
                onPress={() => picked && confirm(`A banana peel for ${picked.name}?`, PEEL_COST, () => actions.throwPeel(picked.id))}
              />
            </View>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 22 },
  form: { gap: 10, backgroundColor: C.card2, borderRadius: 12, padding: 12 },
});
