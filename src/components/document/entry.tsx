/**
 * Entry anatomy (§1.7, R4) — server-safe. No entrance animation: an entry is
 * legible on arrival (style-row.tsx law, the site's motion constitution).
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * §1.7/R4 — entry head: `.entry-rule` double rule + head line
 * (letter · name · real tabular count · right-aligned action slot).
 *
 * Anatomy defaults: 96/128px clear paper above (R5 slot) — override via
 * className (`mt-0`) where a seam feeds the entry directly. At `lg+` the entry
 * letter leaves the head line for the 72px folio rail (R2); below `lg` it
 * renders inline. The wrapping element must be inside the text block so the
 * rail letter lands in the outer 72px margin.
 */
export function EntryHead({
  letter,
  name,
  count,
  countLabel,
  action,
  className,
  id,
}: {
  /** Entry letter — A, B, C… (a real register, R2). */
  letter: string;
  /** Entry name, set at ENTRY HEAD spec (Inter 800 / 10px / 0.22em). */
  name: string;
  /** Real count only — never a decorative number (R0). */
  count?: number;
  /** Unit for the count, e.g. "styles", "chapters". */
  countLabel?: string;
  /** Right-aligned action link slot (R4c). */
  action?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <header id={id} className={cn("entry-rule relative mt-24 lg:mt-32", className)}>
      <div className="flex items-baseline gap-3 pt-4">
        {/* Entry letter — inline below lg, folio rail at lg+ (R2). Held at 60%
            of whatever ink it inherits, so this stays neutral on every ground
            and in both themes: no colour of its own to clash with a page. */}
        <span
          className={cn(
            "text-[10px] font-extrabold uppercase tracking-[0.22em] text-content/60",
            "lg:absolute lg:-left-[72px] lg:top-4 lg:w-[72px]",
          )}
        >
          {letter}
        </span>
        <span aria-hidden="true" className="text-content/40 lg:hidden">
          ·
        </span>
        <h2 className="text-[10px] font-extrabold uppercase tracking-[0.22em]">
          {name}
        </h2>
        {count !== undefined && (
          <>
            <span aria-hidden="true" className="text-content/40">
              ·
            </span>
            <span className="ledger text-[10px] font-extrabold uppercase tracking-[0.22em] text-content/55">
              {count}
              {countLabel ? ` ${countLabel}` : ""}
            </span>
          </>
        )}
        {action !== undefined && (
          <span className="ml-auto text-right">{action}</span>
        )}
      </div>
    </header>
  );
}

/** §1.7/R4e — entry closing rule: the 1px hairline that ends an entry body. */
export function EntryClose({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("border-t border-line/25", className)} />;
}
