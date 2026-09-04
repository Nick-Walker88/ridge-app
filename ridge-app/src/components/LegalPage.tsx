import Link from 'next/link';

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-canvas px-6 py-12">
      <div className="max-w-[640px] mx-auto">
        <Link href="/" className="text-[12px] text-neutral-600 hover:text-accent-400">
          ‹ Ridge
        </Link>
        <h1 className="text-[28px] font-medium text-text mt-4">{title}</h1>
        <div className="text-[12px] text-neutral-600 mt-2">Last updated {updated}</div>
        <div className="mt-8 flex flex-col gap-5 text-[14px] leading-relaxed text-neutral-400 [&_h2]:text-[16px] [&_h2]:font-medium [&_h2]:text-text [&_h2]:mt-4 [&_h2]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_a]:text-accent-400 [&_a:hover]:text-accent-300 [&_strong]:text-text [&_strong]:font-medium">
          {children}
        </div>
      </div>
    </main>
  );
}
