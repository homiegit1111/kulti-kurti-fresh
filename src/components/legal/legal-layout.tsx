import type { ReactNode } from "react";

/**
 * Shared layout for legal/long-form text pages (Privacy, Terms). Keeps the
 * brand aesthetic consistent and the prose readable.
 */
export function LegalLayout({
  title,
  updated,
  eyebrow,
  children,
}: {
  title: string;
  updated: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <main className="flex-1 bg-[#fcfbf9] relative pt-32 pb-24 min-h-screen">
      <div className="max-w-3xl mx-auto px-6 w-full">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-4 h-[1px] bg-gold" />
            <span className="text-[9px] uppercase tracking-[0.3em] text-gold font-bold">
              {eyebrow}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-charcoal tracking-tight leading-[1.1]">
            {title}
          </h1>
          <p className="text-[11px] uppercase tracking-[0.2em] text-charcoal/40 mt-4">
            Last updated · {updated}
          </p>
        </div>

        <div className="space-y-6 text-[15px] leading-relaxed text-charcoal/70 font-light [&_h2]:font-serif [&_h2]:text-charcoal [&_h2]:text-xl [&_h2]:mt-10 [&_h2]:mb-3 [&_strong]:text-charcoal [&_strong]:font-medium [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_a]:text-charcoal [&_a]:underline">
          {children}
        </div>
      </div>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
