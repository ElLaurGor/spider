import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { C } from '@/constants/theme';

/** Full-screen photo; tap anywhere to close. */
export function PhotoViewer({ uri, caption, onClose }: { uri: string | null; caption?: string; onClose: () => void }) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {uri ? <Image source={{ uri }} style={styles.image} contentFit="contain" /> : null}
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000F0', alignItems: 'center', justifyContent: 'center', padding: 12 },
  image: { width: '100%', height: '85%' },
  caption: { color: C.text, marginTop: 12, fontSize: 14 },
});
