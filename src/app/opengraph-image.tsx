import { ImageResponse } from "next/og";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";

/**
 * Site-wide default OpenGraph card — the line-book masthead treatment.
 *
 * Ink canvas, the home hero's stacked "NEW / INDIAN / WHOLESALE" headline
 * (middle word outlined, exactly like the hero), lime accent square, and the
 * wholesale terms strip. Route segments with their own opengraph-image
 * (e.g. /shop/[handle]) override this.
 *
 * NOTE ON COLOR + FONT: OG images are rasterised server-side — CSS tokens
 * don't exist here, so brand hex values are hardcoded on purpose. No Inter
 * TTF/WOFF ships in node_modules (only @vercel/og's Geist-Regular, weight
 * 400), and fetching fonts at request time is off the table — so the card
 * uses the default font and fakes the black weight with same-color
 * WebkitTextStroke, scale and tracking.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Rangat Pehnawa — new Indian wholesale line book";

const INK = "#0a0a0f";
const PAPER = "#ffffff";
const LIME = "#e9a319";
const RED = "#c03a2b";
const HAIR = "rgba(236, 233, 223, 0.3)";
const MUTED = "rgba(236, 233, 223, 0.55)";

const microLabel = {
  fontSize: 13,
  letterSpacing: 3.5,
  textTransform: "uppercase" as const,
};

export default function Image() {
  const terms = [
    `MOQ ${B2B_CONFIG.minimumOrderSets} SETS`,
    `${SIZE_RATIO_LABEL} PACK`,
    "PAN-INDIA DISPATCH",
    "WHATSAPP ORDERS",
  ];

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
          padding: "46px 56px 40px",
        }}
      >
        {/* ── Top rule: kicker + wordmark ─────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1px solid ${HAIR}`,
            paddingBottom: 20,
          }}
        >
          <div style={{ ...microLabel, color: MUTED }}>
            WHOLESALE LINE BOOK · INDIA · 2026
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                fontSize: 24,
                letterSpacing: 4,
                color: PAPER,
                WebkitTextStrokeWidth: 1,
                WebkitTextStrokeColor: PAPER,
              }}
            >
              RANGAT
            </div>
            <div style={{ width: 9, height: 9, background: LIME, margin: "0 12px" }} />
            <div style={{ ...microLabel, color: MUTED }}>PEHNAWA</div>
          </div>
        </div>

        {/* ── Masthead ────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Middle word outlined like the hero. Satori skips painting
                transparent fills entirely, so the outline is faked with an
                ink-on-ink fill + paper stroke. */}
            {["NEW", "INDIAN", "WHOLESALE"].map((word, index) => (
              <div
                key={word}
                style={{
                  fontSize: 128,
                  lineHeight: 0.9,
                  letterSpacing: -2,
                  color: index === 1 ? INK : PAPER,
                  WebkitTextStrokeWidth: index === 1 ? 2 : 3.2,
                  WebkitTextStrokeColor: PAPER,
                }}
              >
                {word}
              </div>
            ))}
          </div>

          {/* Lime accent square, red register mark at its corner */}
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              alignItems: "flex-end",
              position: "relative",
            }}
          >
            <div
              style={{
                width: 132,
                height: 132,
                background: LIME,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 44,
                  lineHeight: 1,
                  color: INK,
                  WebkitTextStrokeWidth: 1.6,
                  WebkitTextStrokeColor: INK,
                }}
              >
                RP
              </div>
              <div style={{ fontSize: 11, letterSpacing: 2.5, color: INK }}>
                LINE BOOK 26
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                left: -14,
                bottom: -14,
                width: 28,
                height: 28,
                background: RED,
              }}
            />
          </div>
        </div>

        {/* ── Terms strip ─────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderTop: `1px solid ${HAIR}`,
            paddingTop: 22,
          }}
        >
          {terms.map((term, index) => (
            <div
              key={term}
              style={{
                display: "flex",
                alignItems: "center",
                marginRight: index === terms.length - 1 ? 0 : 34,
              }}
            >
              <div style={{ width: 11, height: 11, background: LIME, marginRight: 12 }} />
              <div style={{ ...microLabel, color: PAPER }}>{term}</div>
            </div>
          ))}
          <div style={{ display: "flex", marginLeft: "auto" }}>
            <div style={{ ...microLabel, color: "rgba(236, 233, 223, 0.4)" }}>
              RANGATPEHNAWA.COM
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
