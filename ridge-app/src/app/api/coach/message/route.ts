import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/session';
import { coachReply } from '@/lib/coach';

export async function POST(req: Request) {
  const userId = await requireUserId();
  const { text } = await req.json();
  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }

  await prisma.coachMessage.create({ data: { userId, role: 'user', text } });
  const reply = await coachReply(userId, text);
  const saved = await prisma.coachMessage.create({ data: { userId, role: 'coach', text: reply } });

  return NextResponse.json({ id: saved.id, text: reply });
}

export async function GET() {
  const userId = await requireUserId();
  const messages = await prisma.coachMessage.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ messages });
}
