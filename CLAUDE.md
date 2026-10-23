# S.P.I.D.E.R. — notes for Claude

Savage J.A.R.V.I.S.-style personal assistant for Android: Expo SDK 57, expo-router (NativeTabs), React Compiler on. It ships to the owner's phone as an EAS **preview APK** and gets **over-the-air updates** after that. General Expo rules are in `AGENTS.md`. Read it too.

## Layout
- `src/app/`: routes.
  - `(tabs)/` holds index (HQ), plan, gym, fuel and game.
  - Stack screens, each registered in `_layout.tsx`: settings, mood, report, scan, cycle, wrapped, insights, shop, league, records, focus, breathe, body, outside, heart, sleep, movement, bestiary, perks, flies, diary, webs, debrief, onboarding.
  - HQ's movable cards are a registry: a new card needs an entry in `HQ_SECTIONS` (`src/lib/hq-layout.ts`) and a renderer in `SECTIONS` in `(tabs)/index.tsx`.
- `src/lib/store.tsx`: the single store.
  - Each action calls `run()`, which applies the change, then checks the league, quests (and the boss), then achievements and secret achievements, then saves and shows the toasts.
  - `reward()` adds XP and coins.
  - Calendar, health, weather, screen time and "outside" (air quality and alerts) live here too as non-persisted side state.
- `src/lib/lines.ts`: every personality line, with `mild` and `savage` pools. The tone comes from `effectiveSavage()` (see below).
- `src/lib/notifications.ts`: cancels and rebuilds every planned reminder (IDs are prefix-based) 1.5 s after any state change.
- Pure logic:
  - Core: `selectors.ts`, `xp.ts` (levels, achievements, secret achievements), `quests.ts` (daily quests, weekly boss), `habits.ts`, `report.ts`.
  - Economy and progression: `economy.ts` (coins, chest, shop), `league.ts` (rival bots), `evolution.ts` (spider stages, themes).
  - Recaps: `insights.ts`, `wrapped.ts`, `records.ts` (Hall of Fame/Shame).
  - Other: `countdowns.ts`, `body-log.ts`, `mood.ts`.
