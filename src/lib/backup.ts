// Backups go into a folder the user picks (Android's folder picker), as
// "SPIDER-backup-<date>/data.json" plus a "photos" folder. Restoring = picking
// that folder again.
// Automatic weekly backups (cluster F) go into one "SPIDER-auto-backup" folder in a folder picked
// once: "data-<date>.json" files (the newest few kept) and a shared "photos" folder that only
// gets new photos. Restoring = picking that "SPIDER-auto-backup" folder; the newest file wins.
import { Directory, File, Paths } from 'expo-file-system';

import { AUTO_BACKUPS_KEPT } from './backup-due';
import { hydrate } from './defaults';
import type { State } from './types';

type BackupFile = { app: 'spider'; version: 1; createdAt: number; photos: Record<string, string>; state: State };

const localPhotos = () => new Directory(Paths.document, 'photos');

const mimeFor = (name: string) => (name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');

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

const AUTO_DIR = 'SPIDER-auto-backup';
const AUTO_FILE = /^data-.+\.json$/;

/** Asks for the folder automatic backups go into. Android keeps the permission across restarts. */
export async function pickAutoBackupFolder(): Promise<{ uri: string; name: string } | null> {
  const dir = await pickFolder();
  return dir ? { uri: dir.uri, name: dir.name } : null;
}

const childDir = (parent: Directory, name: string) =>
  parent.list().find((e): e is Directory => e instanceof Directory && e.name === name) ?? parent.createDirectory(name);

/** Writes this week's automatic backup into the saved folder. Throws if the folder or its permission is gone. */
export async function autoBackup(state: State, folderUri: string): Promise<{ photos: number }> {
  const parent = new Directory(folderUri);
  if (!parent.exists) throw new Error('Backup folder is gone');
  const dir = childDir(parent, AUTO_DIR);
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

  const files = dir
    .list()
    .filter((e): e is File => e instanceof File && AUTO_FILE.test(e.name))
    .sort((a, b) => (a.name < b.name ? -1 : 1));
  for (const old of files.slice(0, Math.max(0, files.length - AUTO_BACKUPS_KEPT))) old.delete();
  return { photos: added };
}

/** Reads a backup folder and copies its photos back into the app. Doesn't apply the state. */
export async function readBackup(): Promise<{ state: State; createdAt: number; photos: number } | null> {
  const dir = await pickFolder();
  if (!dir) return null;
  const entries = dir.list();
  // A manual backup has data.json; the automatic folder has dated files, of which the newest wins.
  const autoFiles = entries.filter((e): e is File => e instanceof File && AUTO_FILE.test(e.name)).sort((a, b) => (a.name < b.name ? 1 : -1));
  const dataFile = entries.find((e): e is File => e instanceof File && e.name === 'data.json') ?? autoFiles[0];
  if (!dataFile) throw new Error('No backup in that folder. Pick the "SPIDER-backup-…" or "SPIDER-auto-backup" folder itself.');
  const data = JSON.parse(await dataFile.text()) as Partial<BackupFile>;
  if (data.app !== 'spider' || !data.state) throw new Error("That isn't a S.P.I.D.E.R. backup.");

  const photoDir = entries.find((e): e is Directory => e instanceof Directory && e.name === 'photos');
  const backed = new Map((photoDir?.list() ?? []).filter((e): e is File => e instanceof File).map((f) => [f.name, f]));
  const local = localPhotos();
  if (!local.exists) local.create({ intermediates: true });

  const remap = new Map<string, string>();
  for (const [oldUri, name] of Object.entries(data.photos ?? {})) {
    const src = backed.get(name);
    if (!src) continue;
    const dest = new File(local, name);
    if (dest.exists) dest.delete();
    dest.write(await src.bytes());
    remap.set(oldUri, dest.uri);
  }

  const s = data.state;
  const days = Object.fromEntries(
    Object.entries(s.days).map(([k, d]) => [k, { ...d, food: d.food.map((f) => ({ ...f, photo: f.photo ? remap.get(f.photo) : undefined })) }]),
  );
  const progressPhotos = (s.progressPhotos ?? []).flatMap((p) => (remap.has(p.uri) ? [{ ...p, uri: remap.get(p.uri)! }] : []));
  return { state: hydrate({ ...s, days, progressPhotos }), createdAt: data.createdAt ?? 0, photos: remap.size };
}
