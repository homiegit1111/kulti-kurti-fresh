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
  },
  "the-festive-edit": {
    _id: "f2",
    title: "The Festive Edit",
    slug: "the-festive-edit",
    category: "campaign",
    excerpt:
      "Our latest campaign — celebration, colour, and contemporary silhouettes.",
  },
  "quiet-luxury-loud-roots": {
    _id: "f3",
    title: "Quiet Luxury, Loud Roots",
    slug: "quiet-luxury-loud-roots",
    category: "journal",
    excerpt:
      "How minimalism and Indian craftsmanship meet in our design language.",
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

/** Minimal Portable Text → plain paragraphs (no extra dependency). */
function renderBody(body: unknown[] | undefined): string[] {
  if (!Array.isArray(body)) return [];
  return body
    .filter(
      (b): b is { _type: string; children?: { text?: string }[] } =>
        typeof b === "object" && b !== null && (b as { _type?: string })._type === "block",
    )
    .map((block) => (block.children ?? []).map((c) => c.text ?? "").join(""))
    .filter((t) => t.trim().length > 0);
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
  const paragraphs = renderBody(entry.body);

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-[#fcfbf9] relative pt-28 pb-24 min-h-screen">
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

          {paragraphs.length > 0 && (
            <div className="prose prose-lg max-w-none mt-10 font-serif text-charcoal/80 leading-relaxed space-y-5">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}

          {paragraphs.length === 0 && (
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
