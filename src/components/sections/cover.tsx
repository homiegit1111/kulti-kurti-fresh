import Image from "next/image";
import Link from "next/link";
import { TYPICAL_RESALE_MULTIPLIER } from "@/lib/b2b/config";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
import { formatPrice } from "@/lib/commerce/catalog";
import type { CommerceProduct } from "@/lib/commerce/types";
import type { HomeCoverContent } from "@/lib/content/home-types";

/** Last-resort art, used only if the owner clears the field entirely. */
const COVER_FALLBACK_MODEL = "/images/model-sage.png";
const COVER_FALLBACK_CLOTH = "/images/catalog/set-10.jpg";

/**
 * THE COVER — the model stands in front of the name.
 *
 * रंगत ("rangat" — colour) is set at display scale as a WINDOW ONTO THE CLOTH:
 * the fabric inside the letters is the current featured style's photograph, so
 * the masthead re-dresses itself whenever stock turns over. Nobody re-art-directs
 * it per drop — change the catalogue and the cover changes.
 *
 * The depth is the point. Three planes, back to front:
 *   1. the word, filled with cloth, with a blurred ink copy behind it for the
 *      cast shadow (that copy is also the contrast floor — stock churns, and a
 *      pale fabric must never leave the name unreadable);
 *   2. a raking soft-light pass across the folds;
 *   3. the model, cut out with real transparency, standing IN FRONT of the word
 *      and overlapping it — which is what makes the page read as a photographed
 *      set rather than a layout.
 *
 * The cutouts are supplied assets (professionally matted), not generated here.
 * Server-rendered throughout: no canvas, no scroll listener, no entrance
 * animation. The model is the LCP image.
 *
 * BELOW lg THE PLANES UNSTACK. A phone cannot hold three overlapping layers and
 * still be readable — the word, the model and the copy end up fighting for the
 * same 390px. So under lg the same three ingredients run down the page in normal
 * flow (word → model → reading column → price card) and only the model keeps a
 * small negative margin, so its head still tucks IN FRONT of the word's baseline
 * and the depth idea survives. Nothing is ever layered over type. The absolute
 * composition above returns intact at lg:, where there is room for it.
 */
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

  /* The cloth inside the letters — live from the catalogue, falling back to the
     editable still. */
  const clothUrl =
    featured?.image ?? (content.clothImage || COVER_FALLBACK_CLOTH);
  /* next/image throws on an empty src, and the model is the LCP element, so the
     one field that must never be blank gets a hard floor. */
  const modelUrl = content.modelImage || COVER_FALLBACK_MODEL;

  return (
    <section
      id="home-cover"
      aria-label="Rangat Pehnawa — wholesale kurtis"
      className="relative min-h-[94svh] overflow-hidden bg-home-ground text-home-ink"
    >
      {/* ── Plane 1: the name, wearing this season's cloth ──
          pt-[190px] is measured, not guessed. leading-[1.16] is tighter than this
          face's own ascent+descent (1.56em), so the glyphs overflow their line box:
          रंगत PAINTS 0.122em ABOVE its own rect, the anusvara highest of all. 190px
          clears the fixed chrome (100px) AND the season tape sitting under it.
          Anything less guillotines the dot. */}
      <div
        aria-hidden="true"
        className="pointer-events-none relative z-[1] select-none px-4 pt-[190px] text-center lg:absolute lg:inset-x-0 lg:top-[21svh] lg:px-0 lg:pt-0"
      >
        <div className="relative inline-block">
          <span className="absolute left-[4px] top-[6px] block font-deva text-[clamp(5rem,40vw,15rem)] font-bold leading-[1.16] text-home-ink/45 blur-[1.5px] lg:text-[clamp(5.5rem,20vw,21rem)]">
            रंगत
          </span>
          <span
            style={{ backgroundImage: `url(${clothUrl})` }}
            /* `cover-cloth` (globals.css) carries the photographic grade. It was
               a baked-in brightness(0.8), which is right against cream paper and
               wrong under a lamp — at night that same grade sank the masthead
               into its own ground. The class lifts instead of darkens in `.dark`.
               Geometry, scale and position are untouched. */
            className="cover-cloth relative block bg-[length:190%_auto] bg-[position:46%_38%] bg-clip-text font-deva text-[clamp(5rem,40vw,15rem)] font-bold leading-[1.16] text-transparent lg:text-[clamp(5.5rem,20vw,21rem)]"
          >
            रंगत
          </span>
          {/* Plane 2: raking light across the folds. */}
          <span className="pointer-events-none absolute inset-0 mix-blend-soft-light [background:repeating-linear-gradient(96deg,transparent_0_28px,rgba(255,255,255,0.18)_28px_32px,transparent_32px_66px)]" />
        </div>
      </div>

      {/* ── Plane 3: the model, in front of the name ──
          The cutout is only ~40% of its own frame wide (the rest is matting), so
          under lg the box is deliberately wider than the viewport — the section
          clips the empty sides and the figure lands at a human scale. Height comes
          from the asset's own ratio, not svh, so the band can never letterbox.

          The negative margin is what keeps the depth idea alive on a phone: it eats
          the word's ~0.43em of empty line box below the baseline plus the asset's
          own 3% top matting, so the model's head genuinely rises IN FRONT of रंगत
          instead of merely sitting under it. It is clamped, not pure vw, because
          the word stops growing at 15rem while a raw vw margin would not — by
          1023px an unclamped one would have swallowed the whole word. */}
      <div className="pointer-events-none relative z-[2] -mt-[clamp(6rem,28vw,10rem)] flex justify-center lg:absolute lg:inset-x-0 lg:bottom-0 lg:mt-0">
        <div className="relative aspect-[1024/1044] w-[118vw] max-w-[470px] shrink-0 lg:aspect-auto lg:h-[72svh] lg:w-full lg:shrink">
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
            className="object-contain object-bottom drop-shadow-[0_28px_44px_rgba(25,20,16,0.28)]"
          />
        </div>
      </div>

      {/* ── The reading layer ──
          pb clears the fixed mobile CTA bar (~76px) with room to breathe; the
          full-height, bottom-justified overlay is an lg-only behaviour now. */}
      <div className="relative z-[3] mx-auto flex max-w-[1500px] flex-col px-5 pb-[112px] pt-10 sm:px-8 lg:min-h-[94svh] lg:justify-end lg:px-14 lg:pb-16 lg:pt-28">
        <div className="grid gap-y-10 lg:grid-cols-12 lg:items-end lg:gap-x-10">
          {/* Left: the argument. */}
          <div className="lg:col-span-5">
            <p className="font-sans text-[11px] font-extrabold uppercase tracking-[0.42em] text-home-vermilion">
              {content.eyebrow}
            </p>

            <h1 className="mt-4 max-w-[15ch] font-editorial text-[clamp(1.9rem,3.3vw,2.7rem)] font-light leading-[1.12] tracking-[-0.01em]">
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
            <div className="lg:col-span-4 lg:col-start-9">
              <Link
                href={`/shop/${featured.handle}`}
                className="group block bg-home-panel/95 p-5 shadow-[0_24px_48px_-18px_rgba(25,20,16,0.34)] backdrop-blur-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-home-ink"
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

      {/* The season tape — a real count, so it stays true as stock moves. */}
      <span className="absolute right-5 top-[112px] z-[4] -rotate-[4deg] bg-home-vermilion px-3.5 py-2 font-trade text-[10px] tracking-[0.1em] text-home-panel sm:right-8 lg:right-14 lg:top-[120px]">
        {season.toUpperCase()} · {products.length} STYLES
      </span>
    </section>
  );
}
