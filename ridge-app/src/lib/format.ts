export function formatPace(secPerMile: number): string {
  const m = Math.floor(secPerMile / 60);
  const s = Math.round(secPerMile % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatClock(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:00`;
  return `${m}:00`;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DOW = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export function formatShortDate(d: Date): string {
  return `${MON[d.getMonth()]} ${d.getDate()}`;
}

export function formatDowDate(d: Date): string {
  return `${DOW_SHORT[(d.getDay() + 6) % 7]} ${MON[d.getMonth()]} ${d.getDate()}`;
}

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Monday-indexed day-of-week: 0=Mon .. 6=Sun */
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}
