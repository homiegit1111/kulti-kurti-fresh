/**
 * Root template — a fresh instance mounts on every client navigation, giving
 * React one <ViewTransition> exit/enter boundary per page turn.
 *
 * This boundary is what actually starts the browser View Transition under
 * `experimental.viewTransition`: Next marks navigations as React Transitions
 * (startTransition/addTransitionType in app-router-instance), but react-dom
 * only calls document.startViewTransition when a <ViewTransition> fiber is
 * part of the commit — with no boundary in the tree, no transition ever fires.
 *
 * <ViewTransition> renders no wrapper DOM: children are returned unchanged.
 * Crossfade/morph timing lives in globals.css (gated on prefers-reduced-motion
 * there); browsers without the View Transitions API simply navigate normally.
 */
// Type-level opt-in to React canary APIs (ViewTransition) — see
// @types/react/canary.d.ts. `import type` is fully elided at emit, so no
// runtime specifier reaches the bundler (Next aliases `react` and ships no
// `react/canary` subpath); tsc still loads the module augmentation.
import type {} from "react/canary";
import { ViewTransition, type ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return <ViewTransition>{children}</ViewTransition>;
}
