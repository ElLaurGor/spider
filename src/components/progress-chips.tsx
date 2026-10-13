import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Row } from '@/components/ui';
import { C } from '@/constants/theme';
import { perkPoints } from '@/lib/perks';
import { useStore } from '@/lib/store';

/** HQ: a rested bonus waiting to be used and ability points waiting to be spent. Nothing when there's neither. */
export function ProgressChips() {
  const { state } = useStore();
  const rested = state.rested ?? 0;
  const points = perkPoints(state);
  if (!rested && !points) return null;
  return (
    <Row gap={8} style={{ flexWrap: 'wrap' }}>
      {rested ? (
        <Text style={[styles.chip, { borderColor: C.cyan, color: C.cyan }]}>😴 Rested: +50 % XP until {rested} bonus XP is used</Text>
      ) : null}
      {points ? (
        <Pressable onPress={() => router.push('/perks')} hitSlop={6} accessibilityRole="button">
          <Text style={[styles.chip, { borderColor: C.purple, color: C.purple }]}>
            ✨ {points} ability point{points > 1 ? 's' : ''} to spend →
          </Text>
        </Pressable>
      ) : null}
    </Row>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10, fontSize: 12, fontWeight: '700', overflow: 'hidden' },
});
