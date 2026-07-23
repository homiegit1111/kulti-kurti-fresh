import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  getEditorialBySlug,
  getEditorialSlugs,
  type EditorialDetail,
} from "@/lib/sanity/queries";
import { sanityImageUrl, isSanityConfigured } from "@/lib/sanity/client";
import { LookbookPortableText } from "@/components/lookbook/portable-text";
import { LbReveal } from "@/components/lookbook/motion";
import type { PortableTextBlock } from "@portabletext/react";

// Tiny helpers to author the built-in fallback bodies as valid Portable Text
// (so the rich renderer is showcased before Sanity is connected).
let keySeq = 0;
const k = () => `k${(keySeq += 1)}`;
const span = (text: string, marks: string[] = []) => ({
  _type: "span",
  _key: k(),
  text,
  marks,
});
const block = (
  children: ReturnType<typeof span>[],
  style = "normal",
  markDefs: { _key: string; _type: string; href: string }[] = [],
): PortableTextBlock =>
  ({ _type: "block", _key: k(), style, markDefs, children }) as PortableTextBlock;

export const revalidate = 3600;

// Built-in fallback entries (mirror the lookbook index) so the route works
// before Sanity is connected.
const FALLBACK: Record<string, EditorialDetail> = {
  "threads-of-heritage": {
    _id: "f1",
    title: "Threads of Heritage",
    slug: "threads-of-heritage",
    category: "craft",
    excerpt:
      "A journey through the handlooms and dyeing traditions that shape every Rangat piece.",
    body: [
      block([
        span("Every Rangat Pehnawa piece begins not on a sketchpad, but at a "),
        span("handloom", ["strong"]),
        span(
          " - where a weaving cluster may spend days coaxing a length of cloth into being. We work with craft partners across Bhuj, Bagru and Chanderi so wholesale buyers can source styles with a real material story.",
        ),
      ]),
      block([span("The colour of memory")], "h2"),
      block([
        span(
          "Our dye and print direction is built for small-batch wholesale drops: rich enough for boutique displays, practical enough for repeat buying, and varied enough that each lot keeps its hand-finished character.",
        ),
      ]),
      block(
        [span("A garment should carry the fingerprints of the hands that made it.")],
        "blockquote",
      ),
      block([
        span("What that means for trade buyers", ["em"]),
        span(
          " is a catalog with provenance: style codes, size-ratio packs, and product stories your customers can understand. Explore the current wholesale catalog in the ",
        ),
        span("catalog", ["L1"]),
        span("."),
      ], "normal", [{ _key: "L1", _type: "link", href: "/shop" }]),
    ],
  },
  "the-festive-edit": {
    _id: "f2",
    title: "The Festive Edit",
    slug: "the-festive-edit",
    category: "campaign",
    excerpt:
      "A festive wholesale drop built around colour, occasion buying, and quick boutique merchandising.",
  },
  "quiet-luxury-loud-roots": {
    _id: "f3",
    title: "Quiet Luxury, Loud Roots",
    slug: "quiet-luxury-loud-roots",
    category: "journal",
    excerpt:
      "How restrained craft details become reseller-friendly catalog stories.",
  },
};

async function resolveEntry(slug: string): Promise<EditorialDetail | null> {
  const fromCms = await getEditorialBySlug(slug);
  if (fromCms) return fromCms;
  return FALLBACK[slug] ?? null;
}

export async function generateStaticParams() {
  if (!isSanityConfigured()) return Object.keys(FALLBACK).map((slug) => ({ slug }));
  const slugs = await getEditorialSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = await resolveEntry(slug);
  if (!entry) return { title: "Editorial" };
  return {
    title: entry.title,
    description: entry.excerpt,
    alternates: { canonical: `/lookbook/${entry.slug}` },
    openGraph: {
      title: `${entry.title} | Rangat Pehnawa`,
      description: entry.excerpt,
      url: `/lookbook/${entry.slug}`,
      type: "article",
    },
  };
}

const formatDate = (iso?: string) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** Rough read-time from portable-text spans — presentational only. */
const readingMinutes = (body: PortableTextBlock[]) => {
  const words = body.reduce((acc, blk) => {
    const children = (blk as { children?: { text?: string }[] }).children;
    if (!Array.isArray(children)) return acc;
    return (
      acc +
      children.reduce(
        (sum, child) =>
          sum +
          (typeof child.text === "string"
            ? child.text.trim().split(/\s+/).filter(Boolean).length
            : 0),
        0,
      )
    );
  }, 0);
  return Math.max(1, Math.round(words / 200));
};

