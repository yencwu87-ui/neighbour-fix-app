import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Body, Button, Field, Notice, Screen, Title } from '../components/ui';
import { supabase } from '../lib/supabase';

// Email one-time code: no password to remember, works for customers and pros.
export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'muted' | 'crit' } | null>(null);

  async function send() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setMsg({ text: 'Enter a valid email address.', tone: 'crit' }); return; }
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) { setMsg({ text: error.message, tone: 'crit' }); return; }
    setSent(true); setMsg({ text: `We sent a code to ${email.trim()}. It can take a minute to arrive.`, tone: 'muted' });
  }

  async function verify() {
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) { setMsg({ text: 'That code didn\'t work. Check it, or send a new one.', tone: 'crit' }); return; }
    if (router.canGoBack()) router.back(); else router.replace('/');
  }

  return (
    <Screen>
      <Title sub="Sign in to book jobs, see your quotes and rate the work. Pros use the same sign-in.">Sign in</Title>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" editable={!sent} />
      {sent ? (
        <>
          <Field label="Code from the email" value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={8} />
          <Button title="Sign in" onPress={verify} busy={busy} disabled={code.trim().length < 6} />
          <Button title="Use a different email" kind="ghost" onPress={() => { setSent(false); setCode(''); setMsg(null); }} />
        </>
      ) : (
        <Button title="Email me a code" onPress={send} busy={busy} />
      )}
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <Body muted>We use your email only to sign you in and to send updates about your jobs.</Body>
    </Screen>
  );
}
