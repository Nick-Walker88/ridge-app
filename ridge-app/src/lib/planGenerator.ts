// Real periodized marathon-plan generator. Replaces the prototype's
// hardcoded 19-week PLAN table with an algorithm parametrized by the
// runner's assessed level, chosen race, days-per-week, and long-run-day
// preference — same structural idea (base → threshold → strength → peak →
// taper → race, with a cutback every 4th week) but computed, not fixed.

export type Phase = 'BASE' | 'THRESHOLD' | 'STRENGTH' | 'PEAK' | 'TAPER' | 'RACE';
export type WorkoutType = 'EASY' | 'TEMPO' | 'LONG' | 'REST' | 'RACE';

export interface GeneratedWorkout {
  dayOfWeek: number; // 0=Mon .. 6=Sun
  type: WorkoutType;
  plannedMiles: number;
  description: string;
  targetPaceSec?: number;
}

export interface GeneratedWeek {
  weekNumber: number;
  phase: Phase;
  plannedMiles: number;
  workouts: GeneratedWorkout[];
}

export interface PlanGeneratorInput {
  weeks: number; // whole weeks until race, race week inclusive
  raceDistanceMiles: number;
  goalTimeSec: number;
  thresholdPaceSec: number; // seconds per mile
  daysPerWeek: number; // 3-7
  longRunDay: number; // 0=Mon .. 6=Sun
  startingWeeklyMiles: number;
  peakWeeklyMiles: number;
}

const PHASE_LABEL: Record<Phase, string> = {
  BASE: 'Base Building',
  THRESHOLD: 'Threshold Dev',
  STRENGTH: 'Strength & Vol',
  PEAK: 'Peak Phase',
  TAPER: 'Taper',
  RACE: 'Race Week',
};
export { PHASE_LABEL };

export const PHASE_COLOR: Record<Phase, string> = {
  BASE: '#595d6c',
  THRESHOLD: '#5d5294',
  STRENGTH: '#796cbf',
  PEAK: '#9184d9',
  TAPER: '#b5abfc',
  RACE: '#d2cefd',
};

function allocatePhases(weeks: number): Phase[] {
  const out: Phase[] = new Array(weeks);
  out[weeks - 1] = 'RACE';
  const taperWeeks = weeks >= 16 ? 3 : weeks >= 10 ? 2 : weeks >= 6 ? 1 : 0;
  for (let i = 0; i < taperWeeks; i++) out[weeks - 2 - i] = 'TAPER';

  let remaining = weeks - 1 - taperWeeks; // weeks left for base/threshold/strength/peak
  if (remaining <= 0) {
    // Very short runway: everything but race week is taper.
    for (let i = 0; i < weeks - 1; i++) out[i] = 'TAPER';
    return out;
  }

  const peakWeeks = Math.max(1, Math.round(remaining * 0.2));
  remaining -= peakWeeks;
  const strengthWeeks = remaining > 0 ? Math.max(1, Math.round(remaining * 0.4)) : 0;
  remaining -= strengthWeeks;
  const thresholdWeeks = remaining > 0 ? Math.max(1, Math.round(remaining * 0.55)) : 0;
  remaining -= thresholdWeeks;
  const baseWeeks = Math.max(0, remaining);

  let idx = 0;
  for (let i = 0; i < baseWeeks; i++) out[idx++] = 'BASE';
  for (let i = 0; i < thresholdWeeks; i++) out[idx++] = 'THRESHOLD';
  for (let i = 0; i < strengthWeeks; i++) out[idx++] = 'STRENGTH';
  for (let i = 0; i < peakWeeks; i++) out[idx++] = 'PEAK';
  // Fill any rounding gap left before the taper/race weeks with BASE.
  while (idx < weeks - 1 - taperWeeks) out[idx++] = 'BASE';

  return out;
}

/** Weekly mileage curve: ramp toward peak with a cutback every 4th week, then taper. */
function weeklyMileageCurve(phases: Phase[], input: PlanGeneratorInput): number[] {
  const { weeks, startingWeeklyMiles, peakWeeklyMiles, raceDistanceMiles } = input;
  const miles = new Array<number>(weeks);

  const peakPhaseIdx = phases.findIndex((p) => p === 'PEAK');
  const rampEndIdx = peakPhaseIdx >= 0 ? phases.lastIndexOf('PEAK') : weeks - 1;
  const rampWeeks = Math.max(1, rampEndIdx); // weeks 0..rampEndIdx-1 ramp, rampEndIdx hits peak

  let last = startingWeeklyMiles;
  for (let w = 0; w < weeks; w++) {
    const phase = phases[w];
    if (phase === 'RACE') {
      miles[w] = Math.round((raceDistanceMiles + 8) * 10) / 10;
      continue;
    }
    if (phase === 'TAPER') {
      const taperStart = phases.indexOf('TAPER');
      const taperLen = phases.filter((p) => p === 'TAPER').length;
      const posFromEnd = phases.lastIndexOf('TAPER') - w; // 0 = last taper week
      const ratios = [0.78, 0.6, 0.46];
      const ratio = ratios[Math.min(ratios.length - 1, posFromEnd)] ?? 0.6;
      miles[w] = Math.round(peakWeeklyMiles * ratio);
      void taperStart;
      void taperLen;
      continue;
    }

    const isCutback = (w + 1) % 4 === 0 && w > 0 && w < rampEndIdx;
    if (isCutback) {
      miles[w] = Math.round(last * 0.72);
      // Don't compound the cutback into next week's ramp base.
    } else if (w >= rampEndIdx) {
      miles[w] = peakWeeklyMiles;
    } else {
      const progress = w / rampWeeks;
      const target = startingWeeklyMiles + (peakWeeklyMiles - startingWeeklyMiles) * progress;
      miles[w] = Math.round(Math.min(target, last * 1.12));
      last = miles[w];
    }
  }
  return miles;
}

