import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Card, Field, Row, SpiderSays, Stepper, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { ACRONYM, ACRONYM_REAL, line } from '@/lib/lines';
import { initNotifications } from '@/lib/notifications';
import { useStore } from '@/lib/store';

export default function Onboarding() {
  const { state, actions } = useStore();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [level, setLevel] = useState(10);
  const [preview, setPreview] = useState(() => line('greetMorning', 10, { name: 'human' }));

  if (state.onboarded) return <Redirect href="/" />;

  const changeLevel = (v: number) => {
    setLevel(v);
    setPreview(line('spiderTap', v, { name: name.trim() || 'human' }));
  };

  const activate = async () => {
    await initNotifications(true).catch(() => false);
    actions.completeOnboarding(name, level);
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior="height">
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 40 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}>
          <Text style={{ fontSize: 56 }}>🕷️</Text>
        </View>
        <Text style={styles.title}>S.P.I.D.E.R.</Text>
        <Text style={styles.acronym}>{ACRONYM}</Text>
        <Text style={styles.real}>(Unofficially: {ACRONYM_REAL})</Text>

        <Card style={{ alignSelf: 'stretch' }}>
          <T>I track your calendar, gym, water, food and gaming. I roast habits. Never your body or what you eat.</T>
          <T dim small>
            What should I call you?
          </T>
          <Field value={name} onChangeText={setName} placeholder="Your name" autoFocus />
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <T>Savage level</T>
              <T dim small>
                1 = polite butler · 10 = no mercy
              </T>
            </View>
            <Stepper value={level} min={1} max={10} onChange={changeLevel} />
          </Row>
          <SpiderSays text={preview} onPress={() => changeLevel(level)} />
        </Card>

        <Btn label="Activate S.P.I.D.E.R." icon="bolt" onPress={activate} disabled={!name.trim()} style={{ alignSelf: 'stretch' }} />
        <T dim small style={{ textAlign: 'center' }}>
          I&apos;ll ask for notification permission next. Say yes. I&apos;m much funnier as a notification.
        </T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 16, alignItems: 'center', paddingBottom: 48 },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: C.red,
    backgroundColor: C.redDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: C.text, fontSize: 38, fontWeight: '900', letterSpacing: 6, fontFamily: MONO },
  acronym: { color: C.red, fontSize: 13, textAlign: 'center', fontWeight: '700' },
  real: { color: C.dim, fontSize: 12, textAlign: 'center', fontStyle: 'italic', marginTop: -10 },
});
