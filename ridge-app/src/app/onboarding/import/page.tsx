import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import ImportClient from './ImportClient';

export default async function ImportPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.vo2max) redirect('/onboarding/analyzing');

  return <ImportClient />;
}
