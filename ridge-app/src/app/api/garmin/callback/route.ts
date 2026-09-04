import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { exchangeCodeForToken } from '@/lib/garmin';
import { initialSync } from '@/lib/sync';

const STATE_COOKIE = 'garmin_oauth_state';
const VERIFIER_COOKIE = 'garmin_oauth_verifier';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const jar = cookies();
  const expectedState = jar.get(STATE_COOKIE)?.value;
  const verifier = jar.get(VERIFIER_COOKIE)?.value;
  const userId = jar.get('garmin_oauth_user')?.value;

  if (!code || !state || !verifier || !userId || state !== expectedState) {
    return NextResponse.redirect(new URL('/onboarding/connect?error=state_mismatch', url.origin));
  }

  const token = await exchangeCodeForToken(code, verifier);
  await prisma.garminConnection.upsert({
    where: { userId },
    create: {
      userId,
      provider: 'garmin',
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
      scopes: token.scope ? token.scope.split(' ') : [],
    },
    update: {
      provider: 'garmin',
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
      scopes: token.scope ? token.scope.split(' ') : [],
    },
  });

  await initialSync(userId);

  jar.delete(STATE_COOKIE);
  jar.delete(VERIFIER_COOKIE);
  jar.delete('garmin_oauth_user');

  return NextResponse.redirect(new URL('/onboarding/questions', url.origin));
}
