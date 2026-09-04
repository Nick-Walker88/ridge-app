'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/session';
import { assessRunner, type OnboardingAnswers } from '@/lib/assessment';
import { computeHistorySummary } from '@/lib/historySummary';
import { estimateVo2max } from '@/lib/vo2max';
import { generatePlan, type Phase as GenPhase } from '@/lib/planGenerator';
import { mondayIndex, addDays } from '@/lib/format';
import { parsePlanCsv, groupIntoWeeks } from '@/lib/csvPlan';

export async function saveOnboardingAnswers(answers: OnboardingAnswers) {
  const userId = await requireUserId();
  await prisma.user.update({ where: { id: userId }, data: { onboardingAnswers: answers as any } });
}

export async function runAnalysis() {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const answers = (user.onboardingAnswers as unknown as OnboardingAnswers) ?? {
    years: '5+ years',
    races: '3–5',
    days: '6',
    long: 'Saturday',
    niggles: 'Nothing',
  };
  const history = await computeHistorySummary(userId);
  const assessment = assessRunner(answers, history);
  const vo2max = estimateVo2max(assessment.thresholdPaceSec);

  await prisma.user.update({
    where: { id: userId },
    data: {
      assessedLevel: assessment.level,
      thresholdPaceSec: assessment.thresholdPaceSec,
      longestRunMiles: history.longestRunMiles,
      peakWeekMiles: history.peakWeekMiles,
      aerobicDecouplingPct: history.aerobicDecouplingPct,
      vo2max,
    },
  });

  return { assessment, history, vo2max };
}

export async function searchRaces(query: string) {
  if (query.trim().length < 2) return [];
  return prisma.race.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { date: 'asc' },
  });
}

function nextWeekday(from: Date, targetDow0Mon: number): Date {
  const cur = mondayIndex(from);
  const delta = (targetDow0Mon - cur + 7) % 7;
  return addDays(from, delta === 0 ? 7 : delta);
}

export async function createDraftPlan(input: {
  raceId: string;
  goalTimeSec: number;
  daysPerWeek: number;
  longRunDay: number; // 0=Mon..6=Sun
}) {
  const userId = await requireUserId();
  const race = await prisma.race.findUniqueOrThrow({ where: { id: input.raceId } });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const now = new Date();
  const weeks = Math.max(4, Math.ceil((race.date.getTime() - now.getTime()) / (7 * 86400000)));
  const startingWeeklyMiles = Math.max(15, Math.round(user.peakWeekMiles ? user.peakWeekMiles * 0.7 : 25));
  const peakWeeklyMiles = Math.max(startingWeeklyMiles + 10, Math.round((user.peakWeekMiles ?? 40) * 1.2));

  const generated = generatePlan({
    weeks,
    raceDistanceMiles: race.distanceMiles,
    goalTimeSec: input.goalTimeSec,
    thresholdPaceSec: user.thresholdPaceSec ?? 7 * 60 + 30,
    daysPerWeek: input.daysPerWeek,
    longRunDay: input.longRunDay,
    startingWeeklyMiles,
    peakWeeklyMiles,
  });

  // Week 1 starts the most recent past-or-current Monday so "today" falls inside it.
  const week1Start = addDays(now, -mondayIndex(now));

  // Clear any prior draft for this user/race so re-running onboarding doesn't accumulate plans.
  await prisma.trainingPlan.deleteMany({ where: { userId, status: 'DRAFT' } });

  const plan = await prisma.trainingPlan.create({
    data: {
      userId,
      raceId: race.id,
      status: 'DRAFT',
      weeks,
      startDate: week1Start,
      goalTimeSec: input.goalTimeSec,
      daysPerWeek: input.daysPerWeek,
      longRunDay: input.longRunDay,
      peakWeeklyMiles,
    },
  });

  for (const w of generated) {
    const weekStart = addDays(week1Start, (w.weekNumber - 1) * 7);
    const planWeek = await prisma.planWeek.create({
      data: {
        planId: plan.id,
        weekNumber: w.weekNumber,
        phase: w.phase as GenPhase,
        startDate: weekStart,
        plannedMiles: w.plannedMiles,
      },
    });
    await prisma.workout.createMany({
      data: w.workouts.map((wo) => ({
        planWeekId: planWeek.id,
        dayOfWeek: wo.dayOfWeek,
        date: addDays(weekStart, wo.dayOfWeek),
        type: wo.type,
        plannedMiles: wo.plannedMiles,
        description: wo.description,
        targetPaceSec: wo.targetPaceSec,
      })),
    });
  }

  return plan.id;
}

