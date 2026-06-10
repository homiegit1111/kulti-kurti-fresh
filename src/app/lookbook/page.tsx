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

      <main className="flex-1 bg-warm-white relative pt-32 pb-24 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 w-full relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-4 h-[1px] bg-gold" />
              <span className="text-[9px] uppercase tracking-[0.3em] text-gold font-bold">
                The Lookbook
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-charcoal mb-5 tracking-tight leading-[1.1]">
              Stories woven <br />
              <span className="text-charcoal/40 italic font-light">
                in colour & craft.
              </span>
            </h1>
            <p className="text-sm md:text-base text-charcoal/60 max-w-md mx-auto font-light leading-relaxed">
              A visual journal — editorials, campaigns, and the hands behind the
              cloth.
            </p>
          </div>

          {/* Editorial grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {items.map((entry, idx) => {
              const cover =
                sanityImageUrl(entry.coverImageRef, 800) ??
                FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
              return (
                <Link
                  key={entry._id}
                  href={`/lookbook/${entry.slug}`}
                  className="group block"
                >
                  <article>
                    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-charcoal/5">
                      <Image
                        src={cover}
                        alt={entry.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    <div className="pt-5">
                      {entry.category && (
                        <span className="text-[9px] uppercase tracking-[0.3em] text-gold font-bold">
                          {entry.category}
                        </span>
                      )}
                      <h2 className="font-serif text-2xl text-charcoal mt-2 leading-tight group-hover:text-gold transition-colors duration-300">
                        {entry.title}
                      </h2>
                      {entry.excerpt && (
                        <p className="text-sm text-charcoal/55 font-light mt-2 leading-relaxed line-clamp-2">
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
            <p className="text-center text-[11px] text-charcoal/30 mt-16 font-light tracking-wide">
              Connect Sanity (see&nbsp;
              <code className="text-charcoal/40">sanity/README.md</code>) to
              publish live editorial here.
            </p>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
