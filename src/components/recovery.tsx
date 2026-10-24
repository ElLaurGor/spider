import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Card, H, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import type { RecoveryProps } from '@/lib/store';

const when = (t: number) => new Date(t).toLocaleString('sv-SE').slice(0, 16);

/** Shown instead of the app when the saved data is there but can't be read. Nothing is saved until one of these is picked. */
export function Recovery({ message, older, retry, restore, loadOlder, startFresh }: RecoveryProps) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [sure, setSure] = useState(false);

  const act = (fn: () => Promise<unknown>) => async () => {
    setBusy(true);
    setNote(null);
    try {
      await fn();
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 16, paddingBottom: 48, gap: 14 }}>
      <StatusBar style="light" />
      <Text style={{ color: C.text, fontSize: 24, fontWeight: '800' }}>🕷️ Hold on</Text>
      <Card>
        <H>I couldn&apos;t read your saved data</H>
        <T>Nothing has been overwritten. Your logs are still on this phone; I just can&apos;t open them right now.</T>
        <T dim small mono>
          {message}
        </T>
      </Card>

      <Card>
        <T dim small>
          Try again first. If it keeps failing, restore your latest backup.
        </T>
        <Btn label="Try again" icon="refresh" onPress={act(retry)} disabled={busy} />
        <Btn
          label="Restore from backup"
          kind="ghost"
          onPress={act(async () => {
            if (!(await restore())) setNote('No folder picked. Pick the "SPIDER-backup-…" or "SPIDER-auto-backup" folder.');
          })}
          disabled={busy}
        />
        {older ? (
          <>
            <T dim small>
              There&apos;s also a second copy in the older format{older.at ? `, last updated ${when(older.at)}` : ''}. It may be missing your latest entries.
            </T>
            <Btn label="Open the older copy" kind="ghost" onPress={act(loadOlder)} disabled={busy} />
          </>
        ) : null}
      </Card>

      <Card>
        <T dim small>
          Starting fresh saves an empty S.P.I.D.E.R. over the data I can&apos;t read. Only do this if you have no backup.
        </T>
        <Btn label={sure ? 'Yes, start fresh' : 'Start fresh'} kind="danger" onPress={sure ? act(startFresh) : () => setSure(true)} disabled={busy} />
        {sure ? <Btn label="Cancel" kind="ghost" onPress={() => setSure(false)} disabled={busy} /> : null}
      </Card>

      {note ? (
        <View style={{ padding: 12, borderRadius: 10, backgroundColor: C.card2 }}>
          <Text style={{ color: C.text, fontFamily: MONO, fontSize: 13 }}>{note}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
