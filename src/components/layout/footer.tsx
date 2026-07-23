"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Turnstile } from "@/components/ui/turnstile";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";

/* Brand icons removed from lucide-react v1.x.
   All four are decorative (the wrapping <a> carries the accessible name via
   aria-label), so each svg is aria-hidden. */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.7 5.5 4.4 9 4.5-.9-4.2 4-6.5 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M8 20l4-9" />
      <path d="M10.7 14c.437 1.263 1.43 2 2.55 2 2.071 0 3.75-1.554 3.75-4.07C17 9.2 14.98 7 12 7c-3.22 0-5.5 2.116-5.5 4.93 0 1.13.393 2.196 1.25 2.75" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

/* Data */
const shopLinks = [
  { label: "Kurti Catalog", href: "/shop" },
  { label: "Bulk Deals", href: "/bulk-order" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Kurti Sets", href: "/shop" },
  { label: "New Drops", href: "/shop" },
  { label: "WhatsApp Inquiry", href: "/contact" },
];

const companyLinks = [
  { label: "Our Story", href: "/about" },
  { label: "Artisans", href: "/about" },
  { label: "Sustainability", href: "/about" },
  { label: "Press", href: "/contact" },
  { label: "Careers", href: "/contact" },
];

const supportLinks = [
  { label: "Contact Us", href: "/contact" },
  { label: "FAQs", href: "/contact" },
  { label: "MOQ & Pricing", href: "/shop" },
  { label: "Invoice Support", href: "/contact" },
  { label: "Dispatch Support", href: "/contact" },
];

const socialLinks = [
  {
    label: "Instagram",
    href: "https://instagram.com/rangatpehnawa",
    icon: InstagramIcon,
  },
  {
    label: "Facebook",
    href: "https://facebook.com/rangatpehnawa",
    icon: FacebookIcon,
  },
  {
    label: "Twitter",
    href: "https://twitter.com/rangatpehnawa",
    icon: TwitterIcon,
  },
  {
    label: "Pinterest",
    href: "https://pinterest.com/rangatpehnawa",
    icon: PinterestIcon,
  },
];

const bottomLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Cookies", href: "/privacy" },
];

