// Backups go into a folder the user picks (Android's folder picker), as
// "SPIDER-backup-<date>/data.json" plus a "photos" folder. Restoring = picking
// that folder again.
// Automatic daily backups go into one "SPIDER-auto-backup" folder in a folder picked once:
// "data-<date>.json" files (the last 7, plus the newest of each of the 5 weeks before) and a shared "photos" folder that only gets new
// photos (and, on Sundays, loses the ones no kept file needs). Restoring = picking that
// "SPIDER-auto-backup" folder; the newest readable file wins.
// "Send backup" shares one "SPIDER-backup-<date>.json" (the data, no photos) through the share sheet,
// for Drive or mail; restoring from such a file picks the file itself.
import { Directory, File, Paths } from 'expo-file-system';

import { autoBackupsToPrune, orphanPhotos, pickBackup, skipAutoBackup } from './backup-pick';
import { hydrate } from './defaults';
import type { State } from './types';

type BackupFile = { app: 'spider'; version: 1; createdAt: number; photos: Record<string, string>; state: State };

const AUTO_DIR = 'SPIDER-auto-backup';
const AUTO_FILE = /^data-.+\.json$/;

const localPhotos = () => new Directory(Paths.document, 'photos');

/** A copy of raw saved data in the app's own files, outside AsyncStorage (written before the storage layout changes). */
export function keepCopy(name: string, text: string) {
  const f = new File(Paths.document, name);
  if (!f.exists) f.create();
  f.write(text);
}

