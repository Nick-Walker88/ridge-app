import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import CoachClient from './CoachClient';

export default async function CoachPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  let messages = await prisma.coachMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } });
  if (messages.length === 0) {
    const opener = await prisma.coachMessage.create({
      data: {
        userId: user.id,
        role: 'coach',
        text: "Plan is loaded. Ask about the taper, your goal pace, deload timing, or fuelling — I'm reading your actual plan and Garmin history.",
      },
    });
    messages = [opener];
  }

  return <CoachClient initialMessages={messages.map((m) => ({ id: m.id, role: m.role as 'user' | 'coach', text: m.text }))} />;
}
