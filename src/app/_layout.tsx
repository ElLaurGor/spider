import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AutoUpdate } from '@/components/auto-update';
import { ToastHost } from '@/components/toast';
import { C } from '@/constants/theme';
import { StoreProvider } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

const SpiderTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.card, primary: C.red, text: C.text, border: C.border },
};

export default function RootLayout() {
  return (
    <StoreProvider>
      <ThemeProvider value={SpiderTheme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="settings"
            options={{
              headerShown: true,
              title: 'Settings',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="mood"
            options={{
              headerShown: true,
              title: 'Mood',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="report"
            options={{
              headerShown: true,
              title: 'Report card',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="scan"
            options={{
              headerShown: true,
              title: 'Scan barcode',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="cycle"
            options={{
              headerShown: true,
              title: 'Cycle',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="wrapped"
            options={{
              headerShown: true,
              title: 'Wrapped',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="insights"
            options={{
              headerShown: true,
              title: 'Insights',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="shop"
            options={{
              headerShown: true,
              title: 'Shop',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="league"
            options={{
              headerShown: true,
              title: 'League',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="records"
            options={{
              headerShown: true,
              title: 'Hall of Fame',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="focus"
            options={{
              headerShown: true,
              title: 'Web Focus',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="breathe"
            options={{
              headerShown: true,
              title: 'Breathe',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="body"
            options={{
              headerShown: true,
              title: 'Body',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="outside"
            options={{
              headerShown: true,
              title: 'Outside',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="heart"
            options={{
              headerShown: true,
              title: 'Heart rate',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="flies"
            options={{
              headerShown: true,
              title: 'Fly collection',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="sleep"
            options={{
              headerShown: true,
              title: 'Sleep',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="diary"
            options={{
              headerShown: true,
              title: 'Secret diary',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="webs"
            options={{
              headerShown: true,
              title: 'Web gallery',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="bestiary"
            options={{
              headerShown: true,
              title: 'Bestiary',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="perks"
            options={{
              headerShown: true,
              title: 'Abilities',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="debrief"
            options={{
              headerShown: true,
              title: 'Evening debrief',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="movement"
            options={{
              headerShown: true,
              title: 'Movement',
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        </Stack>
        <ToastHost />
        <AutoUpdate />
      </ThemeProvider>
    </StoreProvider>
  );
}
