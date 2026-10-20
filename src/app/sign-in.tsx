import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Body, Button, Chips, Field, Notice, Screen, Title } from '../components/ui';
import { supabase } from '../lib/supabase';

// Email and password sign-in. Works without any email being sent while
// "Confirm email" is off in Supabase. Once custom SMTP is set up, turn
// "Confirm email" back on and new accounts will get a confirmation email.
const MODES = ['Sign in', 'Create account'] as const;
type Mode = (typeof MODES)[number];

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('Sign in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'muted' | 'crit' | 'good' } | null>(null);

  function done() { if (router.canGoBack()) router.back(); else router.replace('/'); }

  async function submit() {
    const e = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(e)) { setMsg({ text: 'Enter a valid email address.', tone: 'crit' }); return; }
    if (password.length < 8) { setMsg({ text: 'Use a password of at least 8 characters.', tone: 'crit' }); return; }
    setBusy(true); setMsg(null);
    if (mode === 'Sign in') {
      const { error } = await supabase.auth.signInWithPassword({ email: e, password });
      setBusy(false);
      if (error) { setMsg({ text: 'That email and password don\'t match. Check them, or create an account.', tone: 'crit' }); return; }
      done(); return;
    }
    const { data, error } = await supabase.auth.signUp({ email: e, password });
    setBusy(false);
    if (error) { setMsg({ text: error.message, tone: 'crit' }); return; }
    if (data.session) { done(); return; }
    setMsg({ text: `Account created. Check ${e} for a confirmation email, then sign in.`, tone: 'good' });
    setMode('Sign in');
  }

  async function reset() {
    const e = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(e)) { setMsg({ text: 'Enter your email above first.', tone: 'crit' }); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(e);
    setMsg(error ? { text: error.message, tone: 'crit' } : { text: `If ${e} has an account, a reset link is on its way.`, tone: 'muted' });
  }

  return (
    <Screen>
      <Title sub="Sign in to book jobs, see your quotes and rate the work. Pros use the same sign-in.">{mode}</Title>
      <Chips options={MODES} value={mode} onChange={(m) => { setMode(m); setMsg(null); }} />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
      <Field label="Password" hint={mode === 'Create account' ? 'At least 8 characters' : undefined} value={password} onChangeText={setPassword}
        secureTextEntry autoCapitalize="none" autoComplete={mode === 'Sign in' ? 'current-password' : 'new-password'}
        textContentType={mode === 'Sign in' ? 'password' : 'newPassword'} onSubmitEditing={submit} />
      <Button title={mode} onPress={submit} busy={busy} />
      {mode === 'Sign in' ? <Button title="Forgot password" kind="ghost" small onPress={reset} /> : null}
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <Body muted>We use your email only for your account and updates about your jobs.</Body>
    </Screen>
  );
}
