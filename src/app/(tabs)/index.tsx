import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ExampleTag, Row, Screen, Small, Title } from '../../components/ui';
import { JOBS, SIZES, type Size } from '../../lib/catalog';
import { fetchRates, useQuery } from '../../lib/data';
import { money } from '../../lib/money';
import { isConfigured } from '../../lib/supabase';
import { radius, space, useColors } from '../../lib/theme';

export default function Book() {
  const c = useColors();
  const router = useRouter();
  const [size, setSize] = useState<Size>('quick');
  const rates = useQuery(fetchRates);
  const jobs = JOBS.filter((j) => j.size === size);
  const anyExample = jobs.some((j) => rates.data?.[j.id]?.example);

  if (!isConfigured) {
    return (
      <Screen>
        <Title sub="This build has no database connected yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to the .env file, then restart the app. The README explains each step.">Almost ready</Title>
      </Screen>
    );
  }

  const door = (key: Size, label: string, hint: string, urgent?: boolean) => {
    const on = size === key;
    return (
      <Pressable key={key} onPress={() => setSize(key)} accessibilityRole="button" accessibilityState={{ selected: on }}
        style={{ flex: 1, minHeight: 64, borderRadius: radius.md, padding: space.md, gap: 2, borderWidth: 1,
          borderStyle: on ? 'solid' : 'dashed', borderColor: on ? (urgent ? c.crit : c.accent) : c.line, backgroundColor: on && !urgent ? c.accentSoft : 'transparent' }}>
        <Text style={{ fontWeight: '700', fontSize: 15, color: urgent ? c.crit : c.ink }}>{label}</Text>
        <Small>{hint}</Small>
      </Pressable>
    );
  };

  return (
    <Screen>
      <Title sub="From an aircon service to a new toilet bowl to a whole flat. Pick the size of the job, tap what fits, and we match you with one pro we've checked ourselves. You get an itemised quote before any work starts.">What needs doing?</Title>

      {/* The job-size ladder: steps grow taller from quick fix to whole project */}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }} accessibilityRole="tablist">
        {SIZES.map((s) => {
          const on = s.key === size;
          return (
            <Pressable key={s.key} onPress={() => setSize(s.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${s.label}. ${s.hint}`}
              style={{ flex: 1, gap: 6, padding: 10, borderRadius: radius.md, borderWidth: on ? 2 : 1, borderColor: on ? c.accent : c.line, backgroundColor: c.card }}>
              <View style={{ height: s.height, borderRadius: 4, backgroundColor: on ? c.accent : c.accentSoft }} />
              <Text style={{ fontWeight: '700', fontSize: 13, color: c.ink }} numberOfLines={2}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Small>{SIZES.find((s) => s.key === size)?.hint ?? ''}</Small>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {door('adhoc', 'One-off or ad-hoc', 'Moving help, party setup, odd jobs')}
        {door('emergency', 'Emergency', 'Burst pipe, no power, flooding', true)}
      </View>

      <View style={{ gap: 8 }}>
        {jobs.map((j) => {
          const r = rates.data?.[j.id];
          const price = j.go ? 'Open planner' : r ? `${money(r.low)}–${money(r.high)}${j.unit ? ' ' + j.unit : ''}` : 'Quote needed';
          return (
            <Pressable key={j.id} accessibilityRole="button" accessibilityLabel={`${j.name}. ${j.check}. ${price}`}
              onPress={() => (j.go ? router.push(j.go) : router.push({ pathname: '/request', params: { job: j.id } }))}
              style={({ pressed }) => ({ backgroundColor: c.card, borderRadius: radius.md, borderWidth: 1, borderColor: pressed ? c.accent : c.line,
                padding: space.md, gap: 6, minHeight: 64 })}>
              <Text style={{ fontWeight: '600', fontSize: 16, color: c.ink }}>{j.name}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Small>{j.check}</Small>
                <Text style={{ fontVariant: ['tabular-nums'], color: c.ink, fontSize: 13, fontWeight: '600' }}>{price}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {anyExample ? <Row><ExampleTag /><Small>Prices are placeholders until real quotes come in.</Small></Row> : null}
    </Screen>
  );
}
