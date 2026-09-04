import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { incrementalSync } from '@/lib/sync';

/**
 * Daily sync job, meant to be hit by a scheduler (cron / Vercel Cron) on
 * the same cadence the design calls out ("Garmin · synced 9:30 AM").
 * Protect with CRON_SECRET in production.
 */
export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const connections = await prisma.garminConnection.findMany({ select: { userId: true } });
  const results = await Promise.allSettled(connections.map((c) => incrementalSync(c.userId)));
  const ok = results.filter((r) => r.status === 'fulfilled').length;
  return NextResponse.json({ synced: ok, total: connections.length });
}
