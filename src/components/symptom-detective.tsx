import { useState } from 'react';
import { Text, View } from 'react-native';

import { Card, Chip, H, Row, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { detective } from '@/lib/detective';
import type { State } from '@/lib/types';

/** Pick a tracker; see which of the usual suspects show up together with it. Patterns, not proof. */
export function SymptomDetective({ state }: { state: State }) {
  const [picked, setPicked] = useState<string | null>(null);
  const trackers = state.trackers;
  const tracker = trackers.find((t) => t.id === picked) ?? trackers[0];

  return (
    <Card accent={C.purple}>
      <H>🔎 Symptom detective</H>
      {!tracker ? (
        <T dim small>
          Add a tracker on HQ, like 🤕 Headache or 🤧 Allergy, and log it for a couple of weeks. Then I&apos;ll line up the suspects: short sleep, late caffeine,
          water, pollen, air pressure, hot days, social apps, late gaming, rest days and your cycle.
        </T>
      ) : (
        <Body state={state} trackerId={tracker.id} trackers={trackers} onPick={setPicked} />
      )}
    </Card>
  );
}

function Body({ state, trackerId, trackers, onPick }: { state: State; trackerId: string; trackers: State['trackers']; onPick: (id: string) => void }) {
  const tracker = trackers.find((t) => t.id === trackerId)!;
  const { logged, clues } = detective(state, tracker);
  return (
    <>
      {trackers.length > 1 ? (
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {trackers.map((t) => (
            <Chip key={t.id} label={`${t.emoji} ${t.name}`} active={t.id === trackerId} color={C.purple} onPress={() => onPick(t.id)} />
          ))}
        </Row>
      ) : null}
      {clues.length ? (
        clues.slice(0, 5).map((c, i) => (
          <View key={c.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 22 }}>{c.emoji}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <T style={i === 0 ? { fontWeight: '700' } : undefined}>{c.text}</T>
              <T dim small>
                {c.detail}
              </T>
            </View>
          </View>
        ))
      ) : (
        <T dim small>
          {logged < 6
            ? `${tracker.emoji} ${tracker.name} is logged on ${logged} day${logged === 1 ? '' : 's'} so far. Keep logging it, good days too: I need at least 3 days on each side of a comparison.`
            : `No suspect stands out yet for ${tracker.emoji} ${tracker.name} (${logged} days logged). That can be good news.`}
        </T>
      )}
      <T dim small>
        Last 90 days. These show what tends to happen together, not what causes what.
      </T>
    </>
  );
}
