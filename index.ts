// App entry (APK 1.5.0+). src/background.ts defines the work Android can start without a screen (reminder buttons,
// the warnings check, the home-screen widget); expo-router's entry renders the app. Those headless starts load
// this file but no route files, so background work must be defined from here, never from a screen. It comes
// first: if the router's entry ever threw in a headless start, the tasks would still be defined (a task that's
// missing when Android starts it gets unregistered).
import './src/background';

import 'expo-router/entry';
