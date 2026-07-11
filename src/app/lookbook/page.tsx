import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getEditorialEntries, type EditorialEntry } from "@/lib/sanity/queries";
import { sanityImageUrl, isSanityConfigured } from "@/lib/sanity/client";

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

const FALLBACK_IMAGES = [
  "/images/hero.png",
  "/images/RangatPehnawa.png",
  "/images/hero.png",
];

export default async function LookbookPage() {
  const entries = await getEditorialEntries(24);
  const items = entries.length > 0 ? entries : FALLBACK;
  const usingFallback = entries.length === 0;

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-surface text-content pt-28 pb-24 lg:pt-36 lg:pb-28 min-h-screen">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
          {/* Header */}
          <div className="grid gap-8 border-b-2 border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-accent-red">
                The Lookbook / Journal
              </p>
              <h1 className="mt-4 max-w-[13ch] text-[clamp(3rem,8vw,7.5rem)] font-black uppercase leading-[0.82] tracking-[-0.07em]">
                Stories in colour &amp; craft.
              </h1>
            </div>
            <p className="max-w-[32ch] text-sm leading-6 text-content/60">
              A visual journal — editorials, campaigns, and the hands behind the
              cloth.
            </p>
          </div>

          {/* Editorial grid */}
          <div className="mt-10 grid grid-cols-1 gap-px bg-line/15 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((entry, idx) => {
              const cover =
                sanityImageUrl(entry.coverImageRef, 800) ??
                FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
              return (
                <Link
                  key={entry._id}
                  href={`/lookbook/${entry.slug}`}
                  className="group block bg-surface"
                >
                  <article>
                    <div className="relative aspect-[4/5] overflow-hidden bg-surface-hover">
                      <Image
                        src={cover}
                        alt={entry.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                      <span className="absolute left-0 top-0 bg-accent-lime px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-on-accent">
                        0{idx + 1}
                      </span>
                    </div>
                    <div className="border-t border-line/20 px-4 py-5">
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
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>

          {usingFallback && !isSanityConfigured() && (
            <p className="mt-16 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-content/35">
              Connect Sanity (see&nbsp;
              <code className="text-content/50">sanity/README.md</code>) to
              publish live editorial here.
            </p>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