/* Reusable column component */
function FooterLinkColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="flex flex-col">
      <h3 className="mb-6 text-[9px] font-bold uppercase tracking-[0.3em] text-accent-lime">
        {title}
      </h3>
      <ul className="flex flex-col gap-4">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm font-bold uppercase tracking-[0.02em] text-content-inverse/65 transition-colors duration-300 hover:text-content-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime focus-visible:ring-offset-2 focus-visible:ring-offset-surface-inverse"
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
        setMessage("You are subscribed to wholesale updates.");
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
      {/*
        Always-mounted live region: a role="status" node that only mounts with
        the message is unreliably announced. sr-only (position: absolute) and
        first-child placement keep it out of the space-y flow — zero layout
        shift. The visible message below stays presentational.
      */}
      <p className="sr-only" role="status">
        {message}
      </p>
      <form
        onSubmit={handleSubmit}
        className="group relative flex items-center border-b border-[#f1eee5]/25 pb-3 pt-4"
      >
        <Input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          aria-label="Email address"
          autoComplete="email"
          className="w-full rounded-none border-none bg-transparent px-0 text-base text-content-inverse outline-none placeholder:text-content-inverse/35 focus-visible:ring-0"
          required
          disabled={status === "loading"}
        />
        <button
          type="submit"
          aria-label="Subscribe"
          disabled={status === "loading"}
          className="absolute right-0 rounded-none px-2 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-accent-lime transition-colors duration-300 hover:text-content-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime disabled:opacity-50"
        >
          {status === "loading" ? "..." : "Subscribe"}
        </button>
        <div className="absolute bottom-[-1px] left-0 h-[2px] w-0 bg-accent-lime transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-focus-within:w-full" />
      </form>

      {/* Bot protection renders only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. */}
      <Turnstile onVerify={setToken} onExpire={() => setToken("")} theme="dark" />

      {message ? (
        <p
          className={`text-xs font-semibold ${
            status === "error" ? "text-accent-red" : "text-accent-lime"
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
    <footer className="relative overflow-hidden border-t border-[#f1eee5]/10 bg-surface-inverse pt-24 pb-24 text-content-inverse lg:pb-0">
      {/* Giant faded editorial wordmark (background device) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[3vw] left-0 select-none text-[26vw] font-black uppercase leading-[0.7] tracking-[-0.06em] text-content-inverse/[0.04]"
      >
        Rangat
      </div>

      {/* Newsletter and brand story */}
      <div className="relative z-10 mx-auto mb-20 grid max-w-[1400px] grid-cols-1 items-start gap-16 px-6 lg:mb-32 lg:grid-cols-2 lg:px-12">
        {/* Left: Newsletter */}
        <div className="max-w-md space-y-6">
          <p className="eyebrow eyebrow--bare text-accent-lime">Fresh Drops</p>
          <h2 className="text-[clamp(2.4rem,5vw,3.4rem)] font-black uppercase leading-[0.92] tracking-[-0.055em] text-content-inverse">
            Fresh kurti drops, price-smart picks, and catalog alerts.
          </h2>
          <p className="text-sm leading-relaxed text-content-inverse/55">
            New kurti drops, reseller notes, and catalog updates for shoppers, boutique owners, and online sellers.
          </p>

          <NewsletterForm />
        </div>

        {/* Right: Brand Mini-Manifesto */}
        <div className="flex h-full flex-col justify-center lg:pl-20">
          <div className="mb-6 inline-flex items-baseline gap-3">
            <h2 className="text-3xl font-black uppercase tracking-[-0.03em] text-content-inverse">
              Rangat
            </h2>
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-accent-lime">
              Pehnawa Studio
            </span>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-content-inverse/55">
            Rangat Pehnawa brings modern kurti drops, practical prices, and WhatsApp-first ordering for shoppers, boutiques, and online sellers across India.
          </p>
          <a
            href={buildCatalogRequestUrl()}
            className="mt-6 inline-flex w-fit border border-[#f1eee5]/30 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-content-inverse transition-colors hover:border-accent-lime hover:bg-accent-lime hover:text-on-accent"
          >
            Get WhatsApp Catalog
          </a>
          <div className="mt-8 flex gap-6">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="text-content-inverse/45 transition-all duration-300 hover:-translate-y-1 hover:text-accent-lime"
                >
                  <Icon className="h-5 w-5" />
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Link columns */}
      <div className="relative z-10 mx-auto grid max-w-[1400px] grid-cols-2 gap-12 border-t border-[#f1eee5]/10 px-6 pb-16 pt-16 md:grid-cols-4 lg:gap-8 lg:px-12 lg:pb-24">
        <FooterLinkColumn title="Shop" links={shopLinks} />
        <FooterLinkColumn title="Company" links={companyLinks} />
        <FooterLinkColumn title="Support" links={supportLinks} />

        <div className="flex flex-col">
          <h3 className="mb-6 text-[9px] font-bold uppercase tracking-[0.3em] text-accent-lime">
            Contact
          </h3>
          <ul className="flex flex-col gap-4 text-sm text-content-inverse/65">
            <li>
              <a
                href="mailto:rangatpehnawa@gmail.com"
                className="font-semibold transition-colors duration-300 hover:text-content-inverse"
              >
                rangatpehnawa@gmail.com
              </a>
            </li>
            <li>
              <a
                href="tel:8660452247"
                className="font-semibold transition-colors duration-300 hover:text-content-inverse"
              >
                8660452247
              </a>
            </li>
            <li className="pt-2">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.24em] text-accent-red">
                Studio
              </span>
              3rd Floor, NR Complex, 36,
              <br />
              Siddanna Ln, Cubbonpete,
              <br />
              Bengaluru 560002
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 border-t border-[#f1eee5]/10">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-4 px-6 py-6 md:flex-row lg:px-12">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center border border-accent-lime/40 bg-accent-lime/10 text-[10px] font-black text-accent-lime">
              R
            </div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-content-inverse/45">
              Copyright {new Date().getFullYear()} Rangat Pehnawa. All rights reserved.
            </p>
          </div>

          <div className="flex items-center gap-6 text-[9px] font-bold uppercase tracking-[0.2em] text-content-inverse/45">
            {bottomLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors duration-300 hover:text-accent-lime"
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
