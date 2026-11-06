import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, H, T, useNow } from '@/components/ui';
import { useToday, noonOf } from '@/components/use-today';
import { C } from '@/constants/theme';
import { dayKey, fmtTime, WEEKDAYS } from '@/lib/dates';
import {
  EVENTS_TTL_MS,
  eventsRetryMs,
  fetchWeekend,
  pickWeekend,
  planned,
  VISIT_CREDIT,
  weekendKey,
  weekendOf,
  whenText,
  type WeekendEvent,
  type WeekendPick,
} from '@/lib/sthlm-events';
import { useStore } from '@/lib/store';
import { stormOn } from '@/lib/storm';

/** The last weekend fetched: kept outside the component (tabs) and on disk (app restarts), keyed by categories and weekend. */
type Snap = { key: string; events: WeekendEvent[]; okAt: number | null; fails: number; nextAt: number };
const DISK_KEY = 'spider:sthlm:weekend';

let cache: Snap | null = null;
let inflight: Promise<Snap> | null = null;
let diskTried = '';

/** The saved fetch, if it's for this weekend and these categories (a cache from last weekend is never shown). */
async function fromDisk(key: string): Promise<Snap | null> {
  if (diskTried === key) return null;
  diskTried = key;
  try {
    const raw = await AsyncStorage.getItem(DISK_KEY);
    const j = raw ? (JSON.parse(raw) as { key?: string; fetchedAt?: number; events?: WeekendEvent[] }) : null;
    if (!j || j.key !== key || !Array.isArray(j.events) || typeof j.fetchedAt !== 'number') return null;
    return { key, events: j.events, okAt: j.fetchedAt, fails: 0, nextAt: j.fetchedAt + EVENTS_TTL_MS };
  } catch {
    return null;
  }
}

