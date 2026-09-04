'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Kicker, ScreenTitle, PrimaryButton } from '@/components/ui';
import { CourseProfile } from '@/components/CourseProfile';
import { createDraftPlan, searchRaces } from '@/lib/actions';
import { formatClock } from '@/lib/format';
import { riegel, vo2maxToMileTimeSec } from '@/lib/predictions';

interface RaceResult {
  id: string;
  name: string;
  city: string;
  region: string;
  date: string | Date;
  distanceMiles: number;
  startElevationFt: number;
  finishElevationFt: number;
  netElevationFt: number;
  totalGainFt: number;
  fieldSize: string;
  tempLowF: number;
  tempHighF: number;
  qualifyingStandard: string;
  note: string;
  profile: [number, number][];
}

export default function RaceClient({ vo2max, daysPerWeek, longRunDay }: { vo2max: number; daysPerWeek: number; longRunDay: number }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<RaceResult | null>(null);
  const [goalSec, setGoalSec] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function onQuery(q: string) {
    setQuery(q);
    setPicked(null);
    if (q.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const r = await searchRaces(q);
    setResults(r as unknown as RaceResult[]);
  }

  function pick(r: RaceResult) {
    setPicked(r);
    setQuery(r.name);
    setSearching(false);
    const mileTime = vo2maxToMileTimeSec(vo2max);
    const predicted = Math.round(riegel(mileTime, 1, r.distanceMiles) / 30) * 30;
    setGoalSec(predicted);
  }

  const weeksOut = picked ? Math.max(1, Math.round((new Date(picked.date).getTime() - Date.now()) / (7 * 86400000))) : 0;

  const goalOptions = goalSec ? [goalSec - 300, goalSec, goalSec + 300, goalSec + 600].filter((s) => s > 0) : [];

  async function buildPlan() {
    if (!picked || !goalSec) return;
    setBusy(true);
    const planId = await createDraftPlan({ raceId: picked.id, goalTimeSec: goalSec, daysPerWeek, longRunDay });
    router.push(`/onboarding/plan-review?planId=${planId}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-canvas">
      <div className="w-full max-w-[360px] flex flex-col justify-between min-h-[80vh] py-6">
        <div>
          <Kicker>Step 4 of 4</Kicker>
          <ScreenTitle>Pick your race</ScreenTitle>
          <div className="text-[13px] leading-relaxed text-neutral-500 mt-2.5">
            Type a race or a city. Ridge pulls the course, the field and the conditions, then builds the plan backwards from
            race day.
          </div>

          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search a marathon…"
            className="w-full box-border mt-4.5 bg-surface border border-white/10 rounded-md px-3.5 py-3 text-[13.5px] text-text outline-none focus:border-accent mt-4"
          />

          {searching && (
            <div className="flex flex-col gap-1.5 mt-2.5">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => pick(r)}
                  className="flex items-center gap-3 w-full text-left border border-white/[0.09] rounded-md bg-surface px-3.5 py-2.5 hover:border-accent-700"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-text truncate">{r.name}</div>
                    <div className="text-[10.5px] text-neutral-600 mt-0.5">
                      {r.city}, {r.region}
                    </div>
                  </div>
                  <div className="text-[10px] tracking-[0.1em] uppercase text-accent-700 whitespace-nowrap">
                    {Math.max(1, Math.round((new Date(r.date).getTime() - Date.now()) / (7 * 86400000)))} wks
                  </div>
                </button>
              ))}
              {!results.length && <div className="text-[12px] text-neutral-600 px-0.5 py-2.5">No match yet. Try a city.</div>}
            </div>
          )}

          {picked && (
            <div>
              <div className="border border-white/10 rounded-lg bg-gradient-to-b from-surface to-canvas px-4 py-4 mt-3.5">
                <div className="flex justify-between items-baseline gap-2.5">
                  <div className="text-[17px] font-medium text-text">{picked.name}</div>
                  <button onClick={() => setPicked(null)} className="text-[10.5px] text-neutral-600 hover:text-accent-400 whitespace-nowrap">
                    Change
                  </button>
                </div>
                <div className="text-[11px] text-neutral-600 mt-1">
                  {picked.city}, {picked.region} · {new Date(picked.date).toDateString()}
                </div>
                <div className="mt-3.5">
                  <CourseProfile profile={picked.profile} gradientId="rsg" />
                </div>
                <div className="flex gap-4 mt-2.5">
                  {[
                    { v: `${picked.netElevationFt > 0 ? '+' : ''}${picked.netElevationFt}`, l: 'Net ft' },
                    { v: `${picked.totalGainFt}`, l: 'Total gain ft' },
                    { v: picked.fieldSize, l: 'Field' },
                    { v: `${picked.tempLowF}–${picked.tempHighF}°`, l: 'Race morning' },
                  ].map((f) => (
                    <div key={f.l}>
                      <div className="text-[13px] font-medium tabular text-text">{f.v}</div>
                      <div className="text-[9px] tracking-[0.09em] uppercase text-neutral-600 mt-1">{f.l}</div>
                    </div>
                  ))}
                </div>
                <div className="text-[12px] leading-relaxed text-neutral-400 mt-3.5 pt-3 border-t border-white/[0.08]">{picked.note}</div>
              </div>

              <div className="flex flex-col mt-4">
                {[
                  { l: 'Distance', v: `${picked.distanceMiles} mi` },
                  { l: 'Weeks out', v: String(weeksOut) },
                  { l: 'Qualifying standard', v: picked.qualifyingStandard },
                ].map((m) => (
                  <div key={m.l} className="flex items-baseline justify-between py-2.5 border-b border-white/[0.07]">
                    <div className="text-[12px] text-neutral-500">{m.l}</div>
                    <div className="text-[12px] tabular text-text">{m.v}</div>
                  </div>
                ))}
              </div>

              <div className="text-[10.5px] tracking-[0.16em] uppercase text-neutral-600 mt-6 mb-2.5">Goal time</div>
              <div className="flex gap-1.5 flex-wrap">
                {goalOptions.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoalSec(g)}
                    className={`px-3.5 py-2.5 rounded-md border text-[12.5px] tabular ${
                      goalSec === g ? 'border-accent text-accent-300 bg-accent/10' : 'border-white/10 text-neutral-400 hover:border-accent-700'
                    }`}
                  >
                    {formatClock(g)}
                  </button>
                ))}
              </div>
              <div className="text-[11.5px] leading-relaxed text-neutral-600 mt-3">
                Your VO2 max of {vo2max.toFixed(1)} projects a {goalSec ? formatClock(goalSec - (goalOptions[1] - goalOptions[0])) : '—'} marathon
                on this course.
              </div>
            </div>
          )}
        </div>

        <PrimaryButton disabled={!picked || !goalSec || busy} onClick={buildPlan}>
          {busy ? 'Building plan…' : 'Build my plan'}
        </PrimaryButton>
      </div>
    </main>
  );
}
