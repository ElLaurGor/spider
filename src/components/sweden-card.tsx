// The Swedish calendar on HQ (step 8): today's names and flag day (in the Red days row), the fika banner, and a
// card for what's near: people days with their one-tap task, Hesa Fredrik's test, the tax return and the
// preparedness week's checklist. Each part shows only in its own window; the card hides when none does.
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, H, Icon, Row, T, useNow } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { PREP_COINS, PREP_ITEMS, prepPaid, prepTicked, prepWeekOn, sirenToday } from '@/lib/beredskap';
import { DEKL_TASK, deklarationOn, deklDayLabel, deklTaskKey } from '@/lib/deklaration';
import { fikaBannerKey, fikaOn } from '@/lib/fika';
import { nameDayText, type YearNames } from '@/lib/name-days';
import { cachedNameDays, loadNameDays } from '@/lib/name-days-cache';
import { addedTask, peopleSoon } from '@/lib/people-days';
import { useStore } from '@/lib/store';
import { stormOn } from '@/lib/storm';

/** The year's almanac: from the phone's copy, or fetched once (name-days-cache.ts). Null until it's there. */
export function useNameDays(year: number) {
  const [data, setData] = useState<YearNames | null>(() => cachedNameDays(year));
  useEffect(() => {
    let live = true;
    loadNameDays(year).then(
      (d) => {
        if (live && d) setData(d);
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [year]);
  return data?.year === year ? data : null;
}

/** "📛 Gustav Adolf · flag day (Gustav Adolfsdagen)": today's names, shown only when the almanac is there. */
export function NameDayLine() {
  const { state } = useStore();
  const today = useToday();
  const data = useNameDays(Number(today.slice(0, 4)));
  const text = state.settings.sweden?.nameDays === false ? null : nameDayText(data, today);
  if (!text) return null;
  return (
    <T small dim style={styles.names}>
      📛 {text}
    </T>
  );
}

/** HQ's banner on a fika day: the day, a line, and a pointer to Fuel's quick add. Closed with ×, for the day. */
export function FikaBanner() {
  const { state, actions, quip } = useStore();
  const today = useToday();
  const fika = state.settings.sweden?.fika === false || stormOn(state, today) ? null : fikaOn(today);
  const title = fika?.name ?? '';
  const text = useMemo(() => (title ? quip('fikaDay', { title }) : ''), [quip, title]);
  const key = fikaBannerKey(today);
  if (!fika || (state.dismissed ?? []).includes(key)) return null;
  return (
    <View style={styles.banner}>
      <Text style={{ fontSize: 26 }}>{fika.emoji}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.bannerTitle}>{fika.name} · today</Text>
        <T dim small>
          {fika.about}
          {fika.food ? ` On Fuel's quick add today: ${fika.food.name}.` : ''}
        </T>
        <T small style={{ color: C.yellow }}>
          {text}
        </T>
      </View>
      <Pressable onPress={() => actions.dismissBanner(key)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Hide the ${fika.name} banner`}>
        <Icon name="close" size={18} color={C.faint} />
      </Pressable>
    </View>
  );
}

const inDays = (n: number) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`);

/** HQ: people days near, Hesa Fredrik's test today, the tax return countdown and the preparedness checklist. */
export function SwedenCard() {
  const { state, actions } = useStore();
  const today = useToday();
  const now = useNow(60_000);
  const soon = peopleSoon(state, today);
  const dekl = deklarationOn(state, today);
  const prep = prepWeekOn(today);
  const siren = sirenToday(state, new Date(now));
  if (!soon.length && !dekl && !prep && !siren) return null;
  const year = Number(today.slice(0, 4));
  const onList = (key: string) => {
    const id = addedTask(state, key);
    return !!id && state.tasks.some((t) => t.id === id);
  };
  const ticked = prepTicked(state, year);

  return (
    <Card>
      <H>Swedish calendar</H>
      {siren ? <T small>📢 Hesa Fredrik is tested at 15:00 today. Only the test: nothing to do.</T> : null}

      {soon.map((x) =>
        x.kind === 'builtin' ? (
          <Row key={x.taskKey} style={{ justifyContent: 'space-between' }}>
            <T style={{ flex: 1 }}>
              {x.def.emoji} {x.def.name} · {inDays(x.in)}
            </T>
            {onList(x.taskKey) ? (
              <T dim small>
                On your list ✓
              </T>
            ) : (
              <Btn label={`+ ${x.task}`} kind="ghost" small onPress={() => actions.addSwedenTask(x.taskKey, x.task)} />
            )}
          </Row>
        ) : (
          <T key={x.person.id + x.day}>
            {x.person.nameDay ? '📛' : '🗓️'} {x.title} · {inDays(x.in)}
          </T>
        ),
      )}

      {dekl ? (
        <View style={styles.part}>
          <T>
            🧾 Deklaration · {dekl.days === 0 ? 'today' : `${dekl.days} day${dekl.days === 1 ? '' : 's'}`}
          </T>
          <T dim small>
            {dekl.phase === 'early'
              ? `Approve it digitally by ${deklDayLabel(dekl.early)} for the early refund. Deadline: ${deklDayLabel(dekl.deadline)}.`
              : `Due ${deklDayLabel(dekl.deadline)}.`}
            {dekl.confirmed ? '' : ' Dates by the usual rule: check skatteverket.se.'}
          </T>
          <Row gap={8}>
            {onList(deklTaskKey(dekl.year)) ? (
              <T dim small style={{ flex: 1 }}>
                On your list ✓
              </T>
            ) : (
              <Btn label={`+ ${DEKL_TASK}`} kind="ghost" small onPress={() => actions.addSwedenTask(deklTaskKey(dekl.year), DEKL_TASK)} style={{ flex: 1 }} />
            )}
            <Btn label="Approved ✓" kind="ghost" small onPress={() => actions.markDeklaration(dekl.year)} />
          </Row>
        </View>
      ) : null}

      {prep ? (
        <View style={styles.part}>
          <T>🎒 Krisberedskapsveckan · until {new Date(`${prep.to}T12:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</T>
          {prepPaid(state, year) ? (
            <T dim small>
              All five sorted this year ✓
            </T>
          ) : (
            <>
              <T dim small>
                Five things for a week without power or internet. All five: +{PREP_COINS} 🪙, once.
              </T>
              {PREP_ITEMS.map((item) => {
                const done = ticked.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => actions.tickPrep(item.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: done }}
                    style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                    <Row>
                      <Icon name={done ? 'check_circle' : 'radio_button_unchecked'} size={20} color={done ? C.green : C.dim} />
                      <T style={{ flex: 1 }} dim={done}>
                        {item.emoji} {item.label}
                      </T>
                    </Row>
                  </Pressable>
                );
              })}
            </>
          )}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.yellow,
    padding: 14,
  },
  bannerTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  part: { gap: 6 },
  names: { paddingHorizontal: 4 },
});
