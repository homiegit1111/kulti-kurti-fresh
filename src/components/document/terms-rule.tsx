/**
 * §1.7 — TermsRule: the single full-width hairline strip of config-derived
 * trade facts (line-sheet letterhead grammar). Replaces every icon-chip strip
 * site-wide. Server-safe; every fact derives from B2B_CONFIG/GST_CONFIG —
 * never literals.
 */

import { Fragment } from "react";
import { B2B_CONFIG, GST_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { cn } from "@/lib/utils";

/**
 * §1.7 — ruled `<dl>` of trade facts separated by saffron squares:
 * `MOQ {minimumOrderSets} sets · set of {setSize} · {SIZE_RATIO_LABEL} ·
 * GST {lowRate}–{highRate}%, invoice at dispatch`.
 */
export function TermsRule({ className }: { className?: string }) {
  const facts: { label: string; value: string }[] = [
    {
      label: "Minimum order",
      value: `${B2B_CONFIG.minimumOrderSets} sets`,
    },
    { label: "Pack", value: `set of ${B2B_CONFIG.setSize}` },
    { label: "Size ratio", value: SIZE_RATIO_LABEL },
    {
      label: GST_CONFIG.label,
      value: `${GST_CONFIG.lowRate}–${GST_CONFIG.highRate}%, invoice at dispatch`,
    },
  ];

  return (
    <dl
      className={cn(
        "ledger flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 border-y border-line/25 py-2",
        "text-[9px] font-extrabold uppercase tracking-[0.2em] text-content/55",
        className,
      )}
    >
      {facts.map((fact, index) => (
        <Fragment key={fact.label}>
          {index > 0 && (
            <span aria-hidden="true" className="h-1 w-1 shrink-0 bg-accent-lime" />
          )}
          <div className="flex items-baseline gap-1.5">
            <dt className="text-content/40">{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        </Fragment>
      ))}
    </dl>
  );
}
