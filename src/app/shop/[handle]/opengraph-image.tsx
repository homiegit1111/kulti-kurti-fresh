import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { formatPrice, getProductByHandle } from "@/lib/commerce/catalog";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";

/**
 * Per-product OpenGraph card — a mini line sheet for WhatsApp shares.
 *
 * Mirrors the PDP's data access (getProductByHandle → not-found fallback) and
 * renders the line-book composition: photo plate + style-code chip on the
 * left, masthead / title / money block on the right, terms strip below.
 *
 * SIZE: designed on a 1200×630 grid; RENDER_SCALE is a single lever that
 * rescales the whole card (metadata stays truthful — the size export derives
 * from it). Photographic cards land ~530KB as PNG at full size; if WhatsApp's
 * link-preview fetcher ever proves picky about payload, drop RENDER_SCALE to
 * 2/3 (800×420, same 1.905:1 aspect, ~240KB) without touching the layout.
 *
 * COLOR + FONT: OG images are rasterised server-side — CSS tokens don't exist
 * here, so brand hex values are hardcoded on purpose. No Inter TTF/WOFF ships
 * in node_modules (only @vercel/og's Geist-Regular, weight 400), and fetching
 * fonts at request time is off the table — so the card uses the default font
 * and fakes the black weight with same-color WebkitTextStroke, scale and
 * tracking.
 */

const RENDER_SCALE = 1;
/** Scale a 1200×630-grid design value to render pixels. */
const px = (value: number) => Math.round(value * RENDER_SCALE);
/** Unrounded variant for hairline-sensitive values (text strokes). */
const pxf = (value: number) => value * RENDER_SCALE;

export const size = { width: px(1200), height: px(630) };
export const contentType = "image/png";
export const alt = "Rangat Pehnawa wholesale line sheet";

const INK = "#121310";
const PAPER = "#ece9df";
const LIME = "#d8ff4f";
const RED = "#cc2f4a";
const HAIR = "rgba(236, 233, 223, 0.3)";
const HAIR_SOFT = "rgba(236, 233, 223, 0.14)";
const MUTED = "rgba(236, 233, 223, 0.55)";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.rangatpehnawa.com";

/** Load a product photo as a base64 data URI. Local /public paths are read
 *  off disk; absolute URLs (remote catalog backends) are fetched. Returns
 *  null on any failure so the card degrades to a photo-less plate. */
async function loadProductImage(src: string | undefined): Promise<string | null> {
  if (!src) return null;
  // Sniff the real format from magic bytes — several catalog assets carry a
  // .png extension over JPEG bytes, and a mismatched data-URI MIME makes the
  // rasteriser reject the image.
  const toDataUri = (buffer: Buffer) => {
    let mime: string | null = null;
    if (buffer.length > 12) {
      if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        mime = "image/jpeg";
      } else if (buffer.readUInt32BE(0) === 0x89504e47) {
        mime = "image/png";
      } else if (
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
      ) {
        mime = "image/webp";
      }
    }
    if (!mime) return null; // unknown format — safer to render without a photo
    return `data:${mime};base64,${buffer.toString("base64")}`;
  };
  try {
    if (src.startsWith("http://") || src.startsWith("https://")) {
      const response = await fetch(src);
      if (!response.ok) return null;
      return toDataUri(Buffer.from(await response.arrayBuffer()));
    }
    const relative = src.split("?")[0].replace(/^\//, "");
    try {
      return toDataUri(readFileSync(join(process.cwd(), "public", relative)));
    } catch {
      // public/ may not ship with the server bundle in some deployments —
      // fall back to fetching the asset from the canonical origin.
      const response = await fetch(new URL(src, SITE_URL));
      if (!response.ok) return null;
      return toDataUri(Buffer.from(await response.arrayBuffer()));
    }
  } catch {
    return null;
  }
}

const microLabel = {
  fontSize: px(13),
  letterSpacing: pxf(3.5),
  textTransform: "uppercase" as const,
};

