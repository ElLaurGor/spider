import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { mailBanner, mailBannerKey, MAMMA, unreadMail } from '@/lib/mail';
import { useStore } from '@/lib/store';

/** step 9 story: HQ's banner for an unread letter (mail.ts). Closed with ×, that letter's banner stays closed. */
export function MailBanner() {
  const { state, actions } = useStore();
  const letter = mailBanner(state);
  if (!letter) return null;
  const more = unreadMail(state).length - 1;
  const from = letter.from === 'mamma' ? `${MAMMA.name} in Småland` : letter.sender;
  return (
    <Pressable onPress={() => router.push('/mail')} style={styles.banner} accessibilityRole="button" accessibilityLabel={`Open the mailbox: a letter from ${from}`}>
      <Text style={{ fontSize: 26 }}>📬</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.title}>
          {letter.emoji} A letter from {from}
        </Text>
        <T dim small>
          {letter.subject}
          {more > 0 ? ` · and ${more} more` : ''}
        </T>
      </View>
      <Pressable onPress={() => actions.dismissBanner(mailBannerKey(letter))} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide the letter banner">
        <Icon name="close" size={18} color={C.faint} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 16, borderWidth: 1.5, borderColor: C.cyan, padding: 14 },
  title: { color: C.text, fontSize: 15, fontWeight: '800' },
});
