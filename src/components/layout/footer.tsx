"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Turnstile } from "@/components/ui/turnstile";
import { TermsRule } from "@/components/document/terms-rule";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";

/**
 * Footer (Chapter 4) — a quiet letterhead on paper: the trade terms, link
 * columns on the grid, the wordmark, contact facts. Every label is a word a
 * wholesale buyer uses; every link resolves to a route that exists.
 */
const shopLinks = [
  { label: "Styles", href: "/shop" },
  { label: "Collections", href: "/collections" },
  { label: "Lookbook", href: "/lookbook" },
  { label: "Bulk order", href: "/bulk-order" },
  { label: "Your order", href: "/tray" },
  { label: "Print price list", href: "/line-sheet" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Account", href: "/account" },
];

const bottomLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

function FooterLinkColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="flex flex-col">
      <h3 className="mb-4 text-[9px] font-extrabold uppercase tracking-[0.28em] text-content/45">
        {title}
      </h3>
      <ul className="flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-[13px] font-medium text-content/70 transition-colors duration-200 hover:text-content hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken: token }),
      });
      if (res.ok) {
        setStatus("done");
        setEmail("");
        setMessage("You are subscribed to catalog updates.");
      } else {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <div className="space-y-3">
      <p className="sr-only" role="status">
        {message}
      </p>
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center border-b border-line/25 pb-2 focus-within:border-content"
      >
        <Input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          aria-label="Email address"
          autoComplete="email"
          className="w-full rounded-none border-none bg-transparent px-0 text-sm text-content outline-none placeholder:text-content/35 focus-visible:ring-0"
          required
          disabled={status === "loading"}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 rounded-none px-2 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-content/60 transition-colors duration-200 hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime disabled:opacity-50"
        >
          {status === "loading" ? "..." : "Subscribe"}
        </button>
      </form>

      <Turnstile onVerify={setToken} onExpire={() => setToken("")} />

      {message ? (
        <p
          className={`text-xs font-semibold ${
            status === "error" ? "text-accent-red" : "text-content/70"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line/25 bg-surface text-content">
      {/* The trade terms — first thing, before anything else. */}
      <div className="border-b border-line/15">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 lg:px-16">
          <TermsRule className="border-y-0 py-3" />
        </div>
      </div>

      {/* Letterhead grid */}
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-5 pb-14 pt-12 sm:grid-cols-2 md:px-10 lg:grid-cols-[2fr_1fr_1fr_1.4fr] lg:gap-10 lg:px-16">
        {/* Wordmark + one plain line + WhatsApp */}
        <div className="flex flex-col items-start">
          <p className="flex flex-col leading-none">
            <span className="text-[1.55rem] font-black uppercase leading-[0.85] tracking-[-0.05em] text-content">
              Rangat
            </span>
            <span className="mt-[0.35em] text-[8px] font-bold uppercase tracking-[0.42em] text-content/55">
              Pehnawa
            </span>
          </p>
          <p className="mt-5 max-w-[36ch] text-sm leading-relaxed text-content/60">
            Wholesale kurtis for boutiques and resellers. Browse the styles,
            build your order, send it on WhatsApp.
          </p>
          <a
            href={buildCatalogRequestUrl()}
            className="mt-6 inline-flex border border-line/40 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-content transition-colors duration-200 hover:border-line hover:bg-surface-inverse hover:text-content-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
          >
            WhatsApp catalog
          </a>
        </div>

        <FooterLinkColumn title="Shop" links={shopLinks} />
        <FooterLinkColumn title="Company" links={companyLinks} />

        {/* Contact facts + catalog updates */}
        <div className="flex flex-col">
          <h3 className="mb-4 text-[9px] font-extrabold uppercase tracking-[0.28em] text-content/45">
            Contact
          </h3>
          <ul className="flex flex-col gap-2.5 text-[13px] text-content/70">
            <li>
              <a
                href="mailto:rangatpehnawa@gmail.com"
                className="font-medium transition-colors duration-200 hover:text-content hover:underline"
              >
                rangatpehnawa@gmail.com
              </a>
            </li>
            <li>
              <a
                href="tel:8660452247"
                className="ledger font-medium transition-colors duration-200 hover:text-content hover:underline"
              >
                8660452247
              </a>
            </li>
            <li className="pt-1 leading-relaxed">
              3rd Floor, NR Complex, 36,
              <br />
              Siddanna Ln, Cubbonpete,
              <br />
              Bengaluru 560002
            </li>
          </ul>

          <div className="mt-8">
            <h3 className="mb-3 text-[9px] font-extrabold uppercase tracking-[0.28em] text-content/45">
              Catalog updates
            </h3>
            <NewsletterForm />
          </div>
        </div>
      </div>

      {/* Bottom rule */}
      <div className="border-t border-line/15">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-4 px-5 py-6 md:flex-row md:px-10 lg:px-16">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-content/45">
            Copyright {new Date().getFullYear()} Rangat Pehnawa. All rights
            reserved.
          </p>

          <div className="flex items-center gap-6 text-[9px] font-bold uppercase tracking-[0.2em] text-content/45">
            {bottomLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors duration-200 hover:text-content hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