function distributeWeek(
  weekNumber: number,
  phase: Phase,
  weeklyMiles: number,
  input: PlanGeneratorInput,
): GeneratedWorkout[] {
  const { daysPerWeek, longRunDay, thresholdPaceSec, goalTimeSec, raceDistanceMiles } = input;
  const easyPace = thresholdPaceSec + 90;
  const tempoPace = phase === 'BASE' ? thresholdPaceSec + 25 : thresholdPaceSec - (phase === 'PEAK' ? 10 : 0);
  const longPace = thresholdPaceSec + 75;
  const racePace = Math.round(goalTimeSec / raceDistanceMiles);

  if (phase === 'RACE') {
    const days: GeneratedWorkout[] = Array.from({ length: 7 }, (_, d) => ({
      dayOfWeek: d,
      type: 'REST' as WorkoutType,
      plannedMiles: 0,
      description: 'Rest',
    }));
    days[longRunDay] = {
      dayOfWeek: longRunDay,
      type: 'RACE',
      plannedMiles: raceDistanceMiles,
      description: `RACE ${raceDistanceMiles} mi — goal ${formatGoal(goalTimeSec)}`,
      targetPaceSec: racePace,
    };
    const shakeoutDay = (longRunDay + 6) % 7; // day before
    days[shakeoutDay] = {
      dayOfWeek: shakeoutDay,
      type: 'EASY',
      plannedMiles: 2,
      description: '2mi shakeout + strides',
      targetPaceSec: easyPace,
    };
    return days;
  }

  const longMiles = Math.min(Math.round(weeklyMiles * 0.32 * 2) / 2, phase === 'TAPER' ? weeklyMiles * 0.4 : 22);
  const includeQuality = phase !== 'TAPER' || weekNumber % 2 === 0;
  const qualityMiles = includeQuality ? Math.round(weeklyMiles * 0.18 * 2) / 2 : 0;

  const runDays = Math.max(3, Math.min(7, daysPerWeek));
  const otherRunDays = Math.max(0, runDays - (includeQuality ? 2 : 1)); // minus long + quality
  const usedMiles = longMiles + qualityMiles;
  const remainingMiles = Math.max(0, weeklyMiles - usedMiles);
  const easyMilesEach = otherRunDays > 0 ? Math.round((remainingMiles / otherRunDays) * 2) / 2 : 0;

  const dayOrder = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== longRunDay);
  const qualityDay = dayOrder[Math.min(2, dayOrder.length - 1)];
  const restDaysCount = 7 - runDays;
  const restDays = new Set<number>();
  // Prefer a rest day right before the long run, then spread the rest.
  const dayBeforeLong = (longRunDay + 6) % 7;
  const restCandidates = dayOrder.filter((d) => d !== qualityDay);
  for (let i = 0; i < restDaysCount; i++) {
    restDays.add(i === 0 ? dayBeforeLong : restCandidates[i % restCandidates.length]);
  }

  const workouts: GeneratedWorkout[] = [];
  for (let d = 0; d < 7; d++) {
    if (d === longRunDay) {
      const isProgressionLong = phase === 'PEAK' || phase === 'STRENGTH';
      workouts.push({
        dayOfWeek: d,
        type: 'LONG',
        plannedMiles: longMiles,
        description: isProgressionLong
          ? `${longMiles}mi long (${Math.round(longMiles * 0.6)}@${formatPace(longPace)}, ${Math.round(longMiles * 0.4)}@${formatPace(racePace + 15)})`
          : `${longMiles}mi long @${formatPace(longPace)}`,
        targetPaceSec: longPace,
      });
    } else if (d === qualityDay && includeQuality) {
      workouts.push({
        dayOfWeek: d,
        type: 'TEMPO',
        plannedMiles: qualityMiles,
        description: `${qualityMiles}mi w/ ${Math.max(2, Math.round(qualityMiles * 0.6))}mi @${formatPace(tempoPace)} tempo`,
        targetPaceSec: tempoPace,
      });
    } else if (restDays.has(d)) {
      workouts.push({ dayOfWeek: d, type: 'REST', plannedMiles: 0, description: 'Rest' });
    } else {
      workouts.push({
        dayOfWeek: d,
        type: 'EASY',
        plannedMiles: easyMilesEach,
        description: `${easyMilesEach}mi easy`,
        targetPaceSec: easyPace,
      });
    }
  }
  return workouts;
}

export function generatePlan(input: PlanGeneratorInput): GeneratedWeek[] {
  const phases = allocatePhases(input.weeks);
  const mileage = weeklyMileageCurve(phases, input);
  return phases.map((phase, i) => ({
    weekNumber: i + 1,
    phase,
    plannedMiles: mileage[i],
    workouts: distributeWeek(i + 1, phase, mileage[i], input),
  }));
}

export function formatPace(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatGoal(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:00` : `${m}:00`;
}
