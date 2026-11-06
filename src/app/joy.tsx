import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Btn, Card, Chip, Field, H, Icon, Row, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { JOY_CHARS, JOY_MAX, JOY_SIZES, joyOf, liftText, sizeLabel } from '@/lib/joy';
import { useStore } from '@/lib/store';
import type { JoyItem, JoySize } from '@/lib/types';

/**
 * step 9 care: the joy menu (joy.ts). Small things that reliably lift her, each 2 min, 15 min or 1 h, some
 * tagged social. Offered after a low check-in; the count is how often a try helped. No XP, never a quest.
 */
export default function JoyMenu() {
  const { state, actions } = useStore();
  const items = joyOf(state).items;
  const [title, setTitle] = useState('');
  const [size, setSize] = useState<JoySize>(15);
  const [social, setSocial] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const add = () => {
    if (!title.trim()) return;
    actions.addJoy({ title, size, social });
    setTitle('');
    setSocial(false);
  };
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Card accent={C.green}>
        <H>🌼 Joy menu</H>
        <T dim small>
          A short list of small things that reliably lift you. After a low check-in I offer one that fits your energy, to do now or book into a free slot. Afterwards one
          tap says whether it helped. No XP, nothing to keep up.
        </T>
        {items.length === 0 ? (
          <T dim small>
            Nothing on it yet. Ideas: call Mia, bake something, the Djurgården loop, one song with headphones on.
          </T>
        ) : null}
        {items.map((x) => (
          <JoyRow key={x.id} item={x} open={editing === x.id} onToggle={() => setEditing(editing === x.id ? null : x.id)} />
        ))}
      </Card>
      {items.length < JOY_MAX ? (
        <Card>
          <H>Add one</H>
          <Field value={title} onChangeText={setTitle} placeholder="e.g. call Mia" maxLength={JOY_CHARS} onSubmitEditing={add} returnKeyType="done" />
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {JOY_SIZES.map((z) => (
              <Chip key={z.min} label={z.label} active={size === z.min} color={C.green} onPress={() => setSize(z.min)} />
            ))}
            <Chip label="👥 Social" active={social} color={C.purple} onPress={() => setSocial(!social)} />
          </Row>
          <Btn label="Add to the menu" icon="add" onPress={add} disabled={!title.trim()} />
        </Card>
      ) : null}
    </ScrollView>
  );
}

function JoyRow({ item, open, onToggle }: { item: JoyItem; open: boolean; onToggle: () => void }) {
  const { actions } = useStore();
  const [title, setTitle] = useState(item.title);
  return (
    <View style={{ gap: 8 }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <Pressable onPress={onToggle} style={{ flex: 1, gap: 2 }} accessibilityRole="button" accessibilityHint="Tap to change it">
          <T>
            {item.title}
            {item.social ? ' 👥' : ''}
          </T>
          <T dim small>
            {sizeLabel(item.size)} · {liftText(item)}
          </T>
        </Pressable>
        <Pressable onPress={() => actions.removeJoy(item.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${item.title}`}>
          <Icon name="close" size={18} color={C.faint} />
        </Pressable>
      </Row>
      {open ? (
        <View style={{ gap: 8, paddingLeft: 8 }}>
          <Row>
            <Field value={title} onChangeText={setTitle} maxLength={JOY_CHARS} style={{ flex: 1 }} />
            <Btn icon="check" small disabled={!title.trim() || title.trim() === item.title} onPress={() => actions.editJoy(item.id, { title })} />
          </Row>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {JOY_SIZES.map((z) => (
              <Chip key={z.min} label={z.label} active={item.size === z.min} color={C.green} onPress={() => actions.editJoy(item.id, { size: z.min })} />
            ))}
            <Chip label="👥 Social" active={!!item.social} color={C.purple} onPress={() => actions.editJoy(item.id, { social: !item.social })} />
          </Row>
        </View>
      ) : null}
    </View>
  );
}
