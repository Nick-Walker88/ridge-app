'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Kicker, PrimaryButton, SecondaryButton } from '@/components/ui';
import { saveOnboardingAnswers } from '@/lib/actions';
import type { OnboardingAnswers } from '@/lib/assessment';

const QUESTIONS: { k: keyof OnboardingAnswers; t: string; h: string; o: string[] }[] = [
  { k: 'years', t: 'How long have you been running consistently?', h: 'We check this against your Garmin history.', o: ['Under a year', '1–3 years', '3–5 years', '5+ years'] },
  { k: 'races', t: 'How many marathons have you finished?', h: '', o: ['None yet', '1–2', '3–5', '6 or more'] },
  { k: 'days', t: 'How many days a week can you run?', h: 'Rest days get placed around your long run.', o: ['3', '4', '5', '6', '7'] },
  { k: 'long', t: 'Which day suits your long run?', h: '', o: ['Saturday', 'Sunday', 'Flexible'] },
  { k: 'niggles', t: 'Anything bothering you right now?', h: 'Affects how fast volume ramps.', o: ['Nothing', 'A minor niggle', 'Managing an injury'] },
];

export default function QuestionsClient() {
  const router = useRouter();
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>({});
  const [busy, setBusy] = useState(false);
  const q = QUESTIONS[qi];

  async function pick(value: string) {
    const next = { ...answers, [q.k]: value };
    setAnswers(next);
    if (qi < QUESTIONS.length - 1) {
      setQi(qi + 1);
    } else {
      setBusy(true);
      await saveOnboardingAnswers(next as OnboardingAnswers);
      router.push('/onboarding/analyzing');
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-canvas">
      <div className="w-full max-w-[360px] flex flex-col justify-between min-h-[65vh] py-6">
        <div>
          <div className="flex gap-1 mb-6">
            {QUESTIONS.map((_, i) => (
              <div key={i} className={`h-[3px] flex-1 rounded-full ${i <= qi ? 'bg-accent' : 'bg-white/10'}`} />
            ))}
          </div>
          <Kicker>
            Step 2 of 4 · {qi + 1} of {QUESTIONS.length}
          </Kicker>
          <div className="text-[24px] font-medium tracking-[-0.02em] text-text mt-3.5 max-w-[290px] leading-tight">{q.t}</div>
          {q.h && <div className="text-[12.5px] leading-snug text-neutral-600 mt-2.5">{q.h}</div>}
          <div className="flex flex-col gap-1.5 mt-6">
            {q.o.map((opt) => {
              const active = answers[q.k] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => pick(opt)}
                  disabled={busy}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-md border text-left text-[13.5px] font-normal cursor-pointer transition-colors ${
                    active ? 'border-accent text-text bg-accent/10' : 'border-white/10 text-neutral-400 hover:border-accent-700'
                  }`}
                >
                  <span>{opt}</span>
                  <span className={active ? 'text-accent-300' : 'text-transparent'}>✓</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2.5 mt-8">
          <SecondaryButton type="button" onClick={() => setQi((i) => Math.max(0, i - 1))} disabled={qi === 0}>
            Back
          </SecondaryButton>
        </div>
      </div>
    </main>
  );
}
