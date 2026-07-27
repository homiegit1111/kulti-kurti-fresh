import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getEditorialEntries, type EditorialEntry } from "@/lib/sanity/queries";
import { sanityImageUrl } from "@/lib/sanity/client";
import { EntryClose, EntryHead } from "@/components/document/entry";
import { InstagramGallery } from "@/components/sections/instagram-gallery";
import {
  CURATED_REAL_POSTS,
  INSTAGRAM_HANDLE,
  INSTAGRAM_PROFILE,
} from "@/lib/instagram/posts";

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

const formatDate = (iso?: string) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

function StoryRow({ entry, index }: { entry: EditorialEntry; index: number }) {
  return (
    <Link
      href={`/lookbook/${entry.slug}`}
      className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-4 border-b border-line/20 py-3 md:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,10rem)_7rem_2rem]"
    >
      <span className="text-[11px] font-bold tabular-nums text-content/45">
        {index}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold leading-tight tracking-[-0.02em] group-hover:underline sm:text-base">
          {entry.title}
        </span>
        {entry.excerpt && (
          <span className="mt-1 hidden truncate text-xs leading-5 text-content/55 md:block">
            {entry.excerpt}
          </span>
        )}
      </span>
      <span className="hidden truncate text-[9px] font-extrabold uppercase tracking-[0.2em] text-content/45 md:block">
        {entry.category ?? "journal"}
      </span>
      <span className="text-right text-[9px] font-extrabold uppercase tracking-[0.16em] text-content/45">
        {formatDate(entry.publishedAt) ?? "archive"}
      </span>
      <span
        aria-hidden="true"
        className="hidden text-right text-content/40 group-hover:text-content md:block"
      >
        →
      </span>
    </Link>
  );
}

export default async function LookbookPage() {
  const entries = await getEditorialEntries(24);

  // The lead story is the first entry with a real cover — no ghost covers.
  const leadIndex = entries.findIndex((entry) =>
    Boolean(sanityImageUrl(entry.coverImageRef, 1200)),
  );
  const lead = leadIndex >= 0 ? entries[leadIndex] : null;
  const leadCover = lead ? sanityImageUrl(lead.coverImageRef, 1200) : null;
  const rest = lead ? entries.filter((entry) => entry._id !== lead._id) : entries;

  return (
    <>
      <Navbar />

      <main className="min-h-screen flex-1 bg-surface pt-28 text-content lg:pt-36">
        <section className="px-5 pb-24 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-[1400px]">
            {/* Journal masthead. */}
            <header>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-content/55">
                Rangat Pehnawa — journal
              </p>
              <h1 className="mt-4 max-w-[18ch] text-[clamp(2.75rem,6vw,5.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
                The lookbook — stories behind the wholesale line
              </h1>
            </header>

            {/* Text block with the folio rail at lg+ (R2). */}
            <div className="relative lg:ml-[72px] lg:border-l lg:border-line/25 lg:pl-6">
              <EntryHead
                letter="A"
                name="Stories"
                count={entries.length}
                countLabel={entries.length === 1 ? "story" : "stories"}
                action={
                  <Link
                    href="/shop"
                    className="text-[10px] font-extrabold uppercase tracking-[0.2em] underline decoration-1 underline-offset-4 hover:decoration-2"
                  >
                    Browse styles →
                  </Link>
                }
              />

              {entries.length > 0 ? (
                <div className="pt-6">
                  {/* One lead plate — only when a real cover exists. */}
                  {lead && leadCover && (
                    <div className="grid gap-x-6 gap-y-4 border-b border-line/20 pb-8 lg:grid-cols-12">
                      <Link
                        href={`/lookbook/${lead.slug}`}
                        className="block lg:col-span-6"
                        tabIndex={-1}
                        aria-hidden
                      >
                        <div className="plate-frame relative aspect-[4/5] overflow-hidden bg-surface-hover">
                          <Image
                            src={leadCover}
                            alt={lead.title}
                            fill
                            priority
                            sizes="(max-width: 1024px) 100vw, 640px"
                            className="object-cover"
                          />
                        </div>
                      </Link>
                      <div className="lg:col-span-4">
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.24em] text-content/55">
                          {lead.category ?? "journal"}
                          <span className="mx-2 text-content/35">·</span>
                          {formatDate(lead.publishedAt) ?? "archive"}
                        </p>
                        <Link
                          href={`/lookbook/${lead.slug}`}
                          className="group/title block"
                        >
                          <h2 className="mt-3 max-w-[16ch] text-2xl font-black uppercase leading-[0.95] tracking-[-0.03em] group-hover/title:underline sm:text-3xl">
                            {lead.title}
                          </h2>
                        </Link>
                        {lead.excerpt && (
                          <p className="mt-3 max-w-[44ch] text-sm leading-[21px] text-content/70">
                            {lead.excerpt}
                          </p>
                        )}
                        <Link
                          href={`/lookbook/${lead.slug}`}
                          className="mt-4 inline-block text-[10px] font-extrabold uppercase tracking-[0.2em] underline decoration-1 underline-offset-4 hover:decoration-2"
                        >
                          Read the story →
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Ruled entry list. */}
                  {rest.length > 0 && (
                    <div className="ledger">
                      {rest.map((entry, index) => (
                        <StoryRow
                          key={entry._id}
                          entry={entry}
                          index={index + (lead ? 2 : 1)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Honest empty journal — no ghost stories. */
                <div className="max-w-xl pt-6">
                  <p className="border-b border-line/20 py-3 text-sm leading-6 text-content/70">
                    No stories filed yet. The wholesale line is open now.
                  </p>
                  <Link
                    href="/shop"
                    className="mt-6 inline-flex h-11 items-center border border-content px-6 text-[10px] font-extrabold uppercase tracking-[0.2em] transition-colors hover:bg-surface-inverse hover:text-content-inverse"
                  >
                    Browse styles →
                  </Link>
                </div>
              )}

              {/* From the studio — the honest Instagram rail. */}
              {CURATED_REAL_POSTS.length > 0 && (
                <>
                  <EntryHead
                    letter="B"
                    name="From the studio"
                    count={CURATED_REAL_POSTS.length}
                    countLabel="posts"
                    action={
                      <a
                        href={INSTAGRAM_PROFILE}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-extrabold uppercase tracking-[0.2em] underline decoration-1 underline-offset-4 hover:decoration-2"
                      >
                        @{INSTAGRAM_HANDLE} →
                      </a>
                    }
                  />
                  <InstagramGallery className="pt-6" />
                </>
              )}

              <EntryClose className="mt-12" />
            </div>
          </div>
        </section>

        {/* Colophon — the one ink entry: every story ends at the rail (R9). */}
        <section className="bg-surface-inverse text-content-inverse">
          <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-10 lg:px-16">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-content-inverse/55">
              Contact
            </p>
            <p className="mt-4 max-w-[18ch] text-[clamp(2rem,4vw,3.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
              Stock the styles behind the stories
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-[10px] font-extrabold uppercase tracking-[0.2em]">
              <Link
                href="/shop"
                className="underline decoration-1 underline-offset-4 hover:decoration-2"
              >
                Browse styles →
              </Link>
              <Link
                href="/bulk-order"
                className="underline decoration-1 underline-offset-4 hover:decoration-2"
              >
                Bulk desk →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
