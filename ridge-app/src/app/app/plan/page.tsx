import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { getActivePlan, findCurrentWeek } from '@/lib/appData';
import { VolumeChart } from '@/components/VolumeChart';
import { PHASE_LABEL, PHASE_COLOR } from '@/lib/planGenerator';
import { isoDay, addDays } from '@/lib/format';

const VIEWS = ['volume', 'calendar', 'phases'] as const;
type View = (typeof VIEWS)[number];

export default async function PlanPage({ searchParams }: { searchParams: { view?: string; ym?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const plan = await getActivePlan(user.id);
  if (!plan) redirect('/onboarding/connect');

  const view: View = (VIEWS as readonly string[]).includes(searchParams.view ?? '') ? (searchParams.view as View) : 'volume';
  const curWeek = findCurrentWeek(plan);

  return (
    <div className="pt-1">
      <div className="flex gap-0.5 p-0.5 border border-white/[0.09] rounded-md bg-surface mb-4.5 mb-4">
        {VIEWS.map((v) => (
          <Link
            key={v}
            href={`/app/plan?view=${v}`}
            className={`flex-1 text-center py-2 rounded-[7px] text-[12px] capitalize ${
              view === v ? 'bg-accent-800 text-text' : 'text-neutral-600 hover:text-text'
            }`}
          >
            {v}
          </Link>
        ))}
      </div>

      {view === 'volume' && <VolumeView plan={plan} curWeek={curWeek.weekNumber} />}
      {view === 'calendar' && <CalendarView plan={plan} ym={searchParams.ym} />}
      {view === 'phases' && <PhasesView plan={plan} />}
    </div>
  );
}

function VolumeView({ plan, curWeek }: { plan: any; curWeek: number }) {
  return (
    <div>
      <div className="text-[10.5px] font-medium tracking-[0.16em] uppercase text-neutral-600 mb-3">
        {plan.weeks}-week build · weekly volume
      </div>
      <VolumeChart weeks={plan.planWeeks} currentWeek={curWeek} />
      <div className="flex justify-between mt-0.5 text-[9.5px] text-neutral-700">
        <span>Wk 1</span>
        <span>Wk {Math.round(plan.weeks / 2)}</span>
        <span>Wk {plan.weeks} · race</span>
      </div>
    </div>
  );
}

function CalendarView({ plan, ym }: { plan: any; ym?: string }) {
  const planStart = new Date(plan.planWeeks[0].startDate);
  const planEnd = addDays(new Date(plan.planWeeks[plan.planWeeks.length - 1].startDate), 7);
  const [y, m] = ym ? ym.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth()];
  const monthStart = new Date(y, m, 1);
  const monthLabel = monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const firstDow = (monthStart.getDay() + 6) % 7; // Monday-indexed
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const workoutByDay = new Map<string, { miles: number; type: string; completed: boolean }>();
  for (const w of plan.planWeeks) {
    for (const wo of w.workouts) {
      workoutByDay.set(isoDay(new Date(wo.date)), { miles: wo.plannedMiles, type: wo.type, completed: wo.completed });
    }
  }

  const cells: { key: string; num: number | null; mi: string; color: string; faded: boolean }[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ key: `pad-${i}`, num: null, mi: '', color: '', faded: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d);
    const key = isoDay(date);
    const wo = workoutByDay.get(key);
    cells.push({
      key,
      num: d,
      mi: wo && wo.miles > 0 ? String(wo.miles) : '',
      color: wo ? typeColor(wo.type) : '',
      faded: !!wo?.completed,
    });
  }

  const prevM = new Date(y, m - 1, 1);
  const nextM = new Date(y, m + 1, 1);
  const canPrev = nextM > planStart && prevM < planEnd;
  const canNext = nextM < planEnd;

  return (
    <div>
      <div className="flex items-center justify-between mb-3.5">
        <NavA href={canPrev ? `/app/plan?view=calendar&ym=${prevM.getFullYear()}-${prevM.getMonth()}` : undefined}>‹</NavA>
        <div className="text-center">
          <div className="text-[15px] font-medium text-text">{monthLabel}</div>
        </div>
        <NavA href={canNext ? `/app/plan?view=calendar&ym=${nextM.getFullYear()}-${nextM.getMonth()}` : undefined}>›</NavA>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-medium tracking-[0.1em] text-neutral-700">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) =>
          c.num === null ? (
            <div key={c.key} />
          ) : (
            <Link
              key={c.key}
              href={`/app/week?w=${weekNumberFor(plan, c.key)}`}
              className={`aspect-square rounded-md border border-white/[0.08] flex flex-col items-center justify-center gap-0.5 hover:border-accent-700 ${c.faded ? 'opacity-45' : ''}`}
            >
              <div className="text-[10px] text-neutral-500">{c.num}</div>
              <div className="text-[9px] tabular text-neutral-400">{c.mi}</div>
              {c.color && <div className="w-1 h-1 rounded-full" style={{ background: c.color }} />}
            </Link>
          ),
        )}
      </div>
      <div className="flex flex-wrap gap-3 mt-4.5 mt-4">
        {[
          { l: 'Long', c: '#9184d9' },
          { l: 'Quality', c: '#5d5294' },
          { l: 'Easy', c: '#3f424d' },
          { l: 'Rest', c: '#595d6c' },
        ].map((g) => (
          <div key={g.l} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: g.c }} />
            <div className="text-[10.5px] text-neutral-600">{g.l}</div>
          </div>
        ))}
      </div>
      <div className="text-[10px] leading-relaxed text-neutral-700 mt-2.5">
        Numbers are scheduled miles. Faded days are already logged. Tap any day to open its week.
      </div>
    </div>
  );
}

