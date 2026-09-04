import crypto from 'crypto';

// Garmin Connect Developer Program — OAuth2 with PKCE.
// https://developer.garmin.com/gc-developer-program/
//
// Endpoint paths below match the Connect Developer Program's published
// OAuth2 flow. The exact REST paths for pulling activities depend on which
// API product your application is approved for (Activity API vs Health
// API) — confirm against your approval email and adjust `GARMIN_API_BASE`
// / the activity-fetch path in `fetchRecentActivities` accordingly. Nothing
// else in this module needs to change.

export const GARMIN_AUTHORIZE_URL = 'https://connect.garmin.com/oauth2Confirm';
export const GARMIN_TOKEN_URL = 'https://diauth.garmin.com/di-oauth2-service/oauth/token';
export const GARMIN_API_BASE = 'https://apis.garmin.com';

export function isGarminConfigured(): boolean {
  return Boolean(process.env.GARMIN_CLIENT_ID && process.env.GARMIN_CLIENT_SECRET);
}

export function generatePkce() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildAuthorizationUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GARMIN_CLIENT_ID || '',
    response_type: 'code',
    redirect_uri: process.env.GARMIN_REDIRECT_URI || '',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });
  return `${GARMIN_AUTHORIZE_URL}?${params.toString()}`;
}

