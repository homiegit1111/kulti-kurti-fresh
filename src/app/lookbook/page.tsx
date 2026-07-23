import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getEditorialEntries, type EditorialEntry } from "@/lib/sanity/queries";
import { sanityImageUrl, isSanityConfigured } from "@/lib/sanity/client";
import { LbReveal } from "@/components/lookbook/motion";

export const metadata: Metadata = {
  title: "The Lookbook",
  description:
    "Editorial stories, campaigns, and the craft behind Rangat Pehnawa — a visual journal of handcrafted Indian fashion.",
  alternates: { canonical: "/lookbook" },
  openGraph: {
    title: "The Lookbook | Rangat Pehnawa",
    description:
      "Editorial stories, campaigns, and the craft behind Rangat Pehnawa.",
    url: "/lookbook",
    type: "website",
  },
};

// Revalidate hourly so newly published editorial appears without a redeploy.
export const revalidate = 3600;

// Built-in fallback so the route is gorgeous even before Sanity is connected.
const FALLBACK: EditorialEntry[] = [
  {
    _id: "f1",
    title: "Threads of Heritage",
    slug: "threads-of-heritage",
    excerpt:
      "A journey through the handlooms and dyeing traditions that shape every Rangat piece.",
    category: "craft",
    coverImageRef: undefined,
    publishedAt: undefined,
  },
  {
    _id: "f2",
    title: "The Festive Edit",
    slug: "the-festive-edit",
    excerpt:
      "Our latest campaign — celebration, colour, and contemporary silhouettes.",
    category: "campaign",
    coverImageRef: undefined,
    publishedAt: undefined,
  },
  {
    _id: "f3",
    title: "Quiet Luxury, Loud Roots",
    slug: "quiet-luxury-loud-roots",
    excerpt:
      "How minimalism and Indian craftsmanship meet in our design language.",
    category: "journal",
    coverImageRef: undefined,
    publishedAt: undefined,
  },
];

// Garment plates, not wordmarks — used until Sanity supplies real covers.
const FALLBACK_IMAGES = [
  "/images/hero.png",
  "/images/collection-fresh-drops.jpg",
  "/images/collection-minimal.png",
];

const pad = (n: number) => String(n).padStart(2, "0");

const formatDate = (iso?: string) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

