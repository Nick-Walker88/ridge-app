'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Kicker, ScreenTitle, PrimaryButton } from '@/components/ui';

const STATUS_STEPS = [
  'Requesting permissions…',
  'Reading activity history…',
  'Pulling heart rate & training load…',
  'Almost done…',
];

export default function ConnectClient({ permissions }: { permissions: { name: string; detail: string }[] }) {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  async function start() {
    setError(null);
    setConnecting(true);
    setProgress(0);
    timer.current = setInterval(() => {
      setProgress((p) => Math.min(96, p + 4));
    }, 60);

    try {
      const res = await fetch('/api/garmin/connect', { method: 'POST' });
      if (!res.ok) throw new Error('Could not connect to Garmin.');
      const data = await res.json();
      if (timer.current) clearInterval(timer.current);
      setProgress(100);

      if (data.mode === 'redirect') {
        window.location.href = data.authorizeUrl;
        return;
      }
      setConnected(true);
      setConnecting(false);
      setTimeout(() => router.push('/onboarding/questions'), 500);
    } catch (err: any) {
      if (timer.current) clearInterval(timer.current);
      setConnecting(false);
      setError(err.message ?? 'Something went wrong.');
    }
  }

  const statusLabel = STATUS_STEPS[Math.min(STATUS_STEPS.length - 1, Math.floor((progress / 100) * STATUS_STEPS.length))];

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-canvas">
      <div className="w-full max-w-[360px] flex flex-col justify-between min-h-[65vh] py-6">
        <div>
          <Kicker>Step 1 of 4</Kicker>
          <ScreenTitle>Connect Garmin</ScreenTitle>
          <div className="text-[13.5px] leading-relaxed text-neutral-500 mt-3">
            Ridge reads your history to work out what you can actually hold, then syncs each morning at 9:30.
          </div>

          <div className="border border-white/10 rounded-lg bg-surface mt-6 overflow-hidden">
            {permissions.map((p, i) => (
              <div key={p.name} className={`flex items-center gap-3 px-4 py-3 ${i < permissions.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
                <div
                  className={`w-1.5 h-1.5 rounded-full flex-none ${connected ? 'bg-accent' : connecting ? 'bg-accent animate-pulseDot' : 'bg-neutral-700'}`}
                />
                <div className="flex-1">
                  <div className="text-[13px] text-text">{p.name}</div>
                  <div className="text-[10.5px] text-neutral-600 mt-0.5">{p.detail}</div>
                </div>
                <div className="text-[10px] tracking-[0.08em] uppercase text-neutral-600">
                  {connected ? 'Granted' : connecting ? '…' : 'Pending'}
                </div>
              </div>
            ))}
          </div>

          {connecting && (
            <div className="mt-4">
              <div className="h-[3px] rounded-full bg-white/[0.08] overflow-hidden">
                <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-[11px] tracking-[0.08em] text-neutral-600 mt-2">{statusLabel}</div>
            </div>
          )}
          {error && <div className="text-[12px] text-red-400 mt-3">{error}</div>}
        </div>

        <PrimaryButton onClick={start} disabled={connecting || connected}>
          {connected ? 'Connected' : connecting ? 'Connecting…' : 'Connect Garmin'}
        </PrimaryButton>
      </div>
    </main>
  );
}
