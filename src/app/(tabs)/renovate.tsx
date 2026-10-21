import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Body, Button, Card, Chips, ExampleTag, H2, Line, Row, Screen, Small, Title } from '../../components/ui';
import { DONE_BAR } from '../../components/ui';
import { AREAS, RENO_TASKS, STEPS } from '../../lib/catalog';
import { fetchPros, fetchRates, tradesOf, useQuery } from '../../lib/data';
import { money } from '../../lib/money';
import { radius, useColors } from '../../lib/theme';

const HOMES = ['HDB 3-room', 'HDB 4-room', 'HDB 5-room', 'Condo', 'Landed'];

export default function Renovate() {
  const c = useColors();
  const router = useRouter();
  const rates = useQuery(fetchRates);
  const pros = useQuery(fetchPros);
  const [home, setHome] = useState('HDB 4-room');
  const [area, setArea] = useState<string>('Bedok');
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [qty, setQty] = useState<Record<string, string>>(Object.fromEntries(RENO_TASKS.map((t) => [t.id, String(t.qty)])));
  const [arranged, setArranged] = useState(false);

  const lines = RENO_TASKS.filter((t) => picked[t.id]).map((t) => ({ ...t, qty: Number(qty[t.id]) || 0 }));
  const plan = useMemo(() => {
    let low = 0, high = 0, missing = 0, example = false;
    const stages = STEPS.map((name, i) => ({ name, lines: lines.filter((l) => l.step === i) })).filter((s) => s.lines.length);
    for (const l of lines) {
      const r = rates.data?.[l.id];
      if (r) { low += r.low * l.qty; high += r.high * l.qty; example = example || r.example; } else missing++;
    }
    return { stages, low, high, missing, example };
  }, [lines, rates.data]);

  const proFor = (trade: string) => (pros.data ?? []).filter((p) => p.kind !== 'supplier' && tradesOf(p).includes(trade.toLowerCase()) && (p.areas ?? []).includes(area))[0];
  const rooms = [...new Set(RENO_TASKS.map((t) => t.room))];

  return (
    <Screen>
      <Title sub="Tick the work you want. We put it in the order trades must work, estimate each line, and suggest one checked pro per trade. You deal with trade pros directly, so there's no design fee.">Plan a renovation</Title>
      <Chips label="Home" options={HOMES} value={home} onChange={setHome} />
      <Chips label="Area" options={AREAS} value={area} onChange={setArea} />

      {rooms.map((room) => (
        <Card key={room}>
          <H2>{room}</H2>
          {RENO_TASKS.filter((t) => t.room === room).map((t) => {
            const on = !!picked[t.id];
            return (
              <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 }}>
                <Pressable onPress={() => { setPicked((p) => ({ ...p, [t.id]: !p[t.id] })); setArranged(false); }} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <Text style={{ color: c.onAccent, fontWeight: '800', fontSize: 14 }}>✓</Text> : null}
                  </View>
                  <Text style={{ flex: 1, color: c.ink, fontSize: 15 }}>{t.label}</Text>
                </Pressable>
                <TextInput inputAccessoryViewID={DONE_BAR} value={qty[t.id]} onChangeText={(v) => { setQty((q) => ({ ...q, [t.id]: v })); setArranged(false); }} keyboardType="decimal-pad"
                  accessibilityLabel={`Quantity for ${t.label}`}
                  style={{ width: 64, minHeight: 40, borderWidth: 1, borderColor: c.line, borderRadius: radius.sm, paddingHorizontal: 8, color: c.ink, fontSize: 16, backgroundColor: c.bg, textAlign: 'right' }} />
                <Small>{t.unit}</Small>
              </View>
            );
          })}
        </Card>
      ))}

      <Button title="Arrange my renovation" onPress={() => setArranged(true)} disabled={lines.length === 0} />

      {arranged && lines.length ? (
        <>
          <Card highlight>
            <H2>Your plan: {home}, {area}</H2>
            <Line left="Estimated total" right={`${money(plan.low)}–${money(plan.high)}`} strong />
            {plan.missing ? <Small>{plan.missing} line{plan.missing > 1 ? 's need' : ' needs'} a quote before it can be estimated.</Small> : null}
            {plan.example ? <Row><ExampleTag /><Small>Rates are placeholders, not market prices. Real quotes replace them.</Small></Row> : null}
            <Small>HDB flats need a renovation permit for some works and HDB-registered contractors for others. Check HDB's renovation guidelines before work starts.</Small>
          </Card>
          {plan.stages.map((s, i) => (
            <Card key={s.name}>
              <H2>Stage {i + 1}: {s.name}</H2>
              {s.lines.map((l) => {
                const r = rates.data?.[l.id];
                return <Line key={l.id} left={`${l.label} (${l.qty} ${l.unit})`} right={r ? `${money(r.low * l.qty)}–${money(r.high * l.qty)}` : 'Quote needed'} />;
              })}
              {[...new Set(s.lines.map((l) => l.trade))].map((tr) => {
                const p = proFor(tr);
                return <Small key={tr}>{tr}: {p ? `${p.name}${p.licence_type ? `, ${p.licence_type} checked` : ''}` : 'no checked pro in this area yet'}</Small>;
              })}
            </Card>
          ))}
          <Button title="Get real quotes for this plan" onPress={() => router.push({ pathname: '/request', params: {
            job: 'renovation',
            desc: `${home}: ` + lines.map((l) => `${l.label}, ${l.qty} ${l.unit}`).join('; '),
            scope: JSON.stringify(lines.map((l) => ({ id: l.id, label: l.label, trade: l.trade, qty: l.qty, unit: l.unit }))),
            estimate: JSON.stringify({ low: plan.low, high: plan.high }),
          } })} />
          <Body muted>Each pro sends an itemised quote, with labour and materials listed separately.</Body>
        </>
      ) : null}
    </Screen>
  );
}