const MIME: Record<string, string> = { png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', gif: 'image/gif' };
/** The type a photo is written with. A wrong one makes Android's folder storage append ".jpg", so the name no longer matches. */
const mimeFor = (name: string) => MIME[name.toLowerCase().split('.').pop() ?? ''] ?? 'image/jpeg';

/** A backup file's contents, or null when it can't be read (cut off mid-write) or isn't ours. */
async function readBackupFile(f: File): Promise<Partial<BackupFile> | null> {
  try {
    const data = JSON.parse(await f.text()) as Partial<BackupFile>;
    return data.app === 'spider' && data.state && typeof data.state.days === 'object' ? data : null;
  } catch {
    return null;
  }
}

const autoFilesIn = (dir: Directory) =>
  dir
    .list()
    .filter((e): e is File => e instanceof File && AUTO_FILE.test(e.name))
    .sort((a, b) => (a.name < b.name ? -1 : 1));

function photoUris(s: State) {
  const uris = s.progressPhotos.map((p) => p.uri);
  for (const d of Object.values(s.days)) for (const f of d.food) if (f.photo) uris.push(f.photo);
  return uris;
}

async function pickFolder() {
  try {
    return await Directory.pickDirectoryAsync();
  } catch {
    return null; // cancelled
  }
}

const stampNow = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

export async function createBackup(state: State): Promise<{ folder: string; photos: number } | null> {
  const parent = await pickFolder();
  if (!parent) return null;
  const stamp = stampNow();
  const folder = parent.createDirectory(`SPIDER-backup-${stamp}`);
  const photoDir = folder.createDirectory('photos');

  const names: Record<string, string> = {};
  for (const uri of photoUris(state)) {
    const src = new File(uri);
    if (!src.exists) continue;
    photoDir.createFile(src.name, mimeFor(src.name)).write(await src.bytes());
    names[uri] = src.name;
  }

  const data: BackupFile = { app: 'spider', version: 1, createdAt: Date.now(), photos: names, state };
  folder.createFile('data.json', 'application/json').write(JSON.stringify(data));
  return { folder: folder.name, photos: Object.keys(names).length };
}


/** Asks for the folder automatic backups go into. Android keeps the permission across restarts. */
export async function pickAutoBackupFolder(): Promise<{ uri: string; name: string } | null> {
  const dir = await pickFolder();
  return dir ? { uri: dir.uri, name: dir.name } : null;
}

const childDir = (parent: Directory, name: string) =>
  parent.list().find((e): e is Directory => e instanceof Directory && e.name === name) ?? parent.createDirectory(name);

/**
 * Writes today's automatic backup into the saved folder. Throws if the folder or its permission is gone.
 * `skipped`: nothing was written or pruned, because this phone holds far fewer days than the fullest kept
 * backup (a wiped phone must not push the good backups out of the folder).
 */
export async function autoBackup(state: State, folderUri: string, now = new Date()): Promise<{ photos: number; skipped?: boolean }> {
  const parent = new Directory(folderUri);
  if (!parent.exists) throw new Error('Backup folder is gone');
  const dir = childDir(parent, AUTO_DIR);
  const counts = await Promise.all(autoFilesIn(dir).map(async (f) => (await readBackupFile(f))?.state?.days));
  const sizes = counts.flatMap((days) => (days ? [Object.keys(days).length] : []));
  if (skipAutoBackup(sizes.length ? Math.max(...sizes) : null, Object.keys(state.days).length)) return { photos: 0, skipped: true };
  const photoDir = childDir(dir, 'photos');
  const have = new Set(photoDir.list().map((e) => e.name));

  const names: Record<string, string> = {};
  let added = 0;
  for (const uri of photoUris(state)) {
    const src = new File(uri);
    if (!src.exists) continue;
    if (!have.has(src.name)) {
      photoDir.createFile(src.name, mimeFor(src.name)).write(await src.bytes());
      have.add(src.name);
      added++;
    }
    names[uri] = src.name;
  }

  const data: BackupFile = { app: 'spider', version: 1, createdAt: Date.now(), photos: names, state };
  dir.createFile(`data-${stampNow()}.json`, 'application/json').write(JSON.stringify(data));

  const prune = autoBackupsToPrune(autoFilesIn(dir).map((f) => f.name));
  for (const old of autoFilesIn(dir)) if (prune.includes(old.name)) old.delete();
  // Once a week the photos folder sheds what no kept backup points to, so deleted photos don't pile up forever.
  if (now.getDay() === 0) {
    const kept = await Promise.all(autoFilesIn(dir).map(async (f) => (await readBackupFile(f))?.photos ?? null));
    const gone = orphanPhotos([...have], kept) ?? [];
    for (const e of photoDir.list()) if (e instanceof File && gone.includes(e.name)) e.delete();
  }
  return { photos: added };
}

/** Writes a one-file backup (the data, no photos) where the share sheet can pick it up, and returns its uri. */
export function shareableBackup(state: State): string {
  for (const e of Paths.cache.list()) if (e instanceof File && /^SPIDER-backup-.+\.json$/.test(e.name)) e.delete(); // the last one sent
  const data: BackupFile = { app: 'spider', version: 1, createdAt: Date.now(), photos: {}, state };
  const f = new File(Paths.cache, `SPIDER-backup-${stampNow()}.json`);
  f.create();
  f.write(JSON.stringify(data));
  return f.uri;
}

/**
 * Restores from one backup file (a sent "SPIDER-backup-….json", or a "data….json" out of a backup folder). It
 * carries no photos: the ones still on this phone stay linked, the rest drop out. Null when nothing was picked.
 */
export async function readBackupFromFile(): Promise<{ state: State; createdAt: number; photos: number } | null> {
  const picked = await File.pickFileAsync({ mimeTypes: '*/*' }).catch(() => null);
  if (!picked || picked.canceled) return null;
  const data = await readBackupFile(picked.result);
  if (!data?.state) throw new Error("That isn't a S.P.I.D.E.R. backup, or it's damaged.");
  const here = (uri?: string) => !!uri && new File(uri).exists;
  const s = data.state;
  const days = Object.fromEntries(
    Object.entries(s.days).map(([k, d]) => [k, { ...d, food: d.food.map((f) => ({ ...f, photo: here(f.photo) ? f.photo : undefined })) }]),
  );
  const progressPhotos = (s.progressPhotos ?? []).filter((p) => here(p.uri));
  const photos = progressPhotos.length + Object.values(days).reduce((a, d) => a + d.food.filter((f) => f.photo).length, 0);
  return { state: hydrate({ ...s, days, progressPhotos }), createdAt: data.createdAt ?? 0, photos };
}

/** Reads a backup folder and copies its photos back into the app. Doesn't apply the state. */
export async function readBackup(): Promise<{ state: State; createdAt: number; photos: number } | null> {
  const dir = await pickFolder();
  if (!dir) return null;
  const entries = dir.list();
  // A manual backup has data.json; the automatic folder has dated files: the newest that reads and isn't a
  // near-empty copy wins (a cut-off write or a post-wipe backup falls back to the one before).
  const manual = entries.find((e): e is File => e instanceof File && e.name === 'data.json');
  const autoFiles = autoFilesIn(dir);
  if (!manual && !autoFiles.length) throw new Error('No backup in that folder. Pick the "SPIDER-backup-…" or "SPIDER-auto-backup" folder itself.');
  let data: Partial<BackupFile> | null;
  if (manual) {
    data = await readBackupFile(manual);
    if (!data) throw new Error("That isn't a S.P.I.D.E.R. backup, or it's damaged.");
  } else {
    const read = await Promise.all(autoFiles.map(async (f) => ({ name: f.name, data: await readBackupFile(f) })));
    const name = pickBackup(read.map((x) => ({ name: x.name, days: x.data?.state ? Object.keys(x.data.state.days).length : null })));
    data = read.find((x) => x.name === name)?.data ?? null;
    if (!data) throw new Error("None of the backups in that folder could be read.");
  }
  if (!data.state) throw new Error("That isn't a S.P.I.D.E.R. backup.");

  const photoDir = entries.find((e): e is Directory => e instanceof Directory && e.name === 'photos');
  const backed = new Map((photoDir?.list() ?? []).filter((e): e is File => e instanceof File).map((f) => [f.name, f]));
  const local = localPhotos();
  if (!local.exists) local.create({ intermediates: true });

  const remap = new Map<string, string>();
  for (const [oldUri, name] of Object.entries(data.photos ?? {})) {
    const src = backed.get(name);
    if (!src) continue;
    // Read first: if the backup's copy can't be read, the photo on the phone is still there.
    const bytes = await src.bytes();
    const dest = new File(local, name);
    if (dest.exists) dest.delete();
    dest.write(bytes);
    remap.set(oldUri, dest.uri);
  }

  const s = data.state;
  const days = Object.fromEntries(
    Object.entries(s.days).map(([k, d]) => [k, { ...d, food: d.food.map((f) => ({ ...f, photo: f.photo ? remap.get(f.photo) : undefined })) }]),
  );
  const progressPhotos = (s.progressPhotos ?? []).flatMap((p) => (remap.has(p.uri) ? [{ ...p, uri: remap.get(p.uri)! }] : []));
  return { state: hydrate({ ...s, days, progressPhotos }), createdAt: data.createdAt ?? 0, photos: remap.size };
}
