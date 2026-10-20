import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Body, Button, Chips, Field, MultiChips, Notice, Screen, Title, Toggle } from '../components/ui';
import { useAuth } from '../lib/auth';
import { AREAS } from '../lib/catalog';
import { supabase } from '../lib/supabase';
import type { Application } from '../lib/types';

const JOIN_TRADES = ['Plumbing', 'Electrical', 'Aircon', 'Handyman', 'Painting', 'Tiling', 'Flooring', 'Carpentry', 'Upholstery', 'Windows', 'Cleaning', 'Pest control', 'Moving', 'Supplier'];

const LICENCE_HINT: Record<string, string> = {
  Plumbing: 'PUB licensed plumber', Electrical: 'Licensed electrical worker (EMA)', Aircon: 'BCA-trained technician',
  Windows: 'Approved window contractor', 'Pest control': 'NEA-registered vector control operator',
};

export default function Join() {
  const router = useRouter();
  const { session } = useAuth();
  const [existing, setExisting] = useState<Application | null>(null);
  const [name, setName] = useState('');
  const [trade, setTrade] = useState<string | null>(null);
  const [areas, setAreas] = useState<string[]>([]);
  const [phone, setPhone] = useState('');
  const [lic, setLic] = useState('');
  const [licNo, setLicNo] = useState('');
  const [years, setYears] = useState('');
  const [reviews, setReviews] = useState('');
  const [prices, setPrices] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'crit' | 'good' } | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase.from('applications').select('*').order('created_at', { ascending: false }).limit(1).then(({ data }) => setExisting((data?.[0] as Application) ?? null));
  }, [session]);

  async function apply() {
    if (!session) { router.push('/sign-in'); return; }
    if (!name.trim() || !trade || areas.length === 0 || !phone.trim()) { setMsg({ text: 'Add your name, trade, the areas you cover and a WhatsApp number.', tone: 'crit' }); return; }
    if (!agreed) { setMsg({ text: 'Tick the agreement to apply.', tone: 'crit' }); return; }
    setBusy(true); setMsg(null);
    const { error } = await supabase.from('applications').insert({
      name: name.trim(), trade, areas, phone: phone.trim(), licence_type: lic.trim() || null, licence_no: licNo.trim() || null,
      years: Number(years) || null, reviews: reviews.trim() || null, prices_text: prices.trim() || null, agreed: true,
    });
    setBusy(false);
    if (error) { setMsg({ text: 'We couldn\'t send your application. Try again.', tone: 'crit' }); return; }
    setMsg({ text: 'Applied. We\'ll WhatsApp you to check your licence and references.', tone: 'good' });
  }

  if (existing && existing.status === 'pending') {
    return <Screen><Title sub={`We're checking your application as ${existing.name}. We'll WhatsApp you at ${existing.phone}.`}>Application received</Title></Screen>;
  }
  if (existing && existing.status === 'approved') {
    return <Screen><Title sub="You're listed. Jobs assigned to you appear under My jobs, where you can send quotes and mark jobs done.">You're a Neighbour Fix pro</Title></Screen>;
  }

  return (
    <Screen>
      <Title sub="Local jobs near you, no bidding wars. You pay a referral fee only when a job is completed.">Join as a pro</Title>
      <Field label="Your name or business" value={name} onChangeText={setName} placeholder="Ah Seng Plumbing" />
      <Chips label="Main trade" options={JOIN_TRADES} value={trade} onChange={setTrade} labels={{ Supplier: 'Supplier (furniture or materials)' }} />
      <MultiChips label="Areas you cover" options={AREAS} values={areas} onChange={setAreas} />
      <Field label="WhatsApp number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" />
      <Field label="Licence or registration" hint={trade && LICENCE_HINT[trade] ? `Needed: ${LICENCE_HINT[trade]}` : 'If your trade needs one'} value={lic} onChangeText={setLic} />
      <Field label="Licence number" value={licNo} onChangeText={setLicNo} autoCapitalize="characters" />
      <Field label="Years of experience" value={years} onChangeText={setYears} keyboardType="number-pad" />
      <Field label="Where we can see your reviews" value={reviews} onChangeText={setReviews} placeholder="Carousell profile, Google, past customers" />
      <Field label="Your usual prices" hint="One job per line" value={prices} onChangeText={setPrices} multiline placeholder={'Choked sink 80-120\nReplace tap 60-90'} />
      <Toggle label="I agree to an itemised quote before every job, receipts for materials on request, and a referral fee on completed jobs" value={agreed} onChange={setAgreed} />
      <Button title={session ? 'Apply to join' : 'Sign in to apply'} onPress={apply} busy={busy} />
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <Body muted>Your details are seen only by you and the Neighbour Fix team until you're approved.</Body>
    </Screen>
  );
}
