"use client";

/**
 * Density toggle — three segments, no icons-only guessing games.
 *
 * Active segment is ink with a lime label: the density you chose is a state you
 * caused, and lime is that register throughout the system.
 */

import { DENSITIES, type Density } from "@/lib/line/density";
import { cn } from "@/lib/utils";

export function DensityToggle({
  value: density,
  onChange,
  className,
}: {
  value: Density;
  onChange: (next: Density) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("inline-flex items-stretch border border-line/25", className)}
      role="radiogroup"
      aria-label="Result density"
    >
      {DENSITIES.map(({ value, label, hint }) => {
        const active = value === density;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={hint}
            onClick={() => onChange(value)}
            className={cn(
              "px-2.5 py-2 text-[9px] font-bold uppercase tracking-[0.16em] transition-colors duration-200",
              "border-r border-line/25 last:border-r-0",
              active
                ? "bg-surface-inverse text-accent-lime"
                : "text-content/50 hover:text-content",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
