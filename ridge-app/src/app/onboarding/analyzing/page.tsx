import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import AnalyzingClient from './AnalyzingClient';

export default async function AnalyzingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <AnalyzingClient />;
}
