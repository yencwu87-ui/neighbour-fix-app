import React from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
  type TextInputProps, type ViewStyle, type StyleProp,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, space, useColors } from '../lib/theme';

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const c = useColors();
  const body = <View style={{ padding: space.lg, gap: space.lg, paddingBottom: 48 }}>{children}</View>;
  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">{body}</ScrollView> : body}
    </SafeAreaView>
  );
}

export function Title({ children, sub }: { children: React.ReactNode; sub?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '800', color: c.ink, letterSpacing: -0.3 }}>{children}</Text>
      {sub ? <Text style={{ fontSize: 15, color: c.muted, lineHeight: 21 }}>{sub}</Text> : null}
    </View>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: React.ReactNode; muted?: boolean; style?: object }) {
  const c = useColors();
  return <Text style={[{ fontSize: 15, lineHeight: 21, color: muted ? c.muted : c.ink }, style]}>{children}</Text>;
}

export function Small({ children, color }: { children: React.ReactNode; color?: string }) {
  const c = useColors();
  return <Text style={{ fontSize: 13, lineHeight: 18, color: color ?? c.muted }}>{children}</Text>;
}

export function Card({ children, highlight, style }: { children: React.ReactNode; highlight?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[{ backgroundColor: c.card, borderRadius: radius.md, borderWidth: highlight ? 2 : StyleSheet.hairlineWidth * 2,
      borderColor: highlight ? c.accent : c.line, padding: space.lg, gap: space.sm }, style]}>{children}</View>
  );
}

export function Button({ title, onPress, kind = 'primary', disabled, busy, small }: {
  title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; busy?: boolean; small?: boolean;
}) {
  const c = useColors();
  const bg = kind === 'primary' ? c.accent : 'transparent';
  const fg = kind === 'primary' ? c.onAccent : kind === 'danger' ? c.crit : c.accent;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled || busy} onPress={onPress}
      style={({ pressed }) => ({ minHeight: small ? 36 : 48, paddingHorizontal: small ? 12 : 18, borderRadius: radius.sm,
        backgroundColor: bg, borderWidth: 1, borderColor: kind === 'danger' ? c.crit : c.accent, alignItems: 'center',
        justifyContent: 'center', opacity: disabled ? 0.45 : pressed ? 0.75 : 1, flexDirection: 'row', gap: 8 })}>
      {busy ? <ActivityIndicator color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '600', fontSize: small ? 14 : 16 }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: '600', fontSize: 14, color: c.ink }}>{label}{hint ? <Text style={{ fontWeight: '400', color: c.muted }}>  {hint}</Text> : null}</Text>
      <TextInput placeholderTextColor={c.muted} {...props}
        style={[{ minHeight: props.multiline ? 96 : 48, borderWidth: 1, borderColor: c.line, borderRadius: radius.sm, paddingHorizontal: 12,
          paddingVertical: 10, fontSize: 16, color: c.ink, backgroundColor: c.bg, textAlignVertical: props.multiline ? 'top' : 'center' }, props.style]} />
    </View>
  );
}

export function Chips<T extends string>({ label, options, value, onChange, labels }: {
  label?: string; options: readonly T[]; value: T | null; onChange: (v: T) => void; labels?: Partial<Record<T, string>>;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{ fontWeight: '600', fontSize: 14, color: c.ink }}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = o === value;
          return (
            <Pressable key={o} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onChange(o)}
              style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: 'center',
                borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accentSoft : c.card }}>
              <Text style={{ color: c.ink, fontWeight: on ? '600' : '400', fontSize: 14 }}>{labels?.[o] ?? o}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function MultiChips({ label, options, values, onChange }: { label?: string; options: readonly string[]; values: string[]; onChange: (v: string[]) => void }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{ fontWeight: '600', fontSize: 14, color: c.ink }}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const on = values.includes(o);
          return (
            <Pressable key={o} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => onChange(on ? values.filter((x) => x !== o) : [...values, o])}
              style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: 'center',
                borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accentSoft : c.card }}>
              <Text style={{ color: c.ink, fontWeight: on ? '600' : '400', fontSize: 14 }}>{on ? '✓ ' : ''}{o}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.accent, false: c.line }} />
      <Text style={{ flex: 1, color: c.ink, fontSize: 15, lineHeight: 20 }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ text, tone = 'accent' }: { text: string; tone?: 'accent' | 'brass' | 'plain' | 'good' | 'warn' | 'crit' }) {
  const c = useColors();
  const map = {
    accent: [c.accentSoft, c.accent], brass: [c.brassSoft, c.brass], plain: ['transparent', c.line],
    good: ['transparent', c.good], warn: ['transparent', c.warn], crit: ['transparent', c.crit],
  } as const;
  const [bg, border] = map[tone];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: tone === 'plain' ? c.muted : tone === 'accent' || tone === 'brass' ? c.ink : border }}>{text}</Text>
    </View>
  );
}

export function ExampleTag() { return <Badge text="Example" tone="brass" />; }

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Line({ left, right, strong }: { left: string; right: string; strong?: boolean }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 3,
      borderTopWidth: strong ? 1 : 0, borderTopColor: c.line, marginTop: strong ? 4 : 0, paddingTop: strong ? 8 : 3 }}>
      <Text style={{ flex: 1, color: c.ink, fontSize: strong ? 16 : 15, fontWeight: strong ? '700' : '400' }}>{left}</Text>
      <Text style={{ color: c.ink, fontSize: strong ? 16 : 15, fontWeight: strong ? '700' : '500', fontVariant: ['tabular-nums'] }}>{right}</Text>
    </View>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, borderRadius: radius.md, padding: space.xl, alignItems: 'center' }}>
      <Text style={{ color: c.muted, textAlign: 'center', fontSize: 15, lineHeight: 21 }}>{children}</Text>
    </View>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone = status === 'done' ? 'good' : status === 'new' ? 'warn' : status === 'cancelled' ? 'plain' : 'accent';
  const label = { new: 'New', matched: 'Matched', quoted: 'Quoted', done: 'Done', cancelled: 'Cancelled' }[status] ?? status;
  return <Badge text={label} tone={tone} />;
}

export function Notice({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'crit' | 'good' }) {
  const c = useColors();
  const color = tone === 'crit' ? c.crit : tone === 'good' ? c.good : c.muted;
  return <Text style={{ color, fontSize: 14, lineHeight: 20 }} accessibilityLiveRegion="polite">{children}</Text>;
}
