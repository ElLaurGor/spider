import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, H, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { ALPHABET, guessesLeft, knownLetters, lettersKnown, LETTERS_PER_BOSS, LETTERS_PER_FLY, memoLine, memosFound, PLACE_LABEL, PLACES, runeMap } from '@/lib/cipher';
import { ROSTER_LIST } from '@/lib/league';
import { useStore } from '@/lib/store';

/**
 * step 9 story: the Bestiary's Decoder (cipher.ts). Intercepted Syndicate memos in spider runes, the key as far as
 * it's known, and the mole hunt: one accusation per memo found, wrong ones crossed off. Nothing timed, no XP.
 */
export function DecoderCard() {
  const { state, actions } = useStore();
  const memos = memosFound(state);
  if (!memos.length) return null;
  const map = runeMap(state);
  const known = knownLetters(state);
  const left = guessesLeft(state);
  const wrong = new Set(state.cipher?.wrong ?? []);
  const solved = state.cipher?.solved;
  const shown = (name: string) => state.rivalNames?.[name] ?? name;

  const accuse = (name: string) =>
    Alert.alert(`Accuse ${shown(name)}?`, `One accusation per memo found. ${left} left.`, [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Accuse', style: 'destructive', onPress: () => actions.accuseMole(name) },
    ]);

  return (
    <Card accent={C.yellow}>
      <H right={<T dim small>{`${memos.length}/${PLACES.length} memos`}</T>}>🕵️ Decoder</H>
      <T dim small>
        Intercepted Syndicate transmissions. The key fills in as you go: {LETTERS_PER_BOSS} letters for every boss beaten, {LETTERS_PER_FLY} for every fly species.{' '}
        {lettersKnown(state)}/26 known.
      </T>
      <View style={styles.key}>
        {[...ALPHABET].map((ch) => (
          <View key={ch} style={[styles.cell, known.has(ch) && { borderColor: C.yellow }]}>
            <Text style={styles.rune}>{map[ch]}</Text>
            <Text style={[styles.letter, !known.has(ch) && { color: C.faint }]}>{known.has(ch) ? ch : '?'}</Text>
          </View>
        ))}
      </View>
      {memos.map((m, i) => (
        <View key={m.place} style={{ gap: 2 }}>
          <Text style={styles.where}>
            #{i + 1} · found {PLACE_LABEL[m.place]}
          </Text>
          <Text style={styles.memo}>{memoLine(state, m.text)}</Text>
        </View>
      ))}
      {memos.length < PLACES.length ? (
        <T dim small>
          {PLACES.length - memos.length} more hidden in odd places.
        </T>
      ) : null}
      {solved ? (
        <T small style={{ color: C.green }}>
          🔍 {shown(solved.name)} was the Syndicate mole. Case closed, and the magnifier is in your wardrobe.
        </T>
      ) : (
        <>
          <T small style={{ color: C.yellow }}>
            Someone in your league works for the Syndicate. Name them: {left} accusation{left === 1 ? '' : 's'} left (one per memo found).
          </T>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {ROSTER_LIST.map((r) => {
              const out = wrong.has(r.name);
              return (
                <Pressable
                  key={r.name}
                  disabled={out || left <= 0}
                  onPress={() => accuse(r.name)}
                  style={[styles.suspect, (out || left <= 0) && { opacity: 0.4 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Accuse ${shown(r.name)}`}>
                  <Text style={[styles.suspectText, out && { textDecorationLine: 'line-through' }]}>
                    {r.emoji} {shown(r.name)}
                  </Text>
                </Pressable>
              );
            })}
          </Row>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  key: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: 34, alignItems: 'center', paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card2 },
  rune: { color: C.text, fontSize: 16 },
  letter: { color: C.yellow, fontFamily: MONO, fontSize: 11, fontWeight: '800' },
  where: { color: C.dim, fontFamily: MONO, fontSize: 11 },
  memo: { color: C.text, fontFamily: MONO, fontSize: 14, lineHeight: 22, letterSpacing: 1 },
  suspect: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card2 },
  suspectText: { color: C.text, fontSize: 13, fontWeight: '700' },
});