function TermsStrip({ terms, right }: { terms: string[]; right: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        borderTop: `1px solid ${HAIR}`,
        paddingTop: px(22),
        marginTop: px(26),
      }}
    >
      {terms.map((term, index) => (
        <div
          key={term}
          style={{
            display: "flex",
            alignItems: "center",
            marginRight: index === terms.length - 1 ? 0 : px(34),
          }}
        >
          <div
            style={{ width: px(11), height: px(11), background: LIME, marginRight: px(12) }}
          />
          <div style={{ ...microLabel, color: PAPER }}>{term}</div>
        </div>
      ))}
      <div style={{ display: "flex", marginLeft: "auto" }}>
        <div style={{ ...microLabel, color: "rgba(236, 233, 223, 0.4)" }}>{right}</div>
      </div>
    </div>
  );
}

function Masthead() {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div
        style={{
          fontSize: px(30),
          letterSpacing: pxf(4),
          color: PAPER,
          WebkitTextStrokeWidth: pxf(1.2),
          WebkitTextStrokeColor: PAPER,
        }}
      >
        RANGAT
      </div>
      <div
        style={{
          width: px(10),
          height: px(10),
          background: LIME,
          margin: `0 ${px(14)}px`,
        }}
      />
      <div style={{ ...microLabel, color: MUTED }}>PEHNAWA · WHOLESALE LINE BOOK</div>
    </div>
  );
}

