import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Kicker({ children }: { children: ReactNode }) {
  return <div className="text-[10.5px] font-medium tracking-[0.16em] uppercase text-accent-700">{children}</div>;
}

export function ScreenTitle({ children }: { children: ReactNode }) {
  return <div className="text-[27px] font-medium tracking-[-0.02em] text-text mt-3.5 leading-tight">{children}</div>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[10.5px] font-medium tracking-[0.16em] uppercase text-neutral-600">{children}</div>;
}

export function PrimaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full py-3.5 rounded-md border border-accent bg-transparent text-accent-300 font-medium text-[13px] tracking-[0.06em] cursor-pointer transition-colors hover:bg-accent/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    />
  );
}

export function SecondaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`px-5 py-3.5 rounded-md border border-white/10 bg-transparent text-neutral-500 font-normal text-[13px] cursor-pointer transition-colors hover:border-accent-700 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${className}`}
    />
  );
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`border border-white/10 rounded-lg bg-surface ${className}`}>{children}</div>;
}

export function TabularNum({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`tabular ${className}`}>{children}</span>;
}
