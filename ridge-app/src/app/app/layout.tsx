import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { getActivePlan, findCurrentWeek, daysToRace } from '@/lib/appData';
import { prisma } from '@/lib/prisma';
import TabBar from './TabBar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const plan = await getActivePlan(user.id);
  if (!plan) redirect('/onboarding/connect');

  const conn = await prisma.garminConnection.findUnique({ where: { userId: user.id } });
  const curWeek = findCurrentWeek(plan);
  const daysOut = daysToRace(plan.race.date);

  const syncLabel = conn?.lastSyncedAt
    ? `Garmin · synced ${new Date(conn.lastSyncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : 'Garmin · not yet synced';

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-[520px] mx-auto relative bg-[radial-gradient(circle_at_22%_-10%,rgba(145,132,217,0.05)_0_1px,transparent_1px_34px)]">
      <div className="px-5 pt-8 pb-3 flex items-end justify-between flex-none">
        <div>
          <div className="text-[19px] font-medium tracking-[0.22em] text-text">RIDGE</div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulseDot" />
            <div className="text-[10.5px] tracking-[0.08em] uppercase text-neutral-600">{syncLabel}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[12px] font-medium tracking-[0.08em] text-accent-400">
            WK {curWeek.weekNumber}/{plan.weeks}
          </div>
          <div className="text-[11px] text-neutral-600 mt-1">{daysOut} days out</div>
        </div>
      </div>

      <div className="flex-1 px-5 pb-24 overflow-y-auto">{children}</div>

      <TabBar />
    </div>
  );
}
