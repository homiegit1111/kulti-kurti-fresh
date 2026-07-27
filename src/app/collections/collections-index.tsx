/**
 * Collections index — the chapters, typeset as a ruled folio ledger.
 *
 * Server component: collections arrive as props from the route (one server
 * fetch, no mock-first client refetch). Body is Entry A — a ledger of
 * chapters with real item counts — with one 4:5 plate beside the lead entry.
 * An ink colophon closes the document (R9).
 */

import Image from "next/image";
import Link from "next/link";
import { EntryClose, EntryHead } from "@/components/document/entry";
import { TermsRule } from "@/components/document/terms-rule";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";
import type { CommerceCollection } from "@/lib/commerce/catalog";
import { CollectionsMasthead } from "./masthead";

function ChapterRows({ collections }: { collections: CommerceCollection[] }) {
  return (
    <div className="ledger">
      {/* Column heads — solid ink on paper. */}
      <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,16rem)_6rem_2rem] gap-4 border-b border-line/25 py-3 text-[8px] font-bold uppercase tracking-[0.22em] text-content/40 md:grid">
        <span>№</span>
        <span>Collection</span>
        <span>Note</span>
        <span className="text-right">Styles</span>
        <span />
      </div>

      {collections.map((collection, index) => (
        <Link
          key={collection.id}
          href={`/collections/${collection.handle}`}
          className="group grid grid-cols-[2.5rem_minmax(0,1fr)_5rem] items-baseline gap-4 border-b border-line/20 py-3 md:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,16rem)_6rem_2rem]"
        >
          <span className="text-[11px] font-bold tabular-nums text-content/45">
            {index + 1}
          </span>
          <span className="truncate text-sm font-bold leading-tight tracking-[-0.02em] group-hover:underline sm:text-base">
            {collection.title}
          </span>
          <span className="hidden truncate text-xs leading-5 text-content/55 md:block">
            {collection.description}
          </span>
          <span className="text-right text-[11px] font-bold tabular-nums">
            {collection.itemCount}
            <span className="ml-1 text-[8px] font-bold uppercase tracking-[0.14em] text-content/45">
              styles
            </span>
          </span>
          <span
            aria-hidden="true"
            className="hidden text-right text-content/40 group-hover:text-content md:block"
          >
            →
          </span>
        </Link>
      ))}
    </div>
  );
}

export function CollectionsIndex({
  collections,
  seasonLine,
}: {
  collections: CommerceCollection[];
  seasonLine: string;
}) {
  const lead = collections[0];

  return (
    <>
      <section className="bg-surface px-5 pb-24 pt-28 text-content sm:px-10 lg:px-16 lg:pt-36">
        <div className="mx-auto max-w-[1400px]">
          <CollectionsMasthead seasonLine={seasonLine} />

          {/* Text block with the folio rail at lg+ (R2). */}
          <div className="relative lg:ml-[72px] lg:border-l lg:border-line/25 lg:pl-6">
            <EntryHead
              letter="A"
              name="Collections"
              count={collections.length}
              countLabel="collections"
              action={
                <Link
                  href="/shop"
                  className="text-[10px] font-extrabold uppercase tracking-[0.2em] underline decoration-1 underline-offset-4 hover:decoration-2"
                >
                  Browse styles →
                </Link>
              }
            />

            {collections.length > 0 ? (
              <div className="grid gap-x-6 gap-y-10 pt-6 lg:grid-cols-12">
                {/* Ledger of chapters — every count is the live itemCount. */}
                <div className="lg:col-span-7">
                  <ChapterRows collections={collections} />
                </div>

                {/* One 4:5 plate beside the lead entry. */}
                {lead && (
                  <div className="lg:col-span-4 lg:col-start-9">
                    <Link
                      href={`/collections/${lead.handle}`}
                      className="group block"
                    >
                      <div className="plate-frame relative aspect-[4/5] overflow-hidden bg-surface-hover">
                        <Image
                          src={lead.image}
                          alt={lead.title}
                          fill
                          sizes="(max-width: 1024px) 100vw, 420px"
                          className="object-cover"
                        />
                      </div>
                      <div className="ledger mt-3 border-b border-line/20 pb-3">
                        <p className="text-sm font-bold leading-tight tracking-[-0.02em] group-hover:underline">
                          {lead.title}
                        </p>
                        <p className="mt-1 text-[11px] font-bold tabular-nums text-content/55">
                          {lead.itemCount}
                          <span className="ml-1 text-[8px] font-bold uppercase tracking-[0.14em]">
                            styles
                          </span>
                        </p>
                        <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-content/55">
                          Open collection →
                        </p>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              /* Honest empty state — live backend with no chapters yet. */
              <div className="max-w-xl pt-6">
                <TermsRule />
                <p className="mt-6 text-sm leading-6 text-content/70">
                  Collections updating — WhatsApp for the current wholesale
                  catalog and today&apos;s price list.
                </p>
                <a
                  href={buildCatalogRequestUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex h-11 items-center border border-content px-6 text-[10px] font-extrabold uppercase tracking-[0.2em] transition-colors hover:bg-surface-inverse hover:text-content-inverse"
                >
                  WhatsApp catalog
                </a>
              </div>
            )}

            <EntryClose className="mt-12" />
          </div>
        </div>
      </section>

      {/* Colophon — the one ink entry on this route (R9). */}
      <section className="bg-surface-inverse text-content-inverse">
        <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-10 lg:px-16">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-content-inverse/55">
            Contact
          </p>
          <p className="mt-4 max-w-[20ch] text-[clamp(2rem,4vw,3.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
            Rangat Pehnawa — wholesale line book
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-[10px] font-extrabold uppercase tracking-[0.2em]">
            <a
              href={buildCatalogRequestUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-1 underline-offset-4 hover:decoration-2"
            >
              WhatsApp catalog
            </a>
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
              Bulk order →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
