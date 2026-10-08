# 🕷️ S.P.I.D.E.R.

**S**avage **P**ersonal **I**ntelligence for **D**aily **E**xecution & **R**eminders
*(unofficially: Seriously Petty Intelligence Designed to Embarrass Regularly)*

A personal assistant app for Android that tracks your day and roasts you about it.

| Tab | What it does |
|---|---|
| **HQ** | Daily dashboard: weather, level/XP, day score + verdict, **3 daily quests + weekly boss fight**, tiles for water/gym/food/gaming/coffee/mood/steps/heart, up next, achievements, **weekly report card** |
| **Plan** | Today + next 7 days from your phone's calendars (Google + Outlook), free-time finder, **habit tracker with reminders**, task list |
| **Gym** | Watch data (steps, heart rate, sleep), weekly workout plan, set logger with last-time + PR tracking, rest timer, progress photos with then-vs-now |
| **Fuel** | Water tank with one-tap logging and 7-day history, coffee counter with caffeine limit and curfew, food log with meal photos, **barcode scanner (Open Food Facts)** and quick-add |
| **Mood** (from HQ) | Mood check-ins with emotion tags, 7-day mood chart, emotion counter. A low mood makes S.P.I.D.E.R. go easy for the rest of the day |
| **Game** | Gaming session timer, daily budget you can *earn* more of, 7-day chart |

**Notifications** (all savage, all adjustable in Settings): water reminders (silent during meetings), gym reminder 30 min before + a "did you skip?" follow-up, morning briefing, evening report card, gaming 15-min warning / budget reached / 30-min-over, rest timer done, and a "you haven't opened me in days" guilt trip.

**Gamification**: XP for water, workouts, PRs, tasks and food; levels with titles (from *Professional Couch Inspector* upward); 10 achievements. Going over your gaming budget costs XP. Finishing workouts (+30 min), hitting the water goal (+15 min) and tasks (+10 min) earn extra gaming time.

Everything is stored on the phone. No accounts, no cloud.

---

## Try it right now (Expo Go)

1. Install **Expo Go** from the Google Play Store on your phone.
2. Make a free account at <https://expo.dev/signup>, then log in once on the PC:
   ```
   npx expo login
   ```
3. In this folder:
   ```
   npm run tunnel
   ```
   Wait for **Tunnel ready**, then open Expo Go → **Scan QR code** → scan the QR code in the terminal.

`npm run tunnel` uses Expo's own tunnel (tied to your Expo account), so it works on any network. Avoid these:
- Plain `npx expo start` only works if the phone can reach the PC directly. On a work network or a Wi-Fi marked "Public" in Windows, it fails with *"java.io.IOException: Failed to download remote update"*.
- Plain `npx expo start --tunnel` uses Expo's shared ngrok account, which is often full (*"limited to 5000 simultaneous ngrok agent sessions"*, shown as *"Cannot read properties of undefined (reading 'body')"*).

Expo Go mode only works while the PC is running `npm run tunnel`. For everyday use, install the APK below. It runs on its own.

Everything works in Expo Go **except calendar sync** (Expo Go isn't allowed to read calendars). Notifications will show up as coming from "Expo Go".

## Install it as a real app (APK): calendar sync + its own icon

Built in Expo's cloud, no Android Studio needed. Needs a free account at <https://expo.dev/signup>.

```
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

Say **yes** when it asks to create the project and generate a keystore. After ~10–20 minutes you get a link and QR code. Open it on your phone, download the APK, and allow "install unknown apps" when Android asks.

### Calendars
S.P.I.D.E.R. reads the calendars already on your phone. You don't need to log in anywhere:
- **Google Calendar**: works automatically if your Google account is on the phone.
- **Outlook**: open the Outlook app → ⚙️ Settings → tap your account → turn on **Sync calendars**.

Then open S.P.I.D.E.R. → **Plan** → **Connect calendars**. In Settings you can choose which calendars it uses.

---

## Updating the installed app

**Design and feature changes (JavaScript only): no reinstall.** Publish them over the air:
```
npm run ship -- "what changed"
```
The app downloads the update next time it's opened, applies it immediately, and announces it with a roast. Your data is kept. Check which version is running under Settings → About.

**Native changes need a new APK.** That means new native libraries (camera, voice, widgets), new permissions, changes to the app icon/name/splash, or an Expo SDK upgrade. Build it with:
1. Bump `"version"` in `app.json` (e.g. `1.0.0` → `1.1.0`). The runtime version follows the app version, and the bump stops installed apps from receiving JavaScript that needs native code they don't have.
2. `npx eas-cli@latest build -p android --profile preview`
3. Install the new APK over the old one. No uninstall needed, and data is kept, because it's the same package and signing key.

## Watch data (Amazfit / Zepp)
S.P.I.D.E.R. reads steps, heart rate and sleep from **Android Health Connect**, where the Zepp app writes them:
1. Zepp app → Profile → Add accounts (3rd-party) → **Health Connect** → allow Steps, Heart rate, Sleep.
2. S.P.I.D.E.R. → Gym tab → **Connect watch data** → allow the same.

Data refreshes when the app opens and every 5 minutes while it's open. Hitting the step goal gives +20 XP and +15 min gaming.

## Backup
Settings → **Back up now** → pick a folder (e.g. Documents). A `SPIDER-backup-<date>` folder with `data.json` and all photos is created there. Upload it to Google Drive for extra safety. **Restore** → pick that folder. S.P.I.D.E.R. nags you on Sundays if there's been no backup for 2 weeks.

## Customize
- **Roast lines**: `src/lib/lines.ts`. Each category has a `mild` and a `savage` pool. The savage level (1–10) decides how often savage lines are picked.
- **XP, levels, achievements**: `src/lib/xp.ts`
- **Default goals and workout plan**: `src/lib/defaults.ts` (or just change them in the app's Settings)
- **Notification schedule**: `src/lib/notifications.ts`

## Project layout
```
src/app/            screens (Expo Router): (tabs)/index|plan|gym|fuel|game, settings, onboarding
src/components/     UI kit + toast pop-ups
src/lib/            store (state + actions), selectors, notifications, calendar, lines, xp
```

## Development
```
npx tsc --noEmit    # typecheck
npx expo lint       # lint
npx expo-doctor     # dependency/config health
```

## Ideas for the next version
- 🧠 Chat with S.P.I.D.E.R. via the Claude API ("log 3 eggs and coffee", "move gym to 7pm")
- 📸 Snap a photo of your meal, AI estimates calories/protein
- 🗣️ Spoken replies (text-to-speech) and a home-screen widget
