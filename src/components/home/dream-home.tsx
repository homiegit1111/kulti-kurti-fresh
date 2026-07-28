"use client";

/**
 * Dream homepage — a faithful rebuild of the approved reference artwork.
 *
 * Construction (hybrid, per design direction):
 * - Raster where it makes sense: aged paper (tiled), the embroidered fabric
 *   inside the masthead letters (the reference's own pixels), the model
 *   photography, and the frayed-edge fabric swatch of the SS'24 tag.
 * - Vector + live HTML for everything else: the रंगत letterforms are a traced
 *   SVG clip path, the red thread / crosshair markers / stitch baseline are
 *   SVG, and all typography (nav, headline, buttons, price tag, codes) is
 *   real text.
 *
 * Geometry lives in a 1536x1024 design space; every measurement is expressed
 * through the --u unit (calc(100cqw / 1536)) so the whole composition scales
 * fluidly with the container. Styles: `.dream-*` block in globals.css.
 */

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth/client";
import { LETTERS_PATH, THREAD_PATH } from "./dream-paths";

const NAV_LINKS = [
  { label: "New In", href: "/shop" },
  { label: "Kurtis", href: "/shop" },
  { label: "Sets", href: "/shop" },
  { label: "Dupattas", href: "/collections" },
  { label: "Bottoms", href: "/collections" },
  { label: "Lookbook", href: "/lookbook" },
  { label: "About Us", href: "/about" },
];

const SEASON_STYLES = [
  { code: "RPK-2401", img: "/home-dream/s1.png", w: 170, h: 292, x: 475, y: -2 },
  { code: "RPK-2402", img: "/home-dream/s2.png", w: 165, h: 292, x: 790, y: -2 },
  { code: "RPK-2403", img: "/home-dream/s3.png", w: 170, h: 275, x: 1085, y: 13 },
];

