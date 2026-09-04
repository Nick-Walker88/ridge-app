import { prisma } from '@/lib/prisma';
import { daysBetween } from '@/lib/format';

export async function getActivePlan(userId: string) {
  return prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: {
      race: true,
      planWeeks: { orderBy: { weekNumber: 'asc' }, include: { workouts: { orderBy: { dayOfWeek: 'asc' } } } },
    },
  });
}

export type ActivePlan = NonNullable<Awaited<ReturnType<typeof getActivePlan>>>;

export function findCurrentWeek(plan: ActivePlan, now = new Date()) {
  const idx = plan.planWeeks.findIndex((w) => {
    const start = new Date(w.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return now >= start && now < end;
  });
  if (idx >= 0) return plan.planWeeks[idx];
  // Before plan start or after race: clamp.
  if (now < new Date(plan.planWeeks[0].startDate)) return plan.planWeeks[0];
  return plan.planWeeks[plan.planWeeks.length - 1];
}

export function findTodayWorkout(week: ActivePlan['planWeeks'][number], now = new Date()) {
  const todayStr = now.toDateString();
  return week.workouts.find((w) => new Date(w.date).toDateString() === todayStr) ?? week.workouts[0];
}

export function daysToRace(raceDate: Date, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const race = new Date(raceDate.getFullYear(), raceDate.getMonth(), raceDate.getDate());
  return Math.max(0, daysBetween(today, race));
}
