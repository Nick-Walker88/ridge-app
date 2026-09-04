// Training-load model: running TSS (rTSS) fed into 42-day/7-day exponential
// moving averages, the same construction TrainingPeaks uses for CTL/ATL/TSB
// (Banister impulse-response, adapted to pace since most runners don't have
// a power meter). This replaces the prototype's hardcoded PLAN-derived
// series with numbers computed from real logged activities plus, for dates
// after today, the still-unrun planned workouts — so "today" is exact and
// the ridge projects forward on the plan, exactly like the design intends.

export interface DailyLoadPoint {
  date: string; // yyyy-mm-dd
  rtss: number;
  isFuture: boolean;
}

export interface LoadSeriesPoint {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  isFuture: boolean;
}

const CTL_TAU = 42;
const ATL_TAU = 7;
const ctlAlpha = 1 - Math.exp(-1 / CTL_TAU);
const atlAlpha = 1 - Math.exp(-1 / ATL_TAU);

/** Running TSS for one session: duration (hours) * intensity-factor^2 * 100. */
export function sessionRtss(durationSec: number, avgPaceSecPerMile: number, thresholdPaceSecPerMile: number): number {
  if (!durationSec || !avgPaceSecPerMile || !thresholdPaceSecPerMile) return 0;
  const iF = thresholdPaceSecPerMile / avgPaceSecPerMile; // faster than threshold => IF > 1
  const hours = durationSec / 3600;
  return hours * iF * iF * 100;
}

/**
 * Builds the CTL/ATL/TSB series across a date range from a day-indexed load
 * map (rTSS per day, both logged history before today and planned-but-not-
 * yet-run sessions after today).
 */
export function buildLoadSeries(dailyLoad: DailyLoadPoint[], seedCtl = 0, seedAtl = 0): LoadSeriesPoint[] {
  let ctl = seedCtl;
  let atl = seedAtl;
  const out: LoadSeriesPoint[] = [];
  for (const day of dailyLoad) {
    ctl = ctl + (day.rtss - ctl) * ctlAlpha;
    atl = atl + (day.rtss - atl) * atlAlpha;
    out.push({ date: day.date, ctl, atl, tsb: ctl - atl, isFuture: day.isFuture });
  }
  return out;
}

/** Deload windows: runs of >3 consecutive days with TSB below the threshold. */
export function findDeloadWindows(series: LoadSeriesPoint[], threshold: number) {
  const bands: { startIdx: number; endIdx: number }[] = [];
  let run: { startIdx: number; endIdx: number } | null = null;
  series.forEach((p, i) => {
    if (p.tsb < threshold) {
      if (!run) run = { startIdx: i, endIdx: i };
      else run.endIdx = i;
    } else if (run) {
      bands.push(run);
      run = null;
    }
  });
  if (run) bands.push(run);
  return bands.filter((b) => b.endIdx - b.startIdx > 3);
}

/** First index after `todayIdx` where TSB crosses back to >= 0 (form recovers). */
export function findFormRecoveryIndex(series: LoadSeriesPoint[], todayIdx: number): number {
  for (let i = todayIdx + 1; i < series.length; i++) {
    if (series[i].tsb >= 0) return i;
  }
  return series.length - 1;
}
