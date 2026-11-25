import { router, useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { Card, H, Icon, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { themeIds, themeUnlocked } from '@/lib/evolution';
import { fillLine, GOLDEN, GOLDEN_CHANCE } from '@/lib/lines';
import { MEDAL_EMOJI, medalTotals } from '@/lib/medals';
import { hallOfFame, type Rec } from '@/lib/records';
import { useStore } from '@/lib/store';
import { ACHIEVEMENTS, BADGE_NOTE, levelForXp, SECRET_ACHIEVEMENTS, SECRET_COINS, XP } from '@/lib/xp';
// step 8 game: the month's calls and the contract ledger
import { ContractLedgerCard } from '@/components/contract-ledger';
import { CallsCard } from '@/components/shot-call';
// step 9 story: things noticed and the mailbox
import { unreadMail } from '@/lib/mail';
import { REMARKS, remarksFound } from '@/lib/remarks';

export default function RecordsScreen() {
  const { state } = useStore();
  const level = levelForXp(state.xp);
  const { fame, shame } = hallOfFame(state, { unlocked: themeIds.filter((id) => themeUnlocked(id, level, state)).length, total: themeIds.length });
  const found = state.goldenFound ?? {};
  const golden = GOLDEN.filter((g) => found[g.id]).sort((a, b) => found[b.id] - found[a.id]);
  const medals = medalTotals(state);
  // step 10 ux: HQ's "next: …" opens Records at the achievements (`?show=achievements`), once
  const { show } = useLocalSearchParams<{ show?: string }>();
  const scroller = useRef<ScrollView>(null);
  const landed = useRef(false);
  const onAchievements = (e: LayoutChangeEvent) => {
    if (show !== 'achievements' || landed.current) return;
    landed.current = true;
    const y = e.nativeEvent.layout.y;
    setTimeout(() => scroller.current?.scrollTo({ y: Math.max(0, y - 16), animated: true }), 50);
  };
  return (
    <ScrollView ref={scroller} style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Card accent={C.yellow}>
        <H
          right={
            <Text style={{ color: C.red, fontWeight: '700', fontSize: 13 }} onPress={() => router.push('/bestiary')}>
              Bestiary →
            </Text>
          }>
          🏆 Hall of Fame
        </H>
        {fame.map((r) => (
          <RecordRow key={r.label} r={r} />
        ))}
      </Card>
      {medals.weeks > 0 ? (
        <Card>
          <H>🏅 Weekly medals</H>
          <Row style={{ justifyContent: 'space-around' }}>
            {(['gold', 'silver', 'bronze'] as const).map((t) => (
              <View key={t} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 26 }}>{MEDAL_EMOJI[t]}</Text>
                <Text style={styles.value}>{medals[t]}</Text>
              </View>
            ))}
          </Row>
          <T dim small>
            Won over {medals.weeks} week{medals.weeks === 1 ? '' : 's'}. Totals only: a week without one takes nothing away.
          </T>
        </Card>
      ) : null}

      <CallsCard />
      <ContractLedgerCard />

      <View onLayout={onAchievements}>
        <AchievementsCard />
      </View>

      <Card accent={C.purple}>
        <H right={<T dim small>{`${Object.keys(state.secrets).length}/${SECRET_ACHIEVEMENTS.length}`}</T>}>🔓 Secret achievements</H>
        <T dim small>
          Hidden until you stumble into them. Each one: +{XP.secret} XP and {SECRET_COINS} 🪙, except the 🏷️ badges of shame, which pay nothing.
        </T>
        {SECRET_ACHIEVEMENTS.map((a) => {
          const got = !!state.secrets[a.id];
          return (
            <Row key={a.id} style={{ alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 20, width: 30 }}>{got ? (a.badge ? '🏷️' : '🔓') : '❓'}</Text>
              <View style={{ flex: 1 }}>
                <T style={!got && { color: C.dim }}>{got ? a.title : '???'}</T>
                <T dim small>
                  {got ? (a.badge ? `${a.desc}. ${BADGE_NOTE}` : a.desc) : `Hint: ${a.hint}`}
                </T>
              </View>
            </Row>
          );
        })}
      </Card>

      <Card accent={C.yellow}>
        <H right={<T dim small>{`${golden.length}/${GOLDEN.length}`}</T>}>✨ Roast Book</H>
        <T dim small>
          Golden lines. Anything you log has a {Math.round(GOLDEN_CHANCE * 100)}% chance to turn one up. Not while I&apos;m going easy on you.
        </T>
        {golden.map((g) => (
          <Row key={g.id} style={{ alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 16, width: 24 }}>✨</Text>
            <View style={{ flex: 1 }}>
              <T>{fillLine(g.text, { name: state.settings.userName || 'boss' })}</T>
              <T dim small>
                found {new Date(found[g.id]).toLocaleDateString('sv-SE')}
              </T>
            </View>
          </Row>
        ))}
        {golden.length < GOLDEN.length ? (
          <T dim small>
            {GOLDEN.length - golden.length} still hiding.
          </T>
        ) : null}
      </Card>

      <StoryLinks />

      {shame.length > 0 ? (
        <Card accent={C.red}>
          <H>💀 Hall of Shame</H>
          {shame.map((r) => (
            <RecordRow key={r.label} r={r} />
          ))}
          <T dim small>
            Kept for science. And for roasting.
          </T>
        </Card>
      ) : null}
    </ScrollView>
  );
}

