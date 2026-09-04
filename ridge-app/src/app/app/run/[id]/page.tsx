import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { formatPace, formatDowDate } from '@/lib/format';
import type { Split, ZoneMinutes } from '@/lib/garmin';

const ZONE_TONE: Record<string, string> = { Z1: '#3f424d', Z2: '#5d5294', Z3: '#9184d9', Z4: '#d2cefd', Z5: '#f5f4ff' };

export default async function RunDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const run = await prisma.activity.findFirst({ where: { id: params.id, userId: user.id } });
  if (!run) notFound();

  const recent = await prisma.activity.findMany({
    where: { userId: user.id },
    orderBy: { startTime: 'desc' },
    take: 8,
  });

  const splits = (run.splits as unknown as Split[] | null) ?? [];
  const zones = (run.zones as unknown as ZoneMinutes[] | null) ?? [];
  const fastestPace = splits.length ? Math.min(...splits.map((s) => s.paceSec)) : run.avgPaceSec;
  const slowestPace = splits.length ? Math.max(...splits.map((s) => s.paceSec)) : run.avgPaceSec;
  const totalZoneMin = zones.reduce((a, z) => a + z.minutes, 0) || 1;

  return (
    <div className="pt-1">
      <Link href="/app" className="inline-block text-[11px] tracking-[0.1em] text-neutral-600 hover:text-accent-400 mb-3.5">
        ‹ TODAY
      </Link>

      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4.5 mb-4">
        {recent.map((r) => {
          const active = r.id === run.id;
          return (
            <Link
              key={r.id}
              href={`/app/run/${r.id}`}
              className={`flex-none px-3 py-2 rounded-md border text-left ${
                active ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-accent-700'
              }`}
            >
              <div className={`text-[11px] font-medium ${active ? 'text-accent-300' : 'text-text'}`}>{r.distanceMiles.toFixed(1)}mi</div>
              <div className="text-[9.5px] text-neutral-600 mt-0.5">{formatDowDate(r.startTime).slice(0, 6)}</div>
            </Link>
          );
        })}
      </div>

      <div className="text-[10.5px] font-medium tracking-[0.16em] text-accent-400">{run.label ?? run.type.toUpperCase()}</div>
      <div className="flex items-baseline gap-2 mt-2.5">
        <div className="text-[44px] font-medium leading-[0.9] tracking-[-0.03em] tabular text-text">{run.distanceMiles.toFixed(2)}</div>
        <div className="text-[13px] text-neutral-500">mi · {formatDowDate(run.startTime)}</div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-4">
        {[
          { v: formatPace(run.avgPaceSec), l: 'Pace' },
          { v: run.avgHr ? String(run.avgHr) : '—', l: 'BPM' },
          { v: run.avgCadence ? String(run.avgCadence) : '—', l: 'Cadence' },
          { v: run.elevationGainFt ? `${run.elevationGainFt}ft` : '—', l: 'Gain' },
        ].map((s) => (
          <div key={s.l} className="border border-white/10 rounded-md bg-surface px-2.5 pt-2.5 pb-2.5">
            <div className="text-[15px] font-medium tabular text-text">{s.v}</div>
            <div className="text-[9px] tracking-[0.1em] uppercase text-neutral-600 mt-1">{s.l}</div>
          </div>
        ))}
      </div>

      {splits.length > 0 && (
        <>
          <div className="text-[10.5px] font-medium tracking-[0.16em] uppercase text-neutral-600 mt-5.5 mt-5 mb-2.5">Mile splits</div>
          <div className="flex flex-col gap-0.5 border-l border-white/[0.14] pl-0.5">
            {splits.map((s) => {
              const frac = slowestPace === fastestPace ? 1 : (slowestPace - s.paceSec) / (slowestPace - fastestPace);
              const isFast = s.paceSec === fastestPace;
              return (
                <div key={s.mi} className="flex items-center gap-2.5 h-[26px]">
                  <div className="w-4 text-[10px] tabular text-neutral-700 text-right">{s.mi}</div>
                  <div className="flex-1 h-full relative">
                    <div
                      className="absolute inset-y-0 left-0 rounded-sm"
                      style={{ width: `${Math.max(6, frac * 100)}%`, background: isFast ? '#9184d9' : '#3f424d' }}
                    />
                    <div className="absolute inset-y-0 left-2 flex items-center text-[10.5px] tabular text-text">{formatPace(s.paceSec)}</div>
                  </div>
                  <div className="w-[54px] text-[11px] tabular text-neutral-600 text-right whitespace-nowrap">{s.hr} bpm</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {zones.length > 0 && (
        <>
          <div className="text-[10.5px] font-medium tracking-[0.16em] uppercase text-neutral-600 mt-5.5 mt-5 mb-2.5">Time in zone</div>
          <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
            {zones.map((z) => (
              <div key={z.zone} style={{ flex: z.minutes, background: ZONE_TONE[z.zone] }} />
            ))}
          </div>
          <div className="flex gap-3.5 mt-2 text-[10.5px] tabular text-neutral-600">
            {zones.map((z) => (
              <span key={z.zone}>
                {z.zone} · {Math.round((z.minutes / totalZoneMin) * 100)}%
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
