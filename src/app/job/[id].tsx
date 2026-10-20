import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { QuoteView } from '../../components/QuoteView';
import { Body, Button, Card, Chips, ExampleTag, Field, H2, Line, Notice, Row, Screen, Small, StatusPill, Title, Toggle } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { fetchPros, fetchSettings, nearbyPros, useQuery } from '../../lib/data';
import { commission, money, quoteTotals } from '../../lib/money';
import { supabase } from '../../lib/supabase';
import { radius, useColors } from '../../lib/theme';
import type { FeeLine, JobRequest, LabourLine, MaterialLine, Quote, Status } from '../../lib/types';

// Admins match the job and build the quote. The assigned pro can build the quote and mark the job done.
export default function JobScreen() {
  const c = useColors();
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [job, setJob] = useState<JobRequest | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const pros = useQuery(fetchPros);
  const settings = useQuery(fetchSettings);

  const [callout, setCallout] = useState('');
  const [labour, setLabour] = useState<{ desc: string; amount: string }[]>([{ desc: '', amount: '' }]);
  const [materials, setMaterials] = useState<{ item: string; spec: string; qty: string; unit: string; receipt: boolean }[]>([]);
  const [markup, setMarkup] = useState('');
  const [fees, setFees] = useState<FeeLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'crit' | 'good' } | null>(null);

  async function load() {
    const { data, error } = await supabase.from('requests').select('*').eq('id', id).maybeSingle();
    if (error || !data) { setErr('This job could not be found, or you don\'t have access to it.'); return; }
    const j = data as JobRequest;
    setJob(j);
    const q = j.quote;
    if (q) {
      setCallout(String(q.callout || ''));
      setLabour(q.labour.length ? q.labour.map((l) => ({ desc: l.desc, amount: String(l.amount) })) : [{ desc: '', amount: '' }]);
      setMaterials(q.materials.map((m) => ({ item: m.item, spec: m.spec, qty: String(m.qty), unit: String(m.unit), receipt: m.receipt })));
      setMarkup(q.markup ?? ''); setFees(q.fees ?? []);
    }
  }
  useEffect(() => { load(); }, [id]);

  const s = settings.data;
  const feeOptions: (FeeLine & { on: boolean })[] = useMemo(() => {
    const out: (FeeLine & { on: boolean })[] = [];
    if (s && Number(s.customer_fee) > 0) out.push({ key: 'booking', label: s.customer_fee_label || 'Booking and job guarantee', amount: Number(s.customer_fee), on: s.customer_fee_on });
    if (s && Number(s.emergency_fee) > 0) out.push({ key: 'emergency', label: 'Emergency priority', amount: Number(s.emergency_fee), on: !!job?.urgency.startsWith('Emergency') });
    return out;
  }, [s, job?.urgency]);
  useEffect(() => { if (job && !job.quote && fees.length === 0) setFees(feeOptions.filter((f) => f.on).map(({ key, label, amount }) => ({ key, label, amount }))); }, [feeOptions, job]);

  if (err) return <Screen><Body muted>{err}</Body></Screen>;
  if (!job) return <Screen><Body muted>Loading…</Body></Screen>;

  const draft: Quote = {
    callout: Number(callout) || 0,
    labour: labour.filter((l) => l.desc || l.amount).map<LabourLine>((l) => ({ desc: l.desc.trim(), amount: Number(l.amount) || 0 })),
    materials: materials.filter((m) => m.item).map<MaterialLine>((m) => ({ item: m.item.trim(), spec: m.spec.trim(), qty: Number(m.qty) || 0, unit: Number(m.unit) || 0, receipt: m.receipt })),
    fees, markup: markup.trim(), commission_pct: Number(s?.commission_pct) || 0,
  };
  const t = quoteTotals(draft);
  const suggested = nearbyPros(pros.data ?? [], job.category, job.area);
  const others = (pros.data ?? []).filter((p) => p.kind !== 'supplier' && !suggested.includes(p));

  async function update(patch: Partial<JobRequest>, ok: string) {
    setBusy(true); setMsg(null);
    const { error } = await supabase.from('requests').update(patch).eq('id', job!.id);
    setBusy(false);
    if (error) { setMsg({ text: error.message, tone: 'crit' }); return; }
    setMsg({ text: ok, tone: 'good' }); load();
  }

  const statusOptions: Status[] = isAdmin ? ['new', 'matched', 'quoted', 'done', 'cancelled'] : ['matched', 'quoted', 'done'];
  const box = { flex: 1, minHeight: 44, borderWidth: 1, borderColor: c.line, borderRadius: radius.sm, paddingHorizontal: 10, color: c.ink, fontSize: 16, backgroundColor: c.bg } as const;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}><Title>{`${job.job_name ?? job.category}, ${job.area}`}</Title><StatusPill status={job.status} /></Row>
      {job.example ? <ExampleTag /> : null}
      <Card>
        <Body>{job.description}</Body>
        <Small>{job.name}, {job.urgency}{job.phone ? `, WhatsApp ${job.phone}` : ''}{job.budget ? `, budget ${money(job.budget)}` : ''}</Small>
        {job.own_materials ? <Small>Customer will supply materials.</Small> : null}
        {job.estimate ? <Small>Planner estimate: {money(job.estimate.low)}–{money(job.estimate.high)}</Small> : null}
      </Card>

      {isAdmin ? (
        <Card>
          <H2>Assign a checked pro</H2>
          {suggested.length === 0 ? <Small>No checked {job.category.toLowerCase()} pro covers {job.area} yet. Pick from all pros below or recruit one.</Small> : null}
          {[...suggested, ...others].map((p) => {
            const on = job.pro_id === p.id;
            return (
              <Pressable key={p.id} onPress={() => update({ pro_id: p.id, status: job.status === 'new' ? 'matched' : job.status }, `Matched with ${p.name}`)}
                accessibilityRole="radio" accessibilityState={{ selected: on }}
                style={{ minHeight: 44, borderRadius: radius.sm, borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accentSoft : 'transparent', padding: 10 }}>
                <Text style={{ color: c.ink, fontWeight: on ? '700' : '500' }}>{p.name}{suggested.includes(p) ? ' (suggested)' : ''}</Text>
                <Small>{p.trade}, covers {(p.areas ?? []).join(', ')}{p.example ? ', example' : ''}</Small>
              </Pressable>
            );
          })}
        </Card>
      ) : null}

      <Card>
        <H2>Itemised quote</H2>
        <Field label="Call-out fee (S$)" value={callout} onChangeText={setCallout} keyboardType="decimal-pad" />
        <Small>Labour</Small>
        {labour.map((l, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <TextInput style={[box, { flex: 3 }]} placeholder="Replace tap cartridge" placeholderTextColor={c.muted} value={l.desc} onChangeText={(v) => setLabour((x) => x.map((y, k) => (k === i ? { ...y, desc: v } : y)))} accessibilityLabel="Labour item" />
            <TextInput style={box} placeholder="S$" placeholderTextColor={c.muted} keyboardType="decimal-pad" value={l.amount} onChangeText={(v) => setLabour((x) => x.map((y, k) => (k === i ? { ...y, amount: v } : y)))} accessibilityLabel="Labour amount" />
            <Button title="✕" kind="ghost" small onPress={() => setLabour((x) => x.filter((_, k) => k !== i))} />
          </View>
        ))}
        <Button title="Add labour line" kind="ghost" small onPress={() => setLabour((x) => [...x, { desc: '', amount: '' }])} />
        <Small>Materials{job.own_materials ? ' (customer supplies; add lines only if asked to buy)' : ''}</Small>
        {materials.map((m, i) => {
          const set = (k: 'item' | 'spec' | 'qty' | 'unit') => (v: string) => setMaterials((x) => x.map((y, n) => (n === i ? { ...y, [k]: v } : y)));
          return (
            <View key={i} style={{ gap: 6, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.line }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TextInput style={[box, { flex: 2 }]} placeholder="Basin mixer tap" placeholderTextColor={c.muted} value={m.item} onChangeText={set('item')} accessibilityLabel="Part" />
                <TextInput style={[box, { flex: 2 }]} placeholder="Brand, model, size" placeholderTextColor={c.muted} value={m.spec} onChangeText={set('spec')} accessibilityLabel="Brand or size" />
              </View>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <TextInput style={box} placeholder="Qty" placeholderTextColor={c.muted} keyboardType="decimal-pad" value={m.qty} onChangeText={set('qty')} accessibilityLabel="Quantity" />
                <TextInput style={box} placeholder="S$ each" placeholderTextColor={c.muted} keyboardType="decimal-pad" value={m.unit} onChangeText={set('unit')} accessibilityLabel="Unit price" />
                <Button title="✕" kind="ghost" small onPress={() => setMaterials((x) => x.filter((_, n) => n !== i))} />
              </View>
              <Toggle label="Receipt or price label shared with customer" value={m.receipt} onChange={(v) => setMaterials((x) => x.map((y, n) => (n === i ? { ...y, receipt: v } : y)))} />
            </View>
          );
        })}
        <Button title="Add material line" kind="ghost" small onPress={() => setMaterials((x) => [...x, { item: '', spec: '', qty: '1', unit: '', receipt: false }])} />
        <Field label="Materials policy shown to customer" value={markup} onChangeText={setMarkup} placeholder="At cost, plus S$10 handling" />
        {isAdmin && feeOptions.length ? (
          <View style={{ gap: 4 }}>
            <Small>Fees shown to the customer</Small>
            {feeOptions.map((f) => (
              <Toggle key={f.key} label={`${f.label} (${money(f.amount)})`} value={fees.some((x) => x.key === f.key)}
                onChange={(v) => setFees((x) => (v ? [...x.filter((y) => y.key !== f.key), { key: f.key, label: f.label, amount: f.amount }] : x.filter((y) => y.key !== f.key)))} />
            ))}
          </View>
        ) : null}
        <Line left="Labour incl. call-out" right={money(t.labour + t.callout)} />
        <Line left="Materials" right={money(t.materials)} />
        {t.fees ? <Line left="Customer fees" right={money(t.fees)} /> : null}
        <Line left="Total for the customer" right={money(t.total)} strong />
        {isAdmin ? <Small>Commission from the pro: {money(commission(draft, Number(s?.commission_pct) || 0))}</Small> : null}
        <Button title="Save and send quote" busy={busy} onPress={() => update({ quote: draft, status: job.status === 'done' ? 'done' : 'quoted' }, 'Quote saved. The customer can see it under My jobs.')} />
        <Small>Message the customer on WhatsApp too, so they know it's ready.</Small>
      </Card>

      <Chips label="Job status" options={statusOptions} value={job.status as Status}
        labels={{ new: 'New', matched: 'Matched', quoted: 'Quoted', done: 'Done', cancelled: 'Cancelled' }}
        onChange={(st) => update({ status: st }, 'Status updated')} />
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      {job.quote ? <Card><H2>What the customer sees</H2><QuoteView quote={job.quote} ownMaterials={job.own_materials} /></Card> : null}
      {job.rating ? <Card><H2>Customer rating</H2><Body>{job.rating} ★{job.review ? `: ${job.review}` : ''}</Body></Card> : null}
      <Button title="Back" kind="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
