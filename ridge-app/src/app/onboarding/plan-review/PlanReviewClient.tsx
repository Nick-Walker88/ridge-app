'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Kicker, ScreenTitle, PrimaryButton, Card } from '@/components/ui';
import { VolumeChart } from '@/components/VolumeChart';
import { adjustDraftPlan, activatePlan } from '@/lib/actions';
import type { Phase } from '@/lib/planGenerator';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PlanReviewClient(props: {
  planId: string;
  raceName: string;
  raceDate: string;
  weeks: { weekNumber: number; phase: Phase; plannedMiles: number }[];
  daysPerWeek: number;
  longRunDay: number;
  peakWeeklyMiles: number;
  totalWeeks: number;
  source: string;
}) {
  const router = useRouter();
  const [weeks, setWeeks] = useState(props.weeks);
  const [daysPerWeek, setDaysPerWeek] = useState(props.daysPerWeek);
  const [longRunDay, setLongRunDay] = useState(props.longRunDay);
  const [peakWeeklyMiles, setPeakWeeklyMiles] = useState(props.peakWeeklyMiles);
  const [pending, startTransition] = useTransition();
  const [starting, setStarting] = useState(false);

  useEffect(() => setWeeks(props.weeks), [props.weeks]);

  function apply(changes: { daysPerWeek?: number; longRunDay?: number; peakWeeklyMiles?: number }) {
    const next = { daysPerWeek, longRunDay, peakWeeklyMiles, ...changes };
    setDaysPerWeek(next.daysPerWeek);
    setLongRunDay(next.longRunDay);
    setPeakWeeklyMiles(next.peakWeeklyMiles);
    startTransition(async () => {
      await adjustDraftPlan(props.planId, changes);
      router.refresh();
    });
  }

  async function start() {
    setStarting(true);
    await activatePlan(props.planId);
    router.push('/app');
  }

  const peakPhaseWeek = weeks.find((w) => w.phase === 'PEAK');
  const taperWeek = weeks.find((w) => w.phase === 'TAPER');

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-canvas">
      <div className="w-full max-w-[360px] py-6">
        <Kicker>Draft plan</Kicker>
        <ScreenTitle>{props.totalWeeks}-week plan to {props.raceName}</ScreenTitle>
        <div className="text-[13px] leading-relaxed text-neutral-500 mt-2.5">
          Peaking at {peakPhaseWeek?.plannedMiles ?? peakWeeklyMiles} mi
          {taperWeek ? `, then tapering into ${props.raceDate}.` : `, race day ${props.raceDate}.`}
        </div>

        <div className={`mt-5 ${pending ? 'opacity-60' : ''}`}>
          <VolumeChart weeks={weeks} />
        </div>
        <div className="flex justify-between text-[9.5px] text-neutral-700 mt-1">
          <span>Wk 1 · Base</span>
          <span>Peak</span>
          <span>Wk {props.totalWeeks} · race</span>
        </div>

        {props.source === 'imported' ? (
          <div className="text-[11.5px] leading-relaxed text-neutral-600 mt-6 border border-white/[0.09] rounded-md bg-surface px-3.5 py-3">
            This plan was imported from your CSV, so the run-days / peak-volume / long-run-day adjusters are turned off here
            — changing them would regenerate the plan and overwrite your own sessions. Edit the CSV and re-import if you want
            changes.
          </div>
        ) : (
          <>
            <div className="text-[10.5px] tracking-[0.16em] uppercase text-neutral-600 mt-6 mb-2.5">Adjust</div>
            <div className="flex flex-col gap-2">
              <AdjustRow label="Run days / week" value={String(daysPerWeek)}>
                {[3, 4, 5, 6, 7].map((d) => (
                  <OptButton key={d} active={daysPerWeek === d} onClick={() => apply({ daysPerWeek: d })}>
                    {d}
                  </OptButton>
                ))}
              </AdjustRow>
              <AdjustRow label="Peak volume" value={`${peakWeeklyMiles} mi`}>
                {[-10, 0, 10, 20].map((delta) => {
                  const val = Math.round((props.peakWeeklyMiles + delta) / 5) * 5;
                  return (
                    <OptButton key={delta} active={peakWeeklyMiles === val} onClick={() => apply({ peakWeeklyMiles: val })}>
                      {delta === 0 ? 'Base' : `${delta > 0 ? '+' : ''}${delta}`}
                    </OptButton>
                  );
                })}
              </AdjustRow>
              <AdjustRow label="Long-run day" value={DAY_LABELS[longRunDay]}>
                {[5, 6, 3].map((d) => (
                  <OptButton key={d} active={longRunDay === d} onClick={() => apply({ longRunDay: d })}>
                    {DAY_LABELS[d]}
                  </OptButton>
                ))}
              </AdjustRow>
            </div>
          </>
        )}

        <div className="mt-8">
          <PrimaryButton disabled={starting} onClick={start}>
            {starting ? 'Starting…' : 'Start training'}
          </PrimaryButton>
        </div>
      </div>
    </main>
  );
}

function AdjustRow({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <Card className="px-3.5 py-3">
      <div className="flex justify-between items-baseline">
        <div className="text-[12.5px] text-neutral-500">{label}</div>
        <div className="text-[13px] font-medium tabular text-text">{value}</div>
      </div>
      <div className="flex gap-1.5 mt-2.5">{children}</div>
    </Card>
  );
}

function OptButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md border text-[12px] tabular ${
        active ? 'border-accent text-accent-300 bg-accent/10' : 'border-white/10 text-neutral-500 hover:border-accent-700'
      }`}
    >
      {children}
    </button>
  );
}
