"use client";

/**
 * §1.7 — ChopStamp: the saffron chop (R10). Wraps `.chop`/`.chop-fired` with a
 * `moqMet` edge-trigger — fires once per false→true transition, session-scoped,
 * never on mount (entrance policy §1.6), never repeats, never pulses.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SESSION_KEY = "rangat-chop-fired";

/**
 * §1.7 — the in-app chop. Invisible until `moqMet`; the stamp animation runs
 * only when this component witnesses the false→true flip (and the session has
 * not already fired it). Reduced motion: `.chop-fired` is gated in globals.css,
 * so the chop simply appears.
 */
export function ChopStamp({
  moqMet,
  className,
}: {
  moqMet: boolean;
  className?: string;
}) {
  const prevRef = useRef(moqMet);
  const [fired, setFired] = useState(false);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = moqMet;

    if (!moqMet) {
      // Dropping below MOQ re-arms the stamp for the next genuine crossing.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- edge-trigger: state re-arms in sync with the external sessionStorage flag cleared below
      setFired(false);
      try {
        window.sessionStorage.removeItem(SESSION_KEY);
      } catch {
        /* private mode — the edge trigger below still works for this mount */
      }
      return;
    }

    if (!prev) {
      let alreadyFired = false;
      try {
        alreadyFired = window.sessionStorage.getItem(SESSION_KEY) === "1";
      } catch {
        /* unreadable storage — treat as not fired */
      }
      if (!alreadyFired) {
        try {
          window.sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* best effort */
        }
        setFired(true);
      }
    }
  }, [moqMet]);

  return (
    <span
      aria-hidden="true"
      className={cn("chop", !moqMet && "opacity-0", fired && "chop-fired", className)}
    />
  );
}
