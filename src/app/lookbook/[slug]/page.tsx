import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  getEditorialBySlug,
  getEditorialSlugs,
  type EditorialDetail,
} from "@/lib/sanity/queries";
import { sanityImageUrl, isSanityConfigured } from "@/lib/sanity/client";
import { LookbookPortableText } from "@/components/lookbook/portable-text";
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

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-warm-white relative pt-28 pb-24 min-h-screen">
        <article className="max-w-3xl mx-auto px-6 w-full">
          <Link
            href="/lookbook"
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-charcoal/50 hover:text-gold transition-colors mb-10"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> The Lookbook
          </Link>

          {entry.category && (
            <span className="block text-[9px] uppercase tracking-[0.3em] text-gold font-bold mb-3">
              {entry.category}
            </span>
          )}
          <h1 className="font-serif text-4xl md:text-5xl text-charcoal leading-[1.1] tracking-tight">
            {entry.title}
          </h1>
          {entry.excerpt && (
            <p className="text-base text-charcoal/60 font-light mt-5 leading-relaxed">
              {entry.excerpt}
            </p>
          )}

          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-charcoal/5 mt-10">
            <Image
              src={cover}
              alt={entry.title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          </div>

          {body.length > 0 ? (
            <div className="mt-12">
              <LookbookPortableText value={body} />
            </div>
          ) : (
            <p className="text-sm text-charcoal/40 font-light mt-10 italic">
              {isSanityConfigured()
                ? "This story is being written."
                : "Connect Sanity to publish the full editorial."}
            </p>
          )}
        </article>
      </main>

      <Footer />
    </>
  );
}
