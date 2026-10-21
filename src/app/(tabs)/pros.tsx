import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Badge, Body, Button, Card, Chips, Empty, ExampleTag, H2, Line, Notice, Row, Small, Title } from '../../components/ui';
import { KeyboardDoneBar } from '../../components/ui';
import { AREAS } from '../../lib/catalog';
import { fetchPros, fetchProStats, useQuery } from '../../lib/data';
import { money } from '../../lib/money';
import { space, useColors } from '../../lib/theme';

const KINDS = ['All', 'Repairs', 'Furniture & design', 'JB suppliers'] as const;
type Kind = (typeof KINDS)[number];
const KIND_MAP: Record<Kind, string | null> = { All: null, Repairs: 'repair', 'Furniture & design': 'design', 'JB suppliers': 'supplier' };

export default function Pros() {
  const c = useColors();
  const router = useRouter();
  const [kind, setKind] = useState<Kind>('All');
  const [area, setArea] = useState<string | null>(null);
  const pros = useQuery(fetchPros);
  const stats = useQuery(fetchProStats);

  const list = (pros.data ?? [])
    .filter((p) => !KIND_MAP[kind] || p.kind === KIND_MAP[kind])
    .filter((p) => !area || p.kind === 'supplier' || (p.areas ?? []).includes(area))
    .sort((a, b) => (stats.data?.[b.id]?.rating ?? 0) - (stats.data?.[a.id]?.rating ?? 0));

  return (
    <><KeyboardDoneBar /><ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={pros.loading} onRefresh={() => { pros.reload(); stats.reload(); }} tintColor={c.accent} />}>
      <Title sub="Every licence below was checked by us on the date shown. Price ranges are labour only, before materials.">Checked pros near you</Title>
      <Chips options={KINDS} value={kind} onChange={setKind} />
      <Chips label="Near" options={['Anywhere', ...AREAS] as string[]} value={area ?? 'Anywhere'} onChange={(v) => setArea(v === 'Anywhere' ? null : v)} />
      {pros.error ? <Notice tone="crit">{pros.error}</Notice> : null}
      {!pros.loading && list.length === 0 ? <Empty>No checked pros here yet. Try another area, or join as a pro below.</Empty> : null}

      {list.map((p) => {
        const s = stats.data?.[p.id];
        return (
          <Card key={p.id}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Row><H2>{p.name}</H2>{p.example ? <ExampleTag /> : null}</Row>
                <Small>{p.trade}{p.kind === 'supplier' ? '' : `, covers ${(p.areas ?? []).join(', ')}`}</Small>
              </View>
              <Small>{s?.rating ? `★ ${s.rating}, ${s.jobs} jobs` : 'New'}</Small>
            </Row>
            <Row>
              {p.kind === 'supplier' ? <Badge text={`Supplier in ${p.origin || 'Johor Bahru'}${p.delivers ? ', delivers to SG' : ', pickup only'}`} tone="brass" />
                : p.licence_type ? <Badge text={`${p.licence_type}, checked ${p.licence_checked ?? ''}`} />
                : <Badge text="No licence needed, references checked" tone="plain" />}
              {p.materials_policy ? <Badge text={`Materials: ${p.materials_policy}`} tone="brass" /> : null}
            </Row>
            {(p.price_ranges ?? []).map((r) => <Line key={r.job} left={r.job} right={`${money(r.low)}–${money(r.high)}`} />)}
            {p.note ? <Body muted>{p.note}</Body> : null}
          </Card>
        );
      })}

      <Card highlight>
        <H2>Are you a handyman or supplier?</H2>
        <Body>Get local jobs in the areas you cover. You pay a referral fee only when a job is completed. We check your licence and references before you're listed.</Body>
        <Button title="Join as a pro" onPress={() => router.push('/join')} />
      </Card>
    </ScrollView></>
  );
}
