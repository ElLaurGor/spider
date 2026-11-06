import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nightLeft } from '@/components/night-gate';
import { C } from '@/constants/theme';
import { nightWord } from '@/lib/night-shift';
import { useStore } from '@/lib/store';

type Mode = 'menu' | 'brain' | 'pictures' | 'awake';

/**
 * step 9 care: the night shift, the can't-sleep corner (night-shift.ts). Dim, with no clock (the status bar is
 * hidden), no numbers and no roasts. Nothing here is logged except the thoughts she puts on the task list.
 */
export default function NightShift() {
  const { actions, quip } = useStore();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('menu');
  const [text, setText] = useState('');
  const [parked, setParked] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 10_000));
  const [n, setN] = useState(0);
  const greet = useMemo(() => quip('nightShift'), [quip]);
  const parkedLine = useMemo(() => (parked ? quip('nightParked') : ''), [quip, parked]);
  useEffect(() => () => nightLeft(), []);

  const leave = () => {
    nightLeft();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const dump = () => {
    if (actions.nightDump(text) > 0) {
      setText('');
      setParked(parked + 1);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 32 }]} keyboardShouldPersistTaps="handled">
      <StatusBar hidden />
      <Text style={styles.greet}>{greet}</Text>

      {mode === 'menu' ? (
        <View style={{ gap: 12 }}>
          <Choice title="Busy brain" text="Put the thoughts on tomorrow's list, so your head can let go of them." onPress={() => setMode('brain')} />
          <Choice title="Picture game" text="Calm, random things to picture, one at a time. Nothing to solve." onPress={() => setMode('pictures')} />
          <Choice title="Awake a while?" text="What tends to help when sleep won't come." onPress={() => setMode('awake')} />
        </View>
      ) : null}

      {mode === 'brain' ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.body}>One thought per line. Each becomes a task for tomorrow. No need to sort them.</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            placeholder="Whatever is going round…"
            placeholderTextColor={C.faint}
            style={styles.field}
            autoFocus
          />
          <Soft label="Put them on the list" onPress={dump} disabled={!text.trim()} />
          {parkedLine ? <Text style={styles.body}>{parkedLine}</Text> : null}
        </View>
      ) : null}

      {mode === 'pictures' ? (
        <Pressable onPress={() => setN(n + 1)} style={styles.picture} accessibilityRole="button" accessibilityHint="Tap for the next one">
          <Text style={styles.word}>{nightWord(seed, n)}</Text>
          <Text style={styles.hint}>Picture it for a while, in as much detail as comes. Then tap for the next.</Text>
        </Pressable>
      ) : null}

      {mode === 'awake' ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.body}>If you&apos;ve been lying awake a while, it often helps to get up for a bit.</Text>
          <Text style={styles.body}>Somewhere else, with low light. Something dull and calm: a few pages of a familiar book, folding laundry, a warm drink without caffeine.</Text>
          <Text style={styles.body}>Go back to bed once you feel sleepy. No need to check the time.</Text>
        </View>
      ) : null}

      <View style={{ gap: 10, marginTop: 24 }}>
        {mode !== 'menu' ? <Soft label="Back" onPress={() => setMode('menu')} /> : null}
        <Soft label="Open S.P.I.D.E.R." onPress={leave} faint />
      </View>
    </ScrollView>
  );
}

function Choice({ title, text, onPress }: { title: string; text: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.choice, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={title}>
      <Text style={styles.choiceTitle}>{title}</Text>
      <Text style={styles.hint}>{text}</Text>
    </Pressable>
  );
}

function Soft({ label, onPress, disabled, faint }: { label: string; onPress: () => void; disabled?: boolean; faint?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.soft, (pressed || disabled) && { opacity: 0.4 }]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}>
      <Text style={[styles.softText, faint && { color: C.faint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 24, paddingBottom: 48, gap: 20 },
  greet: { color: C.dim, fontSize: 18, lineHeight: 26 },
  body: { color: C.dim, fontSize: 15, lineHeight: 22 },
  hint: { color: C.faint, fontSize: 13, lineHeight: 19 },
  choice: { borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, gap: 4 },
  choiceTitle: { color: C.dim, fontSize: 16, fontWeight: '600' },
  field: { minHeight: 120, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, color: C.dim, fontSize: 15, textAlignVertical: 'top' },
  picture: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 16, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 20 },
  word: { color: C.dim, fontSize: 30, textAlign: 'center' },
  soft: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  softText: { color: C.dim, fontSize: 15 },
});
