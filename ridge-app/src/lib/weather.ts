// Race-morning forecast. Inside Open-Meteo's ~16-day horizon we pull a real
// forecast for the start-line coordinates (no API key required); further
// out we fall back to the race's climate-normal range, exactly like the
// design's "resolution improves inside 10 days" framing.

const START_COORDS: Record<string, { lat: number; lon: number }> = {
  'St. George Marathon': { lat: 37.0965, lon: -113.5684 },
  'Chicago Marathon': { lat: 41.8781, lon: -87.6298 },
  'CIM · California International': { lat: 38.6779, lon: -121.1761 },
  'Boston Marathon': { lat: 42.2287, lon: -71.5226 },
  "Grandma's Marathon": { lat: 47.0335, lon: -91.6714 },
};

const WMO_COND: Record<number, string> = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Fog', 51: 'Light drizzle', 61: 'Light rain', 63: 'Rain',
  71: 'Light snow', 80: 'Showers', 95: 'Thunderstorms',
};

export interface ForecastRow {
  when: string;
  temp: string;
  cond: string;
}

export async function getRaceMorningForecast(
  raceName: string,
  raceDate: Date,
  tempLowF: number,
  tempHighF: number,
): Promise<{ rows: ForecastRow[]; isLive: boolean }> {
  const daysOut = Math.round((raceDate.getTime() - Date.now()) / 86400000);
  const coords = START_COORDS[raceName];

  if (coords && daysOut >= 0 && daysOut <= 15) {
    try {
      const dateStr = raceDate.toISOString().slice(0, 10);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m,weathercode&temperature_unit=fahrenheit&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        const hours: string[] = data.hourly.time;
        const temps: number[] = data.hourly.temperature_2m;
        const codes: number[] = data.hourly.weathercode;
        const pick = (hh: number) => hours.findIndex((h) => new Date(h).getHours() === hh);
        const marks = [
          { when: 'Start · 6:45 AM', hh: 7 },
          { when: 'Mile 13 · ~8:15 AM', hh: 8 },
          { when: 'Mile 20 · ~9:05 AM', hh: 9 },
          { when: 'Finish · ~9:45 AM', hh: 10 },
        ];
        const rows = marks.map((m) => {
          const idx = pick(m.hh);
          const t = idx >= 0 ? Math.round(temps[idx]) : null;
          const c = idx >= 0 ? WMO_COND[codes[idx]] ?? 'Mixed' : null;
          return { when: m.when, temp: t !== null ? `${t} °F` : '—', cond: c ?? 'Forecast pending' };
        });
        return { rows, isLive: true };
      }
    } catch {
      // fall through to climate-normal
    }
  }

  const rows: ForecastRow[] = [
    { when: 'Start · 6:45 AM', temp: `${tempLowF} °F`, cond: 'Clear (normal)' },
    { when: 'Mile 13 · ~8:15 AM', temp: `${Math.round(tempLowF + (tempHighF - tempLowF) * 0.35)} °F`, cond: 'Clear (normal)' },
    { when: 'Mile 20 · ~9:05 AM', temp: `${Math.round(tempLowF + (tempHighF - tempLowF) * 0.7)} °F`, cond: 'Sun (normal)' },
    { when: 'Finish · ~9:45 AM', temp: `${tempHighF} °F`, cond: 'Sun (normal)' },
  ];
  return { rows, isLive: false };
}
