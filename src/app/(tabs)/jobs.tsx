import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { QuoteView } from '../../components/QuoteView';
import { Body, Button, Card, Empty, Field, H2, Notice, Row, Small, StatusPill, Title } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { fetchPros } from '../../lib/data';
import { supabase } from '../../lib/supabase';
import { radius, space, useColors } from '../../lib/theme';
import type { JobRequest, Pro } from '../../lib/types';

export default function MyJobs() {
  const c = useColors();
  const router = useRouter();
  const { session, profile, signOut } = useAuth();
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [pros, setPros] = useState<Record<string, Pro>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPro = profile?.role === 'pro';

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const [{ data, error: e }, list] = await Promise.all([
      supabase.from('requests').select('*').order('created_at', { ascending: false }),
      fetchPros().catch(() => [] as Pro[]),
    ]);
    setLoading(false);
    if (e) { setError('Couldn\'t load your jobs. Pull down to try again.'); return; }
    setError(null);
    setJobs((data ?? []) as JobRequest[]);
    setPros(Object.fromEntries(list.map((p) => [p.id, p])));
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: space.lg, gap: space.lg }}>
        <Title sub="Sign in to see your requests, your itemised quotes and to rate finished jobs.">My jobs</Title>
        <Button title="Sign in" onPress={() => router.push('/sign-in')} />
      </View>
    );
  }

  const mine = jobs.filter((j) => j.customer_id === session.user.id);
  const assigned = isPro ? jobs.filter((j) => j.customer_id !== session.user.id) : [];

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.accent} />}>
      <Title sub={isPro ? 'Jobs assigned to you, and anything you booked yourself.' : 'Your requests, quotes and finished jobs.'}>My jobs</Title>
      {error ? <Notice tone="crit">{error}</Notice> : null}

      {isPro ? (
        <View style={{ gap: space.sm }}>
          <H2>Assigned to you</H2>
          {assigned.length === 0 ? <Empty>No jobs assigned yet. New jobs near your areas will show up here.</Empty> : assigned.map((j) => (
            <Pressable key={j.id} onPress={() => router.push({ pathname: '/job/[id]', params: { id: j.id } })} accessibilityRole="button"
              style={{ backgroundColor: c.card, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, padding: space.md, gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}><Text style={{ fontWeight: '600', color: c.ink, fontSize: 16, flex: 1 }}>{j.job_name ?? j.category}, {j.area}</Text><StatusPill status={j.status} /></Row>
              <Small>{j.urgency}. {j.description.slice(0, 100)}</Small>
            </Pressable>
          ))}
        </View>
      ) : null}

      {mine.length === 0 && !isPro ? <Empty>No jobs yet. Book your first one from the Book tab.</Empty> : null}
      {mine.map((j) => <JobCard key={j.id} job={j} pro={j.pro_id ? pros[j.pro_id] : undefined} onChanged={load} />)}

      <View style={{ gap: 8, marginTop: space.lg }}>
        <Small>Signed in as {session.user.email}{profile?.role && profile.role !== 'customer' ? ` (${profile.role})` : ''}</Small>
        <Button title="Sign out" kind="ghost" onPress={signOut} small />
        <DeleteAccount onDeleted={signOut} />
      </View>
    </ScrollView>
  );
}

function DeleteAccount({ onDeleted }: { onDeleted: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function remove() {
    setBusy(true);
    const { error } = await supabase.rpc('delete_my_account');
    setBusy(false);
    if (error) { setMsg('Couldn\'t delete your account. Try again, or message us on WhatsApp.'); return; }
    await onDeleted();
  }
  if (!confirm) return <Button title="Delete my account" kind="danger" small onPress={() => setConfirm(true)} />;
  return (
    <Card>
      <H2>Delete your account?</H2>
      <Body muted>This permanently removes your account, your job requests, quotes and ratings. It can't be undone.</Body>
      <Row>
        <Button title="Delete permanently" kind="danger" small busy={busy} onPress={remove} />
        <Button title="Keep my account" kind="ghost" small onPress={() => setConfirm(false)} />
      </Row>
      {msg ? <Notice tone="crit">{msg}</Notice> : null}
    </Card>
  );
}

function JobCard({ job, pro, onChanged }: { job: JobRequest; pro?: Pro; onChanged: () => void }) {
  const [review, setReview] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function rate(stars: number) {
    setBusy(true);
    const { error } = await supabase.from('requests').update({ rating: stars, review: review.trim() || null }).eq('id', job.id);
    setBusy(false);
    if (error) { setMsg('Couldn\'t save your rating. Try again.'); return; }
    onChanged();
  }
  async function cancel() {
    const { error } = await supabase.from('requests').update({ status: 'cancelled' }).eq('id', job.id);
    if (error) setMsg('Couldn\'t cancel. If a quote is already in, message us on WhatsApp.'); else onChanged();
  }

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}><H2>{job.job_name ?? job.category}, {job.area}</H2><StatusPill status={job.status} /></Row>
      <Body muted>{job.description}</Body>
      {pro ? <Small>Matched with {pro.name}{pro.licence_type ? `, ${pro.licence_type} checked ${pro.licence_checked ?? ''}` : ''}</Small> : null}
      {job.quote ? <QuoteView quote={job.quote} ownMaterials={job.own_materials} /> : job.status !== 'cancelled' ? <Small>Your itemised quote will appear here.</Small> : null}
      {job.status === 'done' && !job.rating ? (
        <View style={{ gap: 8 }}>
          <H2>How did the job go?</H2>
          <Field label="One line about the work" hint="Optional" value={review} onChangeText={setReview} />
          <Row>{[1, 2, 3, 4, 5].map((n) => <Button key={n} title={`${n} ★`} kind="ghost" small busy={busy} onPress={() => rate(n)} />)}</Row>
          <Small>Problems come to us first so we can put them right.</Small>
        </View>
      ) : null}
      {job.rating ? <Small>You rated this {job.rating} ★{job.review ? `: ${job.review}` : ''}</Small> : null}
      {job.status === 'new' || job.status === 'matched' ? <Button title="Cancel request" kind="danger" small onPress={cancel} /> : null}
      {msg ? <Notice tone="crit">{msg}</Notice> : null}
    </Card>
  );
}