/** Asks Visit Stockholm once the last answer is EVENTS_TTL_MS old (sooner after a failure, with a growing wait). One call at a time. */
function refresh(cats: string[], days: string[]): Promise<Snap> {
  const key = weekendKey(cats, days[0]);
  if (inflight) return inflight;
  inflight = (async (): Promise<Snap> => {
    if (cache?.key !== key) cache = (await fromDisk(key)) ?? { key, events: [], okAt: null, fails: 0, nextAt: 0 };
    const prev = cache;
    if (Date.now() < prev.nextAt) return prev;
    try {
      const events = await fetchWeekend(cats, days);
      const at = Date.now();
      cache = { key, events, okAt: at, fails: 0, nextAt: at + EVENTS_TTL_MS };
      void AsyncStorage.setItem(DISK_KEY, JSON.stringify({ key, fetchedAt: at, events })).catch(() => {});
    } catch (e) {
      console.warn('[spider] Visit Stockholm failed', e);
      const fails = prev.fails + 1;
      cache = { ...prev, fails, nextAt: Date.now() + eventsRetryMs(fails) };
    }
    return cache;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

/**
 * HQ card, Thursday to Saturday: three of the weekend's events in the categories picked in Settings, each with
 * when and the nearest station, and "Add to Plan" (a task for that day, counted in Wrapped). Off until a category
 * is picked. Fetched only while HQ is on screen and the app is in front.
 */
export function WeekendCard() {
  const { state, actions, quip } = useStore();
  const todayKey = useToday();
  const cats = state.settings.sthlmEvents ?? [];
  const weekend = weekendOf(noonOf(todayKey));
  const focused = useIsFocused();
  const [awake, setAwake] = useState(AppState.currentState === 'active');
  const [snap, setSnap] = useState<Snap | null>(cache);
  const on = cats.length > 0 && !!weekend;
  const now = useNow(5 * 60_000, on && focused && awake);
  const key = weekend ? weekendKey(cats, weekend.friday) : '';
  const daysKey = weekend ? weekend.days.join(',') : '';
  const catsKey = cats.join(',');
  const intro = useMemo(() => quip('sthlmWeekend'), [quip]);
  const storm = stormOn(state, todayKey);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => setAwake(st === 'active'));
    return () => sub.remove();
  }, []);

  // Only while HQ is on screen and the app is in front; the refresh itself waits for the cache to go stale.
  useEffect(() => {
    if (!on || !focused || !awake || !daysKey) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const days = daysKey.split(',');
    const want = weekendKey(catsKey.split(','), days[0]);
    const loop = async () => {
      const s = await refresh(catsKey.split(','), days);
      if (!alive) return;
      setSnap(s);
      // A fetch for the old categories was still running: ask again for these right after it.
      timer = setTimeout(() => void loop(), s.key === want ? Math.max(60_000, s.nextAt - Date.now()) : 1_000);
    };
    void loop();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [on, focused, awake, catsKey, daysKey]);

  if (!on || !weekend) return null;

  const mine = snap && snap.key === key ? snap : null;
  const picks = mine ? pickWeekend(mine.events, cats, new Date(now)) : [];
  // The last refresh failed: what's shown is the last good list, and says from when.
  const failed = !!mine && mine.fails > 0 && mine.okAt != null;

  return (
    <Card>
      <H>🎟️ This weekend in Stockholm</H>
      {!mine || (mine.okAt == null && mine.fails === 0) ? (
        <T dim small>
          Checking Visit Stockholm…
        </T>
      ) : mine.okAt == null ? (
        <T dim small>
          Visit Stockholm couldn&apos;t be reached. I&apos;ll try again in a while.
        </T>
      ) : (
        <>
          {failed ? (
            <T dim small>
              Visit Stockholm couldn&apos;t be reached · these are from {dayKey(mine.okAt) === dayKey(now) ? '' : `${WEEKDAYS[new Date(mine.okAt).getDay()]} `}
              {fmtTime(mine.okAt)}
            </T>
          ) : null}
          {picks.length ? (
            <>
              {/* Under the Storm protocol (an orange/red SMHI warning or a VMA): no nudge out of the door, a heads-up instead. */}
              <T dim small>
                {storm ? `⚠️ ${storm.title}: check that it's still on, and the way there, before you go.` : intro}
              </T>
              {picks.map((p) => (
                <EventRow key={p.event.id} pick={p} now={now} inPlan={planned(state, p.event.id, p.slot.day)} onAdd={() => actions.planOuting(p)} />
              ))}
            </>
          ) : (
            <T dim small>
              Nothing left in your categories this weekend. More of them in Settings.
            </T>
          )}
        </>
      )}
      <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Change the event categories in Settings">
        <T dim small>
          Events: {VISIT_CREDIT} (CC BY 4.0) · categories in Settings
        </T>
      </Pressable>
    </Card>
  );
}

function EventRow({ pick, now, inPlan, onAdd }: { pick: WeekendPick; now: number; inPlan: boolean; onAdd: () => void }) {
  const e = pick.event;
  const url = e.url;
  const where = [e.station ? `🚇 ${e.station}` : null, e.venue].filter(Boolean).join(' · ');
  return (
    <View style={styles.pick}>
      <Pressable
        onPress={url ? () => void Linking.openURL(url).catch(() => {}) : undefined}
        disabled={!url}
        accessibilityRole={url ? 'link' : undefined}
        accessibilityHint={url ? "Opens the event's page" : undefined}>
        <Text style={styles.title} numberOfLines={2}>
          {e.title}
        </Text>
      </Pressable>
      <T small style={{ color: C.cyan }}>
        {whenText(pick, new Date(now))}
      </T>
      {where ? (
        <Text style={styles.where} numberOfLines={1}>
          {where}
        </Text>
      ) : null}
      {inPlan ? (
        <T small style={{ color: C.green }}>
          ✓ In your plan
        </T>
      ) : (
        <Btn label="Add to Plan" icon="event_available" kind="ghost" small onPress={onAdd} style={{ alignSelf: 'flex-start' }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pick: { backgroundColor: C.card2, borderRadius: 12, padding: 10, gap: 4 },
  title: { color: C.text, fontWeight: '800', fontSize: 15 },
  where: { color: C.dim, fontSize: 13, lineHeight: 18 },
});
