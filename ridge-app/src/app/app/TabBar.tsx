'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/app', label: 'Today' },
  { href: '/app/week', label: 'Week' },
  { href: '/app/plan', label: 'Plan' },
  { href: '/app/load', label: 'Load' },
  { href: '/app/race', label: 'Race' },
  { href: '/app/coach', label: 'Coach' },
];

export default function TabBar() {
  const pathname = usePathname();
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-[520px] mx-auto px-2.5 pb-2 pt-1 flex items-start bg-gradient-to-t from-bg via-bg/95 to-transparent border-t border-white/[0.09]">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className="flex-1 flex flex-col items-center gap-1.5 py-2.5 text-[10px] tracking-[0.04em]"
          >
            <div className={`w-1 h-1 rounded-full ${active ? 'bg-accent' : 'bg-transparent'}`} />
            <div className={active ? 'text-text' : 'text-neutral-600'}>{t.label}</div>
          </Link>
        );
      })}
    </div>
  );
}
