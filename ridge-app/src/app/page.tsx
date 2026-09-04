import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { PrimaryButton, SecondaryButton } from '@/components/ui';

const WELCOME_POINTS = [
  'Connect Garmin and Ridge reads your real training history — no template.',
  'A plan built backwards from your race, not a generic week 1.',
  'Fitness, fatigue and form tracked as a ridgeline you climb and descend.',
];

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (user) {
    const activePlan = await prisma.trainingPlan.findFirst({ where: { userId: user.id, status: 'ACTIVE' } });
    redirect(activePlan ? '/app' : '/onboarding/connect');
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-canvas">
      <div className="w-full max-w-[360px] flex flex-col justify-between min-h-[70vh] py-6">
        <div>
          <svg viewBox="0 0 322 96" width="100%" height="96" className="block overflow-visible mb-8">
            <defs>
              <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#423a6a" />
                <stop offset="100%" stopColor="#161826" />
              </linearGradient>
            </defs>
            <path d="M0,96 L0,72 L44,50 L82,66 L128,22 L176,58 L214,38 L262,74 L322,44 L322,96 Z" fill="url(#wgrad)" />
            <path
              d="M0,72 L44,50 L82,66 L128,22 L176,58 L214,38 L262,74 L322,44"
              fill="none"
              stroke="#d2cefd"
              strokeWidth="1.7"
            />
            <circle cx="128" cy="22" r="4" fill="#161826" stroke="#b5abfc" strokeWidth="1.8" />
          </svg>
          <div className="text-[40px] font-medium tracking-[0.28em] text-text">RIDGE</div>
          <div className="text-[15px] text-neutral-500 mt-4 max-w-[280px]">
            Marathon training built from your own Garmin history, not a template.
          </div>
          <div className="flex flex-col gap-2.5 mt-7">
            {WELCOME_POINTS.map((p) => (
              <div key={p} className="flex gap-3 items-baseline">
                <div className="w-1 h-1 rounded-full bg-accent-700 flex-none relative -top-[3px]" />
                <div className="text-[12.5px] leading-snug text-neutral-600">{p}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2.5 mt-10">
          <Link href="/signup">
            <PrimaryButton type="button">Create account</PrimaryButton>
          </Link>
          <Link href="/login">
            <SecondaryButton type="button" className="w-full">
              I already have an account
            </SecondaryButton>
          </Link>
        </div>
      </div>
    </main>
  );
}
