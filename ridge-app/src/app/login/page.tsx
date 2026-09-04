'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Kicker, ScreenTitle, PrimaryButton, SecondaryButton } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn('credentials', { redirect: false, email, password });
    setBusy(false);
    if (res?.error) {
      setError('Email or password is incorrect.');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-canvas">
      <form onSubmit={submit} className="w-full max-w-[360px] flex flex-col justify-between min-h-[55vh] py-6">
        <div>
          <Kicker>Welcome back</Kicker>
          <ScreenTitle>Log in to Ridge</ScreenTitle>
          <div className="flex flex-col gap-3 mt-6">
            <div>
              <div className="text-[10px] tracking-[0.12em] uppercase text-neutral-600 mb-1.5">Email</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full box-border bg-surface border border-white/10 rounded-md px-3.5 py-3 text-[13.5px] text-text outline-none focus:border-accent"
              />
            </div>
            <div>
              <div className="text-[10px] tracking-[0.12em] uppercase text-neutral-600 mb-1.5">Password</div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="w-full box-border bg-surface border border-white/10 rounded-md px-3.5 py-3 text-[13.5px] text-text outline-none focus:border-accent"
              />
            </div>
          </div>
          {error && <div className="text-[12px] text-red-400 mt-3">{error}</div>}
        </div>
        <div className="flex gap-2.5 mt-8">
          <Link href="/">
            <SecondaryButton type="button">Back</SecondaryButton>
          </Link>
          <PrimaryButton type="submit" disabled={busy || !email || !password} className="flex-1">
            {busy ? 'Signing in…' : 'Log in'}
          </PrimaryButton>
        </div>
      </form>
    </main>
  );
}
