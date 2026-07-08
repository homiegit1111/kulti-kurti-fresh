"use client";

import { useState, useRef } from "react";
import { motion, type Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Lane {
  title: string;
  copy: string;
  href: string;
  image: string;
}

interface BuyerLanesProps {
  lanes: Lane[];
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function BuyerLanes({ lanes }: BuyerLanesProps) {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28 bg-[#f4efe5] overflow-hidden">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
        {/* Vibrant Premium Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 mb-12 lg:mb-16">
          <div className="max-w-xl flex flex-col items-start">
            <div className="inline-flex items-center gap-3 mb-5">
              <span className="h-px w-10 bg-[#a68b5f]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#a68b5f]">
                Trade Buying Rhythm
              </span>
            </div>
            <h2 className="font-serif text-[42px] sm:text-[50px] lg:text-[56px] leading-[0.98] tracking-[-2px] text-charcoal">
              Four edits.<br />
              <span className="font-serif italic font-light text-[#a68b5f]">Structured for margin.</span>
            </h2>
            <p className="mt-6 max-w-md text-[14px] leading-[1.65] text-charcoal/65">
              Each collection acts as a distinct buying lane. From quick-turning daily cottons to premium festive handlooms — purchase in sets of 4 sizes with zero retail clutter.
            </p>
            <Link
              href="/shop"
              className="group inline-flex items-center gap-2 text-[9px] font-bold tracking-[0.22em] text-[#a68b5f] hover:text-charcoal mt-8 border border-[#a68b5f]/30 hover:border-charcoal bg-transparent px-5 py-2.5 rounded-sm transition-all duration-300"
            >
              VIEW ALL COLLECTIONS
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Right Column: Animated Tactile Polaroid Fan Deck */}
          <div className="relative flex items-center justify-center w-full lg:max-w-[440px] h-[180px] select-none pointer-events-auto">
            <motion.div 
              whileHover="hover"
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative flex items-center justify-center w-full h-full"
            >
              {(() => {
                const cards = [
                  { 
                    image: lanes[0]?.image ?? "/images/product-1.png", 
                    title: "LANE 01 // SAGE",
                    rotate: -12, 
                    hoverRotate: -24, 
                    hoverX: -60, 
                    hoverY: -8,
                    z: "z-10" 
                  },
                  { 
                    image: lanes[1]?.image ?? "/images/product-2.png", 
                    title: "LANE 02 // IVORY",
                    rotate: -2, 
                    hoverRotate: 0, 
                    hoverX: 0, 
                    hoverY: -16,
                    z: "z-20" 
                  },
                  { 
                    image: lanes[2]?.image ?? "/images/product-3.png", 
                    title: "LANE 03 // INDIGO",
                    rotate: 10, 
                    hoverRotate: 24, 
                    hoverX: 60, 
                    hoverY: -8,
                    z: "z-30" 
                  }
                ];

                return cards.map((card, idx) => (
                  <motion.div
                    key={idx}
                    style={{ originX: 0.5, originY: 1 }}
                    animate={{
                      rotate: card.rotate,
                      x: 0,
                      y: 0
                    }}
                    whileHover={{ scale: 1.05, zIndex: 40 }}
                    variants={{
                      hover: {
                        rotate: card.hoverRotate,
                        x: card.hoverX,
                        y: card.hoverY,
                      }
                    }}
                    className={`absolute w-[105px] h-[145px] bg-[#FAF8F5] border border-[#a68b5f]/15 p-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.06)] rounded-sm flex flex-col justify-between ${card.z} transition-all duration-300`}
                  >
                    {/* Photo area */}
                    <div className="relative w-full h-[110px] bg-charcoal/5 rounded-[1px] overflow-hidden shadow-inner">
                      <Image
                        src={card.image}
                        alt={card.title}
                        fill
                        sizes="105px"
                        className="object-cover"
                        priority
                      />
                    </div>
                    {/* Polaroid Label */}
                    <span className="text-[5.5px] font-bold tracking-[0.25em] text-[#a68b5f] text-center block mt-1 uppercase">
                      {card.title}
                    </span>
                  </motion.div>
                ));
              })()}
            </motion.div>
          </div>
        </div>

        {/* Modern Vibrant Collection Grid — Bento with life */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(320px,1fr)]"
        >
          {lanes.map((lane, index) => {
            const accent = ["#a68b5f", "#8b6f47", "#c5a26f", "#6b5a3f"][index];

            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ 
                  y: -8,
                  transition: { type: "spring", stiffness: 180, damping: 22 }
                }}
                className="group relative overflow-hidden rounded-2xl bg-charcoal shadow-[0_24px_55px_-12px_rgba(0,0,0,0.3)] flex flex-col h-[460px] sm:h-[480px] lg:h-[500px]"
              >
                <Link href={lane.href} className="absolute inset-0 z-20" aria-label={`Shop ${lane.title}`} />

                {/* Elegant Full Background Image Swatch */}
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                  <Image
                    src={lane.image}
                    alt={lane.title}
                    fill
                    className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:brightness-[0.9]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />

                  {/* Dark Premium Gradient Layer - ensures text legibility under all image conditions */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-transparent transition-opacity duration-700 group-hover:opacity-95" 
                    style={{ 
                      backgroundImage: `linear-gradient(to top, rgba(28,25,20,0.98) 0%, rgba(28,25,20,0.7) 45%, rgba(28,25,20,0.15) 80%, transparent 100%)` 
                    }} 
                  />

                  {/* Subtle color wash that matches the collection tone */}
                  <div 
                    className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at bottom, ${accent}88 0%, transparent 70%)`
                    }}
                  />

                  {/* Directional light layer */}
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,transparent_45%)] opacity-70 group-hover:opacity-90 transition-opacity duration-700 pointer-events-none" />

                  {/* Fine loom weave texture overlay */}
                  <div className="absolute inset-0 bg-[radial-gradient(#00000005_0.5px,transparent_1px)] bg-[length:2.5px_2.5px] mix-blend-multiply pointer-events-none" />

                  {/* Top Floating Badge - Minimal luxury styled */}
                  <div className="absolute top-5 left-5 z-10 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[8px] font-bold tracking-[0.25em] text-white border border-white/15">
                    0{index + 1} / CHAPTER
                  </div>

                  {/* Gold Thread Bottom Border that slides across */}
                  <div 
                    className="absolute bottom-0 left-0 h-[3px] w-0 group-hover:w-full transition-all duration-500 ease-out z-10" 
                    style={{ backgroundColor: accent }} 
                  />
                </div>

                {/* Floating Content Drawer at bottom */}
                <div className="absolute bottom-0 inset-x-0 p-6 lg:p-7 flex flex-col z-10 pointer-events-none">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-[0.26em] text-[#a68b5f]">
                      Rangat Edit
                    </span>
                    <h3 className="font-serif text-2xl lg:text-[28px] leading-tight tracking-normal text-white mt-1 group-hover:text-[#a68b5f] transition-colors duration-300">
                      {lane.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-white/70 max-w-[28ch] opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                      {lane.copy}
                    </p>
                  </div>

                  {/* Divider and actionable details */}
                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-medium">
                      MOQ 4 • Ready stock
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-[9px] font-bold tracking-[0.22em] text-[#a68b5f]">
                      <span>SHOP RAIL</span>
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>

                {/* Aesthetic corner text */}
                <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-40 transition-opacity duration-300 text-[8px] font-mono tracking-[0.2em] text-white/60">
                  {["DAILY", "WORK", "BLUE", "FESTIVE"][index]}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom Attractive CTA — vibrant and modern */}
        <div className="mt-10 flex justify-center">
          <Link 
            href="/shop" 
            className="group inline-flex items-center gap-3 px-9 py-3.5 rounded-full border border-[#a68b5f]/40 text-sm font-semibold tracking-[0.25em] text-charcoal hover:bg-charcoal hover:text-white hover:border-charcoal transition-all duration-300"
          >
            BROWSE THE FULL EDIT
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
          </Link>
        </div>
      </div>
    </section>
  );
}
