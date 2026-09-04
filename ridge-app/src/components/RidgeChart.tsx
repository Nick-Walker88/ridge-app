'use client';

import { useMemo, useState } from 'react';
import type { LoadSeriesPoint } from '@/lib/trainingLoad';
import { findDeloadWindows } from '@/lib/trainingLoad';
import { addDays, formatShortDate } from '@/lib/format';

export function RidgeChart({
  series,
  todayIdx,
  planStart,
  threshold = -22,
  onScrub,
}: {
  series: LoadSeriesPoint[];
  todayIdx: number;
  planStart: Date;
  threshold?: number;
  onScrub?: (idx: number) => void;
}) {
  const [scrub, setScrub] = useState(todayIdx);
  const W = 322;
  const H = 140;
  const N = series.length;

  const maxV = Math.max(...series.map((p) => Math.max(p.ctl, p.atl))) * 1.1 || 1;
  const X = (i: number) => (i / (N - 1)) * W;
  const Y = (v: number) => H - (v / maxV) * H;

  const paths = useMemo(() => {
    const line = (key: 'ctl' | 'atl', a: number, b: number) =>
      series
        .slice(a, b + 1)
        .map((p, k) => `${k ? 'L' : 'M'}${X(a + k).toFixed(1)},${Y(p[key]).toFixed(1)}`)
        .join(' ');
    const areaAll = `M0,${H} ${series.map((p, i) => `L${X(i).toFixed(1)},${Y(p.ctl).toFixed(1)}`).join(' ')} L${W},${H} Z`;
    const contours = [0.25, 0.45, 0.65, 0.85, 1].map((f) => ({ y: (H - f * H * 0.85).toFixed(1) }));

    const bands = findDeloadWindows(series, threshold).map((b) => ({
      x: X(b.startIdx).toFixed(1),
      w: (X(b.endIdx) - X(b.startIdx)).toFixed(1),
    }));

    return {
      atlPast: line('atl', 0, todayIdx),
      atlFuture: line('atl', todayIdx, N - 1),
      ctlLine: line('ctl', 0, N - 1),
      areaAll,
      contours,
      bands,
      futureMaskX: X(todayIdx),
    };
  }, [series, todayIdx, threshold]);

  function handlePointer(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(frac * (N - 1));
    setScrub(idx);
    onScrub?.(idx);
  }

  const sp = series[scrub];
  const scrubDate = addDays(planStart, scrub);
  const xLabels = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const i = Math.round(f * (N - 1));
    return { x: X(i).toFixed(1), t: formatShortDate(addDays(planStart, i)) };
  });

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <div className="text-[10.5px] font-medium tracking-[0.16em] uppercase text-neutral-600">Fitness · Fatigue</div>
        <div className="text-[10.5px] tracking-[0.08em] text-accent-400">{formatShortDate(scrubDate)}</div>
      </div>
      <div className="flex gap-4.5 gap-4 my-3">
        <Stat val={Math.round(sp.ctl)} label="Fitness" color="text-text" />
        <Stat val={Math.round(sp.atl)} label="Fatigue" color="text-neutral-400" />
        <Stat val={`${sp.tsb >= 0 ? '+' : ''}${Math.round(sp.tsb)}`} label="Form" color="text-accent-400" />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        className="block touch-none overflow-visible"
        onPointerDown={handlePointer}
        onPointerMove={(e) => e.buttons === 1 && handlePointer(e)}
      >
        <defs>
          <clipPath id="ridgeclip">
            <path d={paths.areaAll} />
          </clipPath>
          <linearGradient id="ridgegrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#423a6a" />
            <stop offset="100%" stopColor="#292b31" />
          </linearGradient>
        </defs>
        <path d={paths.areaAll} fill="url(#ridgegrad)" />
        <g clipPath="url(#ridgeclip)">
          {paths.contours.map((c, i) => (
            <line key={i} x1={0} y1={c.y} x2={W} y2={c.y} stroke="rgba(233,233,237,0.10)" strokeWidth="1" />
          ))}
        </g>
        <rect x={paths.futureMaskX} y={0} width={W - Number(paths.futureMaskX)} height={H} fill="rgba(22,24,38,0.55)" />
        {paths.bands.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={0} width={b.w} height={H} fill="rgba(145,132,217,0.10)" />
            <rect x={b.x} y={0} width={b.w} height={2} fill="#9184d9" />
          </g>
        ))}
        <path d={paths.atlPast} fill="none" stroke="#9184d9" strokeWidth="1.1" opacity="0.8" />
        <path d={paths.atlFuture} fill="none" stroke="#9184d9" strokeWidth="1.1" strokeDasharray="3 3" opacity="0.6" />
        <path d={paths.ctlLine} fill="none" stroke="#e9e9ed" strokeWidth="2" />
        <line x1={X(todayIdx)} y1={0} x2={X(todayIdx)} y2={H} stroke="rgba(233,233,237,0.3)" strokeWidth="1" />
        <line x1={X(scrub)} y1={0} x2={X(scrub)} y2={H} stroke="#e9e9ed" strokeWidth="1" />
        <circle cx={X(scrub)} cy={Y(sp.ctl)} r="3.5" fill="#161826" stroke="#d2cefd" strokeWidth="1.6" />
        <circle cx={X(scrub)} cy={Y(sp.atl)} r="3" fill="#161826" stroke="#9184d9" strokeWidth="1.6" />
        {xLabels.map((l, i) => (
          <text key={i} x={l.x} y={H - 4} fill="#595d6c" fontSize="9" fontFamily="Inter" textAnchor="middle">
            {l.t}
          </text>
        ))}
      </svg>

      <div className="flex gap-3.5 mt-0.5 text-[10px] text-neutral-600">
        <span className="text-text">— Fitness</span>
        <span className="text-accent-700">— Fatigue</span>
        <span>Shaded = deload window</span>
      </div>
    </div>
  );
}

function Stat({ val, label, color }: { val: string | number; label: string; color: string }) {
  return (
    <div>
      <div className={`text-[26px] font-medium tabular ${color}`}>{val}</div>
      <div className="text-[9.5px] tracking-[0.11em] uppercase text-neutral-600 mt-1">{label}</div>
    </div>
  );
}
