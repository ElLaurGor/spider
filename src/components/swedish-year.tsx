// The Swedish year on screen (cluster F): upcoming red days, klämdagar and payday on HQ, the
// Easter eggs hidden on each tab, and the Valborg bonfire for old tasks.
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Btn, T } from '@/components/ui';
import { noonOf, useToday } from '@/components/use-today';
import { seasonOn } from '@/lib/seasons';
import { useStore } from '@/lib/store';
import { upcomingDays } from '@/lib/swedish-days';
import { eggsThisYear, staleTasks, STALE_DAYS, type EggId } from '@/lib/traditions';

/** HQ: today's holiday or payday and the next red day or klämdag, plus HQ's own Easter egg. */
export function SwedishDaysRow() {
  const today = useToday();
  const notes = upcomingDays(noonOf(today));
  return (
    <>
      {notes.length ? (
        <View style={styles.notes}>
          {notes.map((n) => (
            <T key={n.kind + n.text} small dim>
              {n.emoji} {n.text}
            </T>
          ))}
        </View>
      ) : null}
      <HiddenEgg id="hq" align="flex-end" />
    </>
  );
}

/** One of the five Easter eggs: shows only during Easter season until it's found that year. */
export function HiddenEgg({ id, align = 'flex-end' }: { id: EggId; align?: 'flex-start' | 'center' | 'flex-end' }) {
  const { state, actions } = useStore();
  const today = useToday();
  if (seasonOn(noonOf(today))?.id !== 'easter' || id in eggsThisYear(state)) return null;
  return (
    <Pressable
      onPress={() => actions.findEgg(id)}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Hidden Easter egg"
      style={({ pressed }) => [styles.egg, { alignSelf: align }, pressed && { transform: [{ scale: 1.3 }] }]}>
      <Text style={{ fontSize: 18 }}>🥚</Text>
    </Pressable>
  );
}

/** Plan tab on Valborg: burn the tasks that have been open for over a month. Asks first. */
export function ValborgBonfire() {
  const { state, actions } = useStore();
  const old = staleTasks(state);
  if (seasonOn()?.id !== 'valborg' || old.length === 0) return null;
  const burn = () =>
    Alert.alert(
      `Burn ${old.length} old task${old.length === 1 ? '' : 's'}?`,
      `Open for more than ${STALE_DAYS} days:\n${old
        .slice(0, 8)
        .map((t) => `• ${t.title}`)
        .join('\n')}${old.length > 8 ? `\n…and ${old.length - 8} more` : ''}\n\nThey're deleted for good.`,
      [
        { text: 'Keep them', style: 'cancel' },
        { text: 'Burn 🔥', style: 'destructive', onPress: actions.burnOldTasks },
      ],
    );
  return <Btn label={`🔥 Valborg bonfire: burn ${old.length} old task${old.length === 1 ? '' : 's'}`} kind="ghost" onPress={burn} />;
}

const styles = StyleSheet.create({
  notes: { gap: 2, paddingHorizontal: 4 },
  egg: { opacity: 0.6, paddingHorizontal: 6 },
});
