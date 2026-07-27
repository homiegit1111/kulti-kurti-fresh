"use client";

import { useRef, type MouseEvent } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

/**
 * THE LAMP SWITCH — the iris opens from here.
 *
 * Two glyphs share one grid cell and trade places on a spring; a soft vermilion
 * bloom lights the well on hover. All of it is driven by `.dark` on <html>
 * (painted by the pre-React boot script in layout.tsx), never by React state —
 * so the server and client markup are byte-identical and the control is already
 * showing the right glyph before hydration. Presentation lives in globals.css
 * under `.theme-toggle*`; this file only supplies structure and the origin.
 *
 * TWO THINGS THAT MUST NOT COME BACK:
 *   • no `disabled` binding — one stuck transition previously killed the
 *     control for the whole session;
 *   • no early-return on `transitioning` — the provider now supersedes a
 *     running iris rather than dropping the click, so every press lands.
 */
export function ThemeToggle({
  className,
  /** Flat icon control — same weight as mobile nav Search/Cart icons */
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "icon";
}) {
  const { toggleTheme } = useTheme();
  const btnRef = useRef<HTMLButtonElement>(null);

  /* The iris grows from the centre of this button, so the gesture reads as
     coming out of the control the buyer actually pressed. */
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = btnRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : e.clientX;
    const y = rect ? rect.top + rect.height / 2 : e.clientY;
    toggleTheme({ x, y });
  };

  const glyphs = (size: string) => (
    <span className={cn("theme-toggle-well", size)}>
      <Sun
        className={cn("theme-toggle-glyph theme-toggle-glyph--sun", size)}
        strokeWidth={1.7}
        aria-hidden
      />
      <Moon
        className={cn("theme-toggle-glyph theme-toggle-glyph--moon", size)}
        strokeWidth={1.7}
        aria-hidden
      />
    </span>
  );

  if (variant === "icon") {
    return (
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        aria-label="Toggle color theme"
        title="Toggle color theme"
        className={cn(
          "theme-toggle relative flex h-10 w-10 shrink-0 items-center justify-center",
          "active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red/60",
          className,
        )}
      >
        {glyphs("h-[18px] w-[18px]")}
      </button>
    );
  }

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleClick}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className={cn(
        "theme-toggle group relative inline-flex h-9 items-center gap-2 rounded-full",
        "border border-line/20 bg-transparent px-3",
        "text-[10px] font-semibold uppercase tracking-[0.16em]",
        "hover:border-accent-red/45",
        "active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        className,
      )}
    >
      {glyphs("h-4 w-4")}

      <span className="relative hidden sm:inline">
        <span className="dark:hidden">Dark</span>
        <span className="hidden dark:inline">Light</span>
      </span>
    </button>
  );
}
