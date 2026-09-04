import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import ConnectClient from './ConnectClient';

const PERMISSIONS = [
  { name: 'Activities', detail: 'Every run, ride and walk' },
  { name: 'Heart rate & zones', detail: 'Per-second HR, zone minutes' },
  { name: 'VO2 max & training load', detail: 'Garmin estimates, per run' },
  { name: 'Sleep & body battery', detail: 'Recovery signals' },
  { name: 'Course & elevation', detail: 'Route profiles for your races' },
];

export default async function ConnectPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <ConnectClient permissions={PERMISSIONS} />;
}