function PhasesView({ plan }: { plan: any }) {
  const groups: { phase: string; from: number; to: number; mi: number }[] = [];
  for (const w of plan.planWeeks) {
    const last = groups[groups.length - 1];
    if (last && last.phase === w.phase) {
      last.to = w.weekNumber;
      last.mi += w.plannedMiles;
    } else {
      groups.push({ phase: w.phase, from: w.weekNumber, to: w.weekNumber, mi: w.plannedMiles });
    }
  }
  return (
    <div className="flex flex-col gap-1.5">
      {groups.map((g) => (
        <div key={g.phase + g.from} className="flex items-center gap-3 border border-white/[0.09] rounded-md bg-surface px-3.5 py-2.5">
          <div className="w-2.5 h-2.5 rounded-sm flex-none" style={{ background: PHASE_COLOR[g.phase as keyof typeof PHASE_COLOR] }} />
          <div className="flex-1">
            <div className="text-[13px] font-medium text-text">{PHASE_LABEL[g.phase as keyof typeof PHASE_LABEL]}</div>
            <div className="text-[10px] tracking-[0.07em] text-neutral-600 mt-0.5">
              Weeks {g.from}
              {g.to !== g.from ? `–${g.to}` : ''}
            </div>
          </div>
          <div className="text-[13px] font-medium tabular text-neutral-400">{Math.round(g.mi)} mi</div>
        </div>
      ))}
    </div>
  );
}

function typeColor(type: string) {
  if (type === 'LONG' || type === 'RACE') return '#9184d9';
  if (type === 'TEMPO') return '#5d5294';
  if (type === 'EASY') return '#3f424d';
  return '#595d6c';
}

function weekNumberFor(plan: any, dayKey: string): number {
  for (const w of plan.planWeeks) {
    for (const wo of w.workouts) {
      if (isoDay(new Date(wo.date)) === dayKey) return w.weekNumber;
    }
  }
  return 1;
}

function NavA({ href, children }: { href?: string; children: React.ReactNode }) {
  const cls = 'w-9 h-9 flex items-center justify-center rounded-md border border-white/10 text-neutral-500';
  if (!href) return <div className={`${cls} opacity-30`}>{children}</div>;
  return (
    <Link href={href} className={`${cls} hover:border-accent-700 hover:text-text`}>
      {children}
    </Link>
  );
}
