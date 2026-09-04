import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import QuestionsClient from './QuestionsClient';

export default async function QuestionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <QuestionsClient />;
}
