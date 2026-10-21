import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import {
  Badge, Body, Button, Card, Chips, Empty, Field, H2, KeyboardDoneBar, Line, MultiChips, Notice, Row, Small, StatusPill, Title, Toggle,
} from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { AREAS } from '../../lib/catalog';
import { commission, money, parsePrices, quoteTotals } from '../../lib/money';
import { supabase } from '../../lib/supabase';
import { radius, space, useColors } from '../../lib/theme';
import type { JobRequest } from '../../lib/types';

type OpenJob = {
  id: string; job_name: string | null; category: string; area: string; urgency: string; description: string;
  own_materials: boolean; budget: number | null; created_at: string; interested: boolean;
};

const SECTIONS = ['Jobs', 'Earnings', 'Profile'] as const;
type Section = (typeof SECTIONS)[number];

function ago(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

export default function Work() {
  const c = useColors();
  const router = useRouter();
  const { pro, refreshProfile } = useAuth();
  const [section, setSection] = useState<Section>('Jobs');
  const [open, setOpen] = useState<OpenJob[]>([]);
  const [mine, setMine] = useState<JobRequest[]>([]);
  const [pct, setPct] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!pro) return;
    setLoading(true);
    const [o, m, s] = await Promise.all([
      supabase.rpc('open_jobs_for_me'),
      supabase.from('requests').select('*').eq('pro_id', pro.id).order('updated_at', { ascending: false }),
      supabase.from('settings').select('commission_pct').eq('id', 1).maybeSingle(),
    ]);
    setLoading(false);
    setOpen((o.data ?? []) as OpenJob[]);
    setMine((m.data ?? []) as JobRequest[]);
    setPct(Number((s.data as { commission_pct?: number } | null)?.commission_pct) || 0);
  }, [pro]);

  useFocusEffect(useCallback(() => { refreshProfile(); load(); }, [load]));

  if (!pro) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: space.lg, gap: space.lg }}>
        <Title sub="Once we've checked your licence and references, your jobs, quotes and earnings live here.">Work</Title>
        <Button title="Join as a pro" onPress={() => router.push('/join')} />
      </View>
    );
  }

  async function interested(job: OpenJob) {
    const { error } = await supabase.from('job_interest').insert({ request_id: job.id, pro_id: pro!.id });
    setMsg(error ? 'Couldn\'t send that. Try again.' : 'Sent. We\'ll confirm on WhatsApp if the job is yours.');
    load();
  }

  const toQuote = mine.filter((j) => j.status === 'matched');
  const waiting = mine.filter((j) => j.status === 'quoted');
  const done = mine.filter((j) => j.status === 'done');
  const jobCard = (j: JobRequest) => (
    <Pressable key={j.id} onPress={() => router.push({ pathname: '/job/[id]', params: { id: j.id } })} accessibilityRole="button"
      style={({ pressed }) => ({ backgroundColor: c.card, borderRadius: radius.md, borderWidth: 1, borderColor: pressed ? c.accent : c.line, padding: space.md, gap: 4 })}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: '600', fontSize: 16, color: c.ink, flex: 1 }}>{j.job_name ?? j.category}, {j.area}</Text>
        <StatusPill status={j.status} />
      </Row>
      <Small>{j.urgency}{j.own_materials ? ', customer supplies materials' : ''}{j.quote ? `, quote ${money(quoteTotals(j.quote).total)}` : ''}</Small>
      <Small>{j.description.slice(0, 110)}</Small>
    </Pressable>
  );

  return (
    <>
      <KeyboardDoneBar />
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets style={{ backgroundColor: c.bg }}
        contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.accent} />}>
        <View style={{ gap: 4 }}>
          <Title>{pro.name}</Title>
          <Row>
            <Badge text={pro.available === false ? 'Not taking new jobs' : 'Taking new jobs'} tone={pro.available === false ? 'plain' : 'good'} />
            {pro.licence_type ? <Badge text={`${pro.licence_type}, checked ${pro.licence_checked ?? ''}`} /> : null}
          </Row>
        </View>
        <Chips options={SECTIONS} value={section} onChange={setSection} />
        {msg ? <Notice>{msg}</Notice> : null}

        {section === 'Jobs' ? (
          <>
            <View style={{ gap: space.sm }}>
              <H2>To quote ({toQuote.length})</H2>
              {toQuote.length ? toQuote.map(jobCard) : <Small>Nothing waiting for a quote.</Small>}
            </View>
            {waiting.length ? (
              <View style={{ gap: space.sm }}>
                <H2>Waiting for the customer ({waiting.length})</H2>
                {waiting.map(jobCard)}
                <Small>Once the work is done, open the job and set it to Done.</Small>
              </View>
            ) : null}
            <View style={{ gap: space.sm }}>
              <H2>Jobs near you ({open.length})</H2>
              <Small>Open jobs in your trade and areas. Customer details are shared once the job is yours.</Small>
              {pro.available === false ? <Notice>You're not taking new jobs. Turn it back on under Profile to see jobs here.</Notice> : null}
              {pro.available !== false && open.length === 0 ? <Empty>No open jobs in your areas right now. Pull down to refresh.</Empty> : null}
              {pro.available !== false && open.map((j) => (
                <Card key={j.id}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <H2>{j.job_name ?? j.category}</H2>
                    {j.urgency.startsWith('Emergency') ? <Badge text="Emergency" tone="crit" /> : <Small>{j.urgency}</Small>}
                  </Row>
                  <Small>{j.area}, {ago(j.created_at)}{j.budget ? `, budget ${money(j.budget)}` : ''}{j.own_materials ? ', customer supplies materials' : ''}</Small>
                  <Body>{j.description}</Body>
                  {j.interested ? <Badge text="You said you're interested" tone="good" /> : <Button title="I'm interested" small onPress={() => interested(j)} />}
                </Card>
              ))}
            </View>
            {done.length ? (
              <View style={{ gap: space.sm }}>
                <H2>Done ({done.length})</H2>
                {done.slice(0, 5).map(jobCard)}
              </View>
            ) : null}
          </>
        ) : null}

        {section === 'Earnings' ? <Earnings jobs={done} pct={pct} /> : null}
        {section === 'Profile' ? <ProfileEditor onSaved={async () => { await refreshProfile(); load(); }} /> : null}
      </ScrollView>
    </>
  );
}

