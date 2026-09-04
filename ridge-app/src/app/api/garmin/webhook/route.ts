import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { incrementalSync } from '@/lib/sync';

/**
 * Garmin push-notification receiver. Garmin's Health/Activity APIs notify
 * via a "ping" containing the Garmin user id for whom new data is ready;
 * the app then pulls it rather than trusting the payload body directly.
 * Register this URL as the webhook endpoint in the Developer Portal once
 * your application is approved.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'invalid payload' }, { status: 400 });

  const pings: any[] = Array.isArray(body) ? body : body.activities || body.pings || [body];
  const garminUserIds = new Set(pings.map((p) => p.userId || p.garminUserId).filter(Boolean));

  for (const gid of garminUserIds) {
    const conn = await prisma.garminConnection.findFirst({ where: { garminUserId: String(gid) } });
    if (conn) await incrementalSync(conn.userId).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
