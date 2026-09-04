import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import PlanReviewClient from './PlanReviewClient';

export default async function PlanReviewPage({ searchParams }: { searchParams: { planId?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const plan = await prisma.trainingPlan.findFirst({
    where: searchParams.planId ? { id: searchParams.planId, userId: user.id } : { userId: user.id, status: 'DRAFT' },
    include: { race: true, planWeeks: { orderBy: { weekNumber: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  if (!plan) redirect('/onboarding/race');

  return (
    <PlanReviewClient
      planId={plan.id}
      raceName={plan.race.name}
      raceDate={plan.race.date.toDateString()}
      weeks={plan.planWeeks.map((w) => ({ weekNumber: w.weekNumber, phase: w.phase, plannedMiles: w.plannedMiles }))}
      daysPerWeek={plan.daysPerWeek}
      longRunDay={plan.longRunDay}
      peakWeeklyMiles={plan.peakWeeklyMiles}
      totalWeeks={plan.weeks}
    />
  );
}
