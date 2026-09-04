import { prisma } from '@/lib/prisma';
import { formatPace } from '@/lib/format';

export function isCoachConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM_PROMPT = `You are Ridge's running coach. You answer questions about the athlete's marathon training plan, their logged Garmin data, race-day strategy, pacing, taper structure and fuelling, grounded strictly in the context provided below. Keep answers to 2-4 sentences, concrete and numbers-first, in the voice of an experienced coach — no filler, no hedging.

Hard rule: you are not a clinician. For anything about pain, injury, or medical symptoms, give general load-management context if useful but explicitly hand off to a physiotherapist or doctor rather than diagnosing or prescribing treatment.`;

async function buildContext(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const plan = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: { race: true, planWeeks: { include: { workouts: true }, orderBy: { weekNumber: 'asc' } } },
  });
  const recentActivities = await prisma.activity.findMany({
    where: { userId },
    orderBy: { startTime: 'desc' },
    take: 8,
  });

  const lines: string[] = [];
  if (user) {
    lines.push(`Runner: ${user.name}, assessed level ${user.assessedLevel ?? 'unknown'}, threshold pace ${user.thresholdPaceSec ? formatPace(user.thresholdPaceSec) : 'unknown'}/mi.`);
  }
  if (plan) {
    lines.push(
      `Plan: ${plan.weeks} weeks toward ${plan.race.name} on ${plan.race.date.toDateString()}, goal ${Math.round(plan.goalTimeSec / 60)} min, peak week ${plan.peakWeeklyMiles} mi.`,
    );
    const upcoming = plan.planWeeks.flatMap((w) => w.workouts).filter((w) => w.date >= new Date()).slice(0, 7);
    if (upcoming.length) {
      lines.push('Next 7 planned sessions: ' + upcoming.map((w) => `${w.date.toDateString()} ${w.type} ${w.plannedMiles}mi`).join('; '));
    }
  }
  if (recentActivities.length) {
    lines.push(
      'Recent logged runs: ' +
        recentActivities
          .map((a) => `${a.startTime.toDateString()} ${a.label ?? a.type} ${a.distanceMiles.toFixed(1)}mi @ ${formatPace(a.avgPaceSec)}/mi${a.avgHr ? `, ${a.avgHr} bpm` : ''}`)
          .join('; '),
    );
  }
  return lines.join('\n');
}

const CANNED_REPLIES: [RegExp, string][] = [
  [/deload|cut ?back|recover|rest week/i, "Check the Load tab for today's form (TSB) reading — if it's deep negative and a cutback week isn't close, pulling one forward costs a quality session, not fitness."],
  [/taper/i, 'Taper is the last 2-3 weeks before race week: volume steps down while intensity holds, so form should cross back to positive by race week.'],
  [/pace|goal|sub.?3|time/i, 'Check the Race day tab for your Riegel-projected times from your best recent result — that projection, not a round number, should set your goal pace.'],
  [/injur|hurt|pain|niggle|sore/i, "I can reason about training load, not diagnose. If something hurts while walking or is getting worse over a few days, that's a question for a physio, not for me."],
  [/fuel|nutrition|gel|carb/i, 'At marathon effort most runners need 60-90g of carbohydrate an hour — practice the exact gel timing on a long run, not on race day.'],
  [/long run/i, 'The long run in Peak phase is where you should be running the back portion at closer to goal pace — check this week\'s plan for the split.'],
  [/heat|hot|weather/i, 'Check the Race day tab for the race-morning forecast — heat training in the weeks before is the main lever if it runs warm.'],
];
const FALLBACK = 'I can work from your plan, your Garmin history, or the course. Ask about the taper, your goal pace, deload timing, or fuelling.';

export async function coachReply(userId: string, question: string): Promise<string> {
  if (!isCoachConfigured()) {
    const hit = CANNED_REPLIES.find(([re]) => re.test(question));
    return hit ? hit[1] : FALLBACK;
  }

  const context = await buildContext(userId);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      max_tokens: 400,
      system: `${SYSTEM_PROMPT}\n\nContext:\n${context}`,
      messages: [{ role: 'user', content: question }],
    }),
  });

  if (!res.ok) {
    const hit = CANNED_REPLIES.find(([re]) => re.test(question));
    return hit ? hit[1] : FALLBACK;
  }
  const data = await res.json();
  const text = data.content?.map((b: any) => b.text).join('') ?? FALLBACK;
  return text || FALLBACK;
}