/** step 10 ux: the achievements with what each one takes (they used to sit on HQ), unlocked ones first lit. */
function AchievementsCard() {
  const { state } = useStore();
  const got = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;
  return (
    <Card accent={C.yellow}>
      <H right={<T dim small>{`${got}/${ACHIEVEMENTS.length}`}</T>}>🏆 Achievements</H>
      <View style={styles.achGrid}>
        {ACHIEVEMENTS.map((a) => {
          const at = state.achievements[a.id];
          return (
            <View key={a.id} style={[styles.ach, !at && { opacity: 0.4 }]} accessible accessibilityLabel={`${a.title}: ${a.desc}. ${at ? 'Unlocked' : 'Locked'}`}>
              <Icon name={a.icon} size={22} color={at ? C.yellow : C.dim} />
              <Text style={styles.achTitle}>{a.title}</Text>
              <Text style={styles.achDesc}>{a.desc}</Text>
              {at ? <Text style={styles.achDate}>{new Date(at).toLocaleDateString('sv-SE')}</Text> : null}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

/** step 9 story: the once-only remarks (remarks.ts) and the mailbox (mail.ts), next to the Roast Book. */
function StoryLinks() {
  const { state } = useStore();
  const found = remarksFound(state).length;
  const letters = state.mail?.length ?? 0;
  const unread = unreadMail(state).length;
  return (
    <Card>
      <Pressable onPress={() => router.push('/noticed')} accessibilityRole="button" accessibilityLabel="Things I've noticed">
        <H right={<T dim small>{`${found}/${REMARKS.length} →`}</T>}>👁️ Things I&apos;ve noticed</H>
      </Pressable>
      <T dim small>
        Remarks I make once, ever, at the moment they happen. Kept here afterwards.
      </T>
      <Pressable onPress={() => router.push('/mail')} accessibilityRole="button" accessibilityLabel="Mailbox">
        <H right={<T dim small>{unread ? `${unread} new →` : `${letters} →`}</T>}>📬 Mailbox</H>
      </Pressable>
    </Card>
  );
}

function RecordRow({ r }: { r: Rec }) {
  return (
    <Row>
      <Text style={{ fontSize: 22, width: 30 }}>{r.emoji}</Text>
      <View style={{ flex: 1 }}>
        <T>{r.label}</T>
        {r.detail ? (
          <T dim small>
            {r.detail}
          </T>
        ) : null}
      </View>
      <Text style={styles.value}>{r.value}</Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  value: { color: C.text, fontFamily: MONO, fontWeight: '800', fontSize: 15 },
  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ach: { width: '31%', flexGrow: 1, backgroundColor: C.card2, borderRadius: 12, padding: 10, gap: 4 },
  achTitle: { color: C.text, fontSize: 12, fontWeight: '800' },
  achDesc: { color: C.dim, fontSize: 11 },
  achDate: { color: C.faint, fontSize: 10, fontFamily: MONO },
});
