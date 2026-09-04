import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ results: [] });

  const races = await prisma.race.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { region: { contains: q, mode: 'insensitive' } },
      ],
    },
    orderBy: { date: 'asc' },
  });

  const now = new Date();
  const results = races.map((r) => ({
    id: r.id,
    name: r.name,
    where: `${r.city}, ${r.region}`,
    date: r.date,
    weeksOut: Math.max(1, Math.round((r.date.getTime() - now.getTime()) / (7 * 86400000))),
  }));

  return NextResponse.json({ results });
}
