import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Body, Button, Card, Chips, Empty, ExampleTag, Field, H2, Notice, Row, Small, StatusPill, Title, Toggle } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { commission, money, quoteTotals } from '../../lib/money';
import { supabase } from '../../lib/supabase';
import { radius, space, useColors } from '../../lib/theme';
import type { Application, JobRequest, Settings } from '../../lib/types';

const FILTERS = ['Open', 'New', 'Matched', 'Quoted', 'Done'] as const;
type Filter = (typeof FILTERS)[number];

export default function Board() {
  const c = useColors();
  const router = useRouter();
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [filter, setFilter] = useState<Filter>('Open');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (profile?.role !== 'admin') return;
    setLoading(true);
    const [r, a, s] = await Promise.all([
      supabase.from('requests').select('*').order('created_at', { ascending: false }),
      supabase.from('applications').select('*').eq('status', 'pending').order('created_at'),
      supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
    ]);
    setLoading(false);
    setJobs((r.data ?? []) as JobRequest[]);
    setApps((a.data ?? []) as Application[]);
    setSettings((s.data as Settings | null) ?? null);
  }, [profile?.role]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (profile?.role !== 'admin') return <View style={{ flex: 1, backgroundColor: c.bg, padding: space.lg }}><Body muted>This page is for the Neighbour Fix team.</Body></View>;

  const done = jobs.filter((j) => j.status === 'done' && j.quote);
  const pct = Number(settings?.commission_pct) || 0;
  const com = done.reduce((a, j) => a + commission(j.quote, pct), 0);
  const fees = done.reduce((a, j) => a + quoteTotals(j.quote).fees, 0);
  const shown = jobs.filter((j) => (filter === 'Open' ? !['done', 'cancelled'].includes(j.status) : j.status === filter.toLowerCase()));

  return (
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.accent} />}>
      <Title sub="Approve pros, match jobs and send itemised quotes.">Board</Title>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[
          [String(done.length), 'Jobs done'], [money(com), `Commission at ${pct}%`], [money(fees), 'Customer fees'], [money(com + fees), 'Your earnings'],
        ].map(([v, l]) => (
          <View key={l} style={{ flexGrow: 1, flexBasis: '45%', backgroundColor: c.card, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, padding: space.md }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: c.ink, fontVariant: ['tabular-nums'] }}>{v}</Text>
            <Small>{l}</Small>
          </View>
        ))}
      </View>
      {done.some((j) => j.example) ? <Row><ExampleTag /><Small>Includes example jobs.</Small></Row> : null}

      {apps.length ? (
        <View style={{ gap: space.sm }}>
          <H2>Pros waiting for your check ({apps.length})</H2>
          {apps.map((a) => <ApplicationCard key={a.id} app={a} onDone={load} />)}
        </View>
      ) : null}

      <Chips options={FILTERS} value={filter} onChange={setFilter} />
      {shown.length === 0 ? <Empty>Nothing here. New requests land in Open.</Empty> : shown.map((j) => (
        <Pressable key={j.id} onPress={() => router.push({ pathname: '/job/[id]', params: { id: j.id } })} accessibilityRole="button"
          style={({ pressed }) => ({ backgroundColor: c.card, borderRadius: radius.md, borderWidth: 1, borderColor: pressed ? c.accent : c.line, padding: space.md, gap: 4 })}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '600', fontSize: 16, color: c.ink, flex: 1 }}>{j.job_name ?? j.category}, {j.area}</Text>
            <StatusPill status={j.status} />
          </Row>
          <Small>{j.name}, {j.urgency}{j.budget ? `, budget ${money(j.budget)}` : ''}{j.own_materials ? ', own materials' : ''}</Small>
          <Small>{j.description.slice(0, 120)}</Small>
          {j.example ? <ExampleTag /> : null}
        </Pressable>
      ))}

      {settings ? <FeeSettings s={settings} onSaved={load} /> : null}
    </ScrollView>
  );
}

