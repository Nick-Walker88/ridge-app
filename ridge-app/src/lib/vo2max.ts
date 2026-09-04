// ACSM running VO2 equation: VO2 (ml/kg/min) = 3.5 + 0.2 * speed(m/min), at
// 0% grade. Assumes a trained runner holds threshold pace at roughly 85% of
// VO2max — a standard exercise-physiology approximation used absent a lab
// or Firstbeat-style proprietary estimate.
export function estimateVo2max(thresholdPaceSecPerMile: number): number {
  const speedMPerMin = (1609.34 * 60) / thresholdPaceSecPerMile;
  const vo2AtThreshold = 3.5 + 0.2 * speedMPerMin;
  return Math.round((vo2AtThreshold / 0.85) * 10) / 10;
}
