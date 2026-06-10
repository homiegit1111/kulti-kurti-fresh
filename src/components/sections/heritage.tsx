"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef } from "react";

export default function Heritage() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const rawY1 = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const rawY2 = useTransform(scrollYProgress, [0, 1], ["8%", "-8%"]);
  const imgY1 = useSpring(rawY1, { stiffness: 80, damping: 20, mass: 0.5 });
  const imgY2 = useSpring(rawY2, { stiffness: 80, damping: 20, mass: 0.5 });

  return (
    <section
      ref={containerRef}
      className="content-auto relative bg-warm-white py-24 md:py-32 overflow-hidden border-t border-charcoal/5"
    >
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 px-6 lg:px-20">
        <div className="w-px h-full bg-charcoal ml-[33%]" />
        <div className="w-px h-full bg-charcoal ml-[66%] hidden md:block" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Asymmetrical Editorial Image Grid */}
          <div className="lg:col-span-6 relative h-[500px] md:h-[600px] w-full flex items-center justify-center">
            {/* Fine framing box */}
            <div className="absolute top-10 left-10 w-[80%] h-[80%] border border-gold/30 pointer-events-none -z-10" />

            {/* Main image - artisan close up */}
            <motion.div
              style={{
                y: imgY1,
                willChange: "transform",
                backfaceVisibility: "hidden",
              }}
              className="absolute left-0 top-0 w-[70%] h-[75%] overflow-hidden shadow-xl"
            >
              <Image
                src="/images/product-4.png"
                alt="Handblock printing detail"
                fill
                className="object-cover transition-transform duration-700 hover:scale-105"
                sizes="(max-width: 1024px) 70vw, 35vw"
              />
            </motion.div>

            {/* Overlapping secondary image - fabric texture */}
            <motion.div
              style={{
                y: imgY2,
                willChange: "transform",
                backfaceVisibility: "hidden",
              }}
              className="absolute right-0 bottom-0 w-[55%] h-[60%] overflow-hidden border-8 border-warm-white shadow-2xl"
            >
              <Image
                src="/images/product-3.png"
                alt="Chanderi Loom"
                fill
                className="object-cover transition-transform duration-700 hover:scale-105"
                sizes="(max-width: 1024px) 55vw, 25vw"
              />
            </motion.div>

            {/* Fine label badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="absolute left-6 bottom-16 bg-gold text-white text-[10px] font-semibold tracking-[0.3em] uppercase py-2.5 px-5 shadow-lg"
            >
              Est. 2025
            </motion.div>
          </div>

          {/* Right Column: Copywriting & Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.2 },
              },
            }}
            className="lg:col-span-6 space-y-6 md:space-y-8"
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 },
              }}
              className="inline-flex items-center gap-3"
            >
              <span className="h-[1px] w-6 bg-gold" />
              <p className="text-[10px] font-sans uppercase tracking-[0.4em] text-gold font-semibold">
                Our Heritage
              </p>
            </motion.div>

            <motion.h2
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0 },
              }}
              className="font-serif text-5xl md:text-6xl lg:text-7xl text-charcoal font-light leading-[1.1]"
            >
              Honoring <br className="hidden md:block" />
              <span className="font-serif italic text-gold relative">
                The Slow Craft
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-gold/30"
                  viewBox="0 0 100 20"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0,10 Q50,20 100,10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>
            </motion.h2>

            <motion.p
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0 },
              }}
              className="text-lg md:text-xl text-charcoal/80 leading-relaxed font-serif first-letter:text-6xl first-letter:font-bold first-letter:text-gold first-letter:float-left first-letter:mr-4 first-letter:mt-2"
            >
              Rangat Pehnawa is born from a desire to preserve and elevate the
              rich tapestry of Indian heritage crafts. We work hand-in-hand with
              multi-generational master artisans across Rajasthan, Madhya
              Pradesh, and Uttar Pradesh.
            </motion.p>

            <motion.div
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              className="space-y-6 pt-8 mt-8 border-t border-charcoal/10"
            >
              <div className="group relative bg-white/50 p-6 rounded-sm border border-charcoal/5 hover:border-gold/30 transition-all shadow-sm hover:shadow-md">
                <span className="absolute -top-4 -left-4 font-serif text-4xl text-gold/20 group-hover:text-gold transition-colors font-normal italic bg-warm-white px-2">
                  01
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-charcoal tracking-widest uppercase mb-2">
                    Handblock Impressionism
                  </h4>
                  <p className="text-sm text-charcoal/60 leading-relaxed font-serif">
                    Using hand-carved teak wood blocks, our artisans stamp
                    fabrics with organic dyes, creating slight, soulful
                    variations unique to each meter of cloth.
                  </p>
                </div>
              </div>

              <div className="group relative bg-white/50 p-6 rounded-sm border border-charcoal/5 hover:border-gold/30 transition-all shadow-sm hover:shadow-md">
                <span className="absolute -top-4 -left-4 font-serif text-4xl text-gold/20 group-hover:text-gold transition-colors font-normal italic bg-warm-white px-2">
                  02
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-charcoal tracking-widest uppercase mb-2">
                    The Luster of Chanderi
                  </h4>
                  <p className="text-sm text-charcoal/60 leading-relaxed font-serif">
                    Woven in Madhya Pradesh, our Chanderi combines raw silk and
                    fine cotton with gold zari, offering a lightweight luxury
                    drape suitable for every season.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              className="pt-10"
            >
              <a
                href="/about"
                className="group inline-flex items-center gap-4 text-xs font-semibold uppercase tracking-widest text-charcoal hover:text-gold transition-colors"
              >
                <span>Meet the Artisans</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-2" />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
