'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Kicker, ScreenTitle, PrimaryButton, Card } from '@/components/ui';
import { searchRaces, createManualRace, importPlanFromCsv } from '@/lib/actions';
import { buildCsvTemplate, parsePlanCsv, groupIntoWeeks } from '@/lib/csvPlan';

interface RaceResult {
  id: string;
  name: string;
  city: string;
  region: string;
  date: string | Date;
}

function parseGoalTime(text: string): number | null {
  const parts = text.trim().split(':').map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

export default function ImportClient() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RaceResult[]>([]);
  const [picked, setPicked] = useState<RaceResult | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manual, setManual] = useState({ name: '', city: '', region: '', date: '', distanceMiles: '26.2' });

  const [goalText, setGoalText] = useState('');
  const [csvText, setCsvText] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const preview = useMemo(() => (csvText ? parsePlanCsv(csvText) : null), [csvText]);
  const weeksPreview = useMemo(() => (preview && preview.rows.length ? groupIntoWeeks(preview.rows) : []), [preview]);

  async function onQuery(q: string) {
    setQuery(q);
    setPicked(null);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const r = await searchRaces(q);
    setResults(r as unknown as RaceResult[]);
  }

  function downloadTemplate() {
    const blob = new Blob([buildCsvTemplate()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ridge-plan-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ''));
    reader.readAsText(file);
  }

  async function saveManualRace() {
    if (!manual.name || !manual.date) return;
    const id = await createManualRace({
      name: manual.name,
      city: manual.city,
      region: manual.region,
      date: manual.date,
      distanceMiles: parseFloat(manual.distanceMiles) || 26.2,
    });
    setPicked({ id, name: manual.name, city: manual.city, region: manual.region, date: manual.date });
    setManualMode(false);
  }

  async function submit() {
    setErrors([]);
    const goalTimeSec = parseGoalTime(goalText);
    if (!picked) {
      setErrors(['Pick or add a race first.']);
      return;
    }
    if (!goalTimeSec) {
      setErrors(['Goal time should look like 3:00:00 (or 45:00 for a shorter race).']);
      return;
    }
    if (!csvText) {
      setErrors(['Upload your plan CSV first.']);
      return;
    }
    setBusy(true);
    const res = await importPlanFromCsv({ raceId: picked.id, goalTimeSec, csvText });
    setBusy(false);
    if (!res.ok) {
      setErrors(res.errors);
      return;
    }
    router.push(`/onboarding/plan-review?planId=${res.planId}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-canvas">
      <div className="w-full max-w-[360px] py-6">
        <Kicker>Import your plan</Kicker>
        <ScreenTitle>Bring your own plan</ScreenTitle>
        <div className="text-[13px] leading-relaxed text-neutral-500 mt-2.5">
          Already have a training plan? Upload it as a CSV and Ridge tracks it — Today, Week, Plan, Load and the coach all
          work the same, they just follow your sessions instead of generating new ones.
        </div>

        {/* Race */}
        <div className="mt-6">
          <div className="text-[10.5px] tracking-[0.16em] uppercase text-neutral-600 mb-2">Race</div>
          {!picked && !manualMode && (
            <>
              <input
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="Search a marathon…"
                className="w-full box-border bg-surface border border-white/10 rounded-md px-3.5 py-3 text-[13.5px] text-text outline-none focus:border-accent"
              />
              <div className="flex flex-col gap-1.5 mt-2.5">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setPicked(r)}
                    className="text-left border border-white/[0.09] rounded-md bg-surface px-3.5 py-2.5 hover:border-accent-700"
                  >
                    <div className="text-[13px] text-text">{r.name}</div>
                    <div className="text-[10.5px] text-neutral-600 mt-0.5">
                      {r.city}, {r.region}
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setManualMode(true)} className="text-[11.5px] text-accent-400 hover:text-accent-300 mt-2.5">
                Can't find it? Add it manually
              </button>
            </>
          )}

          {manualMode && (
            <Card className="px-3.5 py-3.5 flex flex-col gap-2.5">
              <Field label="Race name" value={manual.name} onChange={(v) => setManual({ ...manual, name: v })} />
              <div className="flex gap-2.5">
                <Field label="City" value={manual.city} onChange={(v) => setManual({ ...manual, city: v })} />
                <Field label="State" value={manual.region} onChange={(v) => setManual({ ...manual, region: v })} />
              </div>
              <div className="flex gap-2.5">
                <Field label="Date" type="date" value={manual.date} onChange={(v) => setManual({ ...manual, date: v })} />
                <Field label="Distance (mi)" value={manual.distanceMiles} onChange={(v) => setManual({ ...manual, distanceMiles: v })} />
              </div>
              <PrimaryButton onClick={saveManualRace} disabled={!manual.name || !manual.date}>
                Use this race
              </PrimaryButton>
            </Card>
          )}

          {picked && (
            <div className="flex items-center justify-between border border-accent-700 rounded-md bg-accent/10 px-3.5 py-3">
              <div>
                <div className="text-[13px] text-text">{picked.name}</div>
                <div className="text-[10.5px] text-neutral-600 mt-0.5">
                  {new Date(picked.date).toDateString()}
                </div>
              </div>
              <button onClick={() => setPicked(null)} className="text-[10.5px] text-neutral-600 hover:text-accent-400">
                Change
              </button>
            </div>
          )}
        </div>

        {/* Goal time */}
        <div className="mt-5">
          <div className="text-[10.5px] tracking-[0.16em] uppercase text-neutral-600 mb-2">Goal time</div>
          <input
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            placeholder="3:00:00"
            className="w-full box-border bg-surface border border-white/10 rounded-md px-3.5 py-3 text-[13.5px] text-text outline-none focus:border-accent"
          />
        </div>

        {/* CSV upload */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[10.5px] tracking-[0.16em] uppercase text-neutral-600">Your plan (CSV)</div>
            <button onClick={downloadTemplate} className="text-[11px] text-accent-400 hover:text-accent-300">
              Download template
            </button>
          </div>
          <div className="text-[11px] leading-relaxed text-neutral-600 mb-2.5">
            Columns: <span className="text-neutral-400">date, type, miles, description, target_pace</span>. type is one of
            EASY, TEMPO, LONG, REST, RACE. target_pace is optional, like 7:30.
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full text-left border border-dashed border-white/20 rounded-md px-3.5 py-3.5 text-[13px] text-neutral-400 hover:border-accent-700"
          >
            {csvFileName || 'Choose a .csv file…'}
          </button>

          {preview && (
            <div className="mt-2.5">
              {preview.errors.length > 0 ? (
                <div className="text-[11.5px] text-red-400 leading-relaxed">
                  {preview.errors.slice(0, 6).map((e, i) => (
                    <div key={i}>{e}</div>
                  ))}
                </div>
              ) : (
                <div className="text-[11.5px] text-neutral-500">
                  {weeksPreview.length} weeks · {preview.rows.length} sessions ·{' '}
                  {Math.round(preview.rows.reduce((s, r) => s + r.miles, 0))} total miles
                </div>
              )}
            </div>
          )}
        </div>

        {errors.length > 0 && (
          <div className="mt-4 text-[12px] text-red-400 leading-relaxed">
            {errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <PrimaryButton disabled={busy} onClick={submit}>
            {busy ? 'Importing…' : 'Import plan'}
          </PrimaryButton>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="flex-1">
      <div className="text-[9.5px] tracking-[0.1em] uppercase text-neutral-600 mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        className="w-full box-border bg-bg border border-white/10 rounded-md px-2.5 py-2 text-[12.5px] text-text outline-none focus:border-accent"
      />
    </div>
  );
}
