"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Turnstile } from "@/components/ui/turnstile";

/* ── Brand icons (removed from lucide-react v1.x) ── */
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
      className={className}
    >
      <path d="M8 20l4-9" />
      <path d="M10.7 14c.437 1.263 1.43 2 2.55 2 2.071 0 3.75-1.554 3.75-4.07C17 9.2 14.98 7 12 7c-3.22 0-5.5 2.116-5.5 4.93 0 1.13.393 2.196 1.25 2.75" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

/* ── Data ── */
const shopLinks = [
  { label: "New Arrivals", href: "/shop" },
  { label: "Kurtis", href: "/shop" },
  { label: "Lehengas", href: "/shop" },
  { label: "Sarees", href: "/shop" },
  { label: "Co-ord Sets", href: "/shop" },
  { label: "Sale", href: "/shop" },
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
  { label: "Shipping & Returns", href: "/contact" },
  { label: "Size Guide", href: "/shop" },
  { label: "Track Order", href: "/contact" },
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

/* ── Reusable column component ── */
function FooterLinkColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="flex flex-col">
      <h3 className="mb-6 font-serif text-[11px] uppercase tracking-[0.3em] text-gold font-bold">
        {title}
      </h3>
      <ul className="flex flex-col gap-4">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-xs tracking-wider text-white/60 transition-colors duration-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
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
        setMessage("You're in. Welcome to the Inner Circle.");
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
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center border-b border-white/20 pb-3 pt-4 group"
      >
        <Input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          className="w-full bg-transparent border-none outline-none px-0 text-base text-white placeholder:text-white/30 font-serif focus-visible:ring-0 rounded-none"
          required
          disabled={status === "loading"}
        />
        <button
          type="submit"
          aria-label="Subscribe"
          disabled={status === "loading"}
          className="absolute right-0 rounded-full px-2 py-2 text-gold uppercase text-[10px] tracking-[0.2em] font-bold hover:text-white transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 disabled:opacity-50"
        >
          {status === "loading" ? "..." : "Subscribe"}
        </button>
        <div className="absolute bottom-[-1px] left-0 w-0 h-[1px] bg-gold transition-all duration-500 group-focus-within:w-full" />
      </form>

      {/* Bot protection — renders only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. */}
      <Turnstile onVerify={setToken} onExpire={() => setToken("")} theme="dark" />

      {message ? (
        <p
          className={`text-xs font-serif ${
            status === "error" ? "text-red-400" : "text-gold"
          }`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="relative bg-charcoal text-warm-white pt-24 overflow-hidden border-t border-white/10">
      {/* ── Top Section: Newsletter & Brand Story ── */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 mb-20 lg:mb-32 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* Left: Newsletter */}
        <div className="space-y-6 max-w-md">
          <p className="text-[10px] font-sans uppercase tracking-[0.4em] text-gold font-semibold">
            The Newsletter
          </p>
          <h2 className="font-serif text-4xl lg:text-5xl text-warm-white font-light leading-[1.1]">
            Join the <span className="italic text-gold">Inner Circle</span>
          </h2>
          <p className="text-sm text-white/50 leading-relaxed font-serif">
            Exclusive access to our latest collections, behind-the-scenes
            artisan stories, and private events. Delivered elegantly to your
            inbox.
          </p>

          <NewsletterForm />
        </div>

        {/* Right: Brand Mini-Manifesto */}
        <div className="lg:pl-20 flex flex-col justify-center h-full">
          <div className="inline-flex items-center gap-3 mb-6">
            <h2 className="font-serif text-3xl tracking-widest text-white uppercase">
              Rangat
            </h2>
            <span className="font-sans text-[10px] font-medium tracking-[0.3em] text-gold uppercase pt-1">
              Pehnawa
            </span>
          </div>
          <p className="text-sm text-white/50 leading-relaxed font-serif max-w-md">
            We believe in the quiet luxury of Indian craftsmanship. Every piece
            we create is a tribute to the artisans who weave our history into
            modern silhouettes. Slow fashion, beautifully realized.
          </p>
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
                  className="text-white/40 transition-all duration-300 hover:text-gold hover:-translate-y-1"
                >
                  <Icon className="h-5 w-5" />
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Middle Section: Link Columns ── */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 pb-16 lg:pb-24 grid grid-cols-2 md:grid-cols-4 gap-12 lg:gap-8 border-t border-white/10 pt-16">
        <FooterLinkColumn title="Shop" links={shopLinks} />
        <FooterLinkColumn title="Company" links={companyLinks} />
        <FooterLinkColumn title="Support" links={supportLinks} />

        <div className="flex flex-col">
          <h3 className="mb-6 font-serif text-[11px] uppercase tracking-[0.3em] text-gold font-bold">
            Contact
          </h3>
          <ul className="flex flex-col gap-4 text-xs tracking-wider text-white/60">
            <li>
              <a
                href="mailto:rangatpehnawa@gmail.com"
                className="transition-colors duration-300 hover:text-white"
              >
                rangatpehnawa@gmail.com
              </a>
            </li>
            <li>
              <a
                href="tel:8660452247"
                className="transition-colors duration-300 hover:text-white"
              >
                8660452247
              </a>
            </li>
            <li className="pt-2">
              <span className="text-[10px] uppercase tracking-widest text-gold/60 block mb-1">
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

      {/* ── Giant Footer Typography & Bottom Bar ── */}
      <div className="relative w-full flex flex-col items-center justify-end overflow-hidden pt-10 lg:pt-0">
        {/* Giant decorative wordmark — not a heading (aria-hidden, div) */}
        <div
          aria-hidden="true"
          className="text-[13vw] font-serif leading-[0.75] tracking-tighter whitespace-nowrap text-white/[0.04] select-none pointer-events-none"
        >
          RANGAT PEHNAWA
        </div>

        {/* Soft Fade at Bottom */}
        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-charcoal to-transparent pointer-events-none" />

        {/* Bottom Bar Content */}
        <div className="absolute bottom-0 inset-x-0 w-full max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-6 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-serif font-bold text-[10px]">
              R
            </div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-medium">
              © {new Date().getFullYear()} Rangat Pehnawa. All rights reserved.
            </p>
          </div>

          <div className="flex items-center gap-6 text-[9px] uppercase tracking-[0.2em] text-white/40 font-medium z-10">
            {bottomLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors duration-300 hover:text-white"
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
