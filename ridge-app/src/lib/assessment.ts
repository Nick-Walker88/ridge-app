// Turns onboarding answers + real Garmin history into an assessed level,
// threshold pace, and starting weekly mileage for the plan generator —
// replacing the prototype's hardcoded "Advanced · high-volume base" verdict
// with one computed from the runner's own data.

export interface OnboardingAnswers {
  years: string; // 'Under a year' | '1–3 years' | '3–5 years' | '5+ years'
  races: string; // 'None yet' | '1–2' | '3–5' | '6 or more'
  days: string; // '3'..'7'
  long: string; // 'Saturday' | 'Sunday' | 'Flexible'
  niggles: string; // 'Nothing' | 'A minor niggle' | 'Managing an injury'
}

export interface HistorySummary {
  activityCount: number;
  longestRunMiles: number;
  peakWeekMiles: number;
  avgWeeklyMiles: number;
  thresholdPaceSec: number; // best sustained ~20-40min effort pace observed
  aerobicDecouplingPct: number;
}

export interface Assessment {
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Advanced · high-volume base';
  headline: string;
  detail: string;
  startingWeeklyMiles: number;
  peakWeeklyMiles: number;
  thresholdPaceSec: number;
}

const YEARS_SCORE: Record<string, number> = { 'Under a year': 0, '1–3 years': 1, '3–5 years': 2, '5+ years': 3 };
const RACES_SCORE: Record<string, number> = { 'None yet': 0, '1–2': 1, '3–5': 2, '6 or more': 3 };

export function assessRunner(answers: OnboardingAnswers, history: HistorySummary): Assessment {
  const experienceScore = (YEARS_SCORE[answers.years] ?? 0) + (RACES_SCORE[answers.races] ?? 0);
  const volumeScore = history.peakWeekMiles >= 55 ? 3 : history.peakWeekMiles >= 40 ? 2 : history.peakWeekMiles >= 25 ? 1 : 0;
  const combined = experienceScore + volumeScore;

  let level: Assessment['level'];
  if (combined >= 5 && history.peakWeekMiles >= 45) level = 'Advanced · high-volume base';
  else if (combined >= 4) level = 'Advanced';
  else if (combined >= 2) level = 'Intermediate';
  else level = 'Beginner';

  const declaredYears = answers.years;
  const agrees = (level.startsWith('Advanced') && (declaredYears === '5+ years' || declaredYears === '3–5 years')) ||
    (level === 'Intermediate' && declaredYears !== 'Under a year') ||
    (level === 'Beginner');

  const startingWeeklyMiles = Math.max(15, Math.round(history.avgWeeklyMiles || history.peakWeekMiles * 0.7 || 20));
  const levelCap: Record<Assessment['level'], number> = {
    Beginner: 35,
    Intermediate: 48,
    Advanced: 58,
    'Advanced · high-volume base': 70,
  };
  const peakWeeklyMiles = Math.min(
    levelCap[level],
    Math.max(startingWeeklyMiles + 12, Math.round(Math.max(history.peakWeekMiles * 1.15, history.longestRunMiles * 3))),
  );

  return {
    level,
    headline: level,
    detail: agrees
      ? `Your answers said ${declaredYears.toLowerCase()}. Your data agrees, and puts your threshold at ${formatPaceForAssessment(history.thresholdPaceSec)} /mi.`
      : `Your answers said ${declaredYears.toLowerCase()}, but your logged history points to ${level.toLowerCase()}. Threshold pace comes out to ${formatPaceForAssessment(history.thresholdPaceSec)} /mi.`,
    startingWeeklyMiles,
    peakWeeklyMiles,
    thresholdPaceSec: history.thresholdPaceSec,
  };
}

function formatPaceForAssessment(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
