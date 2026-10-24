import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { useState, type ReactNode } from 'react';
import { Alert, DevSettings, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { Btn, Card, Chip, Field, H, Icon, Row, SpiderSays, Stepper, T, useNow } from '@/components/ui';
import { C, saveTheme, THEME_ID, THEMES, type ThemeId } from '@/constants/theme';
import { themeIds, themeUnlocked } from '@/lib/evolution';
import { backupNudge } from '@/lib/backup-due';
import { dayKey, pad } from '@/lib/dates';
import { lastCallClock } from '@/lib/caffeine';
import { hqHidden, hqLabel, hqOrder, moveSection, toggleSection } from '@/lib/hq-layout';
import { ACRONYM_REAL, bannedLines, line } from '@/lib/lines';
import { openHealthSettings } from '@/lib/health';
import { guardSupported, hasUsageAccess, openUsageSettings, screenTimeSupported } from '@/lib/screentime';
import { POLLEN } from '@/lib/outside';
import { findPlace } from '@/lib/weather';
import { fetchDepartures, routesOf, searchStops, type SlStop } from '@/lib/sl';
import { levelForXp } from '@/lib/xp';
import { sendTestRoast } from '@/lib/notifications';
import { useStore } from '@/lib/store';
import { toneOn } from '@/lib/tone';
import { PauseCard } from '@/components/pause-card';
import { StepsCheckPanel } from '@/components/steps-check';
import type { NotifyPrefs, Settings } from '@/lib/types';

const SAVAGE_LABEL = (v: number) => (v <= 2 ? 'polite butler' : v <= 5 ? 'sassy' : v <= 8 ? 'savage' : 'no mercy');

export default function SettingsScreen() {
  const { state, actions, cal, say, health, saveNow } = useStore();
  const level = levelForXp(state.xp);
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const s = state.settings;
  const set = (patch: Partial<Settings>) => actions.updateSettings(patch);
  const [name, setName] = useState(s.userName);
  const [preview, setPreview] = useState(() => line('spiderTap', s.savageLevel, { name: s.userName || 'boss' }));

  const setNotify = (k: keyof NotifyPrefs, v: boolean) => set({ notify: { ...s.notify, [k]: v } });

  const chosen = s.calendarIds;
  const toggleCal = (id: string, on: boolean) => {
    const all = cal.calendars.map((c) => c.id);
    const current = chosen ?? all;
    const next = on ? [...new Set([...current, id])] : current.filter((x) => x !== id);
    set({ calendarIds: next.length === all.length ? null : next });
  };

  const setPlace = async () => {
    if (!city.trim()) return;
    try {
      const place = await findPlace(city);
      if (!place) return say(`Couldn't find "${city}". Try "Stockholm" or "Göteborg".`, 'bad');
      set({ weather: place });
      setCity('');
      say(`Weather set to ${place.name}.`, 'good');
    } catch {
      say('No internet? Weather lookup failed.', 'bad');
    }
  };

  const doBackup = async () => {
    setBusy(true);
    try {
      await actions.backup();
    } catch (e) {
      say(`Backup failed: ${(e as Error).message}`, 'bad');
    } finally {
      setBusy(false);
    }
  };

  const autoBackupOn = async () => {
    setBusy(true);
    try {
      await actions.setAutoBackupFolder();
    } catch (e) {
      say(`Backup failed: ${(e as Error).message}`, 'bad');
    } finally {
      setBusy(false);
    }
  };

  const doShare = async () => {
    setBusy(true);
    try {
      // The share sheet can't tell a send from a cancel, so ask: only a real send quiets the backup nudges.
      if (await actions.shareBackup()) {
        Alert.alert('Did it go through?', 'Say yes once the file is in Drive, mail or somewhere else off this phone. Until then the backup reminders stay on.', [
          { text: 'Not yet', style: 'cancel' },
          { text: 'Yes, sent', onPress: actions.markShared },
        ]);
      }
    } catch (e) {
      say(`Couldn't send the backup: ${(e as Error).message}`, 'bad');
    } finally {
      setBusy(false);
    }
  };

  const restoreFrom = (from: 'folder' | 'file') => async () => {
    setBusy(true);
    try {
      await actions.restore(from);
    } catch (e) {
      say(`Restore failed: ${(e as Error).message}`, 'bad');
    } finally {
      setBusy(false);
    }
  };
  const doRestore = () =>
    Alert.alert(
      'Restore a backup?',
      'Everything on this phone gets replaced by the backup. Pick the "SPIDER-backup-…" or "SPIDER-auto-backup" folder, or a single backup file you sent yourself.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'A file', onPress: restoreFrom('file') },
        { text: 'A folder', onPress: restoreFrom('folder') },
      ],
    );
  const nudge = backupNudge({ ...state, firstDay: Object.keys(state.days).sort()[0] ?? null });

  const applyTheme = (id: ThemeId) => {
    if (id === THEME_ID) return;
    if (!themeUnlocked(id, level, state)) {
      return say('unlock' in THEMES[id] ? `${THEMES[id].name} is a trophy: beat the Couch King to wear it.` : `${THEMES[id].name} unlocks at level ${THEMES[id].level}. Earn it.`, 'bad');
    }
    Alert.alert(`Switch to ${THEMES[id].name}?`, 'S.P.I.D.E.R. restarts to change outfits. Takes a second.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Switch',
        onPress: async () => {
          saveTheme(id);
          await saveNow().catch(() => {});
          if (Updates.isEnabled) await Updates.reloadAsync();
          else DevSettings.reload();
        },
      },
    ]);
  };

  const testRoast = async () => {
    const ok = await sendTestRoast(state);
    say(ok ? 'Roast incoming in 3 seconds. Lock your phone if you want the full experience.' : 'Notifications are blocked. Enable them in Android settings.', ok ? 'info' : 'bad');
  };

  const reset = () =>
    Alert.alert('Reset everything?', 'All logs, XP and achievements will be deleted. S.P.I.D.E.R. will forget you ever existed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete it all',
        style: 'destructive',
        onPress: async () => {
          await actions.resetAll();
          router.replace('/onboarding');
        },
      },
    ]);

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Card>
        <H>Personality</H>
        <T dim small>
          What should I call you?
        </T>
        <Field value={name} onChangeText={setName} onEndEditing={() => set({ userName: name.trim() })} placeholder="Your name" />
        <SettingRow label="Savage level" hint={SAVAGE_LABEL(s.savageLevel)}>
          <Stepper
            value={s.savageLevel}
            min={1}
            max={10}
            onChange={(v) => {
              set({ savageLevel: v });
              setPreview(line('spiderTap', v, { name: s.userName || 'boss' }));
            }}
          />
        </SettingRow>
        <SpiderSays text={preview} onPress={() => setPreview(line('spiderTap', s.savageLevel, { name: s.userName || 'boss' }))} />
        <TodayTone />
        <Toggle label="Go easy on period days" hint="no roasts on period days" value={s.easyOnPeriod} onChange={(v) => set({ easyOnPeriod: v })} />
        <RetiredLines />
      </Card>

      <Card>
        <H>Themes</H>
        <T dim small>
          New themes unlock as you level up. You are level {level}.
        </T>
        {themeIds.map((id) => {
          const t = THEMES[id];
          const open = themeUnlocked(id, level, state);
          return (
            <Pressable key={id} onPress={() => applyTheme(id)} style={({ pressed }) => [{ opacity: open ? (pressed ? 0.7 : 1) : 0.4 }]}>
              <Row>
                <View style={{ flexDirection: 'row' }}>
                  {[t.colors.bg, t.colors.red, t.colors.blue].map((c, i) => (
                    <View key={i} style={{ width: 18, height: 28, backgroundColor: c, borderRadius: 4, marginRight: 2, borderWidth: 1, borderColor: C.border }} />
                  ))}
                </View>
                <T style={{ flex: 1 }}>{t.name}</T>
                <Text style={{ color: id === THEME_ID ? C.green : C.dim, fontWeight: '700', fontSize: 12 }}>
                  {id === THEME_ID ? '✓ active' : open ? 'tap to use' : 'unlock' in t ? '🔒 trophy' : `🔒 LVL ${t.level}`}
                </Text>
              </Row>
            </Pressable>
          );
        })}
      </Card>

      <PauseCard />

      <Card>
        <H
          right={
            s.hq ? (
              <Text style={{ color: C.red, fontWeight: '700', fontSize: 13 }} onPress={() => set({ hq: undefined })}>
                Reset
              </Text>
            ) : undefined
          }>
          HQ layout
        </H>
        <T dim small>
          Order HQ&apos;s cards and hide the ones you don&apos;t look at. The spider, health alerts and banners stay on top.
        </T>
        {hqOrder(s.hq).map((id, i, all) => {
          const shown = !hqHidden(s.hq).includes(id);
          return (
            <Row key={id} gap={6}>
              <T style={{ flex: 1, opacity: shown ? 1 : 0.45 }}>{hqLabel(id)}</T>
              <Pressable
                onPress={() => set({ hq: moveSection(s.hq, id, -1) })}
                disabled={i === 0}
                hitSlop={6}
                style={{ opacity: i === 0 ? 0.25 : 1 }}
                accessibilityRole="button"
                accessibilityLabel={`Move ${hqLabel(id)} up`}>
                <Icon name="expand_less" size={24} color={C.dim} />
              </Pressable>
              <Pressable
                onPress={() => set({ hq: moveSection(s.hq, id, 1) })}
                disabled={i === all.length - 1}
                hitSlop={6}
                style={{ opacity: i === all.length - 1 ? 0.25 : 1 }}
                accessibilityRole="button"
                accessibilityLabel={`Move ${hqLabel(id)} down`}>
                <Icon name="expand_more" size={24} color={C.dim} />
              </Pressable>
              <Switch value={shown} onValueChange={() => set({ hq: toggleSection(s.hq, id) })} trackColor={{ true: C.red, false: C.card2 }} thumbColor={C.text} />
            </Row>
          );
        })}
      </Card>

      <Card>
        <H>Daily goals</H>
        <SettingRow label="Water goal">
          <Stepper value={s.waterGoalMl} step={250} min={500} max={6000} format={(v) => `${v} ml`} onChange={(v) => set({ waterGoalMl: v })} />
        </SettingRow>
        <Toggle
          label="Adapt water to the day"
          hint="+300–500 ml on hot days, +400 ml on training days"
          value={s.adaptiveWater !== false}
          onChange={(v) => set({ adaptiveWater: v })}
        />
        <SettingRow label="Glass size">
          <Stepper value={s.glassMl} step={50} min={100} max={1000} format={(v) => `${v} ml`} onChange={(v) => set({ glassMl: v })} />
        </SettingRow>
        <SettingRow label="Calories">
          <Stepper value={s.kcalGoal} step={100} min={1000} max={6000} format={(v) => `${v}`} onChange={(v) => set({ kcalGoal: v })} />
        </SettingRow>
        <SettingRow label="Protein">
          <Stepper value={s.proteinGoal} step={5} min={0} max={400} format={(v) => `${v} g`} onChange={(v) => set({ proteinGoal: v })} />
        </SettingRow>
        <SettingRow label="Step goal">
          <Stepper value={s.stepGoal} step={500} min={1000} max={30000} format={(v) => v.toLocaleString('sv-SE')} onChange={(v) => set({ stepGoal: v })} />
        </SettingRow>
        <SettingRow label="Coffee limit" hint={`${s.coffeeLimit * s.caffeinePerCupMg} mg caffeine`}>
          <Stepper value={s.coffeeLimit} min={1} max={10} format={(v) => `${v} cups`} onChange={(v) => set({ coffeeLimit: v })} />
        </SettingRow>
        <SettingRow label="Caffeine per cup">
          <Stepper value={s.caffeinePerCupMg} step={10} min={20} max={300} format={(v) => `${v} mg`} onChange={(v) => set({ caffeinePerCupMg: v })} />
        </SettingRow>
        <SettingRow label="Coffee curfew" hint={`later cups get roasted · by the caffeine math, last call is ${lastCallClock(s.sleepHour, s.caffeinePerCupMg)}`}>
          <Stepper value={s.coffeeCutoffHour} min={10} max={22} format={(v) => `${pad(v)}:00`} onChange={(v) => set({ coffeeCutoffHour: v })} />
        </SettingRow>
        <SettingRow label="Gaming budget" hint="per day, before bonuses">
          <Stepper value={s.gamingBudgetMin} step={15} min={0} max={600} format={(v) => `${v} min`} onChange={(v) => set({ gamingBudgetMin: v })} />
        </SettingRow>
      </Card>

      <Card>
        <H>Schedule</H>
        <SettingRow label="Wake up">
          <Stepper value={s.wakeHour} min={4} max={12} format={(v) => `${pad(v)}:00`} onChange={(v) => set({ wakeHour: v })} />
        </SettingRow>
        <SettingRow label="Bedtime">
          <Stepper value={s.sleepHour} min={19} max={24} format={(v) => `${pad(v % 24)}:00`} onChange={(v) => set({ sleepHour: v })} />
        </SettingRow>
        <SettingRow label="Water nag every">
          <Stepper value={s.waterEveryMin} step={15} min={30} max={240} format={(v) => `${v} min`} onChange={(v) => set({ waterEveryMin: v })} />
        </SettingRow>
        <SettingRow label="Gym time">
          <Stepper
            value={s.gymHour * 60 + s.gymMinute}
            step={30}
            min={5 * 60}
            max={22 * 60}
            format={(v) => `${pad(Math.floor(v / 60))}:${pad(v % 60)}`}
            onChange={(v) => set({ gymHour: Math.floor(v / 60), gymMinute: v % 60 })}
          />
        </SettingRow>
        <SettingRow label="Rest timer">
          <Stepper value={s.restSeconds} step={15} min={0} max={600} format={(v) => (v ? `${v} s` : 'off')} onChange={(v) => set({ restSeconds: v })} />
        </SettingRow>
        <Toggle label="Red days are rest days" hint="no planned workout or gym reminders on Swedish public holidays" value={s.redDaysOff} onChange={(v) => set({ redDaysOff: v })} />
      </Card>

      <Card>
        <H>Notifications</H>
        <Toggle label="Water reminders" value={s.notify.water} onChange={(v) => setNotify('water', v)} />
        <Toggle label="Gym reminders" value={s.notify.gym} onChange={(v) => setNotify('gym', v)} />
        <Toggle label="Morning briefing" value={s.notify.morning} onChange={(v) => setNotify('morning', v)} />
        <Toggle label="Evening report card" value={s.notify.evening} onChange={(v) => setNotify('evening', v)} />
        <Toggle label="Gaming alerts" value={s.notify.gaming} onChange={(v) => setNotify('gaming', v)} />
        <Toggle label="Mood check-ins" hint="13:00 and 20:00" value={s.notify.mood} onChange={(v) => setNotify('mood', v)} />
        <Toggle label="Habit reminders" hint="per habit, if it has a time" value={s.notify.habits} onChange={(v) => setNotify('habits', v)} />
        <Toggle label="Weekly report card" hint="Sundays 19:00" value={s.notify.report} onChange={(v) => setNotify('report', v)} />
        <Toggle label="Sleep rating prompt" hint="an hour after you wake up" value={s.notify.sleep} onChange={(v) => setNotify('sleep', v)} />
        <Toggle label="Countdown reminders" hint="the day before and on the day" value={s.notify.countdowns} onChange={(v) => setNotify('countdowns', v)} />
        <Toggle label="Wrapped & Prizes" hint="monthly on the 1st, the year on 1 Jan, the Prizes on 10 Dec" value={s.notify.wrapped} onChange={(v) => setNotify('wrapped', v)} />
        <Toggle label="Wind-down reminder" hint="an hour before bedtime" value={s.notify.windDown} onChange={(v) => setNotify('windDown', v)} />
        <Toggle label="League reminder" hint="Sundays 17:00" value={s.notify.league} onChange={(v) => setNotify('league', v)} />
        <Toggle
          label="Weekend boss finisher"
          hint="Sat & Sun 15:00, when today can still finish the boss"
          value={s.notify.weekendBoss}
          onChange={(v) => setNotify('weekendBoss', v)}
        />
        <Toggle label="Period heads-up" hint="2 days before it's predicted" value={s.notify.cycle} onChange={(v) => setNotify('cycle', v)} />
        <Toggle
          label="Status line"
          hint="a silent summary in the notification shade, with +1 glass and Focus buttons"
          value={s.notify.statusLine}
          onChange={(v) => setNotify('statusLine', v)}
        />
        <Toggle label="Stay quiet during meetings" value={s.respectMeetings} onChange={(v) => set({ respectMeetings: v })} />
        <Btn label="Send me a test roast" icon="notifications" kind="ghost" onPress={testRoast} />
      </Card>

      <Card>
        <H>Weather</H>
        <T dim small>
          {s.weather ? `Showing weather for ${s.weather.name}.` : 'Pick a city to get the forecast on HQ and in your morning briefing.'}
        </T>
        <Row>
          <Field value={city} onChangeText={setCity} placeholder={s.weather ? 'Change city…' : 'City, e.g. Stockholm'} onSubmitEditing={setPlace} style={{ flex: 1 }} />
          <Btn label="Set" kind="ghost" onPress={setPlace} disabled={!city.trim()} />
        </Row>
      </Card>

      <SlSettings />

      <Card>
        <H>Outside: pollen, air & warnings</H>
        <T dim small>
          {s.weather
            ? `SMHI warnings and VMA for ${s.weather.county ?? 'your county (looking it up…)'}. Pollen and air quality for ${s.weather.name.split(',')[0]}.`
            : 'Set a city above first.'}
        </T>
        <T small>Your allergies</T>
        <Row style={{ flexWrap: 'wrap' }} gap={8}>
          {POLLEN.map((p) => {
            const on = s.allergies.includes(p.type);
            return (
              <Chip
                key={p.type}
                label={`${p.emoji} ${p.label}`}
                active={on}
                onPress={() => set({ allergies: on ? s.allergies.filter((x) => x !== p.type) : [...s.allergies, p.type] })}
              />
            );
          })}
        </Row>
        <SettingRow label="Pollen alert from">
          <Row gap={6}>
            <Chip label="Moderate" active={s.pollenAlertLevel === 2} onPress={() => set({ pollenAlertLevel: 2 })} />
            <Chip label="High" active={s.pollenAlertLevel === 3} onPress={() => set({ pollenAlertLevel: 3 })} />
          </Row>
        </SettingRow>
        <SettingRow label="Air quality alert" hint="European AQI: 40 fair, 60 poor, 80 very poor">
          <Stepper value={s.aqiAlert} step={10} min={20} max={100} format={(v) => `${v}+`} onChange={(v) => set({ aqiAlert: v })} />
        </SettingRow>
        <Toggle label="Pollen alerts" hint="morning, for your allergies only" value={s.notify.pollen} onChange={(v) => setNotify('pollen', v)} />
        <Toggle label="Air quality alerts" hint="morning, when AQI hits your limit" value={s.notify.air} onChange={(v) => setNotify('air', v)} />
        <Toggle
          label="SMHI weather warnings"
          hint="a ping for yellow, orange and red, right away. Outside lists them either way"
          value={s.notify.smhi}
          onChange={(v) => setNotify('smhi', v)}
        />
        <Toggle
          label="VMA"
          hint="Viktigt meddelande till allmänheten: a ping right away. Outside lists them either way"
          value={s.notify.vma}
          onChange={(v) => setNotify('vma', v)}
        />
        <Btn label="Open Outside" icon="air" kind="ghost" onPress={() => router.push('/outside')} disabled={!s.weather} />
      </Card>

      <Card accent={nudge ? C.yellow : undefined}>
        <H right={nudge ? <T small style={{ color: C.yellow }}>{nudge === 'stale' ? '⚠ no backup this week' : '⚠ not set up'}</T> : undefined}>Backup & restore</H>
        <T dim small>
          Last backup: {state.lastBackupAt ? new Date(state.lastBackupAt).toLocaleString('sv-SE').slice(0, 16) : 'never'}
          {state.lastSharedAt ? ` · last sent: ${new Date(state.lastSharedAt).toLocaleString('sv-SE').slice(0, 10)}` : ''}. A backup is a folder with all
          your data and photos. Pick e.g. Documents. Send backup puts your data (no photos) in Drive, mail or wherever you like: off the phone.
        </T>
        <Row>
          <Btn label="Back up now" icon="save" onPress={doBackup} disabled={busy} style={{ flex: 1 }} />
          <Btn label="Send backup" icon="share" kind="ghost" onPress={doShare} disabled={busy} style={{ flex: 1 }} />
        </Row>
        <Btn label="Restore" kind="ghost" onPress={doRestore} disabled={busy} />
        <Toggle
          label="Daily backup"
          hint={
            state.backupFolderUri
              ? 'Every day when you open the app, into "SPIDER-auto-backup" in the folder you picked. Keeps the last 7 days, plus one a week for 5 weeks before that.'
              : 'Pick a folder once and S.P.I.D.E.R. backs up there every day.'
          }
          value={!!state.backupFolderUri}
          onChange={(v) => (v ? void autoBackupOn() : actions.stopAutoBackup())}
        />
        <StorageRow />
      </Card>

      {cal.status === 'granted' && cal.calendars.length > 0 ? (
        <Card>
          <H>Calendars</H>
          {cal.calendars.map((c) => (
            <Toggle
              key={c.id}
              label={c.title}
              hint={c.account}
              color={c.color}
              value={chosen ? chosen.includes(c.id) : true}
              onChange={(v) => toggleCal(c.id, v)}
            />
          ))}
        </Card>
      ) : null}

      {screenTimeSupported ? (
        <Card>
          <H>Phone screen time</H>
          <T dim small>
            {hasUsageAccess() ? 'Usage access is on. S.P.I.D.E.R. reads app names and minutes, on this phone only.' : 'Usage access is off. Turn it on to track phone time and auto-detect phone gaming.'}
          </T>
          <Btn label="Usage access settings" kind="ghost" onPress={openUsageSettings} />
          <Toggle label="Count phone games in gaming budget" value={s.phoneGamesCount} onChange={(v) => set({ phoneGamesCount: v })} />
          {guardSupported ? (
            <Toggle
              label="Focus guard"
              hint="during Web Focus, a nudge the moment you open a social app"
              value={s.focusGuard !== false}
              onChange={(v) => set({ focusGuard: v })}
            />
          ) : null}
          <SettingRow label="Daily phone limit" hint="above this, the roasts get louder">
            <Stepper value={s.phoneLimitMin} step={30} min={30} max={720} format={(v) => `${Math.floor(v / 60)}h${v % 60 ? ` ${v % 60}m` : ''}`} onChange={(v) => set({ phoneLimitMin: v })} />
          </SettingRow>
        </Card>
      ) : null}

      {health.status !== 'unsupported' ? (
        <Card>
          <H>Watch (Zepp → Health Connect)</H>
          <T dim small>
            {health.status === 'connected'
              ? health.missing.length
                ? `Connected, but without access to ${health.missing.join(' and ')}.`
                : 'Connected. Steps, heart rate and sleep are read from Health Connect; steps every minute while the app is open.'
              : health.status === 'unavailable'
                ? 'Health Connect is not available. Install it from the Play Store.'
                : 'Not connected yet. In Zepp: Profile → Add accounts → Health Connect, then connect here.'}
          </T>
          <Row>
            {health.status !== 'connected' ? <Btn label="Connect" icon="monitor_heart" onPress={health.connect} style={{ flex: 1 }} /> : null}
            {health.status === 'connected' && health.missing.length ? (
              <Btn label="Grant missing access" icon="monitor_heart" onPress={health.connect} style={{ flex: 1 }} />
            ) : null}
            <Btn label="Health Connect settings" kind="ghost" onPress={openHealthSettings} style={{ flex: 1 }} />
          </Row>
          {health.status === 'connected' ? (
            <>
              <Toggle
                label="Fill Zepp's delay with the phone's steps"
                hint="Zepp writes to Health Connect late; until it does, the phone's own step count covers today's newest steps"
                value={s.stepsFill !== false}
                onChange={(v) => {
                  set({ stepsFill: v });
                  setTimeout(health.refresh, 0); // re-read with the new setting (the store reads it at the next read)
                }}
                color={C.green}
              />
              <StepsCheckPanel fill={s.stepsFill !== false} />
            </>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <H>About</H>
        <T dim small>
          S.P.I.D.E.R. officially stands for Savage Personal Intelligence for Daily Execution &amp; Reminders. Unofficially: {ACRONYM_REAL}.
        </T>
        <T dim small>
          {state.xp} XP total · {Object.keys(state.achievements).length} achievements · all data stays on this phone.
        </T>
        <T dim small mono>
          v{Constants.expoConfig?.version ?? '?'}
          {Updates.isEnabled && Updates.updateId
            ? ` · ${Updates.isEmbeddedLaunch ? 'built-in' : 'update'} ${Updates.updateId.slice(0, 8)}${
                Updates.createdAt ? ` (${Updates.createdAt.toLocaleString('sv-SE').slice(0, 16)})` : ''
              }`
            : ' · dev'}
        </T>
        <Btn label="Reset everything" icon="delete" kind="danger" onPress={reset} />
      </Card>
    </ScrollView>
  );
}

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Where the data lives: when it was last saved, and how close the biggest stored part is to Android's 2 MB a part can hold. */
function StorageRow() {
  const { storageInfo } = useStore();
  useNow(10_000);
  const info = storageInfo();
  return (
    <T dim small>
      {info.failing
        ? '💾 The last save failed. Retrying in the background.'
        : `💾 Last saved ${info.savedAt ? new Date(info.savedAt).toLocaleTimeString('sv-SE').slice(0, 5) : 'not yet this run'}`}
      {info.rows ? ` · ${kb(info.bytes)} in ${info.rows} part${info.rows === 1 ? '' : 's'}, the biggest ${kb(info.largest)} of the 2 MB a part can hold.` : ''}
    </T>
  );
}

/** Under the savage preview: whether today's tone is held down, since the preview shows a normal day. */
function TodayTone() {
  const { state } = useStore();
  const tone = toneOn(state, dayKey());
  const chosen = state.settings.savageLevel;
  if (tone.kind) {
    return (
      <T dim small>
        {tone.storm
          ? `Storm protocol: a warning is out, so the jokes are off until it passes. The preview shows how level ${chosen} sounds on a normal day.`
          : `Roasts are paused today (a low mood, sick mode or a period day). The preview shows how level ${chosen} sounds on a normal day.`}
      </T>
    );
  }
  if (tone.level < chosen) {
    return (
      <T dim small>
        {state.toneEase?.day === dayKey()
          ? `A line went too far today, so I'm at level ${tone.level} until tomorrow.`
          : `Low-battery mode today: roasts are capped at level ${tone.level}.`}
      </T>
    );
  }
  return null;
}

/** "17 (direction 1)" for a picked line that has no departure right now to name its destination. */
const routeFallback = (key: string) => {
  const [line, dir] = key.split(':');
  return `${line} (direction ${dir})`;
};

/** SL departures on HQ: the stop (found with SL's journey planner), the lines to show, and the walk to the stop. */
function SlSettings() {
  const { state, actions, say } = useStore();
  const sl = state.settings.sl ?? null;
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SlStop[] | null>(null);
  const [routes, setRoutes] = useState<{ key: string; label: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const save = (next: Settings['sl']) => actions.updateSettings({ sl: next });

  const search = async () => {
    if (!q.trim() || busy) return;
    setBusy(true);
    try {
      const found = await searchStops(q);
      setHits(found);
      if (!found.length) say(`No SL stop called "${q.trim()}". Try the station or stop name, like "Odenplan".`, 'bad');
    } catch {
      say("Couldn't reach SL to search. Try again in a minute.", 'bad');
    } finally {
      setBusy(false);
    }
  };
  const pick = (stop: SlStop) => {
    save({ siteId: stop.siteId, name: stop.name, routes: [], walkMin: sl?.walkMin ?? 5 });
    setHits(null);
    setQ('');
    setRoutes(null);
    say(`SL departures from ${stop.name} are on HQ now.`, 'good');
  };
  const loadRoutes = async () => {
    if (!sl || busy) return;
    setBusy(true);
    try {
      setRoutes(routesOf((await fetchDepartures(sl.siteId)).departures));
    } catch {
      say("Couldn't reach SL for the lines. Try again in a minute.", 'bad');
    } finally {
      setBusy(false);
    }
  };
  const toggleRoute = (key: string) => {
    if (!sl) return;
    save({ ...sl, routes: sl.routes.includes(key) ? sl.routes.filter((k) => k !== key) : [...sl.routes, key] });
  };
  // Picked lines with nothing leaving in the next hour still show, so they can be unpicked.
  const chips = routes ? [...routes, ...(sl?.routes ?? []).filter((k) => !routes.some((r) => r.key === k)).map((k) => ({ key: k, label: routeFallback(k) }))] : null;

  return (
    <Card>
      <H>SL departures</H>
      <T dim small>
        {sl
          ? `HQ shows when to leave for the next departures from ${sl.name}, with SL's live times and disruption notices.`
          : 'Pick your stop to see on HQ when to leave for the next bus, metro, tram or train. Live times and disruption notices come from SL.'}
      </T>
      <Row>
        <Field value={q} onChangeText={setQ} placeholder={sl ? 'Change stop…' : 'Stop, e.g. Odenplan'} onSubmitEditing={search} style={{ flex: 1 }} />
        <Btn label="Search" kind="ghost" onPress={search} disabled={!q.trim() || busy} />
      </Row>
      {hits?.map((stop) => (
        <Pressable
          key={stop.siteId}
          onPress={() => pick(stop)}
          accessibilityRole="button"
          accessibilityLabel={`Use ${stop.name}`}
          style={({ pressed }) => [{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }, pressed && { opacity: 0.6 }]}>
          <T>{stop.name}</T>
          {stop.area ? (
            <T dim small>
              {stop.area}
            </T>
          ) : null}
        </Pressable>
      ))}
      {sl ? (
        <>
          <SettingRow label="Walk to the stop" hint="for when to leave">
            <Stepper value={sl.walkMin} min={0} max={30} format={(v) => `${v} min`} onChange={(v) => save({ ...sl, walkMin: v })} />
          </SettingRow>
          <T small>Lines to show</T>
          <T dim small>
            {sl.routes.length ? `${sl.routes.length} picked. Only these show on HQ.` : 'Every line at the stop. Pick yours to see only those.'}
          </T>
          {chips ? (
            <Row style={{ flexWrap: 'wrap' }} gap={8}>
              {chips.map((r) => (
                <Chip key={r.key} label={r.label} active={sl.routes.includes(r.key)} onPress={() => toggleRoute(r.key)} />
              ))}
            </Row>
          ) : (
            <Btn label="Load the lines at this stop" kind="ghost" onPress={loadRoutes} disabled={busy} />
          )}
          {sl.routes.length ? <Btn label="Show every line" kind="ghost" small onPress={() => save({ ...sl, routes: [] })} /> : null}
          <Btn label="Remove the SL card" kind="ghost" onPress={() => save(null)} />
        </>
      ) : null}
    </Card>
  );
}

/** Lines retired with "too far" (long-press a comment): each one can be let back in. */
function RetiredLines() {
  const { state, actions } = useStore();
  const [open, setOpen] = useState(false);
  const list = bannedLines(state.lineMemory?.banned ?? []);
  if (!list.length) {
    return (
      <T dim small>
        A comment went too far? Long-press it and I&apos;ll retire that line for good.
      </T>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      <SettingRow label={`Retired lines (${list.length})`} hint="long-press a comment to retire it">
        <Chip label={open ? 'Hide' : 'Show'} onPress={() => setOpen(!open)} />
      </SettingRow>
      {open
        ? list.map((x) => (
            <Row key={x.id} style={{ justifyContent: 'space-between', gap: 8 }}>
              <T dim small style={{ flex: 1 }}>
                “{x.text}”
              </T>
              <Chip label="Let back in" onPress={() => actions.unretireLine(x.id)} />
            </Row>
          ))
        : null}
    </View>
  );
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <T>{label}</T>
        {hint ? (
          <T dim small>
            {hint}
          </T>
        ) : null}
      </View>
      {children}
    </Row>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
  color,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <SettingRow label={label} hint={hint}>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: color ?? C.red, false: C.card2 }} thumbColor={C.text} />
    </SettingRow>
  );
}
