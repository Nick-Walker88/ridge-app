'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Kicker, ScreenTitle, PrimaryButton, SecondaryButton } from '@/components/ui';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not create account');
      }
      const signInRes = await signIn('credentials', { redirect: false, email, password });
      if (signInRes?.error) throw new Error('Account created — sign in failed, try logging in.');
      router.push('/onboarding/connect');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-canvas">
      <form onSubmit={submit} className="w-full max-w-[360px] flex flex-col justify-between min-h-[65vh] py-6">
        <div>
          <Kicker>Create account</Kicker>
          <ScreenTitle>Start with your details</ScreenTitle>
          <div className="flex flex-col gap-3 mt-6">
            <Field label="Name" value={name} onChange={setName} placeholder="Your name" />
            <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
            <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="At least 8 characters" />
          </div>
          {error && <div className="text-[12px] text-red-400 mt-3">{error}</div>}
          <div className="text-[11px] leading-relaxed text-neutral-700 mt-4">
            Ridge stores your training history and Garmin tokens. It never sells data and you can revoke access from Garmin
            Connect at any time.
          </div>
        </div>
        <div className="flex gap-2.5 mt-8">
          <Link href="/">
            <SecondaryButton type="button">Back</SecondaryButton>
          </Link>
          <PrimaryButton type="submit" disabled={busy || !name || !email || password.length < 8} className="flex-1">
            {busy ? 'Creating…' : 'Continue'}
          </PrimaryButton>
        </div>
      </form>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.12em] uppercase text-neutral-600 mb-1.5">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        className="w-full box-border bg-surface border border-white/10 rounded-md px-3.5 py-3 text-[13.5px] text-text outline-none focus:border-accent"
      />
    </div>
  );
}
