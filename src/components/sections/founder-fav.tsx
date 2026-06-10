"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";

export default function FounderFav() {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <section className="content-auto relative w-full bg-[#f8f5f0] py-20 lg:py-32 border-y border-charcoal/10 overflow-hidden">
      {/*
        =========================================
        DESKTOP LAYOUT (The Magazine Editorial)
        =========================================
      */}
      <div className="hidden lg:flex w-full max-w-[1400px] mx-auto px-12 items-center gap-16">
        {/* Left: Huge Editorial Image */}
        <div className="w-[45%] h-[85vh] relative group">
          <div className="absolute inset-0 bg-charcoal/5 -translate-x-4 translate-y-4 rounded-sm" />
          <div className="relative w-full h-full overflow-hidden shadow-2xl">
            <Image
              src="/images/product-2.png"
              alt="The Signature Piece"
              fill
              className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
              style={{ willChange: "transform", backfaceVisibility: "hidden" }}
              sizes="50vw"
            />
          </div>

          {/* Floating Polaroid Detail */}
          <motion.div
            initial={{ opacity: 0, y: 20, rotate: -5 }}
            whileInView={{ opacity: 1, y: 0, rotate: -12 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="absolute -bottom-12 -right-12 w-64 h-80 bg-white p-3 pb-12 shadow-xl border border-charcoal/5 z-20"
          >
            <div className="relative w-full h-full">
              <Image
                src="/images/product-4.png"
                alt="Detail shot"
                fill
                sizes="256px"
                className="object-cover"
              />
            </div>
            <p className="absolute bottom-4 left-4 font-serif italic text-sm text-charcoal/60">
              The zari detail...
            </p>
          </motion.div>
        </div>

        {/* Right: The Founder's Letter */}
        <div className="w-[55%] pl-12 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-xs font-sans uppercase tracking-[0.4em] text-gold font-semibold mb-12 flex items-center gap-4">
              <span className="w-12 h-[1px] bg-gold" />
              The Founder&apos;s Letter
            </p>

            <h2 className="font-serif text-5xl text-charcoal font-light leading-[1.2] mb-12">
              &quot;I spent months searching for <br />
              <span className="italic text-gold">this exact flow</span> of
              Chanderi.&quot;
            </h2>

            <div className="space-y-6 text-charcoal/75 leading-relaxed text-lg max-w-xl font-serif">
              <p>Dear Patron,</p>
              <p>
                When we first conceptualized this season&apos;s collection, I
                knew I wanted a piece that felt completely effortless, yet
                carried the undeniable weight of heritage.
              </p>
              <p>
                This ivory Anarkali is deeply personal to me. The way the
                hand-woven Zari catches the evening light, and the way the
                fabric drapes without feeling heavy—it took our artisans in
                Jaipur over three weeks just to perfect the block print borders.
              </p>
              <p>
                It is more than just a dress. It is a tribute to the quiet
                luxury of Indian craftsmanship. I hope you feel as beautiful
                wearing it as we felt creating it.
              </p>
            </div>

            <div className="mt-12 pt-12 border-t border-charcoal/10 flex items-end justify-between max-w-xl">
              <div>
                <p className="font-serif italic text-3xl text-charcoal">
                  Anjali M.
                </p>
                <p className="text-xs uppercase tracking-widest text-charcoal/50 mt-2">
                  Founder, Rangat Pehnawa
                </p>
              </div>
              <Link
                href="/shop/signature-anarkali"
                className="inline-flex items-center gap-3 bg-charcoal text-white px-8 py-4 text-xs font-semibold uppercase tracking-widest hover:bg-gold transition-colors rounded-full"
              >
                <span>View The Piece</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/*
        =========================================
        MOBILE LAYOUT (The 3D Polaroid Storybook)
        =========================================
      */}
      <div className="block lg:hidden w-full px-6 flex flex-col items-center">
        <div className="text-center mb-10">
          <p className="text-[10px] font-sans uppercase tracking-[0.4em] text-gold font-semibold mb-3">
            Founder&apos;s Cut
          </p>
          <h2 className="font-serif text-3xl text-charcoal font-light">
            The Story Behind <br /> The Dress
          </h2>
        </div>

        {/* 3D Flip Container */}
        <div
          className="perspective-1000 w-full max-w-[400px] aspect-[3/4] cursor-pointer group"
          style={{ willChange: "transform", transform: "translateZ(0)" }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <motion.div
            className="w-full h-full relative transform-style-3d transition-transform duration-600 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{ willChange: "transform", backfaceVisibility: "hidden" }}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
          >
            {/* FRONT OF POLAROID */}
            <div className="absolute inset-0 backface-hidden bg-white p-4 pb-20 shadow-2xl border border-charcoal/5 rounded-sm flex flex-col">
              <div className="relative w-full h-full bg-warm-gray overflow-hidden">
                <Image
                  src="/images/product-2.png"
                  alt="Founder Fav"
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
              <div className="absolute bottom-6 left-0 w-full flex flex-col items-center justify-center text-charcoal">
                <p className="font-serif italic text-xl mb-1">
                  Tap to read my notes...
                </p>
                <RotateCcw className="w-4 h-4 text-charcoal/40 animate-spin-slow" />
              </div>
            </div>

            {/* BACK OF POLAROID (The Letter) */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#f4ebd9] p-8 shadow-2xl border border-charcoal/10 rounded-sm flex flex-col justify-center bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')]">
              <p className="text-[10px] uppercase tracking-widest text-charcoal/40 mb-6 text-center border-b border-charcoal/10 pb-4">
                A Personal Note
              </p>

              <div className="space-y-4 font-serif text-[15px] leading-relaxed text-charcoal/80">
                <p>
                  &quot;I spent weeks searching for this exact flow of
                  Chanderi.&quot;
                </p>
                <p>
                  This ivory Anarkali is deeply personal to me. It took our
                  artisans in Jaipur over three weeks just to perfect the block
                  print borders.
                </p>
                <p>
                  It is a tribute to the quiet luxury of Indian craftsmanship. I
                  hope you love it as much as I do.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-charcoal/10">
                <p className="font-serif italic text-2xl text-charcoal">
                  Anjali M.
                </p>
                <p className="text-[9px] uppercase tracking-widest text-charcoal/50 mt-1">
                  Founder
                </p>
              </div>

              <div className="mt-auto pt-8 flex justify-center">
                <Link
                  href="/shop/signature-anarkali"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-2 bg-charcoal text-white px-6 py-3 text-[10px] font-semibold uppercase tracking-widest hover:bg-gold transition-colors rounded-full"
                >
                  <span>Shop This Look</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
