import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export type PhotoKind = 'meal' | 'progress';
export type PhotoSource = 'camera' | 'library';

const photoDir = () => new Directory(Paths.document, 'photos');

/**
 * Takes or picks a photo and copies it into the app's own storage (the picker's
 * file lives in a cache Android may clear). Returns the saved file's URI, or
 * null if cancelled or permission was refused.
 */
export async function getPhoto(kind: PhotoKind, source: PhotoSource): Promise<string | null> {
  const perm =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.6,
    allowsEditing: kind === 'progress',
    aspect: kind === 'progress' ? [3, 4] : undefined,
  };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.length) return null;

  const dir = photoDir();
  if (!dir.exists) dir.create({ intermediates: true });
  const ext = result.assets[0].uri.split('.').pop()?.split('?')[0] || 'jpg';
  const saved = new File(dir, `${kind}-${Date.now()}.${ext}`);
  await new File(result.assets[0].uri).copy(saved);
  return saved.uri;
}

/** Copies a file another app shared (it lives in a cache that gets cleared) into the app's own storage. */
export async function importPhoto(kind: PhotoKind, uri: string): Promise<string> {
  const dir = photoDir();
  if (!dir.exists) dir.create({ intermediates: true });
  const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  const saved = new File(dir, `${kind}-${Date.now()}.${/^[a-z0-9]{2,5}$/.test(ext) ? ext : 'jpg'}`);
  await new File(uri).copy(saved);
  return saved.uri;
}

export function deletePhoto(uri: string | undefined) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // already gone
  }
}

export function deleteAllPhotos() {
  try {
    const dir = photoDir();
    if (dir.exists) dir.delete();
  } catch {
    // nothing to delete
  }
}
