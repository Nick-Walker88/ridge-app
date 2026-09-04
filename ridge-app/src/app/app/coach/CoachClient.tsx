'use client';

import { useState } from 'react';

const PROMPTS = ['Should I deload this week?', 'Is my goal pace realistic?', 'How does the taper work?', 'Fuelling for race day'];

interface Msg {
  id: string;
  role: 'user' | 'coach';
  text: string;
}

export default function CoachClient({ initialMessages }: { initialMessages: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);

  async function send(text: string) {
    if (!text.trim() || typing) return;
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: 'user', text }]);
    setDraft('');
    setTyping(true);
    try {
      const res = await fetch('/api/coach/message', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { id: data.id ?? `reply-${Date.now()}`, role: 'coach', text: data.text }]);
    } finally {
      setTyping(false);
    }
  }

  return (
    <div className="pt-1 flex flex-col gap-3 pb-16">
      <div className="flex justify-between items-baseline">
        <div className="text-[10.5px] font-medium tracking-[0.16em] uppercase text-neutral-600">Coach</div>
        <div className="text-[10.5px] text-neutral-700">Sees your plan and Garmin data</div>
      </div>
      <div className="border border-white/[0.09] rounded-md px-3.5 py-2.5 text-[10.5px] leading-relaxed text-neutral-600">
        Training and nutrition guidance only. Ridge is not a clinician — for pain, injury or anything medical, see a
        physiotherapist or doctor.
      </div>

      {messages.map((m) => (
        <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed rounded-[13px] ${
              m.role === 'user' ? 'bg-accent-800 text-text rounded-br-[4px]' : 'bg-surface border border-white/[0.09] text-neutral-300 rounded-bl-[4px]'
            }`}
          >
            {m.text}
          </div>
        </div>
      ))}
      {typing && (
        <div className="flex justify-start">
          <div className="px-3.5 py-2.5 rounded-[13px] rounded-bl-[4px] bg-surface border border-white/[0.09] text-[13px] tracking-[0.2em] text-neutral-600">
            ···
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mt-0.5">
        {PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => send(p)}
            className="px-2.5 py-2 rounded-md border border-white/[0.11] text-[11.5px] text-neutral-400 hover:border-accent-700 hover:text-text"
          >
            {p}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="fixed bottom-[84px] left-0 right-0 max-w-[520px] mx-auto px-4 py-2.5 bg-bg border-t border-white/[0.09] flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about your training…"
          className="flex-1 bg-surface border border-white/[0.11] rounded-md px-3 py-2.5 text-[13px] text-text outline-none focus:border-accent"
        />
        <button type="submit" className="px-4 rounded-md border border-accent-700 text-[12px] font-medium text-accent-400 hover:bg-accent/[0.14]">
          Send
        </button>
      </form>
    </div>
  );
}
