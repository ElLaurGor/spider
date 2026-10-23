import type { AndroidSymbol } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpiderAvatar } from '@/components/spider-avatar';
import { C, MONO, RADIUS } from '@/constants/theme';

export function Icon({ name, size = 22, color = C.text }: { name: AndroidSymbol; size?: number; color?: string }) {
  return <SymbolView name={{ android: name, web: name }} size={size} tintColor={color} />;
}

/** Re-renders every `ms` while `active` (and until `until`, if given), returning the current time. */
export function useNow(ms = 1000, active = true, until?: number) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      if (until !== undefined && n >= until) clearInterval(interval);
    };
    const first = setTimeout(tick, 0);
    interval = setInterval(tick, ms);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [ms, active, until]);
  return now;
}

export function Screen({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 40, gap: 14 }}
      keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  return <View style={[styles.card, accent ? { borderColor: accent } : null, style]}>{children}</View>;
}

export function H({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.hRow}>
      <Text style={styles.h}>{children}</Text>
      {right}
    </View>
  );
}

export function T({
  children,
  dim,
  small,
  mono,
  style,
}: {
  children: ReactNode;
  dim?: boolean;
  small?: boolean;
  mono?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[{ color: dim ? C.dim : C.text, fontSize: small ? 13 : 15, lineHeight: small ? 18 : 21 }, mono && { fontFamily: MONO }, style]}>
      {children}
    </Text>
  );
}

export function Big({ children, color = C.text, size = 34 }: { children: ReactNode; color?: string; size?: number }) {
  return <Text style={{ color, fontSize: size, fontWeight: '800', fontFamily: MONO, letterSpacing: -1 }}>{children}</Text>;
}

type BtnKind = 'primary' | 'blue' | 'ghost' | 'danger';
const BTN_BG: Record<BtnKind, string> = { primary: C.red, blue: C.blue, ghost: C.card2, danger: C.redDim };

/** What an icon-only button says to a screen reader. */
const ICON_LABEL: Partial<Record<AndroidSymbol, string>> = {
  undo: 'Undo the last one',
  add: 'Add',
  barcode_scanner: 'Scan a barcode',
  photo_camera: 'Take a photo',
  photo_library: 'Pick a photo',
  refresh: 'Refresh',
  close: 'Close',
};

export function Btn({
  label,
  a11yLabel,
  onPress,
  icon,
  kind = 'primary',
  small,
  disabled,
  style,
}: {
  label?: string;
  /** For a screen reader; defaults to the label, or to what the icon means. */
  a11yLabel?: string;
  onPress: () => void;
  icon?: AndroidSymbol;
  kind?: BtnKind;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label ?? (icon ? (ICON_LABEL[icon] ?? icon.replace(/_/g, ' ')) : undefined)}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: BTN_BG[kind], opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        kind === 'ghost' && { borderWidth: 1, borderColor: C.border },
        small && { paddingVertical: 8, paddingHorizontal: 12 },
        style,
      ]}>
      {icon ? <Icon name={icon} size={small ? 18 : 20} color={kind === 'danger' ? C.red : C.text} /> : null}
      {label ? <Text style={[styles.btnText, small && { fontSize: 14 }, kind === 'danger' && { color: C.red }]}>{label}</Text> : null}
    </Pressable>
  );
}

export function Bar({ pct, color = C.red, height = 8 }: { pct: number; color?: string; height?: number }) {
  const p = Math.max(0, Math.min(1, pct));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: C.card2, overflow: 'hidden' }}>
      <View style={{ width: `${p * 100}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function Row({ children, gap = 10, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Chip({ label, onPress, active, color = C.red }: { label: string; onPress?: () => void; active?: boolean; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: color, borderColor: color },
        pressed && { opacity: 0.7 },
      ]}>
      <Text style={{ color: active ? '#fff' : C.text, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={C.faint} {...props} style={[styles.field, props.style]} />;
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 99999,
  format = (v: number) => String(v),
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  return (
    <Row gap={6}>
      <Pressable onPress={() => set(value - step)} style={styles.stepBtn} hitSlop={6}>
        <Icon name="remove" size={18} />
      </Pressable>
      <Text style={styles.stepVal}>{format(value)}</Text>
      <Pressable onPress={() => set(value + step)} style={styles.stepBtn} hitSlop={6}>
        <Icon name="add" size={18} />
      </Pressable>
    </Row>
  );
}

/** The spider avatar with a speech bubble. */
export function SpiderSays({ text, onPress }: { text: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, pressed && { opacity: 0.85 }]}>
      <SpiderAvatar size={48} />
      <View style={styles.bubble}>
        <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{text}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  title: { color: C.text, fontSize: 28, fontWeight: '900', letterSpacing: 3 },
  subtitle: { color: C.dim, fontSize: 12, letterSpacing: 0.5, marginTop: 2 },
  card: { backgroundColor: C.card, borderRadius: RADIUS, padding: 16, gap: 12, borderWidth: 1, borderColor: C.border },
  hRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h: { color: C.dim, fontSize: 12, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  btnText: { color: C.text, fontSize: 15, fontWeight: '700' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card2,
  },
  field: {
    backgroundColor: C.card2,
    color: C.text,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.border,
  },
  stepVal: { color: C.text, fontFamily: MONO, fontSize: 16, minWidth: 64, textAlign: 'center', fontWeight: '700' },
  bubble: {
    flex: 1,
    backgroundColor: C.card2,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
});
