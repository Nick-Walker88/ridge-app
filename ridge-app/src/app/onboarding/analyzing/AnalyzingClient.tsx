'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Kicker, ScreenTitle, PrimaryButton } from '@/components/ui';
import { runAnalysis } from '@/lib/actions';
import { formatPace } from '@/lib/format';
import type { Assessment, HistorySummary } from '@/lib/assessment';

export default function AnalyzingClient() {
  const router = useRouter();
  const [result, setResult] = useState<{ assessment: Assessment; history: HistorySummary; vo2max: number } | null>(null);
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    runAnalysis().then((r) => setResult(r));
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const rows = result
    ? [
        { label: 'Activities read', val: String(result.history.activityCount) },
        { label: 'Longest run in the last year', val: `${result.history.longestRunMiles.toFixed(1)} mi` },
        { label: 'Peak week', val: `${result.history.peakWeekMiles.toFixed(0)} mi` },
        { label: 'VO2 max', val: result.vo2max.toFixed(1) },
        { label: 'Threshold pace', val: `${formatPace(result.assessment.thresholdPaceSec)} /mi` },
        { label: 'Aerobic decoupling, long runs', val: `${result.history.aerobicDecouplingPct.toFixed(1)}%` },
      ]
    : [];

  useEffect(() => {
    if (!result || timer.current) return;
    timer.current = setInterval(() => {
      setStep((s) => {
        if (s >= rows.length) {
          if (timer.current) clearInterval(timer.current);
          return s;
        }
        return s + 1;
      });
    }, 420);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const done = result && step >= rows.length;

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-canvas">
      <div className="w-full max-w-[360px] flex flex-col justify-between min-h-[70vh] py-6">
        <div>
          <Kicker>Step 3 of 4</Kicker>
          <ScreenTitle>Reading your history</ScreenTitle>
          <div className="text-[13px] leading-relaxed text-neutral-500 mt-3">
            {result ? `18 months of activities, ${result.history.activityCount} runs.` : 'Pulling your Garmin history…'}
          </div>

          <div className="flex flex-col gap-0.5 mt-6">
            {rows.slice(0, step).map((r) => (
              <div key={r.label} className="flex items-center gap-3 py-3 border-b border-white/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-accent flex-none" />
                <div className="flex-1 text-[12.5px] text-neutral-400">{r.label}</div>
                <div className="text-[13px] font-medium tabular text-text">{r.val}</div>
              </div>
            ))}
          </div>

          {done && (
            <div className="border border-accent-700 rounded-lg bg-accent/[0.09] px-4 py-4 mt-5">
              <div className="text-[10px] font-medium tracking-[0.16em] uppercase text-accent-400">Assessed level</div>
              <div className="text-[21px] font-medium text-text mt-2.5">{result!.assessment.headline}</div>
              <div className="text-[12px] leading-relaxed text-neutral-500 mt-2">{result!.assessment.detail}</div>
            </div>
          )}
        </div>
        <PrimaryButton disabled={!done} onClick={() => router.push('/onboarding/race')}>
          {done ? 'Continue' : 'Analyzing…'}
        </PrimaryButton>
      </div>
    </main>
  );
}
