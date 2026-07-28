import Image from "next/image";
import Link from "next/link";
import { TYPICAL_RESALE_MULTIPLIER } from "@/lib/b2b/config";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
import { formatPrice } from "@/lib/commerce/catalog";
import type { CommerceProduct } from "@/lib/commerce/types";
import type { HomeCoverContent } from "@/lib/content/home-types";
import { RangatVectorPaths } from "./rangat-vector";

/** Last-resort art, used only if the owner clears the field entirely. */
const COVER_FALLBACK_MODEL = "/images/model-sage.png";
const COVER_FALLBACK_CLOTH = "/images/rangat-editorial-cloth.svg";

/**
 * THE COVER — couture typography first, model second.
 *
 * रंगत ("rangat" — colour) is a vector window onto one owner-supplied fabric
 * plate. The SVG keeps the Devanagari edges clean at every viewport, while the
 * image remains a photograph clipped inside the letterforms — never a generated
 * texture, overlay or replacement. A restrained internal rim and ambient shadow
 * supply the depth of letterpress on thick paper without drawing an outline.
 *
 * The native Devanagari anatomy stays intact. A separate fabric-filled bar only
 * extends the shirorekha beyond the word, giving the lockup its handcrafted,
 * editorial width without horizontally distorting the glyphs.
 *
 * The cutout remains a secondary plane in front of the masthead on desktop. On
 * phones the planes unstack so the word remains legible and the model never sits
 * on top of a counter.
 */
function CoutureWordmark({ clothUrl }: { clothUrl: string }) {
  return (
    <svg
      viewBox="0 0 1600 600"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="रंगत"
      className="couture-wordmark block h-auto w-full overflow-visible"
    >
      <defs>
        {/* One supplied editorial cloth composition, mapped across the whole
            lockup. The letters reveal different zones of the same photograph
            because each glyph occupies its own x-position — no tiled pattern. */}
        <pattern id="editorial-cloth" patternUnits="userSpaceOnUse" width="1600" height="600">
          <image
            href={clothUrl}
            x="-48"
            y="120"
            width="1696"
            height="1131"
            preserveAspectRatio="none"
          />
        </pattern>

        {/* Black centered stroke erodes only the INSIDE of the white shape in
            the luminance mask: ~18% thinner positive strokes, larger counters,
            identical outside dimensions. The fixed paths are the approved
            wordmark geometry, not live font text. */}
        <mask id="rangat-letters" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="600">
          <rect width="1600" height="600" fill="black" />
          <RangatVectorPaths fill="white" stroke="black" strokeWidth={22} />
          {/* Recut the headline as one illustrator-style bar: thin, long and
              optically continuous, while the underlying glyph junctions stay
              anchored at its lower edge. */}
          <rect x="0" y="118" width="1600" height="33" fill="black" />
          <rect x="0" y="177" width="1600" height="10" fill="black" />
          <rect x="70" y="151" width="1460" height="26" rx="2" fill="white" />
          <rect x="338" y="174" width="116" height="16" rx="2" fill="white" />
          <rect x="612" y="174" width="108" height="16" rx="2" fill="white" />
          <rect x="770" y="174" width="104" height="16" rx="2" fill="white" />
          <rect x="1240" y="174" width="116" height="16" rx="2" fill="white" />
          <circle cx="423" cy="88" r="29" fill="white" />
        </mask>

        {/* A paper-soft cast shadow. It gives lift, not an illustrated outline. */}
        <filter
          id="rangat-ambient"
          x="-12%"
          y="-12%"
          width="124%"
          height="145%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="5"
            floodColor="#2a1c12"
            floodOpacity="0.075"
          />
        </filter>

        {/* A narrow inside rim: warm shade below/right, paper light above/left.
            Both are clipped to the source alpha, so the vector edge stays clean. */}
        <filter
          id="rangat-surface"
          x="-4%"
          y="-4%"
          width="108%"
          height="108%"
          colorInterpolationFilters="sRGB"
        >
          <feMorphology
            in="SourceAlpha"
            operator="erode"
            radius="1.5"
            result="eroded"
          />
          <feComposite
            in="SourceAlpha"
            in2="eroded"
            operator="out"
            result="inner-rim"
          />

          <feOffset in="inner-rim" dx="1" dy="2" result="shade-offset" />
          <feGaussianBlur
            in="shade-offset"
            stdDeviation="0.9"
            result="shade-blur"
          />
          <feFlood floodColor="#321d12" floodOpacity="0.055" result="shade-color" />
          <feComposite
            in="shade-color"
            in2="shade-blur"
            operator="in"
            result="shade"
          />
          <feComposite
            in="shade"
            in2="SourceAlpha"
            operator="in"
            result="inner-shade"
          />

          <feOffset in="inner-rim" dx="-1" dy="-1" result="light-offset" />
          <feGaussianBlur
            in="light-offset"
            stdDeviation="0.6"
            result="light-blur"
          />
          <feFlood floodColor="#fffaf0" floodOpacity="0.045" result="light-color" />
          <feComposite
            in="light-color"
            in2="light-blur"
            operator="in"
            result="light"
          />
          <feComposite
            in="light"
            in2="SourceAlpha"
            operator="in"
            result="inner-light"
          />

          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="inner-shade" />
            <feMergeNode in="inner-light" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#rangat-ambient)">
        <g mask="url(#rangat-letters)" filter="url(#rangat-surface)">
          <rect width="1600" height="600" fill="url(#editorial-cloth)" />
        </g>
      </g>

    </svg>
  );
}

