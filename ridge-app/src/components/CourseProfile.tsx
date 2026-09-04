'use client';

export function buildCoursePaths(profile: [number, number][], width: number, height: number, padTop = 6) {
  const miles = profile.map((p) => p[0]);
  const elevs = profile.map((p) => p[1]);
  const minMi = Math.min(...miles);
  const maxMi = Math.max(...miles);
  const minEl = Math.min(...elevs);
  const maxEl = Math.max(...elevs);
  const X = (mi: number) => ((mi - minMi) / (maxMi - minMi || 1)) * width;
  const Y = (el: number) => padTop + (1 - (el - minEl) / (maxEl - minEl || 1)) * (height - padTop);

  const line = profile.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');
  const area = `M${X(minMi).toFixed(1)},${height} ${line.replace(/^M/, 'L')} L${X(maxMi).toFixed(1)},${height} Z`;
  return { line, area, X, Y };
}

export function CourseProfile({
  profile,
  height = 62,
  gradientId,
  marks,
}: {
  profile: [number, number][];
  height?: number;
  gradientId: string;
  marks?: { mile: number; label: string }[];
}) {
  const width = 322;
  const { line, area, X, Y } = buildCoursePaths(profile, width, height - (marks ? 18 : 0));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="block overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#423a6a" />
          <stop offset="100%" stopColor="#161826" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke="#d2cefd" strokeWidth="1.5" />
      {marks?.map((m) => (
        <g key={m.mile}>
          <line x1={X(m.mile)} y1={Y(profile.find((p) => p[0] === m.mile)?.[1] ?? 0)} x2={X(m.mile)} y2={height - 18} stroke="rgba(233,233,237,0.22)" strokeWidth="1" />
          <text x={X(m.mile)} y={height - 3} fill="#75798c" fontSize="9" fontFamily="Inter" textAnchor="middle">
            {m.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
