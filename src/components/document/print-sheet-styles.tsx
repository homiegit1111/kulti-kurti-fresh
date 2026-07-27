/**
 * §1.7 — PrintSheetStyles: the A4 print contract, ported from
 * src/app/line-sheet/page.tsx:49-127 into a reusable co-located `<style>`
 * emitter with the §1.5-corrected accent pins. Consumed by /shop (ledger
 * density) and /line-sheet. Server-safe.
 *
 * Class contract (kept byte-compatible with the line-sheet route so adoption
 * is drop-in):
 * - `.ls-doc`      — the document wrapper; forces exact color printing.
 * - `.ls-card`     — a block that must never split across pages.
 * - `.ls-letterhead` — kept attached to the first content row; when
 *   `preparedFor` is passed it gains the print-only
 *   "Prepared for {business_name} · {city}" line.
 * - `.ls-keep`     — a footer that is part of the artifact and prints.
 * - `.ls-sheet-break`   — starts a new printed sheet.
 * - `.ls-sheet-counter` — increments and renders the CSS-counter "Sheet N"
 *   label; place one inside each sheet section.
 *
 * Hardcoded colors are allowed here and only here: print is always paper
 * (§1.1.10, §1.5).
 */

/** §1.7 — emit the print contract for the current route. */
export function PrintSheetStyles({ preparedFor }: { preparedFor?: string }) {
  const prepared = preparedFor
    ? preparedFor
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/[\r\n]+/g, " ")
    : null;

  return (
    <style>{`
@page {
  margin: 14mm;
  size: A4 portrait;
}

@media print {
  /* Force the paper (light) palette regardless of stored theme — the .dark
     override block sets these without !important, so the !important
     declarations here win in both themes. Accent pins corrected per §1.5 to
     the live light-theme saffron/vermilion. */
  :root,
  html.dark {
    --surface: #ffffff !important;
    --surface-2: #ffffff !important;
    --surface-inverse: #111111 !important;
    --surface-hover: #f2f2f0 !important;
    --content: #111111 !important;
    --content-inverse: #f5f5f3 !important;
    --line: #111111 !important;
    --accent-lime: #E9A319 !important;
    --accent-red: #C03A2B !important;
  }

  /* The theme boot script sets color-scheme: dark inline on <html>; Chromium
     paints the PDF canvas (page margins included) per color-scheme, so a
     dark-theme "Save as PDF" gets a black frame without this. */
  html {
    background: #ffffff !important;
    color-scheme: light !important;
  }

  body {
    background: #ffffff !important;
    color: #111111 !important;
  }

  /* Chrome suppression (§1.1.10): every fixed/sticky rail, nav and non-artifact
     footer leaves the printed sheet via the class-substring contract. */
  nav,
  footer:not(.ls-keep),
  [class*="fixed"],
  [class*="sticky"] {
    display: none !important;
  }

  /* Hairlines, accent squares and style-code chips are part of the document —
     print them even when "background graphics" is unticked. */
  .ls-doc,
  .ls-doc * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* A card must never split across pages. */
  .ls-card {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Keep the letterhead attached to the first content row. */
  .ls-letterhead {
    break-after: avoid;
    page-break-after: avoid;
  }

  /* Motion is screen furniture. */
  * {
    transition: none !important;
    animation: none !important;
  }

  /* Sheet counter — "Sheet N" as a CSS counter. Mark each printed sheet
     section with .ls-sheet-break and place one .ls-sheet-counter inside it. */
  body {
    counter-reset: sheet;
  }
  .ls-sheet-break {
    break-before: page;
    page-break-before: always;
  }
  .ls-sheet-counter {
    counter-increment: sheet;
  }
  .ls-sheet-counter::after {
    content: "Sheet " counter(sheet);
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: rgba(17, 17, 17, 0.45);
  }
${
  prepared
    ? `
  /* Letterhead gains the buyer address line in print. */
  .ls-letterhead::after {
    content: "Prepared for ${prepared}";
    display: block;
    margin-top: 8px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: #111111;
  }
`
    : ""
}}
    `}</style>
  );
}