/** Quiet campaign notation: one drawn thread, three reference points, hairlines. */
function EditorialMarks() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1600 1240"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-[4] hidden h-full w-full lg:block"
    >
      <g
        fill="none"
        stroke="var(--home-vermilion)"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M1042 262 C974 310 908 352 936 440 C962 524 936 600 894 660 C842 732 826 780 790 842 C748 912 696 950 622 1000"
          strokeWidth="1.05"
          opacity="0.82"
        />
        <path d="M450 1018 H1440" strokeWidth="0.7" opacity="0.36" />
        <path d="M650 996 V1040 M930 996 V1040 M1210 996 V1040" strokeWidth="0.7" opacity="0.36" />
      </g>

      {[
        { x: 936, y: 440, label: "01" },
        { x: 790, y: 842, label: "02" },
        { x: 622, y: 1000, label: "03" },
      ].map((mark) => (
        <g key={mark.label} transform={`translate(${mark.x} ${mark.y})`}>
          <circle r="8" fill="var(--home-ground)" stroke="var(--home-vermilion)" strokeWidth="0.9" />
          <path d="M-13 0H13M0-13V13" stroke="var(--home-vermilion)" strokeWidth="0.8" />
          <text
            x="15"
            y="4"
            fill="var(--home-vermilion)"
            fontSize="11"
            fontWeight="700"
            letterSpacing="1"
            style={{ fontFamily: "var(--font-mono-trade), monospace" }}
          >
            {mark.label}
          </text>
        </g>
      ))}

      <text
        x="450"
        y="1008"
        fill="var(--home-ink-mute)"
        fontSize="9"
        letterSpacing="2.5"
        style={{ fontFamily: "var(--font-mono-trade), monospace" }}
      >
        COLLECTION 01 / CLOTH STUDY
      </text>
    </svg>
  );
}

