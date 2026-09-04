import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getActivePlan, findCurrentWeek, findTodayWorkout } from '@/lib/appData';
import { buildPlanLoadSeries } from '@/lib/loadSeries';
import { MiniFormChart } from '@/components/MiniFormChart';
import { formatPace, DOW, isoDay, formatDowDate } from '@/lib/format';
import { toggleWorkout } from '@/lib/actions';
import { Card } from '@/components/ui';

export default async function TodayPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const plan = await getActivePlan(user.id);
  if (!plan) redirect('/onboarding/connect');

  const thresholdPaceSec = user.thresholdPaceSec ?? 7 * 60 + 30;
  const curWeek = findCurrentWeek(plan);
  const todayWorkout = findTodayWorkout(curWeek);
  const { series, todayIdx } = await buildPlanLoadSeries(user.id, plan, thresholdPaceSec);
  const today = series[todayIdx];

  const todayActivity = await prisma.activity.findFirst({
    where: { userId: user.id, startTime: { gte: new Date(new Date().toDateString()) } },
    orderBy: { startTime: 'desc' },
  });
  const lastActivity = await prisma.activity.findFirst({ where: { userId: user.id }, orderBy: { startTime: 'desc' } });

  const maxWeekMiles = Math.max(...curWeek.workouts.map((w) => w.plannedMiles), 1);

  return (
    <div className="flex flex-col gap-3.5 pt-1">
      <Card className="px-4.5 pt-4.5 pb-4 shadow-[0_6px_18px_rgba(0,0,0,0.4)] bg-gradient-to-b from-surface to-bg">
        <div className="flex justify-between items-baseline">
          <div className="text-[10.5px] font-medium tracking-[0.16em] text-accent-400">{todayWorkout.type}</div>
          <div className="text-[10.5px] tracking-[0.1em] text-neutral-600">{formatDowDate(new Date(todayWorkout.date))}</div>
        </div>
        <div className="flex items-baseline gap-2 mt-3">
          <div className="text-[52px] font-medium leading-[0.9] tracking-[-0.03em] tabular text-text">
            {todayActivity ? todayActivity.distanceMiles.toFixed(2) : todayWorkout.plannedMiles}
          </div>
          <div className="text-[14px] text-neutral-500">mi</div>
        </div>
        <div className="text-[13.5px] leading-relaxed text-neutral-400 mt-2.5">{todayWorkout.description}</div>

        {todayActivity ? (
          <div className="flex mt-4 border-t border-white/[0.09] pt-3.5">
            {[
              { v: todayActivity.distanceMiles.toFixed(2), l: 'Miles' },
              { v: `${formatPace(todayActivity.avgPaceSec)}`, l: 'Pace' },
              { v: todayActivity.avgHr ? String(todayActivity.avgHr) : '—', l: 'BPM' },
              { v: todayActivity.avgCadence ? String(todayActivity.avgCadence) : '—', l: 'Cadence' },
            ].map((s) => (
              <div key={s.l} className="flex-1">
                <div className="text-[14px] font-medium tabular text-text">{s.v}</div>
                <div className="text-[9px] tracking-[0.1em] uppercase text-neutral-600 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        ) : todayWorkout.plannedMiles > 0 ? (
          <div className="mt-4 flex h-6 gap-0.5 rounded-[5px] overflow-hidden">
            <div className="flex-[1] bg-neutral-900 flex items-center justify-center text-[9.5px] tracking-[0.1em] text-neutral-600">WU</div>
            <div className="flex-[5] bg-accent-800 flex items-center justify-center text-[9.5px] tracking-[0.1em] text-accent-300 whitespace-nowrap overflow-hidden">
              {todayWorkout.plannedMiles} mi
            </div>
            <div className="flex-[1] bg-neutral-900 flex items-center justify-center text-[9.5px] tracking-[0.1em] text-neutral-600">CD</div>
          </div>
        ) : null}

        <form
          action={async () => {
            'use server';
            await toggleWorkout(todayWorkout.id);
          }}
        >
          <button
            type="submit"
            className={`w-full mt-4 py-3 rounded-md border text-[13px] font-medium tracking-[0.04em] transition-colors ${
              todayWorkout.completed
                ? 'border-accent bg-accent/[0.14] text-accent-200'
                : 'border-accent text-accent-300 hover:bg-accent/[0.14]'
            }`}
          >
            {todayWorkout.completed ? 'Marked done · tap to undo' : 'Mark as done'}
          </button>
        </form>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {[
          { val: Math.round(today.ctl), label: 'Fitness', sub: 'CTL 42d' },
          { val: Math.round(today.atl), label: 'Fatigue', sub: 'ATL 7d' },
          { val: (today.tsb >= 0 ? '+' : '') + Math.round(today.tsb), label: 'Form', sub: 'CTL − ATL', accent: true },
        ].map((s) => (
          <Card key={s.label} className="px-3 pt-3 pb-2.5">
            <div className={`text-[21px] font-medium tabular ${s.accent ? 'text-accent-400' : 'text-text'}`}>{s.val}</div>
            <div className="text-[9.5px] tracking-[0.11em] uppercase text-neutral-600 mt-1.5">{s.label}</div>
            <div className="text-[10px] text-neutral-700 mt-0.5">{s.sub}</div>
          </Card>
        ))}
      </div>

      <Link href="/app/load" className="block text-left w-full border border-white/10 rounded-lg bg-surface px-4 pt-3.5 pb-2 hover:border-accent-700">
        <div className="flex justify-between items-baseline">
          <div className="text-[10.5px] font-medium tracking-[0.14em] uppercase text-neutral-500">Form recovers</div>
          <div className="text-[12px] font-medium text-accent-400">{'›'}</div>
        </div>
        <MiniFormChart series={series} todayIdx={todayIdx} />
        <div className="text-[10px] tracking-[0.06em] text-neutral-700 pb-1.5">
          Form (TSB) · today {today.tsb >= 0 ? '+' : ''}
          {Math.round(today.tsb)} · projected on plan
        </div>
      </Link>

      <div>
        <div className="text-[10.5px] font-medium tracking-[0.16em] uppercase text-neutral-600 mt-1.5 mb-2.5">
          This week · {curWeek.plannedMiles} mi planned
        </div>
        <Link href="/app/week" className="flex gap-1 items-end h-[70px]">
          {curWeek.workouts.map((w) => {
            const isToday = isoDay(new Date(w.date)) === isoDay(new Date());
            const h = Math.max(3, (w.plannedMiles / maxWeekMiles) * 54);
            return (
              <div key={w.id} className="flex-1 flex flex-col justify-end items-center gap-1.5 h-full">
                <div
                  className="w-full rounded-[3px]"
                  style={{
                    height: h,
                    background: w.completed ? '#9184d9' : isToday ? '#5d5294' : 'rgba(233,233,237,0.14)',
                  }}
                />
                <div className={`text-[9px] tracking-[0.06em] ${isToday ? 'text-accent-400' : 'text-neutral-700'}`}>{DOW[w.dayOfWeek][0]}</div>
              </div>
            );
          })}
        </Link>
      </div>

      {lastActivity && (
        <Link
          href={`/app/run/${lastActivity.id}`}
          className="flex justify-between items-center w-full border border-white/10 rounded-lg bg-surface px-4 py-3.5 hover:border-accent-700"
        >
          <div>
            <div className="text-[9.5px] tracking-[0.14em] uppercase text-neutral-600">Last workout · {formatDowDate(lastActivity.startTime)}</div>
            <div className="text-[14px] font-medium text-text mt-1.5">
              {lastActivity.distanceMiles.toFixed(2)} mi · {formatPace(lastActivity.avgPaceSec)} /mi
              {lastActivity.avgHr ? ` · ${lastActivity.avgHr} bpm` : ''}
            </div>
          </div>
          <div className="text-[18px] text-accent-700">{'›'}</div>
        </Link>
      )}
    </div>
  );
}
