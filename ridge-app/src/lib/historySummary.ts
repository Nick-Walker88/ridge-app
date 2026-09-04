import { prisma } from '@/lib/prisma';
import type { HistorySummary } from '@/lib/assessment';
import type { Split } from '@/lib/garmin';

/** Real aerobic-decoupling calc: HR/pace efficiency, first half of a run vs
 *  second half. Positive % means HR drifted up relative to pace — less
 *  aerobically durable; well-fuelled steady runs sit low single digits. */
function decouplingPct(splits: Split[]): number | null {
  if (splits.length < 6) return null;
  const mid = Math.floor(splits.length / 2);
  const first = splits.slice(0, mid);
  const second = splits.slice(mid);
  const eff = (s: Split[]) => {
    const avgHr = s.reduce((a, b) => a + b.hr, 0) / s.length;
    const avgPace = s.reduce((a, b) => a + b.paceSec, 0) / s.length; // sec/mi, lower = faster
    return avgHr / (1609.34 / avgPace); // hr per m/s — lower is more efficient
  };
  const e1 = eff(first);
  const e2 = eff(second);
  return ((e2 - e1) / e1) * 100;
}

export async function computeHistorySummary(userId: string): Promise<HistorySummary> {
  const activities = await prisma.activity.findMany({ where: { userId }, orderBy: { startTime: 'desc' } });

  if (activities.length === 0) {
    return {
      activityCount: 0,
      longestRunMiles: 0,
      peakWeekMiles: 0,
      avgWeeklyMiles: 0,
      thresholdPaceSec: 7 * 60 + 30,
      aerobicDecouplingPct: 0,
    };
  }

  const longestRunMiles = Math.max(...activities.map((a) => a.distanceMiles));

  // Weekly totals over the last 12 weeks for peak/average.
  const weekTotals = new Map<string, number>();
  const now = new Date();
  for (const a of activities) {
    const weeksAgo = Math.floor((now.getTime() - a.startTime.getTime()) / (7 * 86400000));
    if (weeksAgo > 12 || weeksAgo < 0) continue;
    const key = String(weeksAgo);
    weekTotals.set(key, (weekTotals.get(key) ?? 0) + a.distanceMiles);
  }
  const totals = Array.from(weekTotals.values());
  const peakWeekMiles = totals.length ? Math.max(...totals) : 0;
  const avgWeeklyMiles = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;

  // Threshold pace: fastest average pace sustained over >=4 miles in the
  // last 6 months (a tempo/threshold-style effort), a defensible proxy
  // absent a formal lactate test.
  const sixMonthsAgo = new Date(now.getTime() - 182 * 86400000);
  const sustainedEfforts = activities.filter((a) => a.distanceMiles >= 4 && a.startTime > sixMonthsAgo);
  const thresholdPaceSec = sustainedEfforts.length
    ? Math.min(...sustainedEfforts.map((a) => a.avgPaceSec))
    : Math.min(...activities.map((a) => a.avgPaceSec));

  const longestRun = activities.find((a) => a.distanceMiles === longestRunMiles);
  const splits = (longestRun?.splits as unknown as Split[] | null) ?? null;
  const decoupling = splits ? decouplingPct(splits) : null;

  return {
    activityCount: activities.length,
    longestRunMiles,
    peakWeekMiles,
    avgWeeklyMiles,
    thresholdPaceSec,
    aerobicDecouplingPct: decoupling ?? 4.5,
  };
}
