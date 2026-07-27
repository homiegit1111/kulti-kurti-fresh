"use client";

/**
 * THE HOMEPAGE BODY — one colour, stepped in tone. Off-white throughout; the
 * cloth in the photographs is the only colour on the page.
 *
 *   Cover        — the loom sheet (see cover.tsx).
 *   This season  — an asymmetric editorial spread: plates hung at different
 *                  heights, overlapping the grid, priced in small typeset
 *                  labels. Never a row of equal boxes.
 *   Price list   — the live tray-wired ledger; add sets straight from the sheet.
 *   Collections  — tall cloth on the next tone up.
 *   On Instagram — the confirmed posts.
 *   Contact      — the closing panel.
 *
 * All on-screen labels are buyer words. No entrance animation anywhere.
 */

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { B2B_CONFIG, GST_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
import { formatPrice } from "@/lib/commerce/catalog";
import type { CommerceCollection, CommerceProduct } from "@/lib/commerce/types";
import type { HomeContent } from "@/lib/content/home-types";
import { toStyleLine, type StyleLine } from "@/lib/line/contract";
import { markTradeBuyer } from "@/lib/line/density";
import { useTray } from "@/lib/line/tray-context";
import { LedgerHead, StyleRow } from "@/components/line/style-row";
import { CinematicBand } from "@/components/sections/cinematic-band";
import { FloatingSet } from "@/components/sections/floating-set";
import { InstagramThread } from "@/components/sections/instagram-thread";
import { INSTAGRAM_HANDLE, INSTAGRAM_PROFILE } from "@/lib/instagram/posts";
import { cn } from "@/lib/utils";

/* ── Field: a full-bleed band of the one colour, stepped only in tone ─────── */

/**
 * ONE COLOUR: every band is the same off-white, separated from its neighbours by
 * tone alone (ground → panel → raised) and by hairlines. There is no inverted or
 * dyed variant, because a second hue is exactly what the page must not have —
 * the cloth in the photographs is the only colour on screen.
 */
function Field({
  tone = "paper",
  className,
  children,
}: {
  tone?: "paper" | "panel" | "raised";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "text-home-ink",
        tone === "paper" && "bg-home-ground",
        tone === "panel" && "bg-home-panel",
        tone === "raised" && "bg-home-raised",
        className,
      )}
    >
      <div className="mx-auto max-w-[1400px] px-5 md:px-10 lg:px-16">
        {/* The 72px folio margin the entry letters hang in. */}
        <div className="relative lg:pl-[72px]">{children}</div>
      </div>
    </div>
  );
}

/* ── Section head — रंगत language ──────────────────────────────────────────
   The cover set the vocabulary: a vermilion eyebrow, a light Fraunces line, a
   hairline under it. The old EntryHead (folio letter + Inter micro-caps) spoke
   the previous system and clashed with it, so the homepage uses this instead.
   Counts stay real — they come from the catalogue, so they move with stock. */

