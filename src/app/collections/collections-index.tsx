"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MessageCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  MOCK_COLLECTIONS,
  getCollections,
  type CommerceCollection,
} from "@/lib/commerce/catalog";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";

const EASE = [0.16, 1, 0.3, 1] as const;

const pad = (n: number) => String(n).padStart(2, "0");

export default function CollectionsIndex() {
  // Same data path as the home "Collections" section — mock-first, then the
  // live adapter — but WITHOUT the 4-item teaser slice: this is the full index.
  const [collections, setCollections] =
    useState<CommerceCollection[]>(MOCK_COLLECTIONS);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    getCollections().then((data) => {
      if (data.length > 0) setCollections(data);
    });
  }, []);

  // With an odd count the first chapter spans the full row as a lead plate,
  // so the hairline mosaic below always closes cleanly (no dead cells).
  const leadSpans = collections.length % 2 === 1;

  return (
    <>
      <section className="bg-surface px-4 pb-20 pt-28 text-content sm:px-6 lg:px-10 lg:pb-28 lg:pt-40">
        <div className="mx-auto max-w-[1600px]">
          {/* ── Index masthead ────────────────────────────────────────── */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: EASE }}
          >
            <div className="grid gap-8 border-b-2 border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="eyebrow">Wholesale collections / Index</p>
                <h1 className="mt-4 max-w-[13ch] text-[clamp(3rem,9vw,8rem)] font-black uppercase leading-[0.8] tracking-[-0.07em]">
                  The chapters.
                </h1>
              </div>
              <div className="lg:pb-2 lg:text-right">
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-content/45">
                  Chapters {pad(1)}—{pad(Math.max(collections.length, 1))} /
                  working line sheet
                </p>
                <p className="mt-3 max-w-[34ch] text-sm leading-6 text-content/60 lg:ml-auto">
                  Each collection is a working chapter of the line sheet — open
                  one for styles, ratio packs and per-piece pricing.
                </p>
              </div>
            </div>

            {/* one-line trade terms strip */}
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[9px] font-bold uppercase tracking-[0.22em] text-content/45">
              {[
                `MOQ ${B2B_CONFIG.minimumOrderSets} sets`,
                `${SIZE_RATIO_LABEL} ratio packs`,
                "Mix chapters freely",
                "WhatsApp ordering",
              ].map((spec) => (
                <span key={spec} className="flex items-center gap-2">
                  <span className="h-1 w-1 bg-accent-lime" aria-hidden="true" />
                  {spec}
                </span>
              ))}
            </div>
          </motion.div>

          {/* ── Chapter plates ────────────────────────────────────────── */}
          {collections.length > 0 ? (
            <div className="mt-12 grid gap-px bg-line/15 sm:grid-cols-2">
              {collections.map((collection, index) => {
                const isLead = leadSpans && index === 0;
                return (
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
                    className={`bg-surface-2 ${isLead ? "sm:col-span-2" : ""}`}
                  >
                    <Link
                      href={`/collections/${collection.handle}`}
                      className={`group flex h-full flex-col ${
                        isLead ? "lg:grid lg:grid-cols-12" : ""
                      }`}
                    >
                      {/* plate image */}
                      <div
                        className={`relative overflow-hidden bg-surface-hover ${
                          isLead
                            ? "aspect-[16/10] lg:col-span-7 lg:aspect-auto lg:min-h-[26rem]"
                            : "aspect-[4/3]"
                        }`}
                      >
                        <Image
                          src={collection.image}
                          alt={collection.title}
                          fill
                          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                          sizes={
                            isLead
                              ? "(max-width: 1024px) 100vw, 58vw"
                              : "(max-width: 640px) 100vw, 50vw"
                          }
                          priority={index === 0}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                        <span className="absolute left-0 top-0 bg-accent-lime px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-on-accent">
                          {pad(index + 1)} / Chapter
                        </span>
                        <span className="absolute right-4 top-4 border border-white/40 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white">
                          {collection.itemCount > 0
                            ? `${collection.itemCount} styles`
                            : "Open"}
                        </span>
                      </div>

                      {/* plate editorial row */}
                      <div
                        className={`relative flex flex-1 flex-col justify-between gap-8 overflow-hidden border-t border-line/20 p-5 sm:p-7 ${
                          isLead
                            ? "lg:col-span-5 lg:border-l lg:border-t-0 lg:p-10"
                            : ""
                        }`}
                      >
                        {/* stroked index numeral — content token keeps it
                            legible in both themes */}
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute -right-3 -top-6 select-none font-black leading-none text-transparent opacity-25 [-webkit-text-stroke:1.5px_var(--content)] ${
                            isLead ? "text-[9rem] lg:text-[12rem]" : "text-[7rem]"
                          }`}
                        >
                          {pad(index + 1)}
                        </span>

                        <div className="relative">
                          <h2
                            className={`font-black uppercase tracking-[-0.04em] transition-transform duration-300 group-hover:translate-x-1 ${
                              isLead
                                ? "max-w-[12ch] text-3xl leading-[0.88] sm:text-5xl lg:text-6xl"
                                : "text-2xl leading-[0.92] sm:text-4xl"
                            }`}
                          >
                            {collection.title}
                          </h2>
                          <p className="mt-3 max-w-[46ch] text-xs leading-5 text-content/60 sm:text-sm sm:leading-6">
                            {collection.description}
                          </p>
                        </div>

                        <div className="relative flex items-center justify-between gap-4 border-t border-line/20 pt-4">
                          <span className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.22em] text-accent-red">
                            Open chapter
                          </span>
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-line/25 transition-all group-hover:border-accent-red group-hover:bg-accent-red group-hover:text-white">
                            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* graceful empty state — live backend with no chapters yet */
            <div className="mx-auto mt-12 max-w-2xl border border-line/20 bg-surface-2 px-6 py-16 text-center">
              <p className="eyebrow eyebrow--bare justify-center">
                Chapters loading
              </p>
              <h2 className="mt-4 text-2xl font-black uppercase leading-[0.9] tracking-[-0.04em] sm:text-3xl">
                The line sheet is being reprinted.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-content/55">
                WhatsApp us for the current wholesale catalog, live stock and
                style-code availability.
              </p>
              <a
                href={buildCatalogRequestUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-luxe mt-8"
              >
                WhatsApp catalog <MessageCircle className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* index footnote */}
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

      {/* ── Trade CTA band ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-accent-red px-4 py-12 text-white sm:px-6 lg:px-10 lg:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-12 select-none text-[28vw] font-black uppercase leading-none text-black/8"
        >
          C
        </div>
        <div className="relative mx-auto grid max-w-[1600px] gap-8 lg:grid-cols-12 lg:items-end">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.65, ease: EASE }}
            className="lg:col-span-8"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/60">
              For boutiques, resellers and online sellers
            </p>
            <h2 className="mt-4 max-w-[13ch] text-[clamp(2.8rem,7vw,7rem)] font-black uppercase leading-[0.78] tracking-[-0.075em]">
              Turn chapters into a rack plan.
            </h2>
          </motion.div>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.65, delay: 0.1, ease: EASE }}
            className="lg:col-span-4"
          >
            <p className="max-w-md text-sm leading-7 text-white/70">
              Start with {B2B_CONFIG.minimumOrderSets} sets, mix styles across
              chapters, and confirm stock, invoice and dispatch on WhatsApp.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link
                href="/bulk-order"
                className="linebook-button border-white bg-white text-on-accent hover:bg-accent-lime"
              >
                Open bulk desk <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href={buildCatalogRequestUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="linebook-button border-white/50 text-white hover:border-white"
              >
                WhatsApp catalogue <MessageCircle className="h-3.5 w-3.5" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
