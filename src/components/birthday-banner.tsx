// step 10: HQ's banners for her birthday (her year since the last one, in totals, and a pointer to the cast's card
// in the mailbox) and her own name day (only when the almanac is there and has her name). Each closes with × for
// that year (State.dismissed).
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useNameDays } from '@/components/sweden-card';
import { Icon, T } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { birthdayBannerKey, birthdayYear, birthdayYearLabel, birthdayYearText, isBirthday, isOwnNameDay, nameDayBannerKey, ownName } from '@/lib/birthday';
import { useStore } from '@/lib/store';

export function BirthdayBanner() {
  const { state, actions, quip } = useStore();
  const today = useToday();
  const names = useNameDays(Number(today.slice(0, 4)));
  const dismissed = state.dismissed ?? [];
  const birthday = isBirthday(state, today) && !dismissed.includes(birthdayBannerKey(today));
  const nameDay = isOwnNameDay(state, names, today) && !dismissed.includes(nameDayBannerKey(today));
  const name = ownName(state);
  const year = birthday ? birthdayYear(state, today) : null;
  const totals = year ? birthdayYearText(year) : null;
  const card = (state.mail ?? []).some((l) => l.ref === `birthday:${today.slice(0, 4)}`);
  const greeting = useMemo(() => (nameDay ? quip('ownNameDay') : ''), [quip, nameDay]);
  if (!birthday && !nameDay) return null;
  return (
    <>
      {birthday ? (
        <Pressable onPress={() => router.push('/mail')} style={styles.banner} accessibilityRole="button" accessibilityLabel="Happy birthday: open the mailbox">
          <Text style={{ fontSize: 26 }}>🎂</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.title}>Happy birthday{name ? `, ${name}` : ''}!</Text>
            {year && totals ? (
              <T dim small>
                {birthdayYearLabel(year)}: {totals}.
              </T>
            ) : null}
            <T small style={{ color: C.yellow }}>
              {card ? 'The whole cast signed a card. It is in the mailbox →' : 'The cast is still signing your card. It arrives any moment.'}
            </T>
          </View>
          <Pressable onPress={() => actions.dismissBanner(birthdayBannerKey(today))} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide the birthday banner">
            <Icon name="close" size={18} color={C.faint} />
          </Pressable>
        </Pressable>
      ) : null}
      {nameDay ? (
        <View style={styles.banner}>
          <Text style={{ fontSize: 26 }}>📛</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.title}>Name day · {name}</Text>
            <T small style={{ color: C.yellow }}>
              {greeting}
            </T>
          </View>
          <Pressable onPress={() => actions.dismissBanner(nameDayBannerKey(today))} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide the name day banner">
            <Icon name="close" size={18} color={C.faint} />
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 16, borderWidth: 1.5, borderColor: C.yellow, padding: 14 },
  title: { color: C.text, fontSize: 15, fontWeight: '800' },
});
