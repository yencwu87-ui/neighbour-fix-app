import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Body, Button, Card, Empty, ExampleTag, Field, H2, Line, Row, Screen, Small, Title } from '../../components/ui';
import { fetchSettings, useQuery } from '../../lib/data';
import { money } from '../../lib/money';
import { supabase } from '../../lib/supabase';
import { useColors } from '../../lib/theme';

type PriceStat = { category: string; jobs: number; labour_median: number; materials_median: number; total_low: number; total_high: number; includes_examples: boolean };
type MatStat = { item: string; times: number; unit_low: number; unit_high: number };

export default function Prices() {
  const c = useColors();
  const router = useRouter();
  const settings = useQuery(fetchSettings);
  const prices = useQuery(async () => ((await supabase.rpc('price_stats')).data ?? []) as PriceStat[]);
  const mats = useQuery(async () => ((await supabase.rpc('material_stats')).data ?? []) as MatStat[]);
  const s = settings.data;
  const booking = s && Number(s.customer_fee) > 0 && s.customer_fee_on;

  return (
    <Screen>
      <Title sub="Every fee shows on your quote as its own line, next to labour and materials.">Plans and prices</Title>

      <Card highlight>
        <Row><H2>Home care plan</H2>{s?.example ? <ExampleTag /> : null}</Row>
        <Body style={{ fontSize: 22, fontWeight: '800' }}>{s?.plan_price ? `${money(s.plan_price)} a year` : 'Price coming soon'}</Body>
        {(s?.plan_includes ?? []).map((i) => <Body key={i}>• {i}</Body>)}
        <Small>Visits booked for you, by the same checked pros, at one yearly price.</Small>
        <Button title="Ask about the plan" onPress={() => router.push({ pathname: '/request', params: { job: 'care-plan' } })} />
      </Card>
      <Card>
        <Row><H2>Renovation coordination</H2>{s?.example ? <ExampleTag /> : null}</Row>
        <Body>{s?.reno_fee || 'Fee set per project'}</Body>
        <Small>We plan the trades, collect itemised quotes and keep the job on schedule. You deal with trade pros directly, so there's no design fee.</Small>
        <Button title="Plan a renovation" kind="ghost" onPress={() => router.push('/renovate')} />
      </Card>
      <Card>
        <H2>Single jobs</H2>
        <Body>{booking ? `${money(s!.customer_fee)} ${(s!.customer_fee_label ?? 'booking fee').toLowerCase()}` : 'No booking fee during our trial'}</Body>
        <Small>You pay the pro's itemised quote.{s?.emergency_fee ? ` Emergency jobs add ${money(s.emergency_fee)} for priority.` : ''}</Small>
      </Card>

      <View style={{ gap: 8 }}>
        <H2>What neighbours paid</H2>
        <Small>From completed jobs, with labour and materials shown apart.</Small>
        {(prices.data ?? []).length === 0 ? <Empty>No completed jobs yet. Prices appear here once the first jobs are done.</Empty> : (
          <Card>
            {prices.data!.map((p) => (
              <View key={p.category} style={{ gap: 2, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: c.line }}>
                <Line left={`${p.category} (${p.jobs} jobs)`} right={`${money(p.total_low)}–${money(p.total_high)}`} />
                <Small>Typical labour {money(p.labour_median)}, typical materials {money(p.materials_median)}</Small>
              </View>
            ))}
            {prices.data!.some((p) => p.includes_examples) ? <Row><ExampleTag /><Small>Includes example jobs until real ones replace them.</Small></Row> : null}
          </Card>
        )}
      </View>

      {(mats.data ?? []).length ? (
        <Card>
          <H2>Common parts, reference prices</H2>
          <Small>From receipts on completed jobs. If a quote's part costs far more, ask for the receipt.</Small>
          {mats.data!.map((m) => <Line key={m.item} left={`${m.item} (${m.times}×)`} right={`${money(m.unit_low)}–${money(m.unit_high)}`} />)}
        </Card>
      ) : null}

      <LandedCost />
    </Screen>
  );
}

function LandedCost() {
  const [rm, setRm] = useState('');
  const [fx, setFx] = useState('');
  const [ship, setShip] = useState('');
  const [inst, setInst] = useState('');
  const [gst, setGst] = useState('9');
  const [sg, setSg] = useState('');
  const n = (v: string) => Number(v) || 0;
  const goods = n(rm) * n(fx);
  const tax = ((goods + n(ship)) * n(gst)) / 100;
  const total = goods + n(ship) + tax + n(inst);
  const diff = n(sg) ? n(sg) - total : null;
  const c = useColors();
  return (
    <Card>
      <H2>Is buying in JB cheaper?</H2>
      <Small>A JB price only wins once exchange, transport, GST and installation are added. Use real quotes.</Small>
      <Field label="JB price (RM)" value={rm} onChangeText={setRm} keyboardType="decimal-pad" />
      <Field label="S$ per RM today" hint="Check your bank or money changer" value={fx} onChangeText={setFx} keyboardType="decimal-pad" placeholder="0.30" />
      <Field label="Transport and delivery (S$)" value={ship} onChangeText={setShip} keyboardType="decimal-pad" />
      <Field label="Installation or assembly in SG (S$)" value={inst} onChangeText={setInst} keyboardType="decimal-pad" />
      <Field label="GST on import (%)" hint="9% is the prevailing rate" value={gst} onChangeText={setGst} keyboardType="decimal-pad" />
      <Field label="Same item bought in Singapore (S$)" value={sg} onChangeText={setSg} keyboardType="decimal-pad" />
      {goods > 0 ? (
        <View>
          <Line left="Goods in S$" right={money(goods)} />
          <Line left="Transport" right={money(n(ship))} />
          <Line left="GST estimate" right={money(tax)} />
          <Line left="Installation" right={money(n(inst))} />
          <Line left="Landed in your home" right={money(total)} strong />
          {diff !== null ? <Body style={{ color: diff > 0 ? c.good : c.crit, fontWeight: '700' }}>{diff > 0 ? `JB saves you ${money(diff)}` : `Singapore is cheaper by ${money(-diff)}`}</Body> : null}
        </View>
      ) : <Small>Enter a JB price and exchange rate to compare.</Small>}
      <Small>GST here is worked on goods plus transport, as an estimate. Personal-use relief is small (up to S$100 for a trip under 48 hours) and you must declare the full value at the checkpoint. Bringing goods in to resell needs a UEN, a Customs account and an import permit through a declaring agent.</Small>
    </Card>
  );
}
