import { useMemo, useState } from 'react';
import { Pressable } from 'react-native';

import { Btn, Card, Field, H, Icon, Row, T, useNow } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { openAsk, PAST_NOTE_CHARS, pastYouFor, pastYouText, type PastSlot } from '@/lib/past-you';
import { useStore } from '@/lib/store';

/**
 * step 8 days: after a good moment, at most once a week, one line for the you who's about to skip (past-you.ts).
 * Optional: × lets it go for the week. Nothing shows otherwise.
 */
export function PastYouAsk() {
  const { state, actions, quip } = useStore();
  const now = useNow(60_000);
  const [text, setText] = useState('');
  const ask = openAsk(state, now);
  const why = ask?.why;
  const prompt = useMemo(() => (why ? quip('pastYouAsk') : ''), [quip, why]);
  if (!ask) return null;
  const save = () => {
    actions.savePastNote(text);
    setText('');
  };
  return (
    <Card accent={C.green}>
      <H
        right={
          <Pressable onPress={actions.skipPastAsk} hitSlop={10} accessibilityRole="button" accessibilityLabel="Not this week">
            <Icon name="close" size={18} color={C.faint} />
          </Pressable>
        }>
        📝 A note for future you
      </H>
      <T small>{prompt}</T>
      <Row>
        <Field value={text} onChangeText={setText} placeholder="e.g. 20 minutes in, you always feel better" maxLength={PAST_NOTE_CHARS} onSubmitEditing={save} returnKeyType="done" style={{ flex: 1 }} />
        <Btn icon="check" onPress={save} disabled={!text.trim()} />
      </Row>
      <T dim small>
        It comes back right when skipping looks tempting. Never on a rough day: then only your wins do.
      </T>
    </Card>
  );
}

/** Past you's note for a slot today, as a quiet line, or nothing. */
export function PastYouLine({ slot }: { slot: PastSlot }) {
  const { state } = useStore();
  const today = useToday();
  const note = pastYouFor(state, today, slot);
  if (!note) return null;
  return (
    <T small style={{ color: C.green }}>
      {pastYouText(note)}
    </T>
  );
}
