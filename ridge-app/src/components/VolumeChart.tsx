'use client';

import { PHASE_COLOR, type Phase } from '@/lib/planGenerator';

export function VolumeChart({
  weeks,
  height = 118,
  currentWeek,
  onBarClick,
}: {
  weeks: { weekNumber: number; phase: Phase; plannedMiles: number }[];
  height?: number;
  currentWeek?: number;
  onBarClick?: (weekNumber: number) => void;
}) {
  const width = 322;
  const gap = 2;
  const barW = width / weeks.length - gap;
  const maxMiles = Math.max(...weeks.map((w) => w.plannedMiles), 1);
  const chartH = height - 6;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="block overflow-visible">
      {weeks.map((w, i) => {
        const h = (w.plannedMiles / maxMiles) * chartH;
        const x = i * (barW + gap);
        const y = chartH - h;
        const isCurrent = w.weekNumber === currentWeek;
        return (
          <rect
            key={w.weekNumber}
            x={x}
            y={y}
            width={barW}
            height={Math.max(1, h)}
            rx={1.5}
            fill={PHASE_COLOR[w.phase]}
            opacity={isCurrent ? 1 : 0.85}
            onClick={onBarClick ? () => onBarClick(w.weekNumber) : undefined}
            style={onBarClick ? { cursor: 'pointer' } : undefined}
          />
        );
      })}
    </svg>
  );
}
