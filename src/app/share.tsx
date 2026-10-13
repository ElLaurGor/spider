import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Btn, Card, H, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { importPhoto } from '@/lib/photos';
import { useStore } from '@/lib/store';

/** A title for a task from shared text: the page title if the other app sent one, else the first line. */
function taskTitle(text: string | null, url: string | null, title?: string | null) {
  const first = (title || text || url || '').split('\n').map((x) => x.trim()).find(Boolean) ?? '';
  const short = first.length > 120 ? `${first.slice(0, 117)}…` : first;
  return url && !short.includes(url) ? `${short || 'Link'} · ${url}` : short;
}

/** Something shared from another app (Android's share sheet → S.P.I.D.E.R., APK 1.4.0+). */
export default function ShareScreen() {
  const { actions, say } = useStore();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const [busy, setBusy] = useState(false);

  const image = shareIntent.files?.find((f) => f.mimeType?.startsWith('image/'));
  const text = shareIntent.text?.trim() || null;
  const url = shareIntent.webUrl || null;
  const title = taskTitle(text, url, shareIntent.meta?.title);

  const done = (to: '/' | '/plan' = '/') => {
    resetShareIntent();
    router.replace(to);
  };

  const asTask = (prefix = '') => {
    if (!title) return;
    actions.addTask(prefix + title);
    done('/plan');
  };

  const asPhoto = async (kind: 'meal' | 'progress') => {
    if (!image) return;
    setBusy(true);
    try {
      const saved = await importPhoto(kind, image.path);
      resetShareIntent();
      if (kind === 'meal') {
        router.replace({ pathname: '/fuel', params: { photo: saved } });
      } else {
        actions.addProgressPhotoFrom(saved);
        router.replace('/');
      }
    } catch {
      say("Couldn't save that picture. Try sharing it again.", 'bad');
      setBusy(false);
    }
  };

  if (!hasShareIntent) {
    return (
      <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={styles.page}>
        <Card>
          <H>Nothing here</H>
          <T dim small>
            Share text, a link or a picture from another app and pick S.P.I.D.E.R. It lands here.
          </T>
          <Btn label="Back to HQ" kind="ghost" onPress={() => done()} />
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={styles.page}>
      {image ? (
        <Card accent={C.green}>
          <H>A picture</H>
          <View style={styles.imageWrap}>
            <Image source={{ uri: image.path }} style={styles.image} contentFit="cover" />
          </View>
          <Btn label="Log as a meal" icon="restaurant" onPress={() => asPhoto('meal')} disabled={busy} />
          <Btn label="Save as progress photo" icon="photo_camera" kind="ghost" onPress={() => asPhoto('progress')} disabled={busy} />
        </Card>
      ) : null}

      {title ? (
        <Card accent={C.blue}>
          <H>{url ? 'A link' : 'Some text'}</H>
          <T style={{ color: C.text }}>{title}</T>
          <Btn label="Add as a task" icon="task_alt" onPress={() => asTask()} />
          <Btn label="Read later" icon="menu_book" kind="ghost" onPress={() => asTask('📖 ')} />
        </Card>
      ) : null}

      {!image && !title ? (
        <Card>
          <H>Can&apos;t use this one</H>
          <T dim small>
            S.P.I.D.E.R. takes text, links and pictures. This was something else.
          </T>
        </Card>
      ) : null}

      <Btn label="Cancel" kind="ghost" onPress={() => done()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, paddingBottom: 48 },
  imageWrap: { borderRadius: 12, overflow: 'hidden', backgroundColor: C.card2 },
  image: { width: '100%', aspectRatio: 1 },
});
