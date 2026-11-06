// Pick next week's boss (step 8, lib/boss-pick.ts): from Sunday, and on Monday until the boss takes a hit.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { bossOptions, pickedFor, pickInfo, pickWeek } from '@/lib/boss-pick';
import { weekKey } from '@/lib/quests';
import { useStore } from '@/lib/store';

/** Three bosses, each with its weakness: the pick is the week's focus. Nothing outside the pick window. */
export function BossPick({ at }: { at: number }) {
  const { state, actions } = useStore();
  const now = new Date(at);
  const week = pickWeek(state, now);
  if (!week) return null;
  const options = bossOptions(state, week);
  const picked = pickedFor(state, week) ?? options[0];
  const next = week !== weekKey(now);
  return (
    <View style={styles.box}>
      <Text style={styles.head}>{next ? "🎲 PICK NEXT WEEK'S BOSS" : "🎲 PICK THIS WEEK'S BOSS · UNTIL IT TAKES A HIT"}</Text>
      {options.map((id, i) => {
        const b = pickInfo(id);
        const on = picked === id;
        return (
          <Pressable
            key={id}
            onPress={() => actions.pickBoss(id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${b.name}, weak to ${b.weakness}`}
            style={({ pressed }) => [styles.pick, on && styles.pickOn, pressed && { opacity: 0.7 }]}>
            <Row>
              <Text style={{ fontSize: 22 }}>{b.emoji}</Text>
              <View style={{ flex: 1 }}>
                <T small style={{ fontWeight: '700' }}>
                  {b.name}
                  {i === 0 ? ' · on the rota' : ''}
                </T>
                <T dim small>
                  Weak to {b.weakness}
                </T>
              </View>
              {on ? <Text style={styles.mark}>✓</Text> : null}
            </Row>
          </Pressable>
        );
      })}
      <T dim small>
        Its weakness is the week&apos;s focus: those days&apos; XP hits 50% harder. Same HP whichever you pick.
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: C.card2, borderRadius: 12, padding: 10, gap: 8 },
  head: { color: C.yellow, fontFamily: MONO, fontSize: 11, fontWeight: '800' },
  pick: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 8 },
  pickOn: { borderColor: C.yellow },
  mark: { color: C.yellow, fontWeight: '800', fontSize: 16 },
});
