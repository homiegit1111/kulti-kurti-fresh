"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

export type ThemeOrigin = { x: number; y: number };

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme, origin?: ThemeOrigin) => void;
  toggleTheme: (origin?: ThemeOrigin) => void;
  ready: boolean;
  /** True while an iris is on screen. Informational only — NEVER bind a
      `disabled` to it: a stuck transition once killed the toggle for a whole
      session, and re-entry is handled here instead (see setTheme). */
  transitioning: boolean;
};

const STORAGE_KEY = "rangat-theme";

/**
 * Iris duration. Long enough to read as a deliberate gesture, short enough
 * that a buyer who hit it by accident is not held hostage. The same number is
 * published to CSS as --theme-iris-ms so the view-transition keyframes and the
 * JS watchdog can never drift apart.
 */
const IRIS_MS = 520;
const IRIS_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Hard ceiling on any single switch. See the watchdog note in startIris. */
const IRIS_WATCHDOG_MS = IRIS_MS + 400;

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ── External store (localStorage + DOM class) ────────────────────────────────
// useSyncExternalStore requires a server snapshot so hydration never reads
// client-only data (the exact failure mode React lists as
// "External changing data without sending a snapshot of it along with the HTML").

type Listener = () => void;

let storeTheme: Theme = "light";
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Client snapshot — live store value after boot. */
function getSnapshot(): Theme {
  return storeTheme;
}

/** Server + hydration snapshot — must be identical on both sides. */
function getServerSnapshot(): Theme {
  return "light";
}

/**
 * The single DOM write that actually changes the palette. Everything visual
 * follows from this: the whole theme is CSS custom properties keyed on `.dark`.
 * Nothing colour-critical is rendered from React state, which is what lets the
 * View Transition snapshot be correct the instant this returns — React has not
 * re-rendered yet at that point, and does not need to have.
 *
 * Mirrors the pre-React boot script in layout.tsx exactly (data-theme + .dark +
 * color-scheme). If one of them ever changes, both must.
 */
function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  /* Keep .dark class in sync for legacy selectors / Tailwind */
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function readStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* private mode */
  }
  return null;
}

function writeStore(theme: Theme, persist: boolean) {
  storeTheme = theme;
  applyThemeClass(theme);
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }
  emit();
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function resolveOrigin(origin?: ThemeOrigin): ThemeOrigin {
  if (origin) return origin;
  return {
    x: Math.round(window.innerWidth / 2),
    y: Math.round(window.innerHeight * 0.08),
  };
}

/** Radius that reaches the furthest corner from the origin. */
function maxRevealRadius(x: number, y: number): number {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return Math.ceil(Math.hypot(Math.max(x, w - x), Math.max(y, h - y)));
}

/**
 * The ground the NEXT theme will paint, read from the live token system — used
 * only by the overlay fallback, which has to stand in for a page it cannot see.
 *
 * The class is toggled on <html> and restored within the same task, so no frame
 * is ever rendered in the wrong state; getComputedStyle forces a style recalc,
 * not a paint. A detached probe div CANNOT be used here: custom properties
 * inherit, so a class-less probe under <html class="dark"> reports the dark
 * values and the dark→light wipe paints the wrong colour.
 *
 * On the homepage the visible ground is the cover's own --home-ground, not the
 * app --surface; those two are different sheets by day.
 */
function nextThemeGround(next: Theme): string {
  const root = document.documentElement;
  const had = root.classList.contains("dark");
  const want = next === "dark";
  const prop = document.getElementById("home-cover")
    ? "--home-ground"
    : "--surface";

  if (had !== want) root.classList.toggle("dark", want);
  const value = getComputedStyle(root).getPropertyValue(prop).trim();
  if (had !== want) root.classList.toggle("dark", had);

  return value || getComputedStyle(document.body).backgroundColor;
}

// ── The iris ────────────────────────────────────────────────────────────────

type ViewTransitionLike = {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
};

/**
 * Read through `unknown` rather than intersecting Document: lib.dom now ships
 * its own `startViewTransition` on some TS versions and not others, and an
 * intersection of the two declarations makes the call site fail to type on
 * exactly the versions that have it.
 */
function getStartViewTransition():
  | ((callback: () => void | Promise<void>) => ViewTransitionLike)
  | null {
  const start = (
    document as unknown as {
      startViewTransition?: (
        callback: () => void | Promise<void>,
      ) => ViewTransitionLike;
    }
  ).startViewTransition;
  return typeof start === "function" ? start.bind(document) : null;
}

type IrisRun = {
  /** Resolves once the theme is applied and every artefact is off the page. */
  done: Promise<void>;
  /** Tear down NOW without applying — the caller has a newer intent. */
  abort: () => void;
};

