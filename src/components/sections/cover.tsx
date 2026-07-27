import Image from "next/image";
import Link from "next/link";
import {
  B2B_CONFIG,
  TYPICAL_RESALE_MULTIPLIER,
} from "@/lib/b2b/config";
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
 * The existing three-plane composition remains the source of truth:
 * cloth-filled masthead, raking light, then the model. This pass only sharpens
 * the trade hierarchy around it. The model remains the LCP image and the page
 * stays server rendered with no hero animation or client state.
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

  const clothUrl =
    featured?.image ?? (content.clothImage || COVER_FALLBACK_CLOTH);
  const modelUrl = content.modelImage || COVER_FALLBACK_MODEL;

  return (
    <section
      id="home-cover"
      aria-label="Rangat Pehnawa — wholesale kurtis"
      className="relative min-h-[94svh] overflow-hidden bg-home-ground text-home-ink"
    >
      {/* Plane 1: the name wearing the current featured cloth. */}
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
            className="cover-cloth relative block bg-[length:190%_auto] bg-[position:46%_38%] bg-clip-text font-deva text-[clamp(5rem,40vw,15rem)] font-bold leading-[1.16] text-transparent lg:text-[clamp(5.5rem,20vw,21rem)]"
          >
            रंगत
          </span>
          <span className="pointer-events-none absolute inset-0 mix-blend-soft-light [background:repeating-linear-gradient(96deg,transparent_0_28px,rgba(255,255,255,0.18)_28px_32px,transparent_32px_66px)]" />
        </div>
      </div>

      {/* Plane 3: the model remains in front of the name and remains the LCP. */}
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

      {/* Reading layer: the sales argument and the live featured trade note. */}
      <div className="relative z-[3] mx-auto flex max-w-[1500px] flex-col px-5 pb-[112px] pt-10 sm:px-8 lg:min-h-[94svh] lg:justify-end lg:px-14 lg:pb-16 lg:pt-28">
        <div className="grid gap-y-10 lg:grid-cols-12 lg:items-end lg:gap-x-10">
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

            <div className="mt-8 grid grid-cols-1 gap-3 min-[340px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center">
              <Link
                href={content.primaryCtaHref}
                className="group/cta inline-flex h-[54px] items-center justify-center whitespace-nowrap bg-home-ink px-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-home-ground transition-opacity duration-200 hover:opacity-90 sm:px-7"
              >
                <span className="relative">
                  {content.primaryCtaLabel}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-home-vermilion transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cta:scale-x-100 group-focus-visible/cta:scale-x-100 motion-reduce:transition-none"
                  />
                </span>
              </Link>
              <a
                href={catalogRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group/cta inline-flex h-[54px] items-center justify-center whitespace-nowrap border border-home-ink/35 px-3 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-colors duration-200 hover:border-home-ink sm:px-7"
              >
                <span className="relative">
                  {content.secondaryCtaLabel}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-home-vermilion transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cta:scale-x-100 group-focus-visible/cta:scale-x-100 motion-reduce:transition-none"
                  />
                </span>
              </a>
            </div>
          </div>

          {featured && setPrice !== null && perPiece !== null && keep !== null && (
            <aside className="lg:col-span-4 lg:col-start-9" aria-label="Featured trade style">
              <Link
                href={`/shop/${featured.handle}`}
                aria-label={`${featured.title}, ${formatPrice(perPiece)} per piece, ${formatPrice(setPrice)} per set`}
                className="group relative block overflow-hidden border border-home-rule bg-home-panel/95 p-5 pl-7 shadow-[0_24px_48px_-18px_rgba(25,20,16,0.34)] backdrop-blur-[2px] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-home-vermilion focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-home-ink"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-home-rule pb-3">
                  <p className="font-trade text-[10px] tracking-[0.06em] text-home-ink-mute">
                    {getStyleCode(featured)}
                  </p>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-home-vermilion">
                    Featured trade style
                  </p>
                </div>

                <p className="mt-4 font-editorial text-[21px] italic leading-tight decoration-home-vermilion decoration-1 underline-offset-4 group-hover:underline">
                  {featured.title}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-x-5 border-t border-home-rule pt-4 tabular-nums">
                  <div>
                    <p className="text-[29px] font-extrabold tracking-[-0.04em]">
                      {formatPrice(perPiece)}
                      <span className="ml-1 text-[11px] font-semibold tracking-normal text-home-ink-mute">
                        /pc
                      </span>
                    </p>
                    <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-home-ink-mute">
                      Trade rate
                    </p>
                  </div>
                  <div className="border-l border-home-rule pl-5">
                    <p className="text-[19px] font-bold tracking-[-0.025em]">
                      {formatPrice(setPrice)}
                    </p>
                    <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-home-ink-mute">
                      Set of {B2B_CONFIG.setSize}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-home-rule pt-3">
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-home-ink-mute">
                    Typical resale margin
                  </span>
                  <span className="shrink-0 text-[13px] font-extrabold text-home-vermilion tabular-nums">
                    +{formatPrice(keep)} /pc
                  </span>
                </div>
              </Link>
            </aside>
          )}
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-4 left-1/2 z-[4] hidden -translate-x-1/2 flex-col items-center gap-1.5 font-trade text-[9px] uppercase tracking-[0.18em] text-home-ink-mute lg:flex [@media(max-height:720px)]:hidden"
      >
        <span>Into the line book</span>
        <span className="h-7 w-px bg-home-vermilion" />
      </div>

      <span className="absolute right-5 top-[112px] z-[4] -rotate-[4deg] bg-home-vermilion px-3.5 py-2 font-trade text-[10px] tracking-[0.1em] text-home-panel sm:right-8 lg:right-14 lg:top-[120px]">
        {season.toUpperCase()} · {products.length} STYLES
      </span>
    </section>
  );
}
