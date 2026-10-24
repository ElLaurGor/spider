import { router, useIsFocused } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, H, Icon, T, useNow } from '@/components/ui';
import { C } from '@/constants/theme';
import { fmtTime } from '@/lib/dates';
import {
  cancelledNote,
  departureText,
  fetchDepartures,
  fetchDeviations,
  isCancelled,
  leaveInMin,
  nextDepartures,
  plannedText,
  relevantDeviations,
  routeKey,
  SL_DEVIATIONS_MS,
  slRetryMs,
  type SlConfig,
  type SlDeparture,
  type SlDeviation,
} from '@/lib/sl';
import { useStore } from '@/lib/store';

/** The last answers from SL for one stop. Kept outside the component, so moving between tabs doesn't call SL again. */
type Snap = {
  key: string; // stop + lines, so a change in Settings starts over
  departures: SlDeparture[];
  stopDeviations: SlDeviation[];
  deviations: SlDeviation[];
  okAt: number | null; // last departures that came through
  devAt: number; // last time disruptions were asked for
  calledAt: number;
  fails: number;
  nextAt: number; // no call to SL before this
};

let cache: Snap | null = null;
let inflight: Promise<Snap> | null = null;

/** Live data counts as live this long; after that the card says it's updating or that SL is unreachable. */
const LIVE_MS = 3 * 60_000;
/** The refresh button can't be used to hammer SL's quota. */
const MANUAL_GAP_MS = 30_000;

const myLines = (deps: SlDeparture[], cfg: SlConfig) => [...new Set(deps.filter((d) => !cfg.routes.length || cfg.routes.includes(routeKey(d))).map((d) => d.lineId))];

