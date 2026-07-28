"use client";

/**
 * The one top hairline (Chapter 4.1a) — a single 2px element paints the top
 * edge of every page. It consolidates the former ScrollProgress spring rail
 * and the timer-driven ThemeProgressBar into one track with three registers:
 *
 *   1. REST — scroll position. Ink fill, transform-only, no spring smoothing:
 *      the fill tracks the real scroll fraction and nothing else. Updated via
 *      a ref (no React state), so scrolling never re-renders the tree.
 *   2. THEME — on toggle, a sweep painted with the COMPUTED `--surface` value
 *      read off the root element *after* the token flip, so the rail always
 *      matches the palette actually in force (no stale hardcoded hex).
 *   3. ROUTE — a brief sweep when the pathname changes, marking the page turn
 *      during view transitions.
 *
 * `view-transition-name: top-rail` keeps the element still across navigations.
 * Sweeps run through the Web Animations API and are skipped entirely under
 * prefers-reduced-motion; the rest-state fill is a position readout, not an
 * animation, so it stays.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/providers/theme-provider";

const SWEEP_MS = 420;

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Computed value of a root CSS custom property, at call time. */
function computedRootVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function TopRail() {
  const fillRef = useRef<HTMLDivElement>(null);
  const sweepRef = useRef<HTMLDivElement>(null);
  const { theme, ready } = useTheme();
  const pathname = usePathname();
  const mountedRef = useRef(false);
  const prevThemeRef = useRef(theme);

  /* REST — scroll fraction as scaleX, rAF-throttled, ref-only (no re-render). */
  useEffect(() => {
    let frame = 0;

    const paint = () => {
      frame = 0;
      const el = fillRef.current;
      if (!el) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const fraction = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      el.style.transform = `scaleX(${fraction})`;
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  /* THEME — sweep the freshly computed --surface across the rail. Runs when
     the committed theme value changes (the provider has already flipped the
     tokens on <html>, so the computed read is the incoming palette). */
  useEffect(() => {
    // Sweep only on a real theme *change* after the provider's boot sync —
    // the stored theme landing on <html> is initial paint, not a toggle.
    const changed = theme !== prevThemeRef.current;
    prevThemeRef.current = theme;
    if (!changed || !ready) return;
    const el = sweepRef.current;
    if (!el || reducedMotion()) return;

    el.style.background = computedRootVar("--surface");
    const anim = el.animate(
      [
        { transform: "scaleX(0)", opacity: 1 },
        { transform: "scaleX(1)", opacity: 1, offset: 0.7 },
        { transform: "scaleX(1)", opacity: 0 },
      ],
      { duration: SWEEP_MS, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    return () => anim.cancel();
  }, [theme, ready]);

  /* ROUTE — a quick ink sweep on navigation (the page turning). */
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const el = sweepRef.current;
    if (!el || reducedMotion()) return;

    el.style.background = computedRootVar("--content");
    const anim = el.animate(
      [
        { transform: "scaleX(0)", opacity: 1 },
        { transform: "scaleX(1)", opacity: 1, offset: 0.75 },
        { transform: "scaleX(1)", opacity: 0 },
      ],
      { duration: 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    return () => anim.cancel();
  }, [pathname]);

  // The dream homepage is a clean editorial field — no chrome overlays on it.
  if (pathname === "/") return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px]"
      style={{ viewTransitionName: "top-rail" }}
    >
      {/* Rest register: scroll position, ink. */}
      <div
        ref={fillRef}
        className="absolute inset-0 origin-left bg-content"
        style={{ transform: "scaleX(0)" }}
      />
      {/* Sweep register: theme / route, painted at animation time. */}
      <div ref={sweepRef} className="absolute inset-0 origin-left opacity-0" />
    </div>
  );
}
