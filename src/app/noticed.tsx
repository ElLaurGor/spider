import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, H, Row, SpiderSays, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { fillLine } from '@/lib/lines';
import { GROUPS, REMARKS, remarksFound, type Group } from '@/lib/remarks';
import { useStore } from '@/lib/store';

/**
 * step 9 story: "Things I've noticed" (remarks.ts). Each remark was said once, at its moment, and is kept here.
 * The ones not found yet stay hidden: no hints, no checklist to grind.
 */
export default function NoticedScreen() {
  const { state } = useStore();
  const found = remarksFound(state);
  const waiting = REMARKS.filter((r) => state.remarks?.[r.id]?.wait).length;
  const name = state.settings.userName || 'boss';
  const groups = (Object.keys(GROUPS) as Group[]).map((g) => ({ g, items: found.filter((x) => x.remark.group === g) })).filter((x) => x.items.length);

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <SpiderSays
        text={
          found.length
            ? `${found.length} of ${REMARKS.length} things noticed. Each one I only say once, so I wrote them down.`
            : "Nothing noticed yet. I'm watching, though. Some things only happen once, and I'll say so when they do."
        }
      />
      {waiting ? (
        <T dim small>
          {waiting} more noticed on a gentler day, saved for a better one.
        </T>
      ) : null}
      {groups.map(({ g, items }) => (
        <Card key={g}>
          <H right={<T dim small>{items.length}</T>}>
            {GROUPS[g].emoji} {GROUPS[g].name}
          </H>
          {items.map((x) => (
            <Row key={x.remark.id} style={{ alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 14, width: 22 }}>👁️</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <T>{fillLine(x.text, { name })}</T>
                <Text style={styles.when}>{new Date(x.at).toLocaleDateString('sv-SE')}</Text>
              </View>
            </Row>
          ))}
        </Card>
      ))}
      <T dim small style={{ textAlign: 'center' }}>
        {REMARKS.length - found.length - waiting} still to happen.
      </T>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  when: { color: C.dim, fontFamily: MONO, fontSize: 11 },
});