export async function adjustDraftPlan(planId: string, changes: { daysPerWeek?: number; longRunDay?: number; peakWeeklyMiles?: number }) {
  const userId = await requireUserId();
  const plan = await prisma.trainingPlan.findFirstOrThrow({ where: { id: planId, userId } });
  const race = await prisma.race.findUniqueOrThrow({ where: { id: plan.raceId } });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const daysPerWeek = changes.daysPerWeek ?? plan.daysPerWeek;
  const longRunDay = changes.longRunDay ?? plan.longRunDay;
  const peakWeeklyMiles = changes.peakWeeklyMiles ?? plan.peakWeeklyMiles;
  const startingWeeklyMiles = Math.max(15, Math.round(user.peakWeekMiles ? user.peakWeekMiles * 0.7 : 25));

  const generated = generatePlan({
    weeks: plan.weeks,
    raceDistanceMiles: race.distanceMiles,
    goalTimeSec: plan.goalTimeSec,
    thresholdPaceSec: user.thresholdPaceSec ?? 7 * 60 + 30,
    daysPerWeek,
    longRunDay,
    startingWeeklyMiles,
    peakWeeklyMiles,
  });

  await prisma.planWeek.deleteMany({ where: { planId } });
  for (const w of generated) {
    const weekStart = addDays(plan.startDate, (w.weekNumber - 1) * 7);
    const planWeek = await prisma.planWeek.create({
      data: { planId, weekNumber: w.weekNumber, phase: w.phase as GenPhase, startDate: weekStart, plannedMiles: w.plannedMiles },
    });
    await prisma.workout.createMany({
      data: w.workouts.map((wo) => ({
        planWeekId: planWeek.id,
        dayOfWeek: wo.dayOfWeek,
        date: addDays(weekStart, wo.dayOfWeek),
        type: wo.type,
        plannedMiles: wo.plannedMiles,
        description: wo.description,
        targetPaceSec: wo.targetPaceSec,
      })),
    });
  }

  await prisma.trainingPlan.update({ where: { id: planId }, data: { daysPerWeek, longRunDay, peakWeeklyMiles } });
  revalidatePath('/onboarding/plan-review');
}

export async function activatePlan(planId: string) {
  const userId = await requireUserId();
  await prisma.trainingPlan.updateMany({ where: { userId, status: 'ACTIVE' }, data: { status: 'COMPLETED' } });
  await prisma.trainingPlan.update({ where: { id: planId }, data: { status: 'ACTIVE' } });
  revalidatePath('/app');
}

export async function toggleWorkout(workoutId: string) {
  await requireUserId();
  const w = await prisma.workout.findUniqueOrThrow({ where: { id: workoutId } });
  await prisma.workout.update({ where: { id: workoutId }, data: { completed: !w.completed } });
  revalidatePath('/app');
}

/** For races outside the seeded database — no elevation profile, so the
 *  course chart just won't render fancy elevation, everything else works. */
export async function createManualRace(input: { name: string; city: string; region: string; date: string; distanceMiles: number }) {
  await requireUserId();
  const date = new Date(`${input.date}T12:00:00`);
  const race = await prisma.race.upsert({
    where: { name_date: { name: input.name, date } },
    create: {
      name: input.name,
      city: input.city || 'Unknown',
      region: input.region || '',
      date,
      distanceMiles: input.distanceMiles,
      startElevationFt: 0,
      finishElevationFt: 0,
      netElevationFt: 0,
      totalGainFt: 0,
      fieldSize: 'Unknown',
      tempLowF: 50,
      tempHighF: 65,
      qualifyingStandard: 'None',
      note: 'Custom race — no course profile on file yet.',
      profile: [
        [0, 0],
        [input.distanceMiles, 0],
      ],
    },
    update: {},
  });
  return race.id;
}

export async function importPlanFromCsv(input: { raceId: string; goalTimeSec: number; csvText: string }) {
  const userId = await requireUserId();
  const { rows, errors } = parsePlanCsv(input.csvText);
  if (errors.length > 0 || rows.length === 0) {
    return { ok: false as const, errors: errors.length ? errors : ['No valid rows found.'] };
  }

  const weeks = groupIntoWeeks(rows);
  const startDate = weeks[0].startDate;
  const peakWeeklyMiles = Math.round(Math.max(...weeks.map((w) => w.plannedMiles)));

  const longRunDayCounts = new Map<number, number>();
  const runningDayCounts = new Set<number>();
  for (const r of rows) {
    const dow = (r.date.getDay() + 6) % 7;
    if (r.type === 'LONG') longRunDayCounts.set(dow, (longRunDayCounts.get(dow) ?? 0) + 1);
    if (r.miles > 0) runningDayCounts.add(dow);
  }
  const longRunDay = [...longRunDayCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 6;
  const daysPerWeek = Math.max(1, runningDayCounts.size);

  await prisma.trainingPlan.deleteMany({ where: { userId, status: 'DRAFT' } });
  const plan = await prisma.trainingPlan.create({
    data: {
      userId,
      raceId: input.raceId,
      status: 'DRAFT',
      source: 'imported',
      weeks: weeks.length,
      startDate,
      goalTimeSec: input.goalTimeSec,
      daysPerWeek,
      longRunDay,
      peakWeeklyMiles,
    },
  });

  for (const w of weeks) {
    const planWeek = await prisma.planWeek.create({
      data: {
        planId: plan.id,
        weekNumber: w.weekNumber,
        phase: w.phase as GenPhase,
        startDate: w.startDate,
        plannedMiles: w.plannedMiles,
      },
    });
    await prisma.workout.createMany({
      data: w.workouts.map((wo) => ({
        planWeekId: planWeek.id,
        dayOfWeek: (wo.date.getDay() + 6) % 7,
        date: wo.date,
        type: wo.type,
        plannedMiles: wo.miles,
        description: wo.description,
        targetPaceSec: wo.targetPaceSec ?? undefined,
      })),
    });
  }

  return { ok: true as const, planId: plan.id };
}
