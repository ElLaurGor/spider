import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, T } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { backupNudge } from '@/lib/backup-due';
import { weekKeyOf } from '@/lib/league';
import { useStore } from '@/lib/store';

/** HQ: a quiet line while no backup leaves the phone (lib/backup-due.ts). Closed with ×, it waits a week. */
export function BackupHint() {
  const { state, actions } = useStore();
  const today = useToday();
  const nudge = backupNudge({ ...state, firstDay: Object.keys(state.days).sort()[0] ?? null }, new Date(`${today}T12:00`));
  const key = `backup:${weekKeyOf(new Date(`${today}T12:00`))}`;
  if (!nudge || (state.dismissed ?? []).includes(key)) return null;
  return (
    <Pressable onPress={() => router.push('/settings')} style={styles.row} accessibilityRole="button" accessibilityLabel="Open backup settings">
      <Text style={{ fontSize: 20 }}>💾</Text>
      <View style={{ flex: 1 }}>
        <T small>{nudge === 'stale' ? "No backup reached its folder this week. Pick the folder again →" : 'Nothing of yours lives off this phone yet. Set up daily backups, or send one →'}</T>
      </View>
      <Pressable onPress={() => actions.dismissBanner(key)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide the backup hint for a week">
        <Icon name="close" size={18} color={C.faint} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingVertical: 10, paddingHorizontal: 12 },
});
