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
  transitioning: boolean;
};

const STORAGE_KEY = "rangat-theme";
/** Short + light — full View Transition snapshots of the homepage are too expensive */
const REVEAL_MS = 420;

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

function maxRevealRadius(x: number, y: number): number {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return Math.ceil(Math.hypot(Math.max(x, w - x), Math.max(y, h - y)));
}

/**
 * Lag-free circular reveal: paint a single GPU circle overlay (not a full-page
 * View Transition snapshot of the DOM — that was the jank source).
 */
function runThemeReveal(
  next: Theme,
  origin: ThemeOrigin,
  apply: () => void,
): Promise<void> {
  const { x, y } = resolveOrigin(origin);

  if (prefersReducedMotion()) {
    apply();
    return Promise.resolve();
  }

  const radius = maxRevealRadius(x, y);
  /* Match canvas tokens — cool graphite void, light paper */
  const targetBg = next === "dark" ? "#0e0f11" : "#f3ebe0";

  return new Promise<void>((resolve) => {
    const overlay = document.createElement("div");
    overlay.setAttribute("aria-hidden", "true");
    overlay.className = "theme-circle-overlay";
    // Compositor-friendly: fixed layer, clip-path only
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483645",
      "pointer-events:none",
      `background:${targetBg}`,
      `clip-path:circle(0px at ${x}px ${y}px)`,
      "transform:translateZ(0)",
      "will-change:clip-path",
      "contain:strict",
    ].join(";");
    document.documentElement.appendChild(overlay);

    const anim = overlay.animate(
      [
        { clipPath: `circle(0px at ${x}px ${y}px)` },
        { clipPath: `circle(${radius}px at ${x}px ${y}px)` },
      ],
      {
        duration: REVEAL_MS,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      },
    );

    // Swap theme early so underlay matches as the circle fills
    const mid = window.setTimeout(() => apply(), Math.round(REVEAL_MS * 0.35));

    const finish = () => {
      window.clearTimeout(mid);
      apply();
      overlay.remove();
      resolve();
    };

    anim.finished.then(finish).catch(finish);
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Hydration always sees getServerSnapshot ("light"); client store syncs after mount.
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [ready, setReady] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const busyRef = useRef(false);
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
    };
  }, []);

  const commitTheme = useCallback((next: Theme) => {
    writeStore(next, true);
  }, []);

  const setTheme = useCallback(
    (next: Theme, origin?: ThemeOrigin) => {
      if (busyRef.current) return;
      if (next === themeRef.current) return;

      busyRef.current = true;
      setTransitioning(true);

      void runThemeReveal(next, resolveOrigin(origin), () =>
        commitTheme(next),
      ).finally(() => {
        busyRef.current = false;
        setTransitioning(false);
      });
    },
    [commitTheme],
  );

  const toggleTheme = useCallback(
    (origin?: ThemeOrigin) => {
      const next: Theme = themeRef.current === "dark" ? "light" : "dark";
      setTheme(next, origin);
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