/**
 * ONE GESTURE, TWO IMPLEMENTATIONS.
 *
 * An iris opens from the toggle and the other half of the day arrives through
 * it. Which implementation runs is decided here; the keyframes, easing and
 * radius are shared, so the two look like the same thing.
 *
 *   • View Transitions (Chromium, Safari 18+) — the browser snapshots the page,
 *     the theme is applied inside the update callback, and the REAL new palette
 *     is revealed through an expanding clip-path circle while the old snapshot
 *     holds still. Nothing stands in for the result; the result is what opens.
 *
 *   • Overlay fallback — a fixed layer painted with the incoming ground, clipped
 *     by the same circle, with an accent bloom running a step ahead of the edge.
 *
 * INVARIANTS, in order of how badly they have bitten before:
 *
 *   1. IT ALWAYS SETTLES. `anim.finished` and `vt.finished` can both hang — a
 *      backgrounded tab, a throttled compositor, a snapshot torn out from under
 *      the animation. When that happened, `transitioning` stayed true forever
 *      and the toggle was dead for the rest of the session. Every exit runs
 *      through `settle()`, and a watchdog timer guarantees one exit no matter
 *      what any promise does.
 *   2. THE THEME LANDS EVEN IF THE ANIMATION DOES NOT. `settle()` applies it;
 *      an interrupted, skipped or never-started transition still ends themed.
 *   3. NO ANIMATION WHEN NOBODY CAN SEE IT. prefers-reduced-motion, or a
 *      document that is not visible, takes the instant path. A hidden tab does
 *      not run rendering updates, so a view transition there would stall on its
 *      own update callback and hand the work to the watchdog for no benefit.
 *   4. COMPOSITOR PROPERTIES ONLY — clip-path, transform, opacity. No width,
 *      height, top, left or filter is animated anywhere in here.
 */