/** Asks SL for departures (and every 5 minutes for disruptions on her lines) unless it's not time yet. One call at a time. */
function refresh(cfg: SlConfig, force = false): Promise<Snap> {
  const key = `${cfg.siteId}|${cfg.routes.join(',')}`;
  const now = Date.now();
  const prev: Snap = cache?.key === key ? cache : { key, departures: [], stopDeviations: [], deviations: [], okAt: null, devAt: 0, calledAt: 0, fails: 0, nextAt: 0 };
  if (inflight) return inflight;
  if (now < prev.nextAt && !(force && now - prev.calledAt >= MANUAL_GAP_MS)) return Promise.resolve((cache = prev));
  inflight = (async (): Promise<Snap> => {
    let next: Snap = { ...prev, calledAt: now };
    try {
      const { departures, stopDeviations } = await fetchDepartures(cfg.siteId);
      next = { ...next, departures, stopDeviations, okAt: Date.now(), fails: 0 };
      if (Date.now() - prev.devAt >= SL_DEVIATIONS_MS) {
        const deviations = await fetchDeviations(myLines(departures, cfg)).catch(() => prev.deviations);
        next = { ...next, deviations, devAt: Date.now() };
      }
    } catch (e) {
      console.warn('[spider] SL failed', e);
      next = { ...next, fails: prev.fails + 1 };
    }
    next.nextAt = Date.now() + slRetryMs(next.fails);
    return (cache = next);
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** HQ card: the next departures from her stop on her lines, when to leave, and SL's disruption notices. Hidden until a stop is set. */
export function SlCard() {
  const { state } = useStore();
  const cfg = state.settings.sl ?? null;
  const focused = useIsFocused();
  const [awake, setAwake] = useState(AppState.currentState === 'active');
  const [snap, setSnap] = useState<Snap | null>(cache);
  const [open, setOpen] = useState<string | null>(null);
  const now = useNow(30_000, !!cfg && focused && awake);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => setAwake(st === 'active'));
    return () => sub.remove();
  }, []);

  const cfgKey = cfg ? `${cfg.siteId}|${cfg.routes.join(',')}` : '';
  // Only while HQ is on screen and the app is in front: at most one call a minute, longer after failures.
  // `cfg` keeps its identity while other settings change, so this only restarts for a new stop or new lines.
  useEffect(() => {
    if (!cfg || !focused || !awake) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const loop = async () => {
      const s = await refresh(cfg);
      if (!alive) return;
      setSnap(s);
      timer = setTimeout(() => void loop(), Math.max(5_000, s.nextAt - Date.now()));
    };
    void loop();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [cfg, focused, awake]);

  const mine = snap && snap.key === cfgKey ? snap : null;
  const live = !!mine && mine.fails === 0 && mine.okAt != null && now - mine.okAt < LIVE_MS;
  const shown = cfg && mine && live ? nextDepartures(mine.departures, cfg, now) : [];
  const first = shown[0];
  const cancelled = cfg && mine && live ? cancelledNote(mine.departures, cfg, now) : null;
  const hurryFor = first && cfg && !isCancelled(first) && leaveInMin(first, cfg.walkMin, now) <= 1 ? first.scheduled : 0;

  if (!cfg) return null;

  const lines = mine ? myLines(mine.departures, cfg) : [];
  const areas = mine ? [...new Set(mine.departures.map((d) => d.stopAreaId).filter((x): x is number => x != null))] : [];
  const notices = mine ? relevantDeviations([...mine.stopDeviations, ...mine.deviations], lines, areas, now).slice(0, 2) : [];
  const lastKnown = mine && !live ? mine.departures.filter((d) => (!cfg.routes.length || cfg.routes.includes(routeKey(d))) && d.scheduled > now).slice(0, 3) : [];

  return (
    <Card>
      <H
        right={
          <Pressable
            onPress={() => void refresh(cfg, true).then(setSnap)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Refresh SL departures">
            <Icon name="refresh" size={20} color={C.dim} />
          </Pressable>
        }>
        🚇 {cfg.name}
      </H>

      {notices.map((n) => (
        <Pressable key={n.id} onPress={() => setOpen(open === n.id ? null : n.id)} style={styles.notice} accessibilityRole="button" accessibilityHint="Shows the whole notice">
          <Text style={styles.noticeHead}>⚠️ {n.header}</Text>
          {open === n.id && n.details ? <T small>{n.details}</T> : null}
        </Pressable>
      ))}

      {!mine ? (
        <T dim small>
          Checking SL…
        </T>
      ) : live ? (
        shown.length ? (
          <View style={{ gap: 6 }}>
            {cancelled ? <Text style={styles.cancelNote}>🚫 {cancelled}</Text> : null}
            {shown.map((d, i) => (
              <Text key={`${routeKey(d)}-${d.scheduled}`} style={[styles.dep, i === 0 && styles.depFirst, isCancelled(d) && styles.cancelled]}>
                {departureText(d, cfg.walkMin, now)}
              </Text>
            ))}
            {hurryFor ? <HurryLine key={hurryFor} /> : null}
          </View>
        ) : (
          <T dim small>
            Nothing you can still make in the next hour on your lines.
          </T>
        )
      ) : (
        <View style={{ gap: 4 }}>
          <T dim small>
            {mine.fails > 0 ? `SL couldn't be reached · last update ${mine.okAt ? fmtTime(mine.okAt) : 'none yet'}` : 'Updating…'}
          </T>
          {lastKnown.length ? (
            <>
              <T dim small>
                Timetable, not live:
              </T>
              {lastKnown.map((d) => (
                <Text key={`${routeKey(d)}-${d.scheduled}`} style={[styles.dep, styles.stale]}>
                  {plannedText(d)}
                </Text>
              ))}
            </>
          ) : null}
        </View>
      )}

      <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Change the SL stop and lines in Settings">
        <T dim small>
          {cfg.walkMin} min walk to the stop{cfg.routes.length ? ` · ${cfg.routes.length} line${cfg.routes.length === 1 ? '' : 's'}` : ' · all lines'} · change in Settings
        </T>
      </Pressable>
    </Card>
  );
}

/** "Time to head out": picked once per departure (keyed by it), not every 30 seconds. */
function HurryLine() {
  const { quip } = useStore();
  const text = useMemo(() => quip('slLeaveNow'), [quip]);
  return (
    <T dim small>
      {text}
    </T>
  );
}

const styles = StyleSheet.create({
  dep: { color: C.text, fontSize: 14 },
  depFirst: { fontWeight: '800', fontSize: 15 },
  cancelled: { color: C.red },
  cancelNote: { color: C.text, fontWeight: '800', fontSize: 14 },
  stale: { color: C.dim },
  notice: { backgroundColor: C.card2, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#FF8A3D', padding: 10, gap: 4 },
  noticeHead: { color: C.text, fontWeight: '700', fontSize: 13 },
});
