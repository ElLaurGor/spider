import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, H, Row, SpiderSays, Stepper, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { lookupBarcode, type Product } from '@/lib/food-db';
import { useStore } from '@/lib/store';

type Phase = { kind: 'scanning' } | { kind: 'loading'; code: string } | { kind: 'found'; product: Product } | { kind: 'missing'; code: string } | { kind: 'error'; message: string };

export default function ScanScreen() {
  const { actions, quip } = useStore();
  const { day } = useLocalSearchParams<{ day?: string }>(); // a past day being fixed on Fuel
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>({ kind: 'scanning' });
  const [grams, setGrams] = useState(100);
  const [line, setLine] = useState('');
  const handled = useRef(false); // the camera fires many events per barcode

  const onScan = async ({ data }: BarcodeScanningResult) => {
    if (handled.current) return;
    handled.current = true;
    setPhase({ kind: 'loading', code: data });
    try {
      const product = await lookupBarcode(data);
      if (!product) {
        setPhase({ kind: 'missing', code: data });
        return;
      }
      setGrams(product.servingG ?? 100);
      setLine(quip('barcodeFound', { product: product.name, kcal: product.kcal100 }));
      setPhase({ kind: 'found', product });
    } catch {
      setPhase({ kind: 'error', message: 'Lookup failed. Check your internet and try again.' });
    }
  };

  const again = () => {
    handled.current = false;
    setPhase({ kind: 'scanning' });
  };

  if (!permission) return <View style={styles.fill} />;
  if (!permission.granted) {
    return (
      <View style={[styles.fill, { padding: 24, justifyContent: 'center', gap: 14 }]}>
        <T>📷 I need the camera to read barcodes.</T>
        <Btn label="Allow camera" icon="photo_camera" onPress={requestPermission} />
      </View>
    );
  }

  if (phase.kind === 'scanning' || phase.kind === 'loading') {
    return (
      <View style={styles.fill}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={phase.kind === 'scanning' ? onScan : undefined}
        />
        <View style={styles.overlay}>
          <View style={styles.frame} />
          <Text style={styles.hint}>{phase.kind === 'loading' ? `Looking up ${phase.code}…` : 'Point at the barcode on the package'}</Text>
          {phase.kind === 'loading' ? <ActivityIndicator color={C.red} size="large" /> : null}
        </View>
      </View>
    );
  }

  if (phase.kind !== 'found') {
    return (
      <View style={[styles.fill, { padding: 24, justifyContent: 'center', gap: 14 }]}>
        <SpiderSays
          text={
            phase.kind === 'missing'
              ? `Barcode ${phase.code} isn't in the food database. Even the internet doesn't know what you're eating. Log it by hand.`
              : phase.message
          }
        />
        <Btn label="Scan again" icon="refresh" onPress={again} />
        <Btn label="Back" kind="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const p = phase.product;
  const kcal = Math.round((p.kcal100 * grams) / 100);
  const protein = Math.round((p.protein100 * grams) / 10) / 10;

  return (
    <ScrollView style={styles.fill} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Card accent={C.green}>
        <H>Found it</H>
        <Text style={styles.name}>{p.name}</Text>
        <T dim small mono>
          per 100 g: {p.kcal100} kcal · {p.protein100} g protein
          {p.servingG ? ` · serving ${p.servingG} g` : ''}
        </T>
        <Row style={{ justifyContent: 'space-between' }}>
          <T>How much?</T>
          <Stepper value={grams} onChange={setGrams} step={grams >= 100 ? 25 : 5} min={5} max={2000} format={(v) => `${v} g`} />
        </Row>
        <Row style={{ justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.big}>{kcal}</Text>
            <T dim small>
              kcal
            </T>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.big, { color: C.green }]}>{protein}</Text>
            <T dim small>
              g protein
            </T>
          </View>
        </Row>
        <Btn
          label="Log it"
          icon="add"
          onPress={() => {
            actions.addFood({ name: `${p.name} (${grams} g)`, kcal, protein: Math.round(protein) }, day);
            router.back();
          }}
        />
        <Btn label="Scan something else" kind="ghost" onPress={again} />
      </Card>
      {line ? <SpiderSays text={line} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 18, pointerEvents: 'none' },
  frame: { width: 260, height: 160, borderRadius: 18, borderWidth: 3, borderColor: C.red },
  hint: { color: C.text, fontWeight: '700', backgroundColor: '#000000AA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  name: { color: C.text, fontSize: 20, fontWeight: '800' },
  big: { color: C.text, fontSize: 32, fontWeight: '900', fontFamily: MONO },
});
