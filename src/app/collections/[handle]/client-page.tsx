"use client";

/**
 * Collection detail — an orderable chapter of the line book.
 *
 * Data arrives entirely as server props (the route fetched once for JSON-LD
 * and the page alike). No client refetch, no mock flash: empty means empty.
 *
 * Body is instrument-register: LedgerHead + tray-wired StyleRows, with two
 * plates interleaved per the entry grammar. A prev/next chapter folio footer
 * closes the document. Zero entrance animation (style-row law).
 */

import { Fragment, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { TermsRule } from "@/components/document/terms-rule";
import { LedgerHead, StyleRow } from "@/components/line/style-row";
import { markTradeBuyer } from "@/lib/line/density";
import { toStyleLine, type StyleLine } from "@/lib/line/contract";
import { useTray } from "@/lib/line/tray-context";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";
import {
  formatPrice,
  type CommerceCollection,
  type MockProduct,
} from "@/lib/commerce/catalog";

export interface ChapterSpec {
  styleCount: number;
  perPieceMin: number;
  perPieceMax: number;
  colors: string[];
}

interface ChapterLink {
  handle: string;
  title: string;
}

/** Plate + caption in the fixed R3 grammar: code / title / pack / rate. */
function ChapterPlate({ line }: { line: StyleLine }) {
  const { product } = line;
  return (
    <div className="grid gap-x-6 gap-y-4 border-b border-line/20 py-8 lg:grid-cols-12">
      <Link
        href={`/shop/${product.handle}`}
        className="block lg:col-span-5"
        tabIndex={-1}
        aria-hidden
      >
        <div className="plate-frame relative aspect-[4/5] overflow-hidden bg-surface-hover">
          <Image
            src={product.image}
            alt={product.title}
            fill
            sizes="(max-width: 1024px) 100vw, 480px"
            className="object-cover"
          />
        </div>
      </Link>
      <div className="ledger lg:col-span-3">
        <p className="font-mono text-[11px] tracking-[0.08em] text-content/70">
          {line.code}
        </p>
        <Link href={`/shop/${product.handle}`} className="group/title block">
          <p className="mt-2 text-sm font-bold leading-tight tracking-[-0.02em] group-hover/title:underline sm:text-base">
            {product.title}
          </p>
        </Link>
        <p className="mt-2 text-[9px] font-extrabold uppercase tracking-[0.18em] text-content/55">
          set of {B2B_CONFIG.setSize} · {SIZE_RATIO_LABEL}
        </p>
        <p className="mt-2 text-sm font-black tabular-nums tracking-[-0.02em]">
          {formatPrice(line.setPrice)}
          <span className="ml-1 text-[8px] font-bold uppercase tracking-[0.14em] text-content/45">
            set
          </span>
          <span className="mx-1.5 text-content/40">·</span>
          {formatPrice(line.perPiece)}
          <span className="ml-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-content/45">
            /pc
          </span>
        </p>
      </div>
    </div>
  );
}

export default function CollectionDetailClient({
  collection,
  products,
  chapterIndex,
  spec,
  prevChapter,
  nextChapter,
}: {
  collection: CommerceCollection;
  products: MockProduct[];
  chapterIndex: number;
  spec: ChapterSpec;
  prevChapter: ChapterLink | null;
  nextChapter: ChapterLink | null;
}) {
  const tray = useTray();
  const letter = String.fromCharCode(65 + (chapterIndex % 26));

  // Rows carry live tray state — a committed style shows its set count with
  // no row-owned state (line-client pattern).
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
        markTradeBuyer();
      },
      onSetsChange: (line: StyleLine, sets: number) =>
        tray.setSets(line.product.id, sets),
      onDemote: (line: StyleLine) => tray.demote(line.product.id),
      onToggleShortlist: (line: StyleLine) =>
        tray.toggleShortlist(line.product),
      onToggleCompare: (line: StyleLine) => tray.toggleCompare(line.product),
    }),
    [tray],
  );

  // Two plates interleaved through the ledger (entry grammar).
  const plateA = lines.length >= 2 ? lines[0] : null;
  const plateAfterA = Math.min(3, lines.length - 1);
  const plateB = lines.length >= 8 ? lines[Math.floor(lines.length / 2)] : null;
  const plateAfterB = Math.min(9, lines.length - 1);

  return (
    <section className="bg-surface px-5 pb-24 pt-28 text-content sm:px-10 lg:px-16 lg:pt-36">
      <div className="mx-auto max-w-[1400px]">
        {/* Text block with the folio rail at lg+ (R2). */}
        <div className="relative lg:ml-[72px] lg:border-l lg:border-line/25 lg:pl-6">
          <Link
            href="/collections"
            className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-content/55 hover:text-content"
          >
            ← All collections
          </Link>

          {/* Folio head — entry anatomy with the chapter letter in the rail. */}
          <header className="entry-rule relative mt-6">
            <span className="hidden text-[10px] font-extrabold uppercase tracking-[0.22em] lg:absolute lg:-left-[72px] lg:top-5 lg:block lg:w-[72px]">
              {letter}
            </span>
            <p className="pt-5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-content/55">
              Collection {letter} · wholesale kurti sets
            </p>
            <h1 className="mt-3 max-w-[16ch] text-[clamp(2.75rem,6vw,5.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
              {collection.title}
            </h1>
            {/* Standfirst — a larger line than the note, so an owner who fills
                both gets a hierarchy rather than two identical paragraphs. */}
            {collection.subtitle && (
              <p className="mt-4 max-w-[46ch] font-editorial text-[clamp(1rem,1.6vw,1.25rem)] font-light italic leading-[1.4] text-content/80">
                {collection.subtitle}
              </p>
            )}
            {collection.description && (
              <p className="mt-4 max-w-[52ch] text-sm leading-[21px] text-content/70">
                {collection.description}
              </p>
            )}
            {/* Long copy. Blank lines in the editor become paragraphs; the text is
                rendered as React children, never as HTML. */}
            {collection.body &&
              collection.body.split(/\n{2,}/).map((para, i) => (
                <p
                  key={i}
                  className="mt-4 max-w-[58ch] text-sm leading-[22px] text-content/65"
                >
                  {para}
                </p>
              ))}

            {/* Chapter spec — computed server-side from the live products. */}
            <dl className="ledger mt-8 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-line/25 pt-4 sm:grid-cols-3">
              <div>
                <dt className="text-[8px] font-extrabold uppercase tracking-[0.22em] text-content/45">
                  Styles
                </dt>
                <dd className="mt-1 text-sm font-black tabular-nums">
                  {spec.styleCount}
                </dd>
              </div>
              <div>
                <dt className="text-[8px] font-extrabold uppercase tracking-[0.22em] text-content/45">
                  Per pc
                </dt>
                <dd className="mt-1 text-sm font-black tabular-nums">
                  {spec.styleCount > 0
                    ? spec.perPieceMin === spec.perPieceMax
                      ? formatPrice(spec.perPieceMin)
                      : `${formatPrice(spec.perPieceMin)}–${formatPrice(spec.perPieceMax)}`
                    : "—"}
                </dd>
              </div>
              {spec.colors.length > 0 && (
                <div className="col-span-2 sm:col-span-1">
                  <dt className="text-[8px] font-extrabold uppercase tracking-[0.22em] text-content/45">
                    Colours
                  </dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {spec.colors.map((color) => (
                      <span
                        key={color}
                        className="border border-content/35 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]"
                      >
                        {color}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>

            <TermsRule className="mt-6" />
          </header>

          {/* Chapter body — the orderable ledger. */}
          <div className="mt-8">
            {lines.length > 0 ? (
              <>
                <LedgerHead />
                {lines.map((line, index) => (
                  <Fragment key={line.product.id}>
                    <StyleRow
                      line={line}
                      shortlisted={tray.isShortlisted(line.product.id)}
                      {...actions}
                    />
                    {plateA && index === plateAfterA && (
                      <ChapterPlate line={plateA} />
                    )}
                    {plateB && index === plateAfterB && (
                      <ChapterPlate line={plateB} />
                    )}
                  </Fragment>
                ))}
              </>
            ) : (
              /* Honest empty chapter — never mock rows. */
              <div className="max-w-xl">
                <p className="border-b border-line/20 py-3 text-sm leading-6 text-content/70">
                  Collection updating — WhatsApp for today&apos;s price list.
                </p>
                <a
                  href={buildCatalogRequestUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex h-11 items-center border border-content px-6 text-[10px] font-extrabold uppercase tracking-[0.2em] transition-colors hover:bg-surface-inverse hover:text-content-inverse"
                >
                  WhatsApp catalog
                </a>
              </div>
            )}
          </div>

          {/* Prev / next chapter folio footer. */}
          <nav
            aria-label="Collections"
            className="mt-16 grid grid-cols-2 gap-4 border-t border-line/25 pt-6"
          >
            <div>
              {prevChapter ? (
                <Link
                  href={`/collections/${prevChapter.handle}`}
                  className="group block"
                >
                  <span className="text-[8px] font-extrabold uppercase tracking-[0.22em] text-content/45">
                    Previous collection
                  </span>
                  <span className="mt-1 block text-sm font-bold tracking-[-0.02em] group-hover:underline">
                    ← {prevChapter.title}
                  </span>
                </Link>
              ) : (
                <Link href="/collections" className="group block">
                  <span className="text-[8px] font-extrabold uppercase tracking-[0.22em] text-content/45">
                    Index
                  </span>
                  <span className="mt-1 block text-sm font-bold tracking-[-0.02em] group-hover:underline">
                    ← All collections
                  </span>
                </Link>
              )}
            </div>
            <div className="text-right">
              {nextChapter ? (
                <Link
                  href={`/collections/${nextChapter.handle}`}
                  className="group block"
                >
                  <span className="text-[8px] font-extrabold uppercase tracking-[0.22em] text-content/45">
                    Next collection
                  </span>
                  <span className="mt-1 block text-sm font-bold tracking-[-0.02em] group-hover:underline">
                    {nextChapter.title} →
                  </span>
                </Link>
              ) : (
                <Link href="/shop" className="group block">
                  <span className="text-[8px] font-extrabold uppercase tracking-[0.22em] text-content/45">
                    The line
                  </span>
                  <span className="mt-1 block text-sm font-bold tracking-[-0.02em] group-hover:underline">
                    Open the full line →
                  </span>
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
    </section>
  );
}