function ApplicationCard({ app, onDone }: { app: Application; onDone: () => void }) {
  const [lic, setLic] = useState(false);
  const [refs, setRefs] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function approve() {
    setBusy(true);
    const { error } = await supabase.rpc('approve_application', { app_id: app.id, licence_checked: lic, references_checked: refs });
    setBusy(false);
    if (error) setMsg(error.message); else onDone();
  }
  async function decline() {
    const { error } = await supabase.from('applications').update({ status: 'declined', reviewed_at: new Date().toISOString() }).eq('id', app.id);
    if (error) setMsg('Couldn\'t save. Try again.'); else onDone();
  }
  return (
    <Card>
      <H2>{app.name}, {app.trade}</H2>
      <Small>Covers {app.areas.join(', ')}. WhatsApp {app.phone}{app.years ? `. ${app.years} years` : ''}</Small>
      <Small>Licence: {app.licence_type ? `${app.licence_type}${app.licence_no ? ' ' + app.licence_no : ''}` : 'none given'}. Reviews: {app.reviews || 'none given'}</Small>
      {app.prices_text ? <Small>Prices: {app.prices_text.replace(/\n/g, '; ')}</Small> : null}
      <Toggle label="I checked the licence on the official register, or this trade needs none" value={lic} onChange={setLic} />
      <Toggle label="I checked references or reviews" value={refs} onChange={setRefs} />
      <Row>
        <Button title="Approve and list" small onPress={approve} busy={busy} disabled={!lic || !refs} />
        <Button title="Decline" small kind="ghost" onPress={decline} />
      </Row>
      {msg ? <Notice tone="crit">{msg}</Notice> : null}
    </Card>
  );
}

function FeeSettings({ s, onSaved }: { s: Settings; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({
    commission_pct: String(s.commission_pct ?? ''), customer_fee: String(s.customer_fee ?? ''), customer_fee_label: s.customer_fee_label ?? '',
    emergency_fee: String(s.emergency_fee ?? ''), plan_price: String(s.plan_price ?? ''), reno_fee: s.reno_fee ?? '', plan_includes: (s.plan_includes ?? []).join('\n'),
  });
  const [on, setOn] = useState(!!s.customer_fee_on);
  const [msg, setMsg] = useState<string | null>(null);
  const num = (x: string) => (x.trim() === '' ? null : Number(x));
  async function save() {
    const { error } = await supabase.from('settings').update({
      commission_pct: num(v.commission_pct) ?? 0, customer_fee: num(v.customer_fee), customer_fee_label: v.customer_fee_label.trim() || null,
      customer_fee_on: on, emergency_fee: num(v.emergency_fee), plan_price: num(v.plan_price), reno_fee: v.reno_fee.trim() || null,
      plan_includes: v.plan_includes.split('\n').map((x) => x.trim()).filter(Boolean), example: false,
    }).eq('id', 1);
    setMsg(error ? 'Couldn\'t save fees. Try again.' : 'Fees saved.');
    if (!error) onSaved();
  }
  const set = (k: keyof typeof v) => (t: string) => setV((x) => ({ ...x, [k]: t }));
  return (
    <Card>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button"><H2>{open ? 'Fees and plans settings' : 'Fees and plans settings, tap to edit'}</H2></Pressable>
      {open ? (
        <View style={{ gap: 12 }}>
          {s.example ? <Row><ExampleTag /><Small>Change these and save to make them yours.</Small></Row> : null}
          <Field label="Commission from pros (% of labour)" value={v.commission_pct} onChangeText={set('commission_pct')} keyboardType="decimal-pad" />
          <Field label="Customer booking fee (S$)" value={v.customer_fee} onChangeText={set('customer_fee')} keyboardType="decimal-pad" />
          <Field label="Booking fee name on the quote" value={v.customer_fee_label} onChangeText={set('customer_fee_label')} />
          <Toggle label="Add the booking fee to new quotes by default" value={on} onChange={setOn} />
          <Field label="Emergency priority fee (S$)" value={v.emergency_fee} onChangeText={set('emergency_fee')} keyboardType="decimal-pad" />
          <Field label="Home care plan price (S$ a year)" value={v.plan_price} onChangeText={set('plan_price')} keyboardType="decimal-pad" />
          <Field label="What the plan includes" hint="One item per line" value={v.plan_includes} onChangeText={set('plan_includes')} multiline />
          <Field label="Renovation coordination fee" value={v.reno_fee} onChangeText={set('reno_fee')} />
          <Button title="Save fees" onPress={save} />
          {msg ? <Notice>{msg}</Notice> : null}
        </View>
      ) : null}
    </Card>
  );
}
