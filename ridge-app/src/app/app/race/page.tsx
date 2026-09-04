import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { getActivePlan, daysToRace } from '@/lib/appData';
import { CourseProfile } from '@/components/CourseProfile';
import { buildPredictions } from '@/lib/predictions';
import { getRaceMorningForecast } from '@/lib/weather';
import { formatDuration, formatPace } from '@/lib/format';

export default async function RaceDayPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const plan = await getActivePlan(user.id);
  if (!plan) redirect('/onboarding/connect');

  const race = plan.race;
  const daysOut = daysToRace(race.date);
  const profile = race.profile as unknown as [number, number][];

  const predictions = buildPredictions({
    bestMarathonSec: user.bestMarathonSec,
    bestHalfSec: user.bestHalfSec,
    vo2max: user.vo2max,
  });
  const { rows: weather, isLive } = await getRaceMorningForecast(race.name, race.date, race.tempLowF, race.tempHighF);

  const raceRows = [
    { l: 'Distance', v: `${race.distanceMiles} mi` },
    { l: 'Start elevation', v: `${race.startElevationFt.toLocaleString()} ft` },
    { l: 'Finish elevation', v: `${race.finishElevationFt.toLocaleString()} ft` },
    { l: 'Net elevation', v: `${race.netElevationFt > 0 ? '+' : ''}${race.netElevationFt} ft` },
    { l: 'Total gain', v: `${race.totalGainFt} ft` },
    { l: 'Field size', v: race.fieldSize },
    { l: 'Qualifying standard', v: race.qualifyingStandard },
  ];

  const goalPaceSec = Math.round(plan.goalTimeSec / race.distanceMiles);

  return (
    <div className="pt-1">
      <div className="flex items-baseline gap-2.5">
        <div className="text-[62px] font-medium leading-[0.85] tracking-[-0.04em] tabular text-text">{daysOut}</div>
        <div>
          <div className="text-[12px] text-neutral-500">days to go</div>
          <div className="text-[11px] text-neutral-600">{race.date.toDateString()}</div>
        </div>
      </div>

      <div className="text-[10.5px] font-medium tracking-[0.16em] uppercase text-neutral-600 mt-6 mb-2">
        Course · {race.distanceMiles} mi, net {race.netElevationFt > 0 ? '+' : ''}{race.netElevationFt} ft
      </div>
      <CourseProfile
        profile={profile}
        gradientId="coursegrad"
        height={108}
        marks={[
          { mile: profile[0][0], label: 'Start' },
          { mile: profile[Math.floor(profile.length / 2)][0], label: 'Mid' },
          { mile: profile[profile.length - 1][0], label: 'Finish' },
        ]}
      />

      <div className="text-[10.5px] font-medium tracking-[0.16em] uppercase text-neutral-600 mt-6 mb-2.5">Race-morning forecast</div>
      <div className="border border-white/[0.09] rounded-md bg-surface overflow-hidden">
        {weather.map((w, i) => (
          <div key={i} className={`flex items-center gap-3 px-3.5 py-2.5 ${i < weather.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
            <div className="flex-1 text-[11.5px] text-neutral-500">{w.when}</div>
            <div className="text-[13px] font-medium tabular text-text">{w.temp}</div>
            <div className="w-[104px] text-right text-[10.5px] text-neutral-600">{w.cond}</div>
          </div>
        ))}
      </div>
      <div className="text-[9.5px] leading-relaxed text-neutral-700 mt-2">
        {isLive
          ? 'Live forecast — updates as race day gets closer.'
          : `Forecast resolution improves inside 10 days. Today's figures are the climate-normal range for ${race.date.toDateString()}.`}
      </div>

      <div className="text-[10.5px] font-medium tracking-[0.16em] uppercase text-neutral-600 mt-6 mb-2.5">Predicted times, all distances</div>
      <div className="flex flex-col gap-1.5">
        {predictions.map((p) => (
          <div key={p.label} className="flex items-center border border-white/[0.09] rounded-md bg-surface px-3.5 py-2.5">
            <div className="flex-1">
              <div className="text-[12.5px] text-text">{p.label}</div>
              <div className="text-[10px] text-neutral-600 mt-0.5">{p.basis}</div>
            </div>
            <div className="text-right">
              <div className="text-[13px] font-medium tabular text-text">{formatDuration(p.timeSec)}</div>
              <div className="text-[10px] tabular text-neutral-600 mt-0.5">{formatPace(p.paceSecPerMile)} /mi</div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-[10.5px] font-medium tracking-[0.16em] uppercase text-neutral-600 mt-6 mb-2.5">Race day</div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between border-b border-white/[0.08] px-0.5 py-2.5">
          <div className="text-[12.5px] text-neutral-500">Goal pace</div>
          <div className="text-[12px] tabular text-text">{formatPace(goalPaceSec)} /mi</div>
        </div>
        {raceRows.map((r) => (
          <div key={r.l} className="flex items-baseline justify-between border-b border-white/[0.08] px-0.5 py-2.5">
            <div className="text-[12.5px] text-neutral-500">{r.l}</div>
            <div className="text-[12px] tabular text-text">{r.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
