import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { getActivePlan, findCurrentWeek } from '@/lib/appData';
import { toggleWorkout } from '@/lib/actions';
import { PHASE_LABEL } from '@/lib/planGenerator';
import { DOW, formatShortDate, isoDay } from '@/lib/format';

export default async function WeekPage({ searchParams }: { searchParams: { w?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const plan = await getActivePlan(user.id);
  if (!plan) redirect('/onboarding/connect');

  const defaultWeek = findCurrentWeek(plan).weekNumber;
  const weekNumber = Math.min(plan.weeks, Math.max(1, parseInt(searchParams.w ?? '', 10) || defaultWeek));
  const week = plan.planWeeks.find((w) => w.weekNumber === weekNumber)!;
  const doneCount = week.workouts.filter((w) => w.completed).length;
  const todayKey = isoDay(new Date());

  return (
    <div className="pt-1">
      <div className="flex items-center justify-between mb-3.5">
        <NavArrow href={weekNumber > 1 ? `/app/week?w=${weekNumber - 1}` : undefined}>‹</NavArrow>
        <div className="text-center">
          <div className="text-[17px] font-medium tracking-[-0.01em] text-text">Week {weekNumber}</div>
          <div className="text-[10.5px] tracking-[0.1em] uppercase text-neutral-600 mt-1.5">
            {PHASE_LABEL[week.phase]} · {formatShortDate(new Date(week.startDate))}
          </div>
        </div>
        <NavArrow href={weekNumber < plan.weeks ? `/app/week?w=${weekNumber + 1}` : undefined}>›</NavArrow>
      </div>

      <div className="flex gap-2.5 mb-3.5">
        <div className="flex-1 border border-white/10 rounded-lg bg-surface px-3.5 py-2.5">
          <div className="text-[21px] font-medium tabular text-text">{week.plannedMiles}</div>
          <div className="text-[9.5px] tracking-[0.11em] uppercase text-neutral-600 mt-1">mi planned</div>
        </div>
        <div className="flex-1 border border-white/10 rounded-lg bg-surface px-3.5 py-2.5">
          <div className="text-[21px] font-medium tabular text-accent-400">{doneCount}</div>
          <div className="text-[9.5px] tracking-[0.11em] uppercase text-neutral-600 mt-1">of 7 done</div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {week.workouts.map((w) => {
          const isToday = isoDay(new Date(w.date)) === todayKey;
          return (
            <form
              key={w.id}
              action={async () => {
                'use server';
                await toggleWorkout(w.id);
              }}
            >
              <button
                type="submit"
                className={`flex items-center gap-3 w-full text-left px-3.5 py-3 rounded-md border ${
                  isToday ? 'border-accent-700' : 'border-white/10'
                } hover:border-accent-700`}
              >
                <div className={`w-8 text-[10.5px] tracking-[0.06em] ${isToday ? 'text-accent-400' : 'text-neutral-600'}`}>{DOW[w.dayOfWeek]}</div>
                <div className="flex-1 min-w-0 text-left">
                  <div className={`text-[13px] truncate ${w.completed ? 'text-neutral-500 line-through' : 'text-text'}`}>{w.description}</div>
                  <div className="text-[9.5px] tracking-[0.08em] text-neutral-700 mt-0.5">{formatShortDate(new Date(w.date))}</div>
                </div>
                <div className="text-[12px] tabular text-neutral-500">{w.plannedMiles > 0 ? `${w.plannedMiles}mi` : ''}</div>
                <div className={`w-4 text-center ${w.completed ? 'text-accent-400' : 'text-transparent'}`}>✓</div>
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}

function NavArrow({ href, children }: { href?: string; children: React.ReactNode }) {
  const cls = 'w-9 h-9 flex items-center justify-center rounded-md border border-white/10 text-neutral-500';
  if (!href) return <div className={`${cls} opacity-30`}>{children}</div>;
  return (
    <Link href={href} className={`${cls} hover:border-accent-700 hover:text-text`}>
      {children}
    </Link>
  );
}
