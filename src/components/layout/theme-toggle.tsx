"use client";

import { useRef, type MouseEvent } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

/**
 * Premium theme control — circular reveal spreads from this button.
 *
 * Display chrome (icons + label) is driven by data-theme="dark" on <html>
 * (class .dark kept in sync) via Tailwind `dark:` variants. Set by the
 * pre-React boot script so server/client HTML match — no theme state in
 * the hydrate path (avoids hydration mismatch).
 */
export function ThemeToggle({
  className,
  /** Flat icon control — same weight as mobile nav Search/Cart icons */
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "icon";
}) {
  const { toggleTheme, transitioning } = useTheme();
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (transitioning) return;
    const rect = btnRef.current?.getBoundingClientRect();
    const x = rect
      ? rect.left + rect.width / 2
      : e.clientX;
    const y = rect
      ? rect.top + rect.height / 2
      : e.clientY;
    toggleTheme({ x, y });
  };

  if (variant === "icon") {
    return (
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        disabled={transitioning}
        aria-label="Toggle color theme"
        title="Toggle color theme"
        className={cn(
          "theme-toggle relative flex h-10 w-10 shrink-0 items-center justify-center",
          "text-charcoal transition-colors active:scale-95 disabled:pointer-events-none",
          "dark:text-white/80 dark:active:text-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red/50",
          className,
        )}
      >
        <span className="relative flex h-[18px] w-[18px] items-center justify-center">
          <Sun
            className="absolute h-[18px] w-[18px] scale-50 -rotate-90 text-charcoal opacity-0 transition-all duration-300 dark:scale-100 dark:rotate-0 dark:text-white/80 dark:opacity-100"
            strokeWidth={1.6}
            aria-hidden
          />
          <Moon
            className="absolute h-[18px] w-[18px] scale-100 rotate-0 opacity-100 transition-all duration-300 dark:scale-50 dark:rotate-90 dark:opacity-0"
            strokeWidth={1.6}
            aria-hidden
          />
        </span>
      </button>
    );
  }

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleClick}
      disabled={transitioning}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className={cn(
        "theme-toggle group relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-full",
        "border border-charcoal/12 bg-transparent px-3",
        "text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal",
        "transition-colors duration-200",
        "hover:border-accent-red/40 hover:text-accent-red",
        "active:scale-[0.97] disabled:pointer-events-none",
        "dark:border-white/15 dark:text-white/80",
        "dark:hover:border-white/30 dark:hover:text-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span className="relative flex h-4 w-4 items-center justify-center">
        <Sun
          className="absolute h-4 w-4 scale-50 -rotate-90 text-accent-red opacity-0 transition-all duration-300 dark:scale-100 dark:rotate-0 dark:opacity-100"
          strokeWidth={1.7}
          aria-hidden
        />
        <Moon
          className="absolute h-4 w-4 scale-100 rotate-0 opacity-100 transition-all duration-300 dark:scale-50 dark:rotate-90 dark:opacity-0"
          strokeWidth={1.7}
          aria-hidden
        />
      </span>

      <span className="relative hidden sm:inline">
        <span className="dark:hidden">Dark</span>
        <span className="hidden dark:inline">Light</span>
      </span>
    </button>
  );
}
