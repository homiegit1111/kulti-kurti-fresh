"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { MOCK_COLLECTIONS, getCollections } from "@/lib/medusa";

export default function Collections() {
  const [collections, setCollections] = useState(MOCK_COLLECTIONS.slice(0, 4));

  useEffect(() => {
    getCollections().then((data) => setCollections(data.slice(0, 4)));
  }, []);

  return (
    <section className="relative border-y border-charcoal/5 bg-warm-white">
      {/*
        =========================================
        DESKTOP LAYOUT (The Bento Grid)
        =========================================
      */}
      <div className="hidden lg:flex w-full min-h-screen py-24 px-12 flex-col max-w-[2000px] mx-auto relative">
        {/* Aesthetic Space Fillers for Collections */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden hidden lg:block">
          <svg
            className="absolute left-[10%] top-[5%] w-32 h-32 text-charcoal/25"
            viewBox="0 0 100 100"
          >
            <path
              d="M10 50 L90 50 M50 10 L50 90 M20 20 L80 80 M20 80 L80 20"
              stroke="currentColor"
              strokeWidth="0.5"
              strokeLinecap="round"
            />
          </svg>
          <svg
            className="absolute right-[5%] bottom-[10%] w-[400px] h-[400px] text-charcoal/15 -rotate-6"
            viewBox="0 0 100 100"
          >
            <pattern
              id="coll-grid"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 10 0 L 0 0 0 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.2"
              />
            </pattern>
            <rect width="100" height="100" fill="url(#coll-grid)" />
          </svg>
          <div className="absolute left-[30%] bottom-[20%] w-[500px] h-[500px] bg-orange-200/30 rounded-full blur-[100px]" />
        </div>

        {/* Editorial Header */}
        <div className="mb-16 flex items-end justify-between w-full relative z-10">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-[1px] w-12 bg-charcoal"></div>
              <span className="text-[10px] font-bold tracking-[0.4em] text-charcoal uppercase">
                Curated Chapters
              </span>
            </div>
            <h2 className="text-6xl lg:text-7xl font-serif text-charcoal leading-none tracking-tight">
              The{" "}
              <span className="italic text-gold font-light">Collections</span>
            </h2>
          </div>
          <p className="max-w-xs text-sm text-charcoal/70 leading-relaxed text-right pb-2">
            Explore our meticulously crafted chapters, where traditional
            karigari meets contemporary silhouettes for the modern aesthetic.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="w-full h-[70vh] min-h-[600px] grid grid-cols-4 grid-rows-2 gap-4">
          {collections.map((collection, index) => {
            // Bento Grid assignment:
            // 0: Massive Feature (left half)
            // 1: Tall Feature (middle right)
            // 2: Small Top (far right top)
            // 3: Small Bottom (far right bottom)
            const gridClasses =
              [
                "col-span-2 row-span-2",
                "col-span-1 row-span-2",
                "col-span-1 row-span-1",
                "col-span-1 row-span-1",
              ][index] || "col-span-1 row-span-1";

            return (
              <Link
                key={collection.id}
                href={`/collections/${collection.handle}`}
                className={`group relative block overflow-hidden rounded-xl bg-charcoal ${gridClasses}`}
              >
                <Image
                  src={collection.image}
                  alt={collection.title}
                  fill
                  className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.08]"
                  style={{
                    willChange: "transform",
                    backfaceVisibility: "hidden",
                  }}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority={index === 0}
                />

                {/* Gradients for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
                <div className="absolute inset-0 bg-charcoal/20 group-hover:bg-transparent transition-colors duration-700" />

                {/* Content */}
                <div className="absolute inset-0 p-6 lg:p-8 flex flex-col justify-end">
                  <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md text-white text-[9px] uppercase tracking-widest border border-white/20 mb-4 w-fit opacity-80 group-hover:opacity-100 transition-opacity">
                    {collection.itemCount > 0 ? `${collection.itemCount} Pieces` : "Shop Collection"}
                  </span>

                  <h3 className="text-3xl lg:text-4xl font-serif text-white mb-1 group-hover:-translate-y-2 transition-transform duration-500 ease-out">
                    {collection.title}
                  </h3>

                  {/* CSS-only height animation for description */}
                  <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
                    <div className="overflow-hidden">
                      <p className="text-sm text-white/80 line-clamp-2 mt-2 pr-4">
                        {collection.description}
                      </p>

                      <div className="mt-4 flex items-center gap-2 text-[10px] text-gold uppercase tracking-widest font-semibold">
                        <span>Explore</span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/*
        =========================================
        MOBILE LAYOUT (The Stacked Deck)
        =========================================
      */}
      <div className="block lg:hidden w-full px-4 sm:px-6 py-12 md:py-16">
        <div className="mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 md:gap-3 mb-2">
            <span className="h-[1px] w-4 md:w-6 bg-gold" />
            <p className="text-[9px] md:text-[10px] font-sans uppercase tracking-[0.3em] md:tracking-[0.4em] text-gold font-semibold">
              Curated Chapters
            </p>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl text-charcoal font-light">
            The <span className="font-serif italic text-gold">Collections</span>
          </h2>
        </div>

        {/* Sticky Container */}
        <div className="relative w-full flex flex-col gap-0 pb-12">
          {collections.map((collection, index) => {
            // Calculate dynamic sticky top based on index so they stack nicely
            const topOffset = `calc(100px + ${index * 20}px)`;

            return (
              <div
                key={collection.id}
                className="sticky w-full h-[60vh] max-h-[500px] rounded-2xl overflow-hidden shadow-2xl mb-8"
                style={{ top: topOffset, zIndex: index + 10 }}
              >
                <div className="absolute inset-0 w-full h-full">
                  <Image
                    src={collection.image}
                    alt={collection.title}
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                </div>

                {/* Gradient & Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/95 via-charcoal/50 to-charcoal/10" />

                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <div className="mb-3">
                    <span className="inline-block text-[9px] uppercase tracking-widest text-gold border border-gold/30 px-2 py-0.5 rounded-sm">
                      {collection.itemCount > 0 ? `${collection.itemCount} Pieces` : "Shop Collection"}
                    </span>
                  </div>
                  <h3 className="font-serif text-3xl text-white font-light mb-2">
                    {collection.title}
                  </h3>
                  <p className="text-xs text-white/70 leading-relaxed mb-6 line-clamp-2">
                    {collection.description}
                  </p>

                  <Link
                    href={`/collections/${collection.handle}`}
                    className="inline-flex items-center justify-between w-full min-h-12 bg-white/10 backdrop-blur-md text-white border border-white/20 px-5 py-3 text-[10px] font-semibold uppercase tracking-widest hover:bg-gold active:scale-[0.99] transition-all rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                  >
                    <span>Shop Collection</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
