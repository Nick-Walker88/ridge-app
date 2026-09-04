import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/session';
import { buildAuthorizationUrl, generatePkce, isGarminConfigured } from '@/lib/garmin';
import { initialSync } from '@/lib/sync';

const STATE_COOKIE = 'garmin_oauth_state';
const VERIFIER_COOKIE = 'garmin_oauth_verifier';

/** Kicks off the connection. Real Garmin: returns an authorize URL to redirect to.
 *  Mock provider (no client id configured): connects immediately and seeds history. */
export async function POST() {
  const userId = await requireUserId();

  if (isGarminConfigured()) {
    const { verifier, challenge } = generatePkce();
    const state = crypto.randomUUID();
    cookies().set(STATE_COOKIE, state, { httpOnly: true, maxAge: 600, path: '/' });
    cookies().set(VERIFIER_COOKIE, verifier, { httpOnly: true, maxAge: 600, path: '/' });
    cookies().set('garmin_oauth_user', userId, { httpOnly: true, maxAge: 600, path: '/' });
    return NextResponse.json({ mode: 'redirect', authorizeUrl: buildAuthorizationUrl(state, challenge) });
  }

  await prisma.garminConnection.upsert({
    where: { userId },
    create: { userId, provider: 'mock', garminUserId: `mock-${userId}`, scopes: ['activities', 'heart_rate', 'training_load', 'sleep'] },
    update: { provider: 'mock' },
  });
  const count = await initialSync(userId);
  return NextResponse.json({ mode: 'mock', activityCount: count });
}
