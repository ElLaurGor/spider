import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, Row, SpiderSays, T } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { C, MONO } from '@/constants/theme';
import { memoLine, memosFound } from '@/lib/cipher';
import { cosmeticOf } from '@/lib/cosmetics';
import { letterAge, MAMMA, unreadMail } from '@/lib/mail';
import { useStore } from '@/lib/store';
import type { Letter } from '@/lib/types';

/**
 * step 9 story: the mailbox (mail.ts). Letters from the cast, newest first, kept for good. Mamma Spindel's stay
 * here: nothing in them is shared, counted or recapped.
 */
export default function MailScreen() {
  const { state, actions } = useStore();
  const today = useToday();
  const [open, setOpen] = useState<string | null>(null);
  const letters = [...(state.mail ?? [])].reverse();
  const unread = unreadMail(state).length;
  const memo = memosFound(state).find((m) => m.place === 'letter');

  const toggle = (l: Letter) => {
    setOpen(open === l.id ? null : l.id);
    if (!l.read) actions.readLetter(l.id);
  };

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
      {letters.length === 0 ? (
        <SpiderSays text="No post yet. Beat a boss, finish a co-op week, or wait for Mamma Spindel's monthly letter from Småland." />
      ) : (
        <Row style={{ justifyContent: 'space-between' }}>
          <T dim small>
            {letters.length} letter{letters.length === 1 ? '' : 's'} · one a day at most
          </T>
          {unread > 1 ? <Btn small kind="ghost" label="Mark all read" onPress={() => actions.readLetter()} /> : null}
        </Row>
      )}
      {letters.map((l) => {
        const age = letterAge(l, new Date(`${today}T12:00`));
        const gift = l.gift ? cosmeticOf(l.gift) : null;
        return (
          <Pressable key={l.id} onPress={() => toggle(l)} accessibilityRole="button" accessibilityLabel={`Letter from ${l.sender}: ${l.subject}`}>
            <Card accent={l.read ? undefined : C.cyan}>
              <Row style={{ alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 24 }}>{l.emoji}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.from, !l.read && { color: C.cyan }]}>{l.from === 'mamma' ? `${MAMMA.name} · Småland` : l.sender}</Text>
                  <T small>{l.subject}</T>
                </View>
                <T dim small mono>
                  {age === 0 ? 'today' : age === 1 ? 'yesterday' : new Date(l.at).toLocaleDateString('sv-SE')}
                </T>
              </Row>
              {open === l.id ? (
                <View style={{ gap: 10, paddingTop: 4 }}>
                  <Text style={styles.body}>{l.body}</Text>
                  {l.memo && memo ? <Text style={styles.memo}>{memoLine(state, memo.text)}</Text> : null}
                  {gift ? (
                    <T small style={{ color: C.green }}>
                      {gift.emoji} {gift.name}, in your wardrobe now (Shop).
                    </T>
                  ) : null}
                  {l.coins ? (
                    <T small style={{ color: C.green }}>
                      +{l.coins} 🪙 for the bus.
                    </T>
                  ) : null}
                  {l.from === 'mamma' ? (
                    <T dim small>
                      🔒 Just between you and Mamma.
                    </T>
                  ) : null}
                </View>
              ) : null}
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  from: { color: C.text, fontWeight: '800', fontSize: 15 },
  body: { color: C.text, fontSize: 15, lineHeight: 22 },
  memo: { color: C.yellow, fontFamily: MONO, fontSize: 14, lineHeight: 22, letterSpacing: 1 },
});
