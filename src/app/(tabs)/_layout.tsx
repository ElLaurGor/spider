import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { C } from '@/constants/theme';
import { useStore } from '@/lib/store';

export default function TabsLayout() {
  const { state } = useStore();
  if (!state.onboarded) return <Redirect href="/onboarding" />;

  const openTasks = state.tasks.filter((t) => !t.done).length;

  return (
    <NativeTabs
      backgroundColor={C.card}
      iconColor={{ default: C.dim, selected: C.text }}
      indicatorColor={C.redDim}
      rippleColor={C.redDim}
      labelVisibilityMode="labeled"
      labelStyle={{ default: { color: C.dim }, selected: { color: C.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon md="pest_control" />
        <NativeTabs.Trigger.Label>HQ</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Icon md="calendar_month" />
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={openTasks === 0}>{String(openTasks)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="gym">
        <NativeTabs.Trigger.Icon md="fitness_center" />
        <NativeTabs.Trigger.Label>Gym</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="fuel">
        <NativeTabs.Trigger.Icon md="water_drop" />
        <NativeTabs.Trigger.Label>Fuel</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="game">
        <NativeTabs.Trigger.Icon md="sports_esports" />
        <NativeTabs.Trigger.Label>Game</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={!state.activeGame}>●</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
