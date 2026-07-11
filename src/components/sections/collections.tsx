"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { MOCK_COLLECTIONS, getCollections } from "@/lib/commerce/catalog";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Collections() {
  const [collections, setCollections] = useState(MOCK_COLLECTIONS.slice(0, 4));
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    getCollections().then((data) => setCollections(data.slice(0, 4)));
  }, []);

  return (
    <section className="bg-surface-2 px-4 py-20 text-content sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[1600px]">
        {/* Editorial header */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.65, ease: EASE }}
          className="grid gap-8 border-b-2 border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end"
        >
          <div>
            <p className="eyebrow text-accent-red">Chapters / index</p>
            <h2 className="mt-4 max-w-[13ch] text-5xl font-black uppercase leading-[0.82] tracking-[-0.065em] sm:text-7xl lg:text-8xl">
              Shop the collections.
            </h2>
          </div>
          <p className="max-w-[34ch] text-sm leading-6 text-content/60">
            Each collection is a working chapter of the linesheet. Open one to
            see the styles, packs and per-piece pricing inside.
          </p>
        </motion.div>

        {/* Collection entries */}
        <div className="mt-12 grid gap-px bg-line/15 sm:grid-cols-2">
          {collections.map((collection, index) => (
            <motion.div
              key={collection.id}
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.6,
                ease: EASE,
                delay: (index % 2) * 0.08,
              }}
              className="bg-surface-2"
            >
              <Link
                href={`/collections/${collection.handle}`}
                className="group flex h-full flex-col"
              >
                {/* Square image with lime code chip */}
                <div className="relative aspect-square overflow-hidden bg-surface-hover">
                  <Image
                    src={collection.image}
                    alt={collection.title}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                    sizes="(max-width: 640px) 100vw, 50vw"
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  <span className="absolute left-4 top-4 bg-accent-lime px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-on-accent">
                    0{index + 1} / Chapter
                  </span>
                  <span className="absolute right-4 top-4 border border-white/40 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white">
                    {collection.itemCount > 0
                      ? `${collection.itemCount} styles`
                      : "Shop"}
                  </span>
                </div>

                {/* Editorial row */}
                <div className="flex flex-1 items-start justify-between gap-4 border-t border-line/20 p-5 sm:p-7">
                  <div>
                    <h3 className="text-2xl font-black uppercase leading-[0.92] tracking-[-0.04em] transition-transform duration-300 group-hover:translate-x-1 sm:text-4xl">
                      {collection.title}
                    </h3>
                    <p className="mt-3 max-w-[42ch] text-xs leading-5 text-content/60 line-clamp-2">
                      {collection.description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.22em] text-accent-red">
                      Open chapter
                    </span>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-line/25 transition-all group-hover:border-accent-red group-hover:bg-accent-red group-hover:text-white">
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-content/45">
            Pack sizes vary by style
          </p>
          <Link
            href="/shop"
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-content underline decoration-accent-red decoration-2 underline-offset-4"
          >
            View all inventory
          </Link>
        </div>
      </div>
    </section>
  );
}