/** Registration-mark crosshair used across the composition. */
function Crosshair({ x, y, r = 6.2 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x},${y})`} className="dream-xhair">
      <circle r={r} fill="none" strokeWidth="1.3" />
      <line x1={-r - 3.8} x2={r + 3.8} y1="0" y2="0" strokeWidth="1.1" />
      <line y1={-r - 3.8} y2={r + 3.8} x1="0" x2="0" strokeWidth="1.1" />
      <circle r="1.4" className="dream-xhair-dot" />
    </g>
  );
}

export function DreamHome() {
  const { itemCount } = useCart();
  const { isSignedIn } = useAuth();

  return (
    <section className="dream-home" aria-label="Rangat Pehnawa wholesale">
      <div className="dream-stage">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="dream-header">
          <Link href="/" className="dream-logo" aria-label="Rangat Pehnawa home">
            <span className="dream-logo-name">Rangat Pehnawa</span>
            <span className="dream-logo-sub">WHOLESALE&nbsp;KURTI</span>
          </Link>
          <nav className="dream-nav" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="dream-hdr-right">
            <Link
              href={isSignedIn ? "/account" : "/login"}
              className="dream-login"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="3.6" />
                <path d="M5 20c1.2-3.8 3.8-5.6 7-5.6s5.8 1.8 7 5.6" />
              </svg>
              <span className="dream-login-txt">
                {isSignedIn ? "My Account" : "Wholesale Login"}
              </span>
            </Link>
            <span className="dream-hdr-sep" aria-hidden="true" />
            <Link href="/cart" className="dream-cart" aria-label={`Cart, ${itemCount} sets`}>
              {itemCount}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 8h12l-1 12H7L6 8z" />
                <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
              </svg>
            </Link>
          </div>
        </header>

        {/* ── Hero art: masthead letters, model, thread, tag ─────── */}
        <div className="dream-art">
          <svg className="dream-masthead" viewBox="0 0 1210 458" aria-hidden="true">
            <defs>
              <clipPath id="dream-letters">
                <path d={LETTERS_PATH} />
              </clipPath>
            </defs>
            <g clipPath="url(#dream-letters)">
              <image
                href="/home-dream/letters_fill.png"
                x="0"
                y="0"
                width="1210"
                height="458"
              />
            </g>
          </svg>

          <span className="dream-model-shadow" aria-hidden="true" />
          <Image
            className="dream-model"
            src="/home-dream/hero.png"
            alt="Sage green embroidered kurta set with dupatta — this season's hero style"
            width={462}
            height={668}
            priority
          />

          <svg className="dream-thread dream-thread-hero" viewBox="0 0 1536 712" aria-hidden="true">
            {/* cream underlay keeps the thread legible where it crosses fabric */}
            <path d={THREAD_PATH} className="dream-thread-under" />
            {/* tag tail: droops off the swatch's right edge, ends in loose fibers */}
            <path
              d="M1400,126 C1436,132 1452,148 1450,168"
              className="dream-thread-line"
            />
            <path d="M1450,168 C1454,178 1460,184 1464,188" className="dream-thread-fiber" />
            <path d="M1450,168 C1450,178 1452,188 1450,194" className="dream-thread-fiber" />
            <path d="M1450,168 C1446,176 1440,182 1436,185" className="dream-thread-fiber" />
            <path d={THREAD_PATH} className="dream-thread-line" />
            <Crosshair x={923} y={289} />
            <text x="938" y="294" className="dream-marker-label">01</text>
            <Crosshair x={860} y={637} />
            <text x="875" y="642" className="dream-marker-label">02</text>
          </svg>

          <div className="dream-tag" aria-label="SS'24 line book">
            <Image
              src="/home-dream/tag_blank.png"
              alt=""
              width={440}
              height={286}
              aria-hidden="true"
            />
            <div className="dream-tag-inner">
              <div className="dream-tag-row">
                <span className="dream-tag-t">SS&rsquo;24</span>
                <svg viewBox="-11 -11 22 22" aria-hidden="true">
                  <circle r="6" fill="none" strokeWidth="1.3" />
                  <line x1="-9" x2="9" y1="0" y2="0" strokeWidth="1.1" />
                  <line y1="-9" y2="9" strokeWidth="1.1" />
                </svg>
              </div>
              <span className="dream-tag-rule" aria-hidden="true" />
              <span className="dream-tag-t">LINE&nbsp;BOOK</span>
            </div>
          </div>
        </div>

        {/* ── Headline + CTAs ────────────────────────────────────── */}
        <div className="dream-copy">
          <h1>
            The new
            <br />
            wholesale book,
            <br />
            cut for <em>real margins.</em>
          </h1>
        </div>
        <div className="dream-cta">
          <Link className="dream-btn dream-btn-fill" href="/shop">
            Browse styles
          </Link>
          <Link className="dream-btn dream-btn-line" href="/line-sheet">
            Request catalogue
          </Link>
        </div>

        {/* ── Wholesale rate tag ─────────────────────────────────── */}
        <div className="dream-price" role="note" aria-label="Wholesale rate 875 rupees per piece">
          <div className="dream-price-card" aria-hidden="true" />
          <div className="dream-price-bord">
            <div className="dream-price-lbl">
              WHOLESALE&nbsp;RATE
              <svg viewBox="-11 -11 22 22" aria-hidden="true">
                <circle r="6" fill="none" strokeWidth="1.3" />
                <line x1="-9" x2="9" y1="0" y2="0" strokeWidth="1.1" />
                <line y1="-9" y2="9" strokeWidth="1.1" />
              </svg>
            </div>
            <div className="dream-price-div" aria-hidden="true" />
            <div className="dream-price-amt">
              <span className="dream-price-rs">₹</span>875
              <span className="dream-price-pc">/pc</span>
            </div>
          </div>
        </div>

        {/* ── This season ────────────────────────────────────────── */}
        <section className="dream-season" aria-label="This season's styles">
          <h2>This season</h2>
          <svg className="dream-season-xhair" viewBox="-14 -14 28 28" aria-hidden="true">
            <circle r="6.2" fill="none" strokeWidth="1.3" />
            <line x1="-10" x2="10" y1="0" y2="0" strokeWidth="1.1" />
            <line y1="-10" y2="10" strokeWidth="1.1" />
            <circle r="1.4" className="dream-xhair-dot" />
          </svg>
          <p className="dream-season-tagline">
            Made to move,
            <br />
            priced to sell.
          </p>

          <div className="dream-smodels">
            {SEASON_STYLES.map((s) => (
              <Link
                key={s.code}
                href="/shop"
                className="dream-smodel"
                style={{
                  left: `calc(var(--u) * ${s.x})`,
                  top: `calc(var(--u) * ${s.y})`,
                  width: `calc(var(--u) * ${s.w})`,
                  height: `calc(var(--u) * ${s.h})`,
                }}
              >
                <Image src={s.img} alt={`Style ${s.code}`} width={s.w} height={s.h} />
              </Link>
            ))}
            {SEASON_STYLES.map((s, i) => (
              <div
                key={s.code}
                className="dream-scode"
                style={{
                  left: `calc(var(--u) * ${[637, 938, 1243][i]})`,
                  top: `calc(var(--u) * ${[114, 116, 117][i]})`,
                }}
              >
                <div className="dream-scode-c">{s.code}</div>
                <div className="dream-scode-p">
                  <span className="dream-price-rs">₹</span>875 /pc
                </div>
              </div>
            ))}
          </div>

          <svg className="dream-thread dream-thread-season" viewBox="0 712 1536 312" aria-hidden="true">
            {/* 03 drop from hero boundary to the stitch baseline */}
            <path d="M607,712 L607,730 C606,800 608,900 608,978" className="dream-thread-line" />
            <path d="M400,982 H1120" className="dream-thread-line dream-stitch" />
            <path d="M1120,982 H1348" className="dream-thread-line dream-stitch-lite" />
            <circle cx="608" cy="982" r="5" fill="none" className="dream-pin" />
            <circle cx="608" cy="982" r="1.8" className="dream-pin-dot" />
            <Crosshair x={607} y={716} />
            <text x="622" y="721" className="dream-marker-label">03</text>
            {[668, 971, 1276].map((x) => (
              <g key={x}>
                <Crosshair x={x} y={882} />
                <path d={`M${x},895 V975`} className="dream-dropline" />
              </g>
            ))}
            <Crosshair x={66} y={881} />
          </svg>
        </section>
      </div>
    </section>
  );
}
