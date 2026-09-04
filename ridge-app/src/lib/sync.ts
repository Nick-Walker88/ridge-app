import { prisma } from '@/lib/prisma';
import { fetchRecentActivities, generateMockHistory, refreshAccessToken, type NormalizedActivity } from '@/lib/garmin';

function classifyLabel(a: NormalizedActivity, thresholdPaceSec: number): string {
  if (a.label === 'LONG') return 'LONG RUN';
  if (a.label === 'TEMPO') return 'LACTATE THRESHOLD';
  if (a.label === 'EASY') return 'EASY';
  if (a.distanceMiles >= 15) return 'LONG RUN';
  if (a.avgPaceSec <= thresholdPaceSec + 10) return 'LACTATE THRESHOLD';
  return 'EASY';
}

async function upsertActivities(userId: string, activities: NormalizedActivity[]) {
  // Rough threshold estimate for labeling; refined later once enough data exists.
  const thresholdGuess = activities.length
    ? Math.min(...activities.map((a) => a.avgPaceSec).filter((p) => p > 0))
    : 420;

  for (const a of activities) {
    await prisma.activity.upsert({
      where: { garminActivityId: a.garminActivityId },
      create: {
        userId,
        garminActivityId: a.garminActivityId,
        source: 'garmin',
        startTime: a.startTime,
        type: a.type,
        label: classifyLabel(a, thresholdGuess),
        distanceMiles: a.distanceMiles,
        durationSec: a.durationSec,
        avgPaceSec: a.avgPaceSec,
        avgHr: a.avgHr,
        avgCadence: a.avgCadence,
        elevationGainFt: a.elevationGainFt,
        splits: (a.splits as unknown as object) ?? undefined,
        zones: (a.zones as unknown as object) ?? undefined,
      },
      update: {
        distanceMiles: a.distanceMiles,
        durationSec: a.durationSec,
        avgPaceSec: a.avgPaceSec,
        avgHr: a.avgHr,
        avgCadence: a.avgCadence,
        elevationGainFt: a.elevationGainFt,
        splits: (a.splits as unknown as object) ?? undefined,
        zones: (a.zones as unknown as object) ?? undefined,
      },
    });
  }
}

/** Initial connect: mock provider seeds ~18mo of history; real Garmin pulls what's available. */
export async function initialSync(userId: string) {
  const conn = await prisma.garminConnection.findUnique({ where: { userId } });
  if (!conn) throw new Error('No Garmin connection on file');

  let activities: NormalizedActivity[];
  if (conn.provider === 'mock') {
    activities = generateMockHistory(userId);
  } else {
    if (!conn.accessToken) throw new Error('Missing Garmin access token');
    const since = Math.floor(Date.now() / 1000) - 18 * 30 * 24 * 3600;
    activities = await fetchRecentActivities(conn.accessToken, since);
  }

  await upsertActivities(userId, activities);
  await prisma.garminConnection.update({
    where: { userId },
    data: { lastSyncedAt: new Date(), lastSyncStatus: 'ok' },
  });
  return activities.length;
}

/** Incremental sync, meant to run on the same daily cadence Garmin pushes on (mirrors the design's "synced 9:30 AM"). */
export async function incrementalSync(userId: string) {
  const conn = await prisma.garminConnection.findUnique({ where: { userId } });
  if (!conn) throw new Error('No Garmin connection on file');

  try {
    let activities: NormalizedActivity[];
    if (conn.provider === 'mock') {
      // Mock history is regenerated deterministically from userId, so a
      // resync naturally "discovers" nothing new beyond what upsert already
      // has — this path exists to exercise the same code as the real sync.
      activities = generateMockHistory(userId).filter((a) => a.startTime > (conn.lastSyncedAt ?? new Date(0)));
    } else {
      let accessToken = conn.accessToken!;
      if (conn.tokenExpiresAt && conn.tokenExpiresAt < new Date()) {
        const refreshed = await refreshAccessToken(conn.refreshToken!);
        accessToken = refreshed.access_token;
        await prisma.garminConnection.update({
          where: { userId },
          data: {
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token,
            tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
          },
        });
      }
      const since = Math.floor((conn.lastSyncedAt ?? new Date(Date.now() - 7 * 86400000)).getTime() / 1000);
      activities = await fetchRecentActivities(accessToken, since);
    }
    await upsertActivities(userId, activities);
    await prisma.garminConnection.update({ where: { userId }, data: { lastSyncedAt: new Date(), lastSyncStatus: 'ok' } });
    return activities.length;
  } catch (err) {
    await prisma.garminConnection.update({ where: { userId }, data: { lastSyncStatus: 'error' } });
    throw err;
  }
}
