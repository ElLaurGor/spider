import { Text, View } from 'react-native';

import { C } from '@/constants/theme';
import { stageFor } from '@/lib/evolution';
import { respectFor } from '@/lib/respect';
import { useStore } from '@/lib/store';
import { levelForXp } from '@/lib/xp';

/** The spider, dressed for its current evolution stage, wearing its opinion of you. */
export function SpiderAvatar({ size = 48 }: { size?: number }) {
  const { state } = useStore();
  const stage = stageFor(levelForXp(state.xp));
  const respect = respectFor(state);
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
      {respect ? <Text style={{ position: 'absolute', left: -size * 0.1, bottom: -size * 0.1, fontSize: size * 0.3 }}>{respect.emoji}</Text> : null}
    </View>
  );
}