function Earnings({ jobs, pct }: { jobs: JobRequest[]; pct: number }) {
  const now = new Date();
  const thisMonth = jobs.filter((j) => { const d = new Date(j.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const sum = (list: JobRequest[]) => list.reduce((a, j) => {
    const t = quoteTotals(j.quote);
    return { labour: a.labour + t.labour + t.callout, materials: a.materials + t.materials, fee: a.fee + commission(j.quote, pct) };
  }, { labour: 0, materials: 0, fee: 0 });
  const m = sum(thisMonth), all = sum(jobs);
  const rated = jobs.filter((j) => j.rating);
  const avg = rated.length ? (rated.reduce((a, j) => a + (j.rating ?? 0), 0) / rated.length).toFixed(1) : null;
  return (
    <>
      <Card highlight>
        <H2>This month</H2>
        <Line left={`Jobs done`} right={String(thisMonth.length)} />
        <Line left="Labour and call-out" right={money(m.labour)} />
        <Line left="Materials (passed to customer)" right={money(m.materials)} />
        <Line left={`Referral fee owed (${pct}% of labour)`} right={money(m.fee)} />
        <Line left="You keep" right={money(m.labour - m.fee)} strong />
      </Card>
      <Card>
        <H2>Since you joined</H2>
        <Line left="Jobs done" right={String(jobs.length)} />
        <Line left="You kept" right={money(all.labour - all.fee)} />
        <Line left="Average rating" right={avg ? `${avg} ★ from ${rated.length}` : 'No ratings yet'} />
      </Card>
      <Small>Referral fees are invoiced monthly by PayNow. Materials aren't part of the fee.</Small>
    </>
  );
}

function ProfileEditor({ onSaved }: { onSaved: () => Promise<void> }) {
  const { pro } = useAuth();
  const [available, setAvailable] = useState(pro?.available !== false);
  const [areas, setAreas] = useState<string[]>(pro?.areas ?? []);
  const [policy, setPolicy] = useState(pro?.materials_policy ?? '');
  const [prices, setPrices] = useState((pro?.price_ranges ?? []).map((r) => `${r.job} ${r.low}-${r.high}`).join('\n'));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'good' | 'crit' } | null>(null);
  if (!pro) return null;
  async function save() {
    setBusy(true);
    const { error } = await supabase.rpc('update_my_pro', { p_available: available, p_areas: areas, p_materials_policy: policy, p_price_ranges: parsePrices(prices) });
    setBusy(false);
    if (error) { setMsg({ text: error.message, tone: 'crit' }); return; }
    setMsg({ text: 'Saved. Customers see the update on the Pros tab.', tone: 'good' });
    await onSaved();
  }
  return (
    <>
      <Toggle label="Taking new jobs" value={available} onChange={setAvailable} />
      <MultiChips label="Areas you cover" options={AREAS} values={areas} onChange={setAreas} />
      <Field label="Your usual prices" hint="One job per line, labour only" value={prices} onChangeText={setPrices} multiline placeholder={'Choked sink 80-120\nReplace tap 60-90'} />
      <Field label="Materials policy" hint="Shown on every quote" value={policy} onChangeText={setPolicy} placeholder="At cost, plus S$10 handling" />
      <Button title="Save profile" onPress={save} busy={busy} />
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <Small>Your name, trade and licence are set when we check you. To change them, message us.</Small>
    </>
  );
}
