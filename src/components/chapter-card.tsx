// Fresh-start chapters (step 8, lib/chapters.ts): on a personal landmark, HQ offers "Chapter N begins". The owner
// names it and picks one thing to restart (free text or a habit); the spider seals the old one with a line.
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Btn, Card, Chip, Field, H, Icon, Row, T } from '@/components/ui';
import { noonOf, useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { chapterOn, dismissKey, landmarkOffer, nextChapter } from '@/lib/chapters';
import { WEEKDAYS_LONG } from '@/lib/dates';
import { useStore } from '@/lib/store';

/** HQ: the chapter on offer (one per landmark, closable), or nothing. */
export function ChapterCard() {
  const { state, actions } = useStore();
  const today = useToday();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [habitId, setHabitId] = useState<string | null>(null);
  const offer = landmarkOffer(state, noonOf(today));
  if (!offer) return null;
  const n = nextChapter(state);
  const current = chapterOn(state, today);
  const when = offer.day === today ? 'Today is' : `${WEEKDAYS_LONG[noonOf(offer.day).getDay()]} was`;
  const pickHabit = (id: string, name: string) => {
    const on = habitId === id;
    setHabitId(on ? null : id);
    setText(on ? '' : name);
  };
  const restart = text.trim() ? { text: text.trim(), ...(habitId ? { habitId } : {}) } : null;
  return (
    <Card accent={C.cyan}>
      <H
        right={
          <Pressable onPress={() => actions.dismissBanner(dismissKey(offer))} hitSlop={10} accessibilityRole="button" accessibilityLabel="Not this time">
            <Icon name="close" size={18} color={C.faint} />
          </Pressable>
        }>
        {offer.emoji} Chapter {n} begins
      </H>
      <T dim small>
        {when} {offer.label}: a good place to turn the page.{current ? ` "${current.title}" gets sealed and kept.` : ''} Name the new chapter and pick one thing to restart.
      </T>
      <Field value={title} onChangeText={setTitle} placeholder={`Name chapter ${n}, e.g. The Comeback`} maxLength={40} />
      {state.habits.length ? (
        <View style={{ gap: 6 }}>
          <T dim small>
            Restart a habit…
          </T>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {state.habits.map((h) => (
              <Chip key={h.id} label={`${h.emoji} ${h.name}`} active={habitId === h.id} color={C.cyan} onPress={() => pickHabit(h.id, `${h.emoji} ${h.name}`)} />
            ))}
          </Row>
        </View>
      ) : null}
      <Field
        value={text}
        onChangeText={(t) => {
          setText(t);
          setHabitId(null);
        }}
        placeholder="…or type the one thing, e.g. evening walks"
        maxLength={60}
      />
      <Btn label={`Begin chapter ${n}`} icon="auto_stories" onPress={() => actions.beginChapter(title, restart)} />
    </Card>
  );
}
