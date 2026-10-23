// Work Android can start without a screen (APK 1.5.0+), defined at load from the app entry (index.ts).
// Each part checks for its native module, so Expo Go and older installs skip it. Nothing here imports the
// store or the theme: a headless start should stay small.
import { setUpWarningsCheck } from './lib/bg-alerts';
import { setUpSilentButtons } from './lib/silent-buttons';

void setUpSilentButtons();
setUpWarningsCheck();
