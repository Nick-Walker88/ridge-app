import type { LoadSeriesPoint } from '@/lib/trainingLoad';
import { findFormRecoveryIndex } from '@/lib/trainingLoad';

export function MiniFormChart({ series, todayIdx }: { series: LoadSeriesPoint[]; todayIdx: number }) {
  const W = 322;
  const H = 56;
  const tsbMax = Math.max(46, ...series.map((p) => Math.abs(p.tsb)));
  const X = (i: number) => (i / (series.length - 1)) * W;
  const Y = (v: number) => H / 2 - (v / tsbMax) * (H / 2);

  const negPath = `M0,${Y(0)} ${series.map((p, i) => `L${X(i).toFixed(1)},${Y(Math.min(0, p.tsb)).toFixed(1)}`).join(' ')} L${W},${Y(0)} Z`;
  const posPath = `M0,${Y(0)} ${series.map((p, i) => `L${X(i).toFixed(1)},${Y(Math.max(0, p.tsb)).toFixed(1)}`).join(' ')} L${W},${Y(0)} Z`;
  const linePast = series
    .slice(0, todayIdx + 1)
    .map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.tsb).toFixed(1)}`)
    .join(' ');
  const lineFuture = series
    .slice(todayIdx)
    .map((p, i) => `${i ? 'L' : 'M'}${X(todayIdx + i).toFixed(1)},${Y(p.tsb).toFixed(1)}`)
    .join(' ');
  const crossIdx = findFormRecoveryIndex(series, todayIdx);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block mt-2 overflow-visible">
      <line x1={0} y1={Y(0)} x2={W} y2={Y(0)} stroke="rgba(233,233,237,0.16)" strokeWidth="1" />
      <path d={negPath} fill="rgba(145,132,217,0.16)" />
      <path d={posPath} fill="rgba(181,171,252,0.30)" />
      <path d={linePast} fill="none" stroke="#b5abfc" strokeWidth="1.6" />
      <path d={lineFuture} fill="none" stroke="#796cbf" strokeWidth="1.4" strokeDasharray="3 3" />
      <line x1={X(todayIdx)} y1={0} x2={X(todayIdx)} y2={H} stroke="rgba(233,233,237,0.28)" strokeWidth="1" />
      <circle cx={X(crossIdx)} cy={Y(0)} r="3" fill="#161826" stroke="#b5abfc" strokeWidth="1.6" />
    </svg>
  );
}
