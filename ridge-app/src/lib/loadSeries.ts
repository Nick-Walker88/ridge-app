import { prisma } from '@/lib/prisma';
import type { ActivePlan } from '@/lib/appData';
import { sessionRtss, buildLoadSeries, type DailyLoadPoint, type LoadSeriesPoint } from '@/lib/trainingLoad';
import { isoDay } from '@/lib/format';

/**
 * Builds a full plan-length CTL/ATL/TSB series: logged Garmin activities for
 * days up to today, planned-but-not-yet-run workouts for days after today —
 * exactly the "ridge projects forward on the plan" behaviour from the
 * design, computed from real data instead of a fixed table.
 */
const WARMUP_DAYS = 56; // >42d (the CTL time constant) so the EMA has converged by plan day one

export async function buildPlanLoadSeries(userId: string, plan: ActivePlan, thresholdPaceSec: number) {
  const start = new Date(plan.startDate);
  const warmupStart = new Date(start);
  warmupStart.setDate(warmupStart.getDate() - WARMUP_DAYS);

  const activities = await prisma.activity.findMany({
    where: { userId, startTime: { gte: warmupStart } },
    orderBy: { startTime: 'asc' },
  });
  const byDay = new Map<string, number>();
  for (const a of activities) {
    const key = isoDay(a.startTime);
    const rtss = sessionRtss(a.durationSec, a.avgPaceSec, thresholdPaceSec);
    byDay.set(key, (byDay.get(key) ?? 0) + rtss);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allWorkouts = plan.planWeeks.flatMap((w) => w.workouts);
  const totalDays = WARMUP_DAYS + plan.weeks * 7;

  const daily: DailyLoadPoint[] = [];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(warmupStart);
    date.setDate(date.getDate() + i);
    const key = isoDay(date);
    const isFuture = date > today;

    let rtss: number;
    if (!isFuture) {
      rtss = byDay.get(key) ?? 0;
    } else {
      const wo = allWorkouts.find((w) => isoDay(new Date(w.date)) === key);
      const pace = wo?.targetPaceSec ?? thresholdPaceSec + 90;
      rtss = wo && wo.plannedMiles > 0 ? sessionRtss(wo.plannedMiles * pace, pace, thresholdPaceSec) : 0;
    }
    daily.push({ date: key, rtss, isFuture });
  }

  const fullSeries = buildLoadSeries(daily, 0, 0);
  const series = fullSeries.slice(WARMUP_DAYS);
  const todayIdx = Math.min(series.length - 1, Math.max(0, Math.round((today.getTime() - start.getTime()) / 86400000)));
  return { series, todayIdx, start };
}