function SectionHead({
  eyebrow,
  title,
  accent,
  action,
  className,
}: {
  eyebrow: string;
  title: string;
  /** The clause set in vermilion italic — the cover's signature. */
  accent?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("border-b border-home-rule pb-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="inline-flex items-center gap-2.5 text-[10px] font-extrabold uppercase tracking-[0.36em] text-home-vermilion">
            <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full bg-home-vermilion" />
            {eyebrow}
          </p>
          <h2 className="mt-3 font-editorial text-[clamp(1.6rem,2.6vw,2.3rem)] font-light leading-[1.14] tracking-[-0.01em]">
            {title}
            {accent && (
              <>
                {" "}
                <span className="font-semibold italic text-home-vermilion">
                  {accent}
                </span>
              </>
            )}
          </h2>
        </div>
        {action && <div className="pb-1">{action}</div>}
      </div>
    </header>
  );
}

/* ── This season — the lineup ────────────────────────────────────────────── */

/**
 * Three models cut out and stood on the paper, at staggered heights.
 *
 * No frames, no boxes, no backgrounds: the cutouts share the cover's device, so
 * the eye reads figures standing on one sheet rather than photographs pasted
 * into a grid. Framed shots with their own studio walls fought the cream and
 * made the page look like a template — that is why they are gone.
 *
 * The garments are fixed brand photography; the CODES AND RATES BESIDE THEM ARE
 * LIVE, so the lineup keeps telling the truth as stock turns over.
 */
function SeasonSpread({
  products,
  todayIndex,
  content,
}: {
  products: CommerceProduct[];
  todayIndex: number;
  content: HomeContent["season"];
}) {
  // The shots are editable (Admin Studio → Content → Home → This season); the
  // style each one is priced against still rotates from the live catalogue, so
  // the spread re-prices itself as stock turns over.
  const picks = content.shots
    .map((shot, i) => ({
      src: shot.image,
      product: products[(todayIndex + i) % Math.max(1, products.length)],
    }))
    .filter((f) => f.product);

  if (picks.length === 0) return null;

  return (
    <Field tone="paper" className="pb-16 pt-20 lg:pb-20 lg:pt-28">
      <section aria-label="This season">
        <SectionHead
          eyebrow={content.eyebrow}
          title={content.headline}
          accent={content.headlineAccent}
          action={
            <Link
              href={content.ctaHref}
              className="inline-flex h-11 items-center rounded-full border border-home-ink/25 px-5 font-trade text-[11px] lg:h-10 tracking-[0.06em] transition-colors duration-200 hover:border-home-ink hover:bg-home-ink hover:text-home-ground"
            >
              {content.ctaLabel}
            </Link>
          }
        />

        {/* On a phone the plate runs wider than the paper — say so, once, in
            the buyer's words. The count is the real count. */}
        <p className="mt-5 font-trade text-[10px] tracking-[0.18em] text-home-ink-mute sm:hidden">
          {picks.length} styles · swipe →
        </p>

        {/* THE PLATE — not a card grid.
            The figures stand on ONE shared ground rule at three different
            heights, each in front of a soft arch of light, numbered in
            Devanagari to match the masthead. Cards were the problem: three
            equal rounded boxes is the shape every template makes. Here the
            rule, the scale changes and the arches do the work instead.

            ON A PHONE THE PLATE IS KEPT, NOT REPLACED. Three columns inside a
            360px screen came to 98px each, which pushed the narrowest model
            down to 65px of rendered width — the thumbnail grid this section
            exists to avoid. So below `sm` the same plate becomes a snap-scrolling
            track of FULL-SIZE figures: the columns butt together with no gap, so
            their rule segments join into the one continuous ground rule the
            plate is built on, and it simply runs off the edge of the screen —
            which is what a plate wider than the paper does. Nothing is stacked,
            boxed or rounded; at `sm` and above the signed-off grid returns
            untouched. */}
        <div className="relative mt-10 sm:mt-14 lg:mt-20">
          <div className="-mx-5 flex snap-x snap-mandatory items-end overflow-x-auto scroll-pl-5 px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-6 sm:overflow-x-visible sm:px-0 sm:pb-0 lg:gap-x-10 [&::-webkit-scrollbar]:hidden">
            {picks.map(({ src, product }, i) => {
              const setPrice = product.salePrice ?? product.price;
              const perPiece = getPerPiecePrice(setPrice);
              /* Centre figure stands tallest — a straight row reads as a grid. */
              const height = [
                "h-[300px] sm:h-[360px] lg:h-[470px]",
                "h-[340px] sm:h-[410px] lg:h-[540px]",
                "h-[286px] sm:h-[345px] lg:h-[450px]",
              ][i];
              return (
                <Link
                  key={product.id}
                  href={`/shop/${product.handle}`}
                  className="group relative flex w-[66vw] max-w-[290px] shrink-0 snap-start flex-col items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-home-ink sm:w-auto sm:max-w-none sm:shrink"
                >
                  {/* The arch of light behind her — jharokha, softened to a wash.
                      The wash itself moved to `.home-arch` in globals.css: it was
                      hardcoded white, which is a bloom of paper light by day and a
                      blown-out box behind a cutout at night. Same ellipse, same
                      size, same hover — only the light changes with the theme. */}
                  <div
                    aria-hidden="true"
                    className="home-arch pointer-events-none absolute bottom-0 left-1/2 h-[86%] w-[86%] -translate-x-1/2 rounded-t-full transition-opacity duration-500 group-hover:opacity-70 motion-reduce:transition-none"
                  />
                  {/* Devanagari numeral — the register mark. */}
                  <span
                    aria-hidden="true"
                    className="absolute -top-2 left-3 font-deva text-[13px] font-bold text-home-vermilion sm:left-0 sm:text-[15px] lg:-top-3"
                  >
                    {["०१", "०२", "०३"][i]}
                  </span>

                  {/* The inset lives on a wrapper, not on the sized box: the
                      image is `fill`, so padding on its own containing block
                      would not move it. */}
                  <div className="w-full px-3 sm:px-0">
                    <div
                      className={cn(
                        "relative",
                        height,
                        "transition-transform duration-500 ease-out group-hover:-translate-y-2 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0",
                      )}
                    >
                      <Image
                        src={src}
                        alt={product.title}
                        fill
                        sizes="(max-width: 640px) 62vw, 30vw"
                        className="object-contain object-bottom"
                      />
                      {/* Contact shadow — she stands on the rule, not above it. */}
                      <div
                        aria-hidden="true"
                        className="absolute -bottom-1 left-1/2 h-3 w-[52%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse,rgba(25,20,16,0.26),rgba(25,20,16,0)_72%)] blur-[3px]"
                      />
                    </div>
                  </div>

                  {/* The ground rule runs through all three columns — and on a
                      phone, where the track carries no gap, the segments meet
                      and read as the single line they are meant to be. */}
                  <div className="mt-0 w-full border-t border-home-ink/35" />

                  <div className="w-full px-3 pt-4 sm:px-0">
                    <p className="font-trade text-[10px] tracking-[0.06em] text-home-ink-mute">
                      {getStyleCode(product)}
                    </p>
                    {/* Clamped to two lines so every label block is the same
                        height — otherwise a long title drops its own column and
                        the shared ground rule stops being shared. */}
                    <p className="mt-1.5 line-clamp-2 min-h-[2.5em] font-editorial text-[17px] italic leading-tight sm:text-[18px] lg:min-h-0 lg:text-[20px]">
                      {product.title}
                    </p>
                    <p className="mt-2.5 flex items-baseline gap-1.5">
                      <span className="text-[22px] font-extrabold tabular-nums tracking-[-0.03em] sm:text-[24px]">
                        {formatPrice(perPiece)}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-home-ink-mute">
                        /pc
                      </span>
                    </p>
                    <p className="mt-1 text-[12px] font-semibold text-home-ink-mute">
                      {formatPrice(setPrice)} · set of {B2B_CONFIG.setSize}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </Field>
  );
}

/* ── Price list — the paper insert ───────────────────────────────────────── */

function PriceList({
  ledgerProducts,
  styleCount,
  catalogRequestUrl,
}: {
  ledgerProducts: CommerceProduct[];
  styleCount: number;
  catalogRequestUrl: string;
}) {
  const tray = useTray();

  // Server products + live tray state → StyleLines. Same derivation as /shop,
  // so a commit here and the /shop ledger always agree (one localStorage tray).
  const lines = useMemo(
    () =>
      ledgerProducts.map((product) => {
        const entry = tray.lines.find((l) => l.product.id === product.id);
        return toStyleLine(
          product,
          entry?.sets ?? 0,
          tray.isComparing(product.id),
        );
      }),
    [ledgerProducts, tray],
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
      onToggleShortlist: (line: StyleLine) => tray.toggleShortlist(line.product),
      onToggleCompare: (line: StyleLine) => tray.toggleCompare(line.product),
    }),
    [tray],
  );

  return (
    <Field tone="paper" className="pb-20 lg:pb-28">
      <section id="price-list" aria-label="Price list">
        <SectionHead
          eyebrow={`Price list · ${styleCount} styles live`}
          title="Today's rates,"
          accent="open for the trade."
          action={
            <Link
              href="/shop"
              className="inline-flex h-11 items-center rounded-full border border-home-ink/25 px-5 font-trade text-[11px] lg:h-10 tracking-[0.06em] transition-colors duration-200 hover:border-home-ink hover:bg-home-ink hover:text-home-ground"
            >
              See all styles →
            </Link>
          }
        />
        <p className="mt-5 max-w-[54ch] text-sm leading-[22px] text-content/70">
          Add sets straight from this sheet — your order follows you across the
          site and onto WhatsApp.
        </p>
        {lines.length > 0 ? (
          <div className="ledger mt-8">
            <LedgerHead />
            {lines.map((line) => (
              <StyleRow
                key={line.product.id}
                line={line}
                shortlisted={tray.isShortlisted(line.product.id)}
                {...actions}
              />
            ))}
          </div>
        ) : (
          /* Empty-catalog contract: head + one honest row. */
          <a
            href={catalogRequestUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 flex items-center justify-between gap-4 border-b border-line/20 py-4 text-sm font-bold tracking-[-0.01em] hover:underline"
          >
            New styles coming — WhatsApp for today&apos;s price list.
            {/* /70, not /55: this only renders on an empty catalogue, so it is
                never on screen during an audit — and /55 computes to 3.8:1 on
                the cover ground by day. Same floor as the rest of the sheet. */}
            <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-content/70">
              WhatsApp →
            </span>
          </a>
        )}
      </section>
    </Field>
  );
}

/* ── Collections — dyed forest, tall cloth ───────────────────────────────── */

function Collections({ collections }: { collections: CommerceCollection[] }) {
  return (
    <Field tone="panel" className="py-20 lg:py-28">
      <section aria-label="Collections">
        <SectionHead
          eyebrow={`Collections · ${collections.length}`}
          title="Racks built"
          accent="around a theme."
          action={
            <Link
              href="/collections"
              className="inline-flex h-11 items-center rounded-full border border-home-ink/25 px-5 font-trade text-[11px] lg:h-10 tracking-[0.06em] transition-colors duration-200 hover:border-home-ink hover:bg-home-ink hover:text-home-ground"
            >
              All collections →
            </Link>
          }
        />
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {collections.map((collection, index) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.handle}`}
              className={cn(
                "group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-lime",
                /* Staggered hang — the middle panel drops, so the row reads as
                   a hung spread rather than three equal cards. */
                index === 1 && "lg:mt-16",
                index === 2 && "lg:mt-8",
              )}
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-home-raised">
                <Image
                  src={collection.image}
                  alt={collection.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-3 border-b border-home-ink/20 pb-2.5">
                <span className="font-serif text-xl italic leading-tight group-hover:underline">
                  {collection.title}
                </span>
                <span className="ledger shrink-0 text-[11px] font-bold tabular-nums text-home-ink-soft">
                  {collection.itemCount}
                  <span className="ml-1 text-[8px] font-bold uppercase tracking-[0.14em] text-home-ink-mute">
                    styles
                  </span>
                </span>
              </div>
              <p className="mt-2.5 text-[13px] leading-[19px] text-home-ink-soft">
                {collection.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </Field>
  );
}

/* ── In the hand — the matted flat-lays, held in space ───────────────────── */

function InTheHand({ content }: { content: HomeContent["sets"] }) {
  /* The sets photographed flat on white; matted at ingest so they can float.
     Editable in Admin Studio → Content → Home → "Every set, in the hand" —
     including the rate labels, which are display copy rather than live prices. */
  const sets = content.items;
  if (sets.length === 0) return null;
  return (
    <Field tone="panel" className="py-20 lg:py-28">
      <section id="in-the-hand" aria-label="In the hand">
        <SectionHead
          eyebrow={content.eyebrow}
          title={content.headline}
          accent={content.headlineAccent}
        />
        <p className="mt-6 max-w-[46ch] text-[15px] leading-[1.66] text-home-ink-soft">
          {/* The paragraph's second sentence describes the cursor tilt, which is
              gated on `pointer: fine` — so on a phone it would be instructing the
              reader to move a cursor they do not have. The copy is split on the
              em dash and the trailing clause is hidden with the behaviour it
              describes. An owner who removes the dash simply gets one sentence
              everywhere, which is still correct. */}
          {content.body.split(" — ")[0]}
          {content.body.includes(" — ") ? (
            <span className="hidden lg:inline">
              {" — "}
              {content.body.split(" — ").slice(1).join(" — ")}
            </span>
          ) : null}
        </p>

        <FloatingSet items={sets} className="mt-12" />
      </section>
    </Field>
  );
}

/* ── Instagram — cream ───────────────────────────────────────────────────── */

function Instagram() {
  return (
    <Field tone="paper" className="py-20 lg:py-28">
      <section aria-label="On Instagram">
        <SectionHead
          eyebrow="On Instagram"
          title="Rack shots,"
          accent="as they go up."
          action={
            <a
              href={INSTAGRAM_PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center rounded-full border border-home-ink/25 px-5 font-trade text-[11px] lg:h-10 tracking-[0.06em] transition-colors duration-200 hover:border-home-ink hover:bg-home-ink hover:text-home-ground"
            >
              @{INSTAGRAM_HANDLE} →
            </a>
          }
        />
        <p className="mt-5 max-w-[52ch] text-sm leading-[22px] text-content/70">
          New arrivals and rack shots as they go up. Tap any post to open it on
          Instagram.
        </p>
        <InstagramThread className="mt-10 lg:mt-12" />
      </section>
    </Field>
  );
}

/* ── Contact — ink ───────────────────────────────────────────────────────── */

function Contact({ catalogRequestUrl }: { catalogRequestUrl: string }) {
  return (
    <div
      className="bg-home-raised text-home-ink"
    >
      <section
        aria-label="Contact"
        className="mx-auto max-w-[1400px] px-5 py-16 md:px-10 lg:px-16 lg:py-20"
      >
        <p className="text-[9px] font-extrabold uppercase tracking-[0.28em] text-home-ink-mute">
          Contact
        </p>
        <p className="mt-4 font-serif text-[clamp(2rem,4vw,3.25rem)] italic leading-[1.05] tracking-[-0.01em]">
          Rangat Pehnawa
        </p>
        <dl className="ledger mt-12 grid gap-x-8 gap-y-8 text-sm leading-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "WhatsApp",
              node: (
                <a
                  href={catalogRequestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center font-bold underline-offset-4 hover:underline"
                >
                  8660452247
                </a>
              ),
            },
            {
              label: "Email",
              node: (
                <a
                  href="mailto:rangatpehnawa@gmail.com"
                  className="inline-flex min-h-[44px] items-center font-bold underline-offset-4 hover:underline"
                >
                  rangatpehnawa@gmail.com
                </a>
              ),
            },
            {
              label: "Studio",
              node: (
                <span className="text-home-ink-soft">
                  3rd Floor, NR Complex, 36, Siddanna Ln, Cubbonpete, Bengaluru
                  560002
                </span>
              ),
            },
            {
              label: "Hours",
              node: (
                <span className="text-home-ink-soft">
                  Mon–Sat 10am–7pm IST · Sun closed
                </span>
              ),
            },
          ].map((item) => (
            <div key={item.label}>
              <dt className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-home-ink-mute">
                {item.label}
              </dt>
              <dd className="mt-2">{item.node}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

/* ── Assembly ────────────────────────────────────────────────────────────── */

export function HomeEntries({
  products,
  ledgerProducts,
  collections,
  todayIndex,
  samplePo,
  catalogRequestUrl,
  content,
}: {
  products: CommerceProduct[];
  ledgerProducts: CommerceProduct[];
  collections: CommerceCollection[];
  /** dayOfYear % products.length — computed server-side, deterministic per request. */
  todayIndex: number;
  /** Real buildWholesaleWhatsAppMessage output for the 2-line example cart. */
  samplePo: string | null;
  catalogRequestUrl: string;
  /**
   * Owner-editable copy and media, resolved on the server (see
   * src/lib/content/home.ts). Passed as plain data because this is a client
   * component — it must never import the content reader itself.
   */
  content: HomeContent;
}) {
  return (
    <>
      {products.length > 0 && (
        <SeasonSpread
          products={products}
          todayIndex={todayIndex}
          content={content.season}
        />
      )}
      {content.film.enabled && (
        <CinematicBand
          headline={content.film.headline}
          accent={content.film.headlineAccent}
          caption={content.film.caption}
          cta={content.film.ctaLabel}
          href={content.film.ctaHref}
          videoMp4={content.film.videoMp4}
          videoWebm={content.film.videoWebm}
          poster={content.film.poster}
        />
      )}
      <PriceList
        ledgerProducts={ledgerProducts}
        styleCount={products.length}
        catalogRequestUrl={catalogRequestUrl}
      />
      {collections.length > 0 && <Collections collections={collections} />}
      <InTheHand content={content.sets} />
      <Instagram />
      <Contact catalogRequestUrl={catalogRequestUrl} />
    </>
  );
}
