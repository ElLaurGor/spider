import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PhotoViewer } from '@/components/photo-viewer';
import { Btn, Card, H, Row, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { useStore } from '@/lib/store';
import type { ProgressPhoto } from '@/lib/types';

const fmtDate = (t: number) => new Date(t).toLocaleDateString('sv-SE');

export function ProgressPhotos() {
  const { state, actions } = useStore();
  const [viewing, setViewing] = useState<ProgressPhoto | null>(null);
  const photos = state.progressPhotos;
  const first = photos[0];
  const latest = photos[photos.length - 1];
  const days = first && latest ? Math.round((latest.at - first.at) / 86_400_000) : 0;

  const confirmDelete = (p: ProgressPhoto) =>
    Alert.alert('Delete this photo?', fmtDate(p.at), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => actions.removeProgressPhoto(p.id) },
    ]);

  return (
    <Card>
      <H right={<T dim small>{photos.length} photos</T>}>Progress photos</H>

      {photos.length >= 2 ? (
        <View style={{ gap: 6 }}>
          <Row gap={8}>
            <Shot photo={first} label="Then" onPress={() => setViewing(first)} />
            <Shot photo={latest} label="Now" onPress={() => setViewing(latest)} />
          </Row>
          <T dim small style={{ textAlign: 'center' }}>
            {days} days apart. Same pose, same light, every week = the best comparison.
          </T>
        </View>
      ) : (
        <T dim small>
          {photos.length === 0
            ? 'Take one now and one every week. In a month you will see what the mirror hides.'
            : 'One down. Take another next week and the before/after comparison appears here.'}
        </T>
      )}

      {photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[...photos].reverse().map((p) => (
            <Pressable key={p.id} onPress={() => setViewing(p)} onLongPress={() => confirmDelete(p)}>
              <Image source={{ uri: p.uri }} style={styles.thumb} contentFit="cover" />
              <Text style={styles.thumbDate}>{fmtDate(p.at).slice(5)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <Row>
        <Btn label="Take photo" icon="photo_camera" onPress={() => actions.addProgressPhoto('camera')} style={{ flex: 1 }} />
        <Btn icon="photo_library" kind="ghost" onPress={() => actions.addProgressPhoto('library')} />
      </Row>
      {photos.length > 0 ? (
        <T dim small>
          Long-press a photo to delete it. Photos stay on this phone only.
        </T>
      ) : null}

      <PhotoViewer uri={viewing?.uri ?? null} caption={viewing ? fmtDate(viewing.at) : undefined} onClose={() => setViewing(null)} />
    </Card>
  );
}

function Shot({ photo, label, onPress }: { photo: ProgressPhoto; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <Image source={{ uri: photo.uri }} style={styles.shot} contentFit="cover" />
      <View style={styles.shotLabel}>
        <Text style={styles.shotLabelText}>
          {label} · {fmtDate(photo.at).slice(5)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shot: { width: '100%', aspectRatio: 3 / 4, borderRadius: 12, backgroundColor: C.card2 },
  shotLabel: { position: 'absolute', left: 6, bottom: 6, backgroundColor: '#000000AA', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  shotLabelText: { color: C.text, fontSize: 12, fontWeight: '700' },
  thumb: { width: 64, height: 85, borderRadius: 8, backgroundColor: C.card2 },
  thumbDate: { color: C.dim, fontSize: 10, textAlign: 'center', marginTop: 2 },
});
