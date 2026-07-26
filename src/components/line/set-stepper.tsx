"use client";

/**
 * Set stepper — the one order control, used at every density and in the tray.
 *
 * Square, hairline, tabular digits. Lime is the state the buyer caused; it
 * appears only once a set count exists. Presentational: takes `sets`, emits
 * `onChange`. No cart writes.
 *
 * Floors at B2B_CONFIG.minimumStyleSets while committed. Stepping below that
 * floor calls onDemote (sets -> 0, back to shortlisted) rather than deleting —
 * a mis-tap must never destroy a saved style.
 */

import { Minus, Plus } from "lucide-react";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { cn } from "@/lib/utils";

type Size = "sm" | "md";

const BOX: Record<Size, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
};

const READOUT: Record<Size, string> = {
  sm: "h-7 min-w-[2.25rem] text-[11px]",
  md: "h-9 min-w-[2.75rem] text-sm",
};

export function SetStepper({
  sets,
  onChange,
  onDemote,
  size = "sm",
  disabled = false,
  label = "Sets",
}: {
  sets: number;
  onChange: (sets: number) => void;
  /** Called instead of onChange when stepping below the per-style floor. */
  onDemote?: () => void;
  size?: Size;
  disabled?: boolean;
  label?: string;
}) {
  const floor = B2B_CONFIG.minimumStyleSets;

  const decrement = () => {
    if (sets <= floor) {
      onDemote?.();
      return;
    }
    onChange(sets - 1);
  };

  return (
    <div
      className={cn(
        "inline-flex items-stretch border border-line/25",
        disabled && "pointer-events-none opacity-40",
      )}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={decrement}
        disabled={disabled}
        aria-label={sets <= floor ? "Move to shortlist" : "Remove one set"}
        className={cn(
          BOX[size],
          "flex items-center justify-center text-content/55",
          "transition-colors duration-200 hover:bg-surface-inverse hover:text-accent-lime",
          "focus-visible:outline-none focus-visible:bg-surface-inverse focus-visible:text-accent-lime",
        )}
      >
        <Minus className="h-3 w-3" strokeWidth={2.25} />
      </button>

      <span
        aria-live="polite"
        className={cn(
          READOUT[size],
          "flex items-center justify-center border-x border-line/25 px-1",
          "font-bold tabular-nums tracking-[-0.01em] text-content",
        )}
      >
        {sets}
      </span>

      <button
        type="button"
        onClick={() => onChange(sets + 1)}
        disabled={disabled}
        aria-label="Add one set"
        className={cn(
          BOX[size],
          "flex items-center justify-center text-content/55",
          "transition-colors duration-200 hover:bg-surface-inverse hover:text-accent-lime",
          "focus-visible:outline-none focus-visible:bg-surface-inverse focus-visible:text-accent-lime",
        )}
      >
        <Plus className="h-3 w-3" strokeWidth={2.25} />
      </button>
    </div>
  );
}
