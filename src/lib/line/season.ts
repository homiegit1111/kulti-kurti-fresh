/**
 * §1.7 — season label, hoisted verbatim from src/app/line-sheet/page.tsx:25-33.
 * Derived server-side so it's fixed at render time.
 */
export function seasonLabel(date: Date): string {
  const m = date.getMonth(); // 0-indexed
  const y = date.getFullYear();
  if (m >= 2 && m <= 4) return `Spring/Summer ${y}`;
  if (m >= 5 && m <= 7) return `Monsoon ${y}`;
  if (m >= 8 && m <= 10) return `Autumn/Winter ${y}`;
  return `Winter ${y}`;
}
