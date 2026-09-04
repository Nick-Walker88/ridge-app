// Race-time predictions via the Riegel formula (T2 = T1 * (D2/D1)^1.06),
// the standard endurance-performance model, seeded from the runner's best
// known performance (a recent race, or VO2max-derived equivalent).

const RIEGEL_EXPONENT = 1.06;

export function riegel(knownTimeSec: number, knownDistanceMiles: number, targetDistanceMiles: number): number {
  return knownTimeSec * Math.pow(targetDistanceMiles / knownDistanceMiles, RIEGEL_EXPONENT);
}

/** ACSM running VO2 equation (VO2 = 3.5 + 0.2 * speed(m/min)) inverted to
 *  get the speed that elicits VO2max — roughly a runner's sustainable pace
 *  for a hard 2-3K effort, used as the Riegel seed when no recent race
 *  result is on file yet. */
export function vo2maxToMileTimeSec(vo2max: number): number {
  const speedMPerMin = (vo2max - 3.5) / 0.2;
  const paceSecPerMile = (1609.34 / speedMPerMin) * 60;
  return Math.max(240, paceSecPerMile);
}

export interface Prediction {
  label: string;
  distanceMiles: number;
  timeSec: number;
  paceSecPerMile: number;
  basis: string;
}

export function buildPredictions(opts: {
  bestMarathonSec?: number | null;
  bestHalfSec?: number | null;
  vo2max?: number | null;
}): Prediction[] {
  const distances: { label: string; miles: number }[] = [
    { label: '5K', miles: 3.107 },
    { label: '10K', miles: 6.214 },
    { label: 'Half marathon', miles: 13.11 },
    { label: 'Marathon', miles: 26.2 },
  ];

  let knownTimeSec: number;
  let knownMiles: number;
  let basisNote: string;
  if (opts.bestHalfSec) {
    knownTimeSec = opts.bestHalfSec;
    knownMiles = 13.11;
    basisNote = 'from your half PB';
  } else if (opts.bestMarathonSec) {
    knownTimeSec = opts.bestMarathonSec;
    knownMiles = 26.2;
    basisNote = 'from your marathon PB';
  } else if (opts.vo2max) {
    const mileSec = vo2maxToMileTimeSec(opts.vo2max);
    knownTimeSec = mileSec;
    knownMiles = 1;
    basisNote = `modelled from VO2 max ${opts.vo2max.toFixed(1)}`;
  } else {
    knownTimeSec = 8 * 60 * 26.2;
    knownMiles = 26.2;
    basisNote = 'default aerobic estimate';
  }

  return distances.map((d) => {
    const timeSec = Math.round(riegel(knownTimeSec, knownMiles, d.miles));
    return {
      label: d.label,
      distanceMiles: d.miles,
      timeSec,
      paceSecPerMile: Math.round(timeSec / d.miles),
      basis: basisNote,
    };
  });
}