export default async function LookbookPage() {
  const entries = await getEditorialEntries(24);
  const items = entries.length > 0 ? entries : FALLBACK;
  const usingFallback = entries.length === 0;

  const resolveCover = (entry: EditorialEntry, idx: number) =>
    sanityImageUrl(entry.coverImageRef, 1200) ??
    FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];

  const [lead, ...rest] = items;

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-surface pt-28 pb-0 text-content lg:pt-36 min-h-screen">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
          {/* ── Journal masthead ──────────────────────────────────────── */}
          <LbReveal>
            <div className="grid gap-8 border-b-2 border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="eyebrow">The Lookbook / Journal</p>
                <h1 className="mt-4 max-w-[13ch] text-[clamp(3rem,8vw,7.5rem)] font-black uppercase leading-[0.82] tracking-[-0.07em]">
                  Stories in colour &amp; craft.
                </h1>
              </div>
              <div className="lg:pb-2 lg:text-right">
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-content/45">
                  Entries {pad(1)}—{pad(items.length)} / Bangalore studio
                </p>
                <p className="mt-3 max-w-[32ch] text-sm leading-6 text-content/60 lg:ml-auto">
                  A visual journal — editorials, campaigns, and the hands
                  behind the cloth.
                </p>
              </div>
            </div>

            {/* one-line desk strip — what the journal carries */}
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[9px] font-bold uppercase tracking-[0.22em] text-content/45">
              {["Craft notes", "Campaign drops", "Buyer-first stories"].map(
                (spec) => (
                  <span key={spec} className="flex items-center gap-2">
                    <span className="h-1 w-1 bg-accent-lime" aria-hidden="true" />
                    {spec}
                  </span>
                ),
              )}
            </div>
          </LbReveal>

          {/* ── Lead story — full-width editorial plate ───────────────── */}
          {lead && (
            <LbReveal className="mt-10" y={28}>
              <Link
                href={`/lookbook/${lead.slug}`}
                className="group grid border border-line/20 bg-surface-2 lg:grid-cols-12"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-surface-hover lg:col-span-7 lg:aspect-auto lg:min-h-[30rem]">
                  <Image
                    src={resolveCover(lead, 0)}
                    alt={lead.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  <span className="absolute left-0 top-0 bg-accent-lime px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-on-accent">
                    {pad(1)} / Lead story
                  </span>
                </div>

                <div className="relative flex flex-col justify-between gap-10 overflow-hidden p-6 sm:p-8 lg:col-span-5 lg:p-10">
                  {/* stroked index numeral — outline via the content token so
                      it survives both themes */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-4 -top-8 select-none text-[9rem] font-black leading-none text-transparent opacity-25 [-webkit-text-stroke:1.5px_var(--content)] lg:text-[13rem]"
                  >
                    {pad(1)}
                  </span>
                  <div className="relative">
                    {lead.category && (
                      <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-accent-red">
                        {lead.category}
                      </span>
                    )}
                    <h2 className="mt-3 max-w-[12ch] text-[clamp(2.2rem,4.5vw,4.2rem)] font-black uppercase leading-[0.88] tracking-[-0.05em] transition-transform duration-300 group-hover:translate-x-1">
                      {lead.title}
                    </h2>
                    {lead.excerpt && (
                      <p className="mt-4 max-w-[40ch] text-sm leading-6 text-content/60">
                        {lead.excerpt}
                      </p>
                    )}
                  </div>
                  <div className="relative flex items-center justify-between gap-4 border-t border-line/20 pt-4">
                    <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-content/45">
                      {formatDate(lead.publishedAt) ?? "Studio archive"}
                    </span>
                    <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-content">
                      Read the story
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </LbReveal>
          )}

          {/* ── Remaining entries ─────────────────────────────────────── */}
          {rest.length > 0 && (
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((entry, idx) => {
                const number = idx + 2;
                return (
                  <LbReveal
                    key={entry._id}
                    delay={(idx % 3) * 0.08}
                    className="h-full"
                  >
                    <Link
                      href={`/lookbook/${entry.slug}`}
                      className="group flex h-full flex-col border border-line/20 bg-surface"
                    >
                      <article className="flex h-full flex-col">
                        <div className="relative aspect-[4/5] overflow-hidden bg-surface-hover">
                          <Image
                            src={resolveCover(entry, number - 1)}
                            alt={entry.title}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                          <span className="absolute left-0 top-0 bg-accent-lime px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-on-accent">
                            {pad(number)}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col border-t border-line/20 px-4 py-5">
                          {entry.category && (
                            <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-accent-red">
                              {entry.category}
                            </span>
                          )}
                          <h2 className="mt-2 text-2xl font-black uppercase leading-[0.95] tracking-[-0.03em] transition-transform duration-300 group-hover:translate-x-1">
                            {entry.title}
                          </h2>
                          {entry.excerpt && (
                            <p className="mt-2 text-sm leading-6 text-content/60 line-clamp-2">
                              {entry.excerpt}
                            </p>
                          )}
                          <div className="mt-auto flex items-center justify-between gap-4 pt-5">
                            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-content/40">
                              {formatDate(entry.publishedAt) ?? "Studio archive"}
                            </span>
                            <span className="flex h-8 w-8 items-center justify-center border border-line/25 transition-colors group-hover:border-accent-red group-hover:bg-accent-red group-hover:text-white">
                              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                            </span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  </LbReveal>
                );
              })}
            </div>
          )}

          {usingFallback && !isSanityConfigured() && (
            <p className="mt-16 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-content/35">
              Connect Sanity (see&nbsp;
              <code className="text-content/50">sanity/README.md</code>) to
              publish live editorial here.
            </p>
          )}
        </div>

        {/* ── Trade CTA — every story ends at the rail ─────────────────── */}
        <section className="mt-20 overflow-hidden bg-surface-inverse px-4 py-16 text-content-inverse sm:px-6 lg:mt-28 lg:px-10 lg:py-20">
          <div className="mx-auto grid max-w-[1600px] gap-8 lg:grid-cols-12 lg:items-end">
            <LbReveal className="lg:col-span-8">
              <p className="eyebrow eyebrow--bare text-accent-lime">
                From press to rack
              </p>
              <h2 className="mt-4 max-w-[14ch] text-[clamp(2.6rem,6vw,6rem)] font-black uppercase leading-[0.8] tracking-[-0.06em]">
                Stock the styles behind the stories.
              </h2>
            </LbReveal>
            <LbReveal delay={0.1} className="lg:col-span-4">
              <p className="max-w-md text-sm leading-6 text-content-inverse/65">
                Every editorial maps to live style codes in the wholesale
                line — ratio packs, per-piece pricing, MOQ from four sets.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link
                  href="/shop"
                  className="inline-flex min-h-12 items-center justify-center gap-2 bg-accent-lime px-6 text-[9px] font-bold uppercase tracking-[0.18em] text-on-accent transition-colors hover:bg-white"
                >
                  Browse the line <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/bulk-order"
                  className="inline-flex min-h-12 items-center justify-center gap-2 border border-content-inverse/40 px-6 text-[9px] font-bold uppercase tracking-[0.18em] text-content-inverse transition-colors hover:border-content-inverse"
                >
                  Open bulk desk <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </LbReveal>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