export function Cover({
  products,
  catalogRequestUrl,
  season,
  content,
}: {
  products: CommerceProduct[];
  catalogRequestUrl: string;
  season: string;
  content: HomeCoverContent;
}) {
  const featured = products[0] ?? null;
  const setPrice = featured ? (featured.salePrice ?? featured.price) : null;
  const perPiece = setPrice !== null ? getPerPiecePrice(setPrice) : null;
  const keep =
    perPiece !== null
      ? Math.round(perPiece * TYPICAL_RESALE_MULTIPLIER) - perPiece
      : null;

  /* The cloth inside the letters — the owner's editable image, or the shipped
     patchwork still. The featured style no longer wins here: the masthead's
     mixed-textile fill is the brand mark's signature, and a single product
     photograph flattens it. */
  const clothUrl = content.clothImage || COVER_FALLBACK_CLOTH;
  /* next/image throws on an empty src, and the model is the LCP element, so the
     one field that must never be blank gets a hard floor. */
  const modelUrl = content.modelImage || COVER_FALLBACK_MODEL;

  return (
    <section
      id="home-cover"
      aria-label="Rangat Pehnawa — wholesale kurtis"
      className="home-cover-paper relative min-h-[94svh] overflow-hidden bg-home-ground text-home-ink lg:min-h-[105svh]"
    >
      {/* ── Plane 1: giant fabric-clipped couture wordmark ──
          Width is the art direction: 88vw keeps the typography at 80–90% of the
          hero while preserving generous ivory margins. The SVG carries its own
          correct Devanagari aspect ratio; no transform stretches the letters. */}
      <div
        aria-hidden="true"
        className="pointer-events-none relative z-[1] mx-auto w-[92vw] max-w-[1580px] select-none px-1 pt-[148px] sm:w-[90vw] sm:px-0 lg:absolute lg:inset-x-0 lg:top-[8svh] lg:w-[84vw] lg:pt-0"
      >
        <CoutureWordmark clothUrl={clothUrl} />
      </div>

      <EditorialMarks />

      {/* ── Plane 3: the model, in front of the name ──
          The cutout is only ~40% of its own frame wide (the rest is matting), so
          under lg the box is deliberately wider than the viewport — the section
          clips the empty sides and the figure lands at a human scale. Height comes
          from the asset's own ratio, not svh, so the band can never letterbox.

          On phones the model begins after the SVG rather than eating into it: the
          typography is now the hero element, and every counter must remain visible.
          Desktop keeps a restrained overlap, with the cutout scaled down so the
          wordmark remains the dominant plane. */}
      <div className="pointer-events-none relative z-[2] mt-0 flex justify-center lg:absolute lg:inset-x-0 lg:top-[5svh] lg:translate-x-[3vw]">
        <div className="relative aspect-[1024/1044] w-[106vw] max-w-[420px] shrink-0 lg:aspect-auto lg:h-[74svh] lg:w-full lg:shrink">
          <Image
            src={modelUrl}
            alt={
              featured
                ? `${featured.title} — wholesale kurta set`
                : "Kurta set from the wholesale line"
            }
            fill
            priority
            fetchPriority="high"
            sizes="(max-width: 1023px) 470px, 640px"
            className="object-contain object-bottom drop-shadow-[0_10px_20px_rgba(25,20,16,0.12)] lg:origin-bottom lg:scale-[1.38]"
          />
        </div>
      </div>

      {/* ── The reading layer ──
          pb clears the fixed mobile CTA bar (~76px) with room to breathe; the
          full-height, bottom-justified overlay is an lg-only behaviour now. */}
      <div className="relative z-[3] mx-auto flex max-w-[1500px] flex-col px-5 pb-[112px] pt-10 sm:px-8 lg:absolute lg:inset-x-0 lg:top-[50svh] lg:min-h-0 lg:justify-start lg:px-14 lg:pb-16 lg:pt-0">
        <div className="grid gap-y-10 lg:grid-cols-12 lg:items-end lg:gap-x-10">
          {/* Left: the argument. */}
          <div className="lg:col-span-5">
            <p className="font-sans text-[11px] font-extrabold uppercase tracking-[0.42em] text-home-vermilion">
              {content.eyebrow}
            </p>

            <h1 className="mt-4 max-w-[15ch] font-editorial text-[clamp(1.9rem,3.3vw,2.7rem)] font-light leading-[1.04] tracking-[-0.015em]">
              {content.headline}{" "}
              <span className="font-semibold italic text-home-vermilion">
                {content.headlineAccent}
              </span>
            </h1>

            <p className="mt-5 max-w-[40ch] text-[15px] leading-[1.66] text-home-ink-soft">
              {content.body}
            </p>

            {/* Two equal columns on a phone: a wrapping flex row let these
                collide once the labels grew. The grid cannot. Below 340px the
                "BROWSE STYLES" label (116.7px set) no longer fits half the row,
                so the pair stacks rather than printing outside the button. */}
            <div className="mt-8 grid grid-cols-1 gap-3 min-[340px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center">
              <Link
                href={content.primaryCtaHref}
                className="inline-flex h-[54px] items-center justify-center whitespace-nowrap bg-home-ink px-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-home-ground transition-opacity duration-200 hover:opacity-85 sm:px-7"
              >
                {content.primaryCtaLabel}
              </Link>
              <a
                href={catalogRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-[54px] items-center justify-center whitespace-nowrap border border-home-ink/35 px-3 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-colors duration-200 hover:border-home-ink sm:px-7"
              >
                {content.secondaryCtaLabel}
              </a>
            </div>
          </div>

          {/* Right: the featured style, priced from the catalogue. */}
          {featured && setPrice !== null && perPiece !== null && keep !== null && (
            <div className="lg:col-span-3 lg:col-start-10 lg:w-[280px] lg:justify-self-end lg:-translate-y-[165px]">
              <Link
                href={`/shop/${featured.handle}`}
                className="group block border border-home-rule/70 bg-home-panel/90 p-5 shadow-[0_16px_36px_-24px_rgba(25,20,16,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-home-ink"
              >
                <p className="font-trade text-[10px] text-home-ink-mute">
                  {getStyleCode(featured)}
                </p>
                <p className="mt-1.5 font-editorial text-[20px] italic leading-tight group-hover:underline">
                  {featured.title}
                </p>
                <div className="mt-3 flex items-baseline gap-3 border-t border-home-rule pt-3">
                  <span className="text-[27px] font-extrabold tracking-[-0.03em] tabular-nums">
                    {formatPrice(perPiece)}
                    <span className="ml-0.5 text-[11px] font-semibold text-home-ink-mute">
                      /pc
                    </span>
                  </span>
                  <span className="text-[12px] font-bold text-home-vermilion">
                    you keep {formatPrice(keep)}
                  </span>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Stitched line-book label — live season and count, editorial not decorative. */}
      <div className="stitched-label absolute right-5 top-[112px] z-[5] hidden w-[148px] -rotate-[1.5deg] bg-home-panel/95 px-3.5 py-2.5 text-home-vermilion sm:right-8 sm:block lg:right-24 lg:top-[110px]">
        <span className="block font-trade text-[9px] uppercase tracking-[0.2em]">
          {season.toUpperCase()}
        </span>
        <span className="mt-1.5 block border-t border-home-vermilion/45 pt-1.5 font-trade text-[12px] font-bold uppercase tracking-[0.16em]">
          Line Book
        </span>
        <span className="mt-1 block font-trade text-[8px] uppercase tracking-[0.12em] opacity-75">
          {products.length} styles · wholesale
        </span>
        <span aria-hidden="true" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-center font-trade text-[14px] leading-4">
          ⊕
        </span>
      </div>
    </section>
  );
}
