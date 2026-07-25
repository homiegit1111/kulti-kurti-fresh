"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

/**
 * NProgress-style theme switch bar — thin lime rail across the top.
 * GPU transform only; works for both light and dark.
 */
export function ThemeProgressBar() {
  const { transitioning, theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"idle" | "run" | "done">("idle");

  useEffect(() => {
    if (transitioning) {
      const start = window.setTimeout(() => {
        setVisible(true);
        setPhase("run");
      }, 0);
      return () => {
        window.clearTimeout(start);
      };
    }

    if (!visible) return;

    // Complete the rail, then fade out
    const complete = window.setTimeout(() => setPhase("done"), 0);
    const hide = window.setTimeout(() => {
      setVisible(false);
      setPhase("idle");
    }, 320);
    return () => {
      window.clearTimeout(complete);
      window.clearTimeout(hide);
    };
  }, [transitioning, visible]);

  if (!visible && phase === "idle") return null;

  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        /* Above theme circle overlay so the bar stays visible during switch */
        "pointer-events-none fixed inset-x-0 top-0 z-[2147483647]",
        "transition-opacity duration-300 ease-out",
        phase === "done" ? "opacity-0" : "opacity-100",
      )}
      role="progressbar"
      aria-hidden
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={phase === "done" ? 100 : 70}
      aria-label="Switching theme"
    >
      {/* Soft track */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-[2px]",
          isDark ? "bg-white/[0.06]" : "bg-charcoal/[0.06]",
        )}
      />

      {/* Progress fill */}
      <div
        className={cn(
          "theme-progress-fill absolute left-0 top-0 h-[2px] origin-left",
          "will-change-transform",
          phase === "run" && "theme-progress-run",
          phase === "done" && "theme-progress-complete",
        )}
      >
        {/* Leading glow tip */}
        <span className="theme-progress-glow absolute right-0 top-1/2 h-3 w-16 -translate-y-1/2" />
      </div>
    </div>
  );
}
