// CSV import for a runner's own training plan — an alternative to the
// generator for people who already have a plan (from a coach, a previous
// cycle, or their own spreadsheet) and just want Ridge's tracking/coach/
// load screens on top of it, without Ridge rewriting their sessions.

export interface ImportedWorkoutRow {
  date: Date;
  type: 'EASY' | 'TEMPO' | 'LONG' | 'REST' | 'RACE';
  miles: number;
  description: string;
  targetPaceSec: number | null;
}

const VALID_TYPES = new Set(['EASY', 'TEMPO', 'LONG', 'REST', 'RACE']);

export function buildCsvTemplate(): string {
  const today = new Date();
  const sample = [
    ['date', 'type', 'miles', 'description', 'target_pace'],
    [isoDate(addDays(today, 0)), 'EASY', '5', '5mi easy', '8:30'],
    [isoDate(addDays(today, 1)), 'REST', '0', 'Rest', ''],
    [isoDate(addDays(today, 2)), 'TEMPO', '7', '7mi w/ 4mi @7:10 tempo', '7:10'],
    [isoDate(addDays(today, 3)), 'EASY', '5', '5mi easy', '8:30'],
    [isoDate(addDays(today, 5)), 'LONG', '14', '14mi long', '8:15'],
  ];
  return sample.map((row) => row.map(csvEscape).join(',')).join('\n');
}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Minimal RFC4180-ish CSV line parser: handles quoted fields with embedded commas/quotes. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function parsePaceToSec(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const m = /^(\d+):(\d{2})$/.exec(t);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export interface CsvParseResult {
  rows: ImportedWorkoutRow[];
  errors: string[];
}

export function parsePlanCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const errors: string[] = [];
  if (lines.length < 2) {
    return { rows: [], errors: ['File has no data rows.'] };
  }

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = {
    date: header.indexOf('date'),
    type: header.indexOf('type'),
    miles: header.indexOf('miles'),
    description: header.indexOf('description'),
    pace: header.indexOf('target_pace'),
  };
  if (idx.date < 0 || idx.type < 0 || idx.miles < 0) {
    errors.push('Header row must include at least: date, type, miles.');
    return { rows: [], errors };
  }

  const rows: ImportedWorkoutRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const lineNo = i + 1;
    const rawDate = (cols[idx.date] ?? '').trim();
    const rawType = (cols[idx.type] ?? '').trim().toUpperCase();
    const rawMiles = (cols[idx.miles] ?? '').trim();
    const rawDesc = idx.description >= 0 ? (cols[idx.description] ?? '').trim() : '';
    const rawPace = idx.pace >= 0 ? (cols[idx.pace] ?? '').trim() : '';

    const date = new Date(`${rawDate}T12:00:00`);
    if (isNaN(date.getTime())) {
      errors.push(`Line ${lineNo}: invalid date "${rawDate}" (use YYYY-MM-DD).`);
      continue;
    }
    if (!VALID_TYPES.has(rawType)) {
      errors.push(`Line ${lineNo}: type must be one of EASY, TEMPO, LONG, REST, RACE — got "${rawType}".`);
      continue;
    }
    const miles = parseFloat(rawMiles);
    if (isNaN(miles) || miles < 0) {
      errors.push(`Line ${lineNo}: miles must be a non-negative number — got "${rawMiles}".`);
      continue;
    }
    const targetPaceSec = rawPace ? parsePaceToSec(rawPace) : null;
    if (rawPace && targetPaceSec === null) {
      errors.push(`Line ${lineNo}: target_pace must look like "7:30" — got "${rawPace}".`);
      continue;
    }

    rows.push({
      date,
      type: rawType as ImportedWorkoutRow['type'],
      miles,
      description: rawDesc || `${miles}mi ${rawType.toLowerCase()}`,
      targetPaceSec,
    });
  }

  if (rows.length === 0 && errors.length === 0) errors.push('No valid rows found.');
  return { rows, errors };
}

/** Groups parsed rows into Monday-start weeks and applies a simple
 *  proximity-to-race-day phase label, purely for the Plan/Load screens'
 *  color-coding — it doesn't affect the imported miles or descriptions. */
export function groupIntoWeeks(rows: ImportedWorkoutRow[]) {
  const sorted = [...rows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const weekMap = new Map<string, ImportedWorkoutRow[]>();
  for (const r of sorted) {
    const monday = new Date(r.date);
    const dow = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - dow);
    monday.setHours(0, 0, 0, 0);
    const key = monday.toISOString().slice(0, 10);
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(r);
  }
  const weekKeys = Array.from(weekMap.keys()).sort();
  const totalWeeks = weekKeys.length;

  return weekKeys.map((key, i) => {
    const workouts = weekMap.get(key)!;
    const plannedMiles = workouts.reduce((sum, w) => sum + w.miles, 0);
    const fromEnd = totalWeeks - 1 - i;
    const phase = workouts.some((w) => w.type === 'RACE')
      ? 'RACE'
      : fromEnd <= 2
        ? 'TAPER'
        : fromEnd <= totalWeeks * 0.4
          ? 'PEAK'
          : fromEnd <= totalWeeks * 0.65
            ? 'STRENGTH'
            : fromEnd <= totalWeeks * 0.85
              ? 'THRESHOLD'
              : 'BASE';
    return { weekNumber: i + 1, startDate: new Date(key), phase, plannedMiles, workouts };
  });
}