function startIris(
  next: Theme,
  origin: ThemeOrigin,
  apply: () => void,
): IrisRun {
  let settled = false;
  let aborted = false;
  const cleanups: Array<() => void> = [];
  let watchdog = 0;

  let resolveDone!: () => void;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const runCleanups = () => {
    for (const fn of cleanups.splice(0)) {
      try {
        fn();
      } catch {
        /* a torn-down node is not a failure */
      }
    }
  };

  /** The one exit. Applies the theme, then removes every artefact. */
  const settle = () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(watchdog);
    if (!aborted) apply();
    runCleanups();
    resolveDone();
  };

  const abort = () => {
    aborted = true;
    settle();
  };

  const finish = () => settle();

  // ── Invariant 3: no animation when nobody can see it ──
  if (prefersReducedMotion() || document.visibilityState !== "visible") {
    apply();
    settled = true;
    resolveDone();
    return { done, abort: () => {} };
  }

  const { x, y } = origin;
  const radius = maxRevealRadius(x, y);
  const root = document.documentElement;

  /* A page that goes away mid-gesture must not leave the toggle hostage. */
  const onHidden = () => {
    if (document.visibilityState !== "visible") settle();
  };
  document.addEventListener("visibilitychange", onHidden);
  cleanups.push(() =>
    document.removeEventListener("visibilitychange", onHidden),
  );

  watchdog = window.setTimeout(finish, IRIS_WATCHDOG_MS);

  // ── Path 1: View Transitions ──
  const startViewTransition = getStartViewTransition();
  if (startViewTransition) {
    root.style.setProperty("--theme-iris-x", `${x}px`);
    root.style.setProperty("--theme-iris-y", `${y}px`);
    root.style.setProperty("--theme-iris-r", `${radius}px`);
    root.style.setProperty("--theme-iris-ms", `${IRIS_MS}ms`);
    root.classList.add("theme-vt");
    cleanups.push(() => {
      root.classList.remove("theme-vt");
      root.style.removeProperty("--theme-iris-x");
      root.style.removeProperty("--theme-iris-y");
      root.style.removeProperty("--theme-iris-r");
      root.style.removeProperty("--theme-iris-ms");
    });

    let vt: ViewTransitionLike | undefined;
    try {
      vt = startViewTransition(() => {
        /* A callback that fires after we gave up (or after a newer click took
           over) must not resurrect a stale theme. */
        if (!aborted && !settled) apply();
      });
    } catch {
      /* Nested or otherwise refused — fall through to the overlay below. */
      vt = undefined;
    }

    if (vt) {
      const transition = vt;
      cleanups.push(() => {
        try {
          transition.skipTransition();
        } catch {
          /* already finished */
        }
      });
      /* `ready` rejects whenever the browser skips the transition (hidden tab,
         a route transition already in flight). That is a normal outcome, not an
         error — but an unhandled rejection in production is noise. */
      transition.ready.catch(() => {});
      transition.finished.then(finish, finish);
      return { done, abort };
    }

    /* startViewTransition threw: drop the VT scaffolding before falling back. */
    runCleanups();
    document.addEventListener("visibilitychange", onHidden);
    cleanups.push(() =>
      document.removeEventListener("visibilitychange", onHidden),
    );
  }

  // ── Path 2: overlay iris ──
  const ground = nextThemeGround(next);

  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  overlay.className = "theme-iris-overlay";
  overlay.style.background = ground;
  overlay.style.clipPath = `circle(0px at ${x}px ${y}px)`;

  /* The bloom is positioned by transform only — its box never moves, so the
     scale animation stays on the compositor. */
  const bloom = document.createElement("div");
  bloom.setAttribute("aria-hidden", "true");
  bloom.className = "theme-iris-bloom";
  bloom.style.width = `${radius * 2}px`;
  bloom.style.height = `${radius * 2}px`;
  const seat = `translate3d(${x - radius}px, ${y - radius}px, 0)`;

  root.appendChild(overlay);
  root.appendChild(bloom);
  cleanups.push(() => {
    overlay.remove();
    bloom.remove();
  });

  const wipe = overlay.animate(
    [
      { clipPath: `circle(0px at ${x}px ${y}px)` },
      { clipPath: `circle(${radius}px at ${x}px ${y}px)` },
    ],
    { duration: IRIS_MS, easing: IRIS_EASE, fill: "forwards" },
  );
  const glow = bloom.animate(
    [
      { transform: `${seat} scale(0.02)`, opacity: 0 },
      { transform: `${seat} scale(0.6)`, opacity: 0.5, offset: 0.42 },
      { transform: `${seat} scale(1.2)`, opacity: 0 },
    ],
    { duration: Math.round(IRIS_MS * 1.1), easing: IRIS_EASE, fill: "forwards" },
  );
  cleanups.push(() => {
    wipe.cancel();
    glow.cancel();
  });

  /* Swap the theme once the circle covers enough of the screen that the
     underlay and the overlay agree — otherwise the edge shows the seam. */
  const mid = window.setTimeout(() => {
    if (!aborted && !settled) apply();
  }, Math.round(IRIS_MS * 0.35));
  cleanups.push(() => window.clearTimeout(mid));

  wipe.finished.then(finish, finish);

  return { done, abort };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Hydration always sees getServerSnapshot ("light"); client store syncs after mount.
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [ready, setReady] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const runRef = useRef<IrisRun | null>(null);
  /** Where a running iris is heading. Toggling mid-gesture reads THIS, not the
      committed store, so a fast second click reverses the intent instead of
      re-issuing it. */
  const pendingRef = useRef<Theme | null>(null);
  const themeRef = useRef<Theme>(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    // Boot script already painted the real theme on <html>. Prefer storage, else DOM.
    const attr = document.documentElement.getAttribute("data-theme");
    const initial: Theme =
      readStoredTheme() ??
      (attr === "dark" || attr === "light"
        ? attr
        : document.documentElement.classList.contains("dark")
          ? "dark"
          : "light");
    writeStore(initial, false);
    const readyTimer = window.setTimeout(() => setReady(true), 0);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => {
      if (readStoredTheme()) return;
      writeStore(mq.matches ? "dark" : "light", false);
    };
    mq.addEventListener("change", onSystem);
    return () => {
      window.clearTimeout(readyTimer);
      mq.removeEventListener("change", onSystem);
      runRef.current?.abort();
      runRef.current = null;
    };
  }, []);

  const setTheme = useCallback((next: Theme, origin?: ThemeOrigin) => {
    /* Re-entry is allowed, and deliberately so. The old build refused any click
       while `transitioning` was true, which meant one hung promise silenced the
       control permanently. A second click now supersedes the first: the running
       iris is torn down WITHOUT committing (its target is stale by definition),
       and the newest intent starts fresh. Every click therefore lands. */
    const current = pendingRef.current ?? themeRef.current;
    if (next === current) return;

    if (runRef.current) {
      runRef.current.abort();
      runRef.current = null;
    }

    /* Reversing a click that never committed: nothing to animate back to. */
    if (next === storeTheme) {
      pendingRef.current = null;
      setTransitioning(false);
      return;
    }

    pendingRef.current = next;
    setTransitioning(true);

    const run = startIris(next, resolveOrigin(origin), () =>
      writeStore(next, true),
    );
    runRef.current = run;

    void run.done.finally(() => {
      if (runRef.current !== run) return; // a newer gesture owns the control
      runRef.current = null;
      pendingRef.current = null;
      setTransitioning(false);
    });
  }, []);

  const toggleTheme = useCallback(
    (origin?: ThemeOrigin) => {
      const current = pendingRef.current ?? themeRef.current;
      setTheme(current === "dark" ? "light" : "dark", origin);
    },
    [setTheme],
  );

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, ready, transitioning }),
    [theme, setTheme, toggleTheme, ready, transitioning],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