/** Generic fallback (unknown handle) — the site-default masthead treatment. */
function GenericCard() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: INK,
        color: PAPER,
        padding: `${px(46)}px ${px(56)}px`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${HAIR}`,
          paddingBottom: px(20),
        }}
      >
        <div style={{ ...microLabel, color: MUTED }}>
          WHOLESALE LINE BOOK · INDIA · 2026
        </div>
        <Masthead />
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Middle word outlined like the hero — ink-on-ink fill + paper
              stroke, because satori skips painting transparent fills. */}
          {["NEW", "INDIAN", "WHOLESALE"].map((word, index) => (
            <div
              key={word}
              style={{
                fontSize: px(124),
                lineHeight: 0.88,
                letterSpacing: pxf(-2),
                color: index === 1 ? INK : PAPER,
                WebkitTextStrokeWidth: index === 1 ? pxf(2) : pxf(3),
                WebkitTextStrokeColor: PAPER,
              }}
            >
              {word}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginLeft: "auto", alignItems: "flex-end" }}>
          <div
            style={{
              width: px(120),
              height: px(120),
              background: LIME,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: px(12),
            }}
          >
            <div
              style={{
                fontSize: px(40),
                color: INK,
                WebkitTextStrokeWidth: pxf(1.4),
                WebkitTextStrokeColor: INK,
              }}
            >
              RP
            </div>
            <div style={{ fontSize: px(10), letterSpacing: pxf(2.5), color: INK }}>
              LINE BOOK
            </div>
          </div>
        </div>
      </div>
      <TermsStrip
        terms={[
          `MOQ ${B2B_CONFIG.minimumOrderSets} SETS`,
          `${SIZE_RATIO_LABEL} PACK`,
          "WHATSAPP ORDERS",
        ]}
        right="RANGATPEHNAWA.COM"
      />
    </div>
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const product = await getProductByHandle(handle);

  if (!product) {
    return new ImageResponse(<GenericCard />, { ...size });
  }

  const setPrice = product.salePrice ?? product.price;
  const perPiece = getPerPiecePrice(setPrice);
  const styleCode = getStyleCode(product);
  const photo = await loadProductImage(product.images?.[0] ?? product.image);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: INK,
          color: PAPER,
          padding: `${px(44)}px ${px(56)}px ${px(40)}px`,
        }}
      >
        <div style={{ display: "flex", flex: 1 }}>
          {/* ── Left: photo plate + style-code chip ─────────────────── */}
          <div style={{ display: "flex", width: px(490), position: "relative" }}>
            <div
              style={{
                display: "flex",
                flex: 1,
                background: "#292a24",
                border: `1px solid ${HAIR}`,
                padding: px(16),
              }}
            >
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  background: "#1c1d18",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {photo ? (
                  <div
                    style={{
                      display: "flex",
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <img
                      src={photo}
                      alt=""
                      style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "top",
                      }}
                    />
                    {/* Hero-plate ink washes (top band + bottom wash) — keep
                        the plate line-book dark and the PNG payload lean for
                        WhatsApp's crawler. */}
                    <div
                      style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        background:
                          "linear-gradient(to top, rgba(18,19,16,0.62) 0%, rgba(18,19,16,0.12) 42%, rgba(18,19,16,0.02) 100%)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        background:
                          "linear-gradient(to bottom, rgba(18,19,16,0.5) 0%, rgba(18,19,16,0) 24%)",
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      ...microLabel,
                      color: MUTED,
                    }}
                  >
                    {styleCode}
                  </div>
                )}
              </div>
            </div>
            {/* Style-code chip overlapping the plate corner */}
            <div
              style={{
                position: "absolute",
                top: px(30),
                right: px(-24),
                display: "flex",
                background: LIME,
                color: INK,
                padding: `${px(10)}px ${px(16)}px`,
                fontSize: px(16),
                letterSpacing: pxf(3),
                WebkitTextStrokeWidth: pxf(0.6),
                WebkitTextStrokeColor: INK,
              }}
            >
              {styleCode}
            </div>
          </div>

          {/* ── Right: masthead / title / money block ───────────────── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              paddingLeft: px(54),
            }}
          >
            <Masthead />
            <div style={{ height: 1, background: HAIR_SOFT, marginTop: px(18) }} />
            <div
              style={{
                display: "block",
                lineClamp: 3,
                fontSize: px(58),
                lineHeight: 1.02,
                letterSpacing: pxf(-1),
                textTransform: "uppercase",
                color: PAPER,
                WebkitTextStrokeWidth: pxf(1.8),
                WebkitTextStrokeColor: PAPER,
                marginTop: px(24),
              }}
            >
              {product.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", marginTop: px(18) }}>
              <div
                style={{ width: px(9), height: px(9), background: RED, marginRight: px(12) }}
              />
              <div style={{ ...microLabel, color: MUTED }}>
                {`${product.category} · WHOLESALE SET OF ${B2B_CONFIG.setSize}`}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: "auto",
                borderTop: `1px solid ${HAIR_SOFT}`,
                paddingTop: px(22),
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <div
                  style={{
                    fontSize: px(82),
                    lineHeight: 1,
                    letterSpacing: pxf(-1),
                    color: LIME,
                    WebkitTextStrokeWidth: pxf(2.4),
                    WebkitTextStrokeColor: LIME,
                  }}
                >
                  {formatPrice(setPrice)}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    marginLeft: px(16),
                    paddingBottom: px(8),
                  }}
                >
                  <div style={{ ...microLabel, color: PAPER }}>/SET</div>
                  {product.salePrice != null && (
                    <div
                      style={{
                        fontSize: px(15),
                        letterSpacing: pxf(1),
                        color: RED,
                        textDecoration: "line-through",
                        marginTop: px(4),
                      }}
                    >
                      {formatPrice(product.price)}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", marginTop: px(10) }}>
                <div
                  style={{
                    fontSize: px(38),
                    lineHeight: 1,
                    color: PAPER,
                    WebkitTextStrokeWidth: pxf(1.2),
                    WebkitTextStrokeColor: PAPER,
                  }}
                >
                  {formatPrice(perPiece)}
                </div>
                {/* Single template literal on purpose: mixed text children
                    ("/PC · " + expr) count as multiple nodes and satori
                    rejects text-only divs without display:flex. */}
                <div
                  style={{
                    ...microLabel,
                    color: MUTED,
                    marginLeft: px(12),
                    paddingBottom: px(2),
                  }}
                >
                  {`/PC · ${SIZE_RATIO_LABEL}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Terms strip ─────────────────────────────────────────────── */}
        <TermsStrip
          terms={[
            `MOQ ${B2B_CONFIG.minimumOrderSets} SETS`,
            `${SIZE_RATIO_LABEL} PACK`,
            "WHATSAPP ORDERS",
          ]}
          right="RANGATPEHNAWA.COM"
        />
      </div>
    ),
    { ...size },
  );
}
