"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-luxe print:hidden"
      aria-label="Print line sheet or save as PDF"
    >
      <Printer className="h-3.5 w-3.5" />
      Print / Save as PDF
    </button>
  );
}
