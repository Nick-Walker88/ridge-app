import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import RaceClient from './RaceClient';

export default async function RacePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.vo2max) redirect('/onboarding/analyzing');

  const answers = (user.onboardingAnswers as any) ?? { days: '6', long: 'Saturday' };
  const dowMap: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };

  return (
    <RaceClient
      vo2max={user.vo2max}
      daysPerWeek={parseInt(answers.days, 10) || 6}
      longRunDay={dowMap[answers.long] ?? 5}
    />
  );
}
