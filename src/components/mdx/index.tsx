import type { ReactNode } from 'react';

type CalloutType = 'takeaway' | 'warning' | 'note';

const CALLOUT_CONFIG: Record<CalloutType, { label: string; bg: string; border: string; accent: string }> = {
  takeaway: { label: 'Takeaway', bg: 'bg-gold/[0.07]', border: 'border-gold', accent: 'text-gold' },
  warning:  { label: 'Watch out', bg: 'bg-accent/[0.07]', border: 'border-accent', accent: 'text-accent' },
  note:     { label: 'Note', bg: 'bg-ink/[0.04]', border: 'border-muted', accent: 'text-muted' },
};

export function Callout({ type = 'note', children }: { type?: CalloutType; children: ReactNode }) {
  const c = CALLOUT_CONFIG[type];
  return (
    <aside className={`my-8 rounded-r-md border-l-4 ${c.border} ${c.bg} pl-5 pr-5 py-4`}>
      <div className={`mb-1 text-[10px] font-bold uppercase tracking-[0.2em] ${c.accent}`}>
        {c.label}
      </div>
      <div className="font-display text-lg leading-snug text-ink">{children}</div>
    </aside>
  );
}

export function ProsCons({ children }: { children: ReactNode }) {
  return (
    <div className="my-10 grid gap-4 overflow-hidden rounded-lg border border-ink/15 bg-ink/[0.03] sm:grid-cols-2 sm:gap-0">
      {children}
    </div>
  );
}

export function Pros({ children }: { children: ReactNode }) {
  return (
    <div className="border-t-4 border-gold p-6 sm:border-r sm:border-r-ink/15 sm:border-t-4">
      <div className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-gold">
        <span className="text-lg leading-none">+</span> Pros
      </div>
      <ul className="space-y-2 text-base">{children}</ul>
    </div>
  );
}

export function Cons({ children }: { children: ReactNode }) {
  return (
    <div className="border-t-4 border-accent p-6">
      <div className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-accent">
        <span className="text-lg leading-none">–</span> Cons
      </div>
      <ul className="space-y-2 text-base">{children}</ul>
    </div>
  );
}

export function FAQ({ children }: { children: ReactNode }) {
  return (
    <div className="my-10 divide-y divide-ink/10 rounded-lg border border-ink/15 bg-ink/[0.03] px-5">
      {children}
    </div>
  );
}

export function Question({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group py-5">
      <summary className="flex cursor-pointer items-start justify-between gap-4 list-none">
        <span className="font-display text-lg font-semibold leading-snug">{q}</span>
        <span className="mt-1 shrink-0 text-gold font-mono text-xl leading-none transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="mt-3 text-[17px] leading-relaxed text-ink/85">{children}</div>
    </details>
  );
}

export const mdxComponents = {
  Callout,
  ProsCons,
  Pros,
  Cons,
  FAQ,
  Question,
};
