import { Text, View } from 'react-native';

import { C } from '@/constants/theme';
import { stageFor } from '@/lib/evolution';
import { useStore } from '@/lib/store';
import { levelForXp } from '@/lib/xp';

/** The spider, dressed for its current evolution stage. */
export function SpiderAvatar({ size = 48 }: { size?: number }) {
  const { state } = useStore();
  const stage = stageFor(levelForXp(state.xp));
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: stage.ringWidth,
        borderColor: C[stage.ring],
        backgroundColor: C.redDim,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: size * 0.5 * stage.scale }}>🕷️</Text>
      {stage.badge ? <Text style={{ position: 'absolute', right: -size * 0.1, top: -size * 0.14, fontSize: size * 0.32 }}>{stage.badge}</Text> : null}
    </View>
  );
}
