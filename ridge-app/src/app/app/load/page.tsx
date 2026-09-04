import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { getActivePlan } from '@/lib/appData';
import { buildPlanLoadSeries } from '@/lib/loadSeries';
import { findDeloadWindows } from '@/lib/trainingLoad';
import { RidgeChart } from '@/components/RidgeChart';
import { addDays, formatShortDate } from '@/lib/format';

export default async function LoadPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const plan = await getActivePlan(user.id);
  if (!plan) redirect('/onboarding/connect');

  const thresholdPaceSec = user.thresholdPaceSec ?? 7 * 60 + 30;
  const { series, todayIdx, start } = await buildPlanLoadSeries(user.id, plan, thresholdPaceSec);
  const deloadThreshold = -22;
  const bands = findDeloadWindows(series, deloadThreshold);

  return (
    <div className="pt-1">
      <RidgeChart series={series} todayIdx={todayIdx} planStart={start} threshold={deloadThreshold} />

      <div className="mt-5.5 mt-5">
        <div className="text-[10.5px] font-medium tracking-[0.16em] uppercase text-neutral-600 mb-2.5">Deload windows</div>
        <div className="flex flex-col gap-1.5">
          {bands.length === 0 && <div className="text-[12px] text-neutral-600">None yet on the current plan.</div>}
          {bands.map((b, i) => {
            const from = addDays(start, b.startIdx);
            const to = addDays(start, b.endIdx);
            const isPast = b.endIdx < todayIdx;
            return (
              <div key={i} className="flex items-center justify-between border border-white/[0.09] rounded-md bg-surface px-3.5 py-3">
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-medium text-text">
                    {formatShortDate(from)} – {formatShortDate(to)}
                  </div>
                  <div className="text-[10.5px] leading-snug text-neutral-600 mt-1">
                    Form under {deloadThreshold} TSB for {b.endIdx - b.startIdx} days
                  </div>
                </div>
                <div className={`text-[10px] tracking-[0.08em] uppercase px-2 py-1 rounded-sm ${isPast ? 'text-neutral-600' : 'text-accent-300 bg-accent/10'}`}>
                  {isPast ? 'Past' : 'Upcoming'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
