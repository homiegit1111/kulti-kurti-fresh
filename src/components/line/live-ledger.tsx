"use client";

/**
 * LiveLedger — StyleRow wired to the tray, reusable on any page.
 *
 * WHY THIS EXISTS: the homepage previously hand-rolled its own inventory table
 * as a list of <Link> rows. That markup could show a rate but could never carry
 * an order control, because a stepper inside an anchor is invalid HTML and
 * breaks keyboard use. So a buyer who already knew what they wanted had to
 * navigate away to act — the exact "no clear path to order fast" problem.
 *
 * This component owns the tray wiring once, so the homepage, /line and any
 * future surface render the SAME row with the same live state. There is now one
 * ledger implementation on the site, not two that drift.
 *
 * PRESENTATIONAL: reads the catalog, writes only tray state (localStorage).
 * Touches no cart handler, no checkout, no schema.
 */

import { useMemo } from "react";
import { toStyleLine, type StyleLine } from "@/lib/line/contract";
import type { MockProduct } from "@/lib/commerce/catalog";
import { useTray } from "@/lib/line/tray-context";
import { markTradeBuyer } from "@/lib/line/density";
import { LedgerHead, StyleRow } from "./style-row";

export function LiveLedger({
  products,
  showHead = true,
}: {
  products: MockProduct[];
  showHead?: boolean;
}) {
  const tray = useTray();

  /** Rows carry live tray state, so a committed style shows its set count here. */
  const lines = useMemo(
    () =>
      products.map((product) => {
        const entry = tray.lines.find((l) => l.product.id === product.id);
        return toStyleLine(
          product,
          entry?.sets ?? 0,
          tray.isComparing(product.id),
        );
      }),
    [products, tray],
  );

  const actions = useMemo(
    () => ({
      onCommit: (line: StyleLine) => {
        tray.commit(line.product);
        // First commit identifies a trade buyer, which promotes Ledger to their
        // default density on /line. No account, no cookie, no server.
        markTradeBuyer();
      },
      onSetsChange: (line: StyleLine, sets: number) =>
        tray.setSets(line.product.id, sets),
      onDemote: (line: StyleLine) => tray.demote(line.product.id),
      onToggleShortlist: (line: StyleLine) => tray.toggleShortlist(line.product),
      onToggleCompare: (line: StyleLine) => tray.toggleCompare(line.product),
    }),
    [tray],
  );

  return (
    <div>
      {showHead && <LedgerHead />}
      {lines.map((line) => (
        <StyleRow
          key={line.product.id}
          line={line}
          shortlisted={tray.isShortlisted(line.product.id)}
          {...actions}
        />
      ))}
    </div>
  );
}