export interface GarminTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export async function exchangeCodeForToken(code: string, verifier: string): Promise<GarminTokenResponse> {
  const res = await fetch(GARMIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.GARMIN_CLIENT_ID || '',
      client_secret: process.env.GARMIN_CLIENT_SECRET || '',
      code,
      code_verifier: verifier,
      redirect_uri: process.env.GARMIN_REDIRECT_URI || '',
    }),
  });
  if (!res.ok) throw new Error(`Garmin token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<GarminTokenResponse> {
  const res = await fetch(GARMIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.GARMIN_CLIENT_ID || '',
      client_secret: process.env.GARMIN_CLIENT_SECRET || '',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Garmin token refresh failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export interface Split {
  mi: number;
  paceSec: number;
  hr: number;
}
export interface ZoneMinutes {
  zone: 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5';
  minutes: number;
}

export interface NormalizedActivity {
  garminActivityId: string;
  startTime: Date;
  type: string;
  label?: string;
  distanceMiles: number;
  durationSec: number;
  avgPaceSec: number;
  avgHr?: number;
  avgCadence?: number;
  elevationGainFt?: number;
  splits?: Split[];
  zones?: ZoneMinutes[];
}

/**
 * Pulls recent running activities from Garmin's Activity API. Confirm the
 * exact path/shape against your approved API product — this targets the
 * common `activity-service` summary endpoint, filtered to running.
 */
export async function fetchRecentActivities(accessToken: string, afterEpochSec: number): Promise<NormalizedActivity[]> {
  const url = `${GARMIN_API_BASE}/activity-service/activities?uploadStartTimeInSeconds=${afterEpochSec}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Garmin activity fetch failed: ${res.status} ${await res.text()}`);
  const raw = (await res.json()) as any[];
  return raw
    .filter((a) => (a.activityType || '').toLowerCase().includes('run'))
    .map((a) => ({
      garminActivityId: String(a.activityId),
      startTime: new Date(a.startTimeInSeconds * 1000),
      type: 'run',
      distanceMiles: a.distanceInMeters / 1609.34,
      durationSec: a.durationInSeconds,
      avgPaceSec: Math.round(a.durationInSeconds / (a.distanceInMeters / 1609.34)),
      avgHr: a.averageHeartRateInBeatsPerMinute,
      avgCadence: a.averageRunCadenceInStepsPerMinute ? Math.round(a.averageRunCadenceInStepsPerMinute) : undefined,
      elevationGainFt: a.totalElevationGainInMeters ? Math.round(a.totalElevationGainInMeters * 3.281) : undefined,
    }));
}

// ── Mock provider ──────────────────────────────────────────────────────
// Used whenever GARMIN_CLIENT_ID/SECRET aren't set, so the app is fully
// usable end-to-end before the real developer-program application clears.
// Generates a plausible 18-month running history seeded per-user so the
// same account always sees the same "synced" data.

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h;
}

export function generateMockHistory(userId: string, months = 18): NormalizedActivity[] {
  const rand = mulberry32(seedFromString(userId));
  const activities: NormalizedActivity[] = [];
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - months);

  // Base fitness ramps up gently over the window with weekly cycles: an
  // easy/easy/quality/easy/easy/long/rest pattern, occasional missed days.
  const thresholdPace = 6 * 60 + 30 + Math.floor(rand() * 90); // 6:30-8:00 /mi baseline
  let cursor = new Date(start);
  let week = 0;
  while (cursor < now) {
    week++;
    const progress = Math.min(1, week / 60);
    const longMiles = Math.round((8 + progress * 12 + rand() * 4) * 2) / 2;
    const pattern: { offset: number; type: string; miles: number }[] = [
      { offset: 0, type: 'EASY', miles: Math.round((4 + progress * 3 + rand() * 2) * 2) / 2 },
      { offset: 1, type: 'EASY', miles: Math.round((4 + progress * 3 + rand() * 2) * 2) / 2 },
      { offset: 2, type: 'TEMPO', miles: Math.round((6 + progress * 4 + rand() * 2) * 2) / 2 },
      { offset: 3, type: 'EASY', miles: Math.round((3 + progress * 2 + rand() * 2) * 2) / 2 },
      { offset: 5, type: 'LONG', miles: longMiles },
    ];
    for (const p of pattern) {
      if (rand() < 0.12) continue; // simulate an occasional missed session
      const date = new Date(cursor);
      date.setDate(date.getDate() + p.offset);
      if (date >= now) continue;
      const isHard = p.type === 'TEMPO';
      const isLong = p.type === 'LONG';
      const paceJitter = Math.floor((rand() - 0.5) * 40);
      const pace = isHard ? thresholdPace + paceJitter : thresholdPace + 75 + paceJitter;
      const durationSec = Math.round(p.miles * pace);
      const baseHr = isHard ? 158 : isLong ? 145 : 128;

      const wholeMiles = Math.max(1, Math.floor(p.miles));
      const splits: Split[] = [];
      for (let mi = 1; mi <= wholeMiles; mi++) {
        // Long runs drift up in HR / pace deep-run fatigue; tempo runs settle
        // in fast then hold; easy runs stay flat with small noise.
        const fatigueDrift = isLong ? (mi / wholeMiles) * 10 : 0;
        const splitPace = Math.round(pace + (rand() - 0.5) * 12 - (isHard ? mi * 0.6 : 0));
        splits.push({
          mi,
          paceSec: splitPace,
          hr: Math.round(baseHr + fatigueDrift + (rand() - 0.5) * 6 + (isHard ? mi * 0.8 : 0)),
        });
      }

      const zoneMinutesTotal = durationSec / 60;
      const zoneSplit = isHard
        ? { Z1: 0.05, Z2: 0.2, Z3: 0.45, Z4: 0.3, Z5: 0 }
        : isLong
          ? { Z1: 0.1, Z2: 0.55, Z3: 0.3, Z4: 0.05, Z5: 0 }
          : { Z1: 0.35, Z2: 0.6, Z3: 0.05, Z4: 0, Z5: 0 };
      const zones: ZoneMinutes[] = (Object.keys(zoneSplit) as (keyof typeof zoneSplit)[])
        .filter((z) => zoneSplit[z] > 0)
        .map((z) => ({ zone: z, minutes: Math.round(zoneMinutesTotal * zoneSplit[z]) }));

      activities.push({
        garminActivityId: `mock-${userId}-${date.toISOString()}`,
        startTime: date,
        type: 'run',
        label: p.type,
        distanceMiles: p.miles,
        durationSec,
        avgPaceSec: pace,
        avgHr: Math.round(baseHr + rand() * 8),
        avgCadence: Math.round(162 + rand() * 8),
        elevationGainFt: Math.round(p.miles * (20 + rand() * 20)),
        splits,
        zones,
      });
    }
    cursor.setDate(cursor.getDate() + 7);
  }
  return activities;
}