- Device and network code: `calendar.ts`, `health.ts`, `weather.ts` (Open-Meteo; past days come from `historical-forecast-api`, the forecast API only keeps ~43), `outside.ts` (pollen/AQI from Open-Meteo, SMHI warnings, Krisinformation VMA), `food-db.ts` (Open Food Facts), `photos.ts`, `backup.ts`.
- Every fetch goes through `getJson()` in `http.ts` (timeout via AbortController). RN's fetch never times out on its own.
- SMHI and VMA are matched on `settings.weather.county` ("Stockholms län"), which needs Swedish geocoding (`language=sv`). Old saves get it via `withCounty()`. From APK 1.5.0 a background task checks them while the app is closed too (see Background work).
- Alerts: a failed SMHI/VMA check keeps the last good list and says so (`sourceNote`), never "no warnings". Notification id `alert-${alert.id}`, seen key `${alert.id}:${level}` (`triageAlerts`/`alertKey` in `outside.ts`), so an escalation pings again. They use their own `spider-warnings` channel. The notify toggles only gate pings, not what's shown.
- `modules/spider-usage/`: a **local Expo native module** (Kotlin) that reads Android usage stats for screen time and strict Web Focus. Autolinking picks it up from `modules/`. JS reaches it only through `src/lib/screentime.ts` (`requireOptionalNativeModule('SpiderUsage')`), so installs without it degrade gracefully. Screen-time spans: a RESUMED of the same app keeps its span running, and only a PAUSED of the activity on screen (package + class) ends it; a late STOPPED of an app's previous activity must not. Any change under `modules/` needs a version bump and a new APK. There is no Android SDK on this PC, so the EAS build is the only Kotlin compile check.
- State is persisted by `src/lib/persist.ts` (v2): the state without `days` in `spider:state:v2:base`, each month of days in `spider:state:v2:days:YYYY-MM`, the month list in `spider:state:v2:months`. One row must stay under Android's 2 MB CursorWindow, or it can be written but never read again. Saves rewrite only changed months.
  - While the whole state is under 1 MB, `spider:state:v1` is written too, in the same transaction, with its fingerprint in the index. Pre-v2 code (an APK's embedded bundle after a rolled-back update) still finds current data there, and if v1 changed behind v2's back, `readSaved()` loads v1 and migrates it again.
  - A load that fails shows the recovery screen (`components/recovery.tsx`) and nothing is saved until the user picks something. A save that would drop most of the history is refused unless reset/restore allowed it (`wouldWipe`).
  - `hydrate()` in `defaults.ts` fills in fields that old saves don't have. New fields need a default there, or must be read with `?? fallback`.
- Tab screens stay mounted for days and the React Compiler computes a bare `dayKey()` once: use `useToday()` (`components/use-today.ts`) for "today" in screens. Day keys passed to actions must pass `isDayKey()`; never hand an action straight to `onPress` if it takes an optional argument (`onPress={actions.addCoffee}` once logged cups under "[object Object]").
- Tone: `toneOn(s, dayKey)` in `tone.ts` gives `{level, kind}` per day. `kind` (level 1, mild lines only) on a low mood (carried overnight until the next check-in), in sick mode, and on period days (logged, still running, or predicted for planned days) with "go easy on period days" on. Low battery caps at 5; away mode keeps the tone. `effectiveSavage()` is today's level; notifications use each planned day's own tone (`sayOn`). `gentleDay` keeps recaps (diary, callbacks, rival talk) kind about rough days; `goldenAllowed` gates golden lines. `quip` re-picks when the tone changes.
- Game bookkeeping:
  - XP goes through `reward(xp, …, day, {ref})` and back through `unreward` (`ledger.ts`). An undo takes back exactly what that entry got, Double XP and rested share included. Never call `reward` with a negative amount.
  - Gaming penalties use `penalize` (`xpLost`), outside `xpEarned`, so the boss and league aren't hit.
  - `paid` flags stop delete-and-relog farming.
  - A finished day keeps its goals (`DayLog.goals`, `goals.ts`, frozen at rollover): read them with `goalsOn`/`waterGoalFor`/`workoutFor`/`habitsFor`, never straight from settings, for past days.
  - Finished tasks per day: `doneTasksOn` (survives Clear/delete).
  - `run(fn, {quiet})` skips roast reactions (body and photo logging).
  - One-time save repairs live in `fixes.ts` (listed in `State.fixes`, run from `hydrate`).
- Weekly and monthly game layers (step 2b):
  - Quest draft: a normal day offers 5 and the owner picks 3 until noon (`draftFor`/`validDraft` in `quests.ts`; defaults count until then).
  - Weekend finisher: `boss-plan.ts`, with a nudge behind `notify.weekendBoss`. Monday boss recap: `boss-recap.ts`.
  - Ghost of last week: `xp-timeline.ts` (`DayLog.xpHours`). Weekly medals: `medals.ts`, paid once per week at rollover, thresholds scale down for rough days. Weekly nemesis: `nemesisOf` in `league.ts`.
  - Monthly Silk Track: `silk-track.ts`. Its tiers come from the month's `xpEarned`, an `EDITIONS` table has one edition per calendar month, and its rewards are cosmetics, never XP.
  - All of these are per-week or per-month counts. Nothing here may become a streak.
- Step 4 layers:
  - Lines: `freshLine` deals each pool list like a deck across runs (`State.lineMemory`). Notifications use `dayLine` via `sayOn(…, day, n)`. Long-press a toast to retire a line (`retireLine`, banned for good, softens today's tone via `toneEase`). Daily pools keep at least 4 savage lines, and a catchphrase may appear in at most 2 pools (tested).
  - Toasts after one-tap logs carry `{ undo }`, which calls `actions.undo`.
  - Just-in-time insights (`jit.ts`) fire once a day per kind, only when the pattern really is in the data, never on sick days.
  - If-then plans (`if-then.ts`, `Habit.plan`/`WorkoutDay.plan`): in-app cues via `checkCues` in `run()`, clock and meeting cues under the `ifthen-` prefix. After 10 on-cue completions (a total) the clock reminder retires.
  - Comeback bonus (`comeback.ts`): the first workout after a missed planned gym day (paused days don't count).
  - Range habits (`Habit.perWeek`): due only on days done or needed to reach the low end (`habits.ts`). Reminders only when the slack is gone.
  - SL departures (`sl.ts`, `sl-card.tsx`, `settings.sl`): keyless SL APIs, the card polls itself (≤1/min, foreground and visible), and timetable data is never shown as live.
- Scores and recaps judge only `countedDay`s (`day-filters.ts`): something was logged and the day wasn't rough (paused, low mood, period). Rough days are listed as rest, never as misses; recaps start at `firstDataDay`. Mood and protein are shown but never graded.

## Before calling a change done
```
npx tsc --noEmit
npx expo lint
npx expo export --platform android --output-dir <tmp>   # proves the bundle builds
npx expo-doctor
```
- After adding a route, run `npx expo start` for ~30 s so `.expo/types` regenerates. Otherwise tsc rejects `router.push('/new-route')`.
- Tests (no framework, plain `node:assert`, run with `tsx`):
  - `npm run test:logic` runs `scripts/logic-test.ts`: offline checks of the pure modules. Extend it when changing logic. It also checks that every `{placeholder}` in `lines.ts` is in its known list.
  - `npm run test:live` runs `scripts/live-api-test.ts`: hits Open-Meteo, SMHI and Krisinformation and prints what came back.
  - Modules that import `@/constants/theme` (e.g. `records.ts`, `store.tsx`) can't load under tsx. Test their pure parts via other modules or leave them to tsc.
- Parallel work in git worktrees: new worktrees start at `origin/master`, which lags local master, so reset to `master` first. With a `node_modules` junction they share Metro's cache in TEMP, and an export can bundle another worktree's `src/app`. Export with a private `TEMP`/`TMP` and `--clear`. Delete the junction before `git worktree remove`.
- Typed routes: `npx expo start --port 8099` run for ~45 s (e.g. `timeout 45 npx expo start --port 8099`) regenerates `.expo/types`; `--offline` does not.

## Shipping
- **JS-only change:** `npm run ship -- "what changed"`. This publishes an EAS Update to channel `preview`. The installed app downloads it on launch, applies it right away (`AutoUpdate`), and announces it with a roast.
- **Native change** (new native module, permission, config plugin, icon/name/splash, SDK bump):
  1. Bump `version` in `app.json` **first**. The runtime version uses the `appVersion` policy, so the bump keeps installed apps from receiving JS that needs native code they don't have.
  2. `npx eas-cli@latest build -p android --profile preview --non-interactive --no-wait`. versionCode auto-increments.
  3. The owner installs the new APK **over** the old one. Same keystore, so data survives.
- Never publish an OTA that imports a native module the installed runtime lacks.
- Never keep an `android/` folder (CNG). If you `expo prebuild` locally to inspect the manifest, delete `android/` afterwards and restore `package.json`. Prebuild rewrites the `android`/`ios` scripts.
- The app `name` must not end with "." because Gradle rejects it as a root project name. That's why it's "S.P.I.D.E.R" without the final dot.

## Native-module gotchas
- Import notification functions from `src/lib/local-notifications.ts`, **never** from `expo-notifications` itself. Its main entry loads push-token code that throws on Android in Expo Go.
- Expo Go can't create notification channels. The code catches that and falls back to expo's default channel.
- `react-native-health-connect` throws on import outside a native build, so `health.ts` loads it with a conditional `require`.
- `expo-calendar` is stubbed in Expo Go, hence the `calendarSupported` guard.
- `expo-file-system`: `File.copy()` is **async**. Await it.
- React Native 0.86 has no `StyleSheet.absoluteFillObject`, and `pointerEvents` belongs in the style, not the props.
- Themes: `src/constants/theme.ts` reads `theme.txt` synchronously when it loads and builds `C` from it, because every `StyleSheet.create` captures colors at import time. Switching theme writes the file and reloads the app. Don't cache `C` values anywhere that outlives a reload.

## Background work (APK 1.5.0+)
- `index.ts` is the app entry (`main` in package.json): `expo-router/entry`, then `src/background.ts`, which defines everything Android can start without a screen. A headless start loads no route files, so tasks and handlers are defined there, never in a screen or the store, and those modules must not import the store or the theme.
- Silent reminder buttons (`silent-buttons.ts`): "+1 glass", "Snooze 30 min", habit "Done" and the mood buttons use `opensAppToForeground: false` once the expo-notifications background task is registered (`silentButtonsReady()`); "Focus 25 min" still opens the app. The task only queues (`pending-actions.ts`); the store applies the queue on load, on 'active', and right away when it's alive (`onQueued`). expo also replays such a tap to the app's listener, so every tap is claimed once (`claimTap` with `tapKey`). Queued actions carry the day they're about and the tap time (`reminder-actions.ts`), which `addWater`/`addCoffee`/`logMood` take as `at`.
- Warnings while closed (`bg-alerts.ts`): expo-background-task (WorkManager, about every 30 min, only while the app is in the background and online). It reads `spider:bg:config` (`bg-config.ts`, written by `useBackgroundSync` in `background-sync.ts`), triages with `triageAlerts` and shares the seen-list `spider:bg:seen` with the app (`mergeSeen`: the later time wins).
- Home-screen widget (`src/widgets/`, react-native-android-widget, widget `Hq` in app.json): draws from a snapshot (`widget-data.ts`) that the app pushes whenever the numbers change; "+1 glass"/"+1 coffee" go through the same queue. Widget component files start with `'use no memo'`: the library calls them as plain functions. The library is only `require`d where its native module exists.
- Each part checks for its native module, so Expo Go and older installs skip it. Still: JS that statically imports `expo-task-manager`, `expo-background-task` or `react-native-android-widget` must never go out as an OTA to a runtime below 1.5.0.
- Reminders are exact: `USE_EXACT_ALARM` (granted at install on Android 13+) and `SCHEDULE_EXACT_ALARM` (Android 12) make expo-notifications use `setExactAndAllowWhileIdle`.

## Dev server
The owner's work Wi-Fi blocks LAN connections, and the default `--tunnel` (shared ngrok) is often full. Use `npm run tunnel`, Expo's account-based tunnel (needs `npx expo login`). Calendar, Health Connect and the barcode scanner only work in the APK, not in Expo Go.

## Personality rules
- Roast habits, never bodies, weight or amounts eaten.
- `moodLow` and `moodAwful` are kind in both pools.
- Every `{placeholder}` in a line must be passed by its callers.
- Body/measurement tracking (`/body`) is strictly neutral: never roasted, and kept out of Insights and Wrapped.
- Period-day lines are kind. Health alerts (pollen, air, SMHI, VMA) are helpful first, at most a wink.
- **No streaks anywhere.** The owner asked for none: no "X days in a row" achievements, consecutive-day records, streak counters or streak shields. Use totals or per-week counts.

## Tooling note (this Windows machine)
Bash heredocs containing emoji fail to parse here. Put multi-line edit scripts in a file and run them with `PYTHONUTF8=1 python script.py`.
