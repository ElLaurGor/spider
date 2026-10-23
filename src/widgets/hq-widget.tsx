'use no memo'; // react-native-android-widget calls these as plain functions; compiled ones would call hooks

// The home-screen widget (APK 1.5.0+): today's water, coffee and gaming time, with "+1 glass" and "+1 coffee"
// that work without opening the app. Drawn by react-native-android-widget from a snapshot (lib/widget-data.ts);
// tapping anywhere else opens S.P.I.D.E.R. Only loaded where the widget module exists (widgets/index.ts).
import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import { widgetLines, type WidgetSnapshot } from '@/lib/widget-data';

export const HQ_WIDGET = 'Hq'; // the name in app.json's react-native-android-widget plugin

const hex = (c: string) => c as ColorProp;

function Stat({ emoji, value, color }: { emoji: string; value: string; color: string }) {
  return (
    <FlexWidget style={{ flex: 1, flexDirection: 'column', alignItems: 'center' }}>
      <TextWidget text={emoji} style={{ fontSize: 16 }} />
      <TextWidget text={value} style={{ fontSize: 14, fontWeight: 'bold', color: hex(color) }} maxLines={1} />
    </FlexWidget>
  );
}

function Button({ action, label, color, card }: { action: string; label: string; color: string; card: string }) {
  return (
    <FlexWidget
      clickAction={action}
      accessibilityLabel={label}
      style={{ flex: 1, height: 36, borderRadius: 12, backgroundColor: hex(card), alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 }}>
      <TextWidget text={label} style={{ fontSize: 14, fontWeight: 'bold', color: hex(color) }} />
    </FlexWidget>
  );
}

/** Before the app has written its first snapshot. */
export function OpenOnce() {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', justifyContent: 'center', alignItems: 'center', backgroundColor: hex('#07090F'), borderRadius: 20, padding: 10 }}>
      <TextWidget text="🕷️ S.P.I.D.E.R." style={{ fontSize: 14, fontWeight: 'bold', color: hex('#E23636') }} />
      <TextWidget text="Open me once and I'll fill this in." style={{ fontSize: 12, color: hex('#8A93A6') }} />
    </FlexWidget>
  );
}

export function HqWidget({ snap }: { snap: WidgetSnapshot }) {
  const c = snap.colors;
  const lines = widgetLines(snap);
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`S.P.I.D.E.R.: water ${lines.water}, coffee ${lines.coffee}, gaming ${lines.game}`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: hex(c.bg),
        borderRadius: 20,
        borderWidth: 1,
        borderColor: hex(c.accent),
        padding: 10,
      }}>
      <TextWidget text="🕷️ S.P.I.D.E.R." style={{ fontSize: 12, fontWeight: 'bold', color: hex(c.accent) }} />
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Stat emoji="💧" value={lines.water} color={c.water} />
        <Stat emoji="☕" value={lines.coffee} color={c.coffee} />
        <Stat emoji="🎮" value={lines.game} color={c.game} />
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row' }}>
        <Button action="GLASS" label="+1 glass" color={c.water} card={c.card} />
        <Button action="COFFEE" label="+1 coffee" color={c.coffee} card={c.card} />
      </FlexWidget>
    </FlexWidget>
  );
}
