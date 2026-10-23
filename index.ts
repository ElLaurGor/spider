// App entry (APK 1.5.0+). expo-router's entry renders the app; src/background.ts defines the work Android can
// start without a screen (reminder buttons, the warnings check, the home-screen widget). Those headless starts
// load this file but no route files, so background work must be defined from here, never from a screen.
import 'expo-router/entry';

import './src/background';