export default async function EditorialDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await resolveEntry(slug);
  if (!entry) notFound();

  const cover = sanityImageUrl(entry.coverImageRef, 1600) ?? "/images/hero.png";
  const body = Array.isArray(entry.body)
    ? (entry.body as PortableTextBlock[])
    : [];
  const published = formatDate(entry.publishedAt);
  const initial = entry.title.trim().charAt(0).toUpperCase() || "R";

  return (
    <>
      <Navbar />

      <main className="relative flex-1 bg-surface pt-28 pb-24 text-content lg:pt-36 min-h-screen">
        <article className="w-full">
          {/* ── Editorial masthead ─────────────────────────────────────── */}
          <header className="relative overflow-hidden">
            {/* giant faded backdrop letter — line-book editorial device */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-6 -top-14 select-none text-[42vw] font-black uppercase leading-none text-content/5 lg:text-[26vw]"
            >
              {initial}
            </span>

            <div className="relative mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
              <LbReveal>
                <Link
                  href="/lookbook"
                  className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-content/50 transition-colors hover:text-accent-red"
                >
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                  The Lookbook
                </Link>

                <div className="mt-8 border-b-2 border-line pb-6">
                  <p className="eyebrow">
                    {entry.category ?? "journal"} / Journal entry
                  </p>
                  <h1 className="mt-4 max-w-[14ch] text-[clamp(2.8rem,7.5vw,6.75rem)] font-black uppercase leading-[0.84] tracking-[-0.06em]">
                    {entry.title}
                  </h1>
                  {entry.excerpt && (
                    <p className="mt-6 max-w-[52ch] border-l-2 border-accent-lime pl-5 text-sm leading-6 text-content/65 sm:text-base sm:leading-7">
                      {entry.excerpt}
                    </p>
                  )}
                </div>

                {/* meta rail — table-like, micro-label columns */}
                <dl className="grid grid-cols-2 gap-px bg-line/15 border-b border-line/20 sm:grid-cols-4">
                  {[
                    ["Filed under", entry.category ?? "Journal"],
                    ["Published", published ?? "Studio archive"],
                    [
                      "Reading time",
                      body.length > 0 ? `${readingMinutes(body)} min` : "—",
                    ],
                    ["Series", "The Lookbook"],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-surface px-1 py-4 sm:px-3">
                      <dt className="text-[9px] font-bold uppercase tracking-[0.24em] text-content/40">
                        {label}
                      </dt>
                      <dd className="mt-1.5 text-xs font-bold uppercase tracking-[0.08em] text-content">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </LbReveal>
            </div>
          </header>

          {/* ── Cover plate ────────────────────────────────────────────── */}
          <div className="mx-auto mt-12 w-full max-w-5xl px-4 sm:px-6 lg:px-10">
            <LbReveal scaleFrom={1.035} y={0} duration={0.48}>
              <div className="relative aspect-[16/9] overflow-hidden border border-line/20 bg-surface-hover">
                <Image
                  src={cover}
                  alt={entry.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                <span className="absolute left-0 top-0 bg-accent-lime px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-on-accent">
                  {entry.category ?? "journal"}
                </span>
              </div>
            </LbReveal>
          </div>

          {/* ── Body ───────────────────────────────────────────────────── */}
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-10">
            {body.length > 0 ? (
              <LbReveal className="mt-12" delay={0.05}>
                <LookbookPortableText value={body} />
              </LbReveal>
            ) : (
              <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.2em] text-content/40">
                {isSanityConfigured()
                  ? "This story is being written."
                  : "Connect Sanity to publish the full editorial."}
              </p>
            )}

            {/* ── End matter — back to the journal, on to the rail ─────── */}
            <LbReveal className="mt-16">
              <div className="flex flex-col gap-4 border-t-2 border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  href="/lookbook"
                  className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-content/55 transition-colors hover:text-accent-red"
                >
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                  All stories
                </Link>
                <Link
                  href="/shop"
                  className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-content underline decoration-accent-lime decoration-2 underline-offset-4 transition-colors hover:decoration-accent-red"
                >
                  Stock the line behind this story
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </LbReveal>
          </div>
        </article>
      </main>

      <Footer />
    </>
  );
}
