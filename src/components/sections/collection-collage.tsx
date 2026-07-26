"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface Tile {
  handle: string;
  title: string;
  note: string;
  image: string;
  /** Tailwind col/row spans for the asymmetric grid. */
  span: string;
  mobileSpan: string;
}

const TILES: Tile[] = [
  {
    handle: "co-ords",
    title: "Co-ords",
    note: "Matched sets · top and bottom cut to move together",
    image: "/images/collection-coords.jpg",
    span: "lg:col-span-7 lg:row-span-2",
    mobileSpan: "col-span-2",
  },
  {
    handle: "2-pcs-set",
    title: "2 Pcs Set",
    note: "Kurta + bottom · the everyday rack-filler",
    image: "/images/collection-2pcs.jpg",
    span: "lg:col-span-5",
    mobileSpan: "col-span-1",
  },
  {
    handle: "dupatta-set",
    title: "Dupatta Set",
    note: "Three-piece · finished with a flowing dupatta",
    image: "/images/collection-dupatta.jpg",
    span: "lg:col-span-5",
    mobileSpan: "col-span-1",
  },
];

/**
 * COLLECTION COLLAGE — asymmetric editorial grid.
 *
 * Three collections, but no equal cards: the lead collection claims a tall
 * double-height panel while the others stack beside it. Uneven grid lines,
 * image-dominant, type set over a grade. Reads as a spread, not a product
 * grid.
 */
export function CollectionCollage() {
  const reduce = useReducedMotion();

  return (
    <section className="bg-surface px-5 py-24 text-content sm:px-8 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-12 flex items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.32em] text-accent-red">
              <span className="h-px w-8 bg-accent-red" aria-hidden />
              Shop by set
            </p>
            <h2 className="mt-4 text-[clamp(2.2rem,5.5vw,5rem)] font-black uppercase leading-[0.88] tracking-[-0.045em]">
              Three ways
              <br />
              to fill a rail.
            </h2>
          </div>
          <Link
            href="/collections"
            className="mb-1 hidden shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors hover:text-accent-red lg:inline-flex"
          >
            All collections
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-12 lg:grid-rows-2 lg:gap-4">
          {TILES.map((tile, i) => (
            <motion.div
              key={tile.handle}
              initial={{ opacity: 0, y: reduce ? 0 : 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.8, delay: reduce ? 0 : i * 0.12, ease: EASE }}
              className={`${tile.mobileSpan} ${tile.span} ${
                i === 0 ? "min-h-[52vw] lg:min-h-[640px]" : "min-h-[30vw] lg:min-h-0"
              }`}
            >
              <Link
                href={`/collections/${tile.handle}`}
                className="group relative block h-full w-full overflow-hidden bg-surface-hover"
              >
                <Image
                  src={tile.image}
                  alt={`${tile.title} collection`}
                  fill
                  className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                  sizes={i === 0 ? "58vw" : "42vw"}
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
                />

                {/* index stamp */}
                <span className="absolute right-4 top-4 text-[10px] font-black tabular-nums tracking-[0.12em] text-white/55">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="absolute inset-x-0 bottom-0 p-5 lg:p-7">
                  <h3
                    className={`font-black uppercase leading-[0.88] tracking-[-0.03em] text-white ${
                      i === 0
                        ? "text-[clamp(2rem,4vw,3.6rem)]"
                        : "text-[clamp(1.4rem,2.4vw,2.2rem)]"
                    }`}
                  >
                    {tile.title}
                  </h3>
                  <p
                    className={`mt-2 max-w-[34ch] font-medium leading-snug text-white/70 ${
                      i === 0 ? "text-[13px]" : "text-[11px]"
                    }`}
                  >
                    {tile.note}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 border-b-2 border-accent-lime pb-0.5 text-[9px] font-black uppercase tracking-[0.22em] text-accent-lime">
                    Open set
                    <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </div>

                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-accent-lime transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
                />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
