// The terrarium full screen, turned sideways (the terrarium round, APK 1.8.0): the same 3D tank as on HQ, filling
// a landscape screen with the status bar hidden. Pinch, double tap, long press and feeding work as they do on HQ;
// ✕ (or back) closes it and the phone goes back to portrait. If 3D gives up here, it just closes.
import * as ScreenOrientation from 'expo-screen-orientation';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Terrarium3D } from '@/components/terrarium-3d';

/** Back to portrait first, then back: HQ's tank is made once the screen has turned (components/terrarium-3d.tsx). */
const close = () => {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
    .catch(() => {})
    .finally(() => (router.canGoBack() ? router.back() : router.replace('/')));
};

export default function TankScreen() {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar hidden />
      <Terrarium3D full onFail={close} onClose={close} />
    </View>
  );
}
