import { Text, View } from 'react-native';

import { C } from '@/constants/theme';
import { worn } from '@/lib/cosmetics';
import { stageFor } from '@/lib/evolution';
import { respectFor } from '@/lib/respect';
import { useStore } from '@/lib/store';
import { levelForXp } from '@/lib/xp';

/** The spider, dressed for its current evolution stage, wearing its opinion of you (and whatever you bought it). */
export function SpiderAvatar({ size = 48 }: { size?: number }) {
  const { state } = useStore();
  const stage = stageFor(levelForXp(state.xp));
  const respect = respectFor(state);
  const outfit = worn(state);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: stage.ringWidth,
        borderColor: outfit.aura?.ring ?? C[stage.ring],
        backgroundColor: C.redDim,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: size * 0.5 * stage.scale }}>🕷️</Text>
      {outfit.hat ? (
        <Text style={{ position: 'absolute', top: -size * 0.34, left: 0, right: 0, textAlign: 'center', fontSize: size * 0.36 }}>{outfit.hat.emoji}</Text>
      ) : null}
      {stage.badge ? <Text style={{ position: 'absolute', right: -size * 0.1, top: -size * 0.14, fontSize: size * 0.32 }}>{stage.badge}</Text> : null}
      {outfit.held ? <Text style={{ position: 'absolute', right: -size * 0.12, bottom: -size * 0.1, fontSize: size * 0.3 }}>{outfit.held.emoji}</Text> : null}
      {respect ? <Text style={{ position: 'absolute', left: -size * 0.1, bottom: -size * 0.1, fontSize: size * 0.3 }}>{respect.emoji}</Text> : null}
    </View>
  );
}
