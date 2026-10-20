import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Body, Button, Card, Chips, ExampleTag, Field, H2, Notice, Row, Screen, Small, Title, Toggle } from '../components/ui';
import { useAuth } from '../lib/auth';
import { AREAS, JOBS, TRADES, URGENCY } from '../lib/catalog';
import { fetchPros, fetchProStats, nearbyPros, useQuery } from '../lib/data';
import { supabase } from '../lib/supabase';

export default function RequestScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { job: jobId = '', scope = '', estimate = '', desc: presetDesc = '' } =
    useLocalSearchParams<{ job?: string; scope?: string; estimate?: string; desc?: string }>();
  const job = JOBS.find((j) => j.id === jobId);
  const isReno = jobId === 'renovation';

  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [area, setArea] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(isReno ? 'Other' : job?.trade ?? null);
  const [urgency, setUrgency] = useState<string>(job?.size === 'emergency' ? 'Emergency, now' : job?.size === 'adhoc' ? 'On a set date' : 'This week');
  const [desc, setDesc] = useState(presetDesc);
  const [budget, setBudget] = useState('');
  const [own, setOwn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'crit' | 'muted' } | null>(null);

  useEffect(() => { if (profile?.name && !name) setName(profile.name); if (profile?.phone && !phone) setPhone(profile.phone); }, [profile]);

  const pros = useQuery(fetchPros);
  const stats = useQuery(fetchProStats);
  const near = useMemo(() => (area && category ? nearbyPros(pros.data ?? [], category, area, stats.data ?? {}).slice(0, 3) : []), [area, category, pros.data, stats.data]);

  async function submit() {
    if (!session) { router.push('/sign-in'); return; }
    if (!name.trim() || !area || !category || !desc.trim()) { setMsg({ text: 'Add your name, area, job type and what needs doing.', tone: 'crit' }); return; }
    setBusy(true); setMsg(null);
    const { error } = await supabase.from('requests').insert({
      name: name.trim(), phone: phone.trim() || null, area, category,
      job_id: isReno ? 'renovation' : job?.id ?? null, job_name: isReno ? 'Renovation plan' : job?.name ?? null,
      urgency, description: desc.trim(), budget: Number(budget) || null, own_materials: own,
      scope: scope ? JSON.parse(scope) : null, estimate: estimate ? JSON.parse(estimate) : null,
    });
    if (!error && (!profile?.name || !profile?.phone)) {
      await supabase.from('profiles').update({ name: profile?.name || name.trim(), phone: profile?.phone || phone.trim() || null }).eq('id', session.user.id);
    }
    setBusy(false);
    if (error) { setMsg({ text: 'We couldn\'t send your request. Check your connection and try again.', tone: 'crit' }); return; }
    router.replace('/jobs');
  }

  return (
    <Screen>
      <Title sub={job?.check ?? (isReno ? 'One checked pro per trade, each with an itemised quote.' : 'Tell us what needs doing and we\'ll find the right pro.')}>
        {isReno ? 'Get quotes for your renovation' : job?.name ?? 'Book a job'}
      </Title>
      {job?.size === 'emergency' ? (
        <Card><Body>If water is near power points, switch off at the main breaker if it's safe to. For fire, injury or gas, call 995.</Body></Card>
      ) : null}
      <Field label="First name" value={name} onChangeText={setName} autoComplete="given-name" textContentType="givenName" placeholder="Mei" />
      <Field label="WhatsApp number" hint="Shared only with your matched pro" value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" placeholder="9xxx xxxx" />
      <Chips label="Area" options={AREAS} value={area} onChange={setArea} />
      {!job || job.trade === 'Other' ? <Chips label="Kind of job" options={TRADES} value={category} onChange={setCategory} /> : null}
      <Chips label="How soon" options={URGENCY} value={urgency} onChange={setUrgency} />
      <Field label="What needs doing" hint="Where, what model or size, anything already tried" value={desc} onChangeText={setDesc} multiline
        placeholder="Kitchen tap leaking at the base since Monday, HDB 4-room" />
      <Field label="Budget in S$" hint="Optional" value={budget} onChangeText={setBudget} keyboardType="number-pad" placeholder="150" />
      <Toggle label="I'll buy the materials myself and pay for labour only" value={own} onChange={setOwn} />

      {area && category ? (
        <Card>
          <H2>Checked pros who cover {area}</H2>
          {near.length === 0 ? (
            <Small>No checked {category.toLowerCase()} pro covers {area} yet. Send the request anyway and we'll find one nearby.</Small>
          ) : near.map((p) => (
            <Row key={p.id} style={{ justifyContent: 'space-between' }}>
              <Body>{p.name}</Body>
              <Row>{p.example ? <ExampleTag /> : null}<Small>{stats.data?.[p.id]?.rating ? `★ ${stats.data[p.id].rating}` : 'New'}</Small></Row>
            </Row>
          ))}
          <Small>We confirm who's free before matching you.</Small>
        </Card>
      ) : null}

      <Button title={session ? 'Send request' : 'Sign in to send'} onPress={submit} busy={busy} />
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <Small>You'll see an itemised quote, with labour, materials and any fees listed separately, before any work starts.</Small>
    </Screen>
  );
}
