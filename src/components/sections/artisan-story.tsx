"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function ArtisanStory() {
  return (
    <section className="content-auto relative w-full bg-warm-white py-24 lg:py-32 overflow-hidden border-b border-charcoal/5">
      {/* Background Decorative Thread Doodle */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
        <svg
          className="absolute w-full h-full"
          viewBox="0 0 1000 500"
          preserveAspectRatio="none"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        >
          <motion.path
            d="M-100,250 C100,100 300,400 500,250 C700,100 900,400 1100,250"
            className="text-gold"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 4, ease: "easeInOut" }}
          />
          <motion.path
            d="M-100,200 C150,50 350,450 550,200 C750,-50 850,450 1100,200"
            className="text-charcoal/20"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 5, ease: "easeInOut", delay: 0.5 }}
          />
        </svg>

        {/* Floating Needle Doodle */}
        <motion.svg
          className="absolute text-gold w-8 h-8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          initial={{ x: "0vw", y: 250, rotate: 45 }}
          whileInView={{ x: "80vw", y: 200, rotate: [45, -20, 45, -20, 45] }}
          viewport={{ once: true }}
          transition={{ duration: 6, ease: "linear" }}
        >
          <path d="M21 3L9 15M21 3C21 3 19.5 2.5 18 4C16.5 5.5 17.5 7 17.5 7L21 3ZM9 15C8.5 15.5 8.5 16.5 9 17C9.5 17.5 10.5 17.5 11 17L9 15Z" />
        </motion.svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: Emotional Typography */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="flex flex-col justify-center order-2 lg:order-1"
          >
            <div className="inline-flex items-center gap-3 mb-6">
              <span className="h-[1px] w-8 bg-gold" />
              <p className="text-[10px] font-sans uppercase tracking-[0.4em] text-gold font-semibold">
                Meet The Karigars
              </p>
            </div>

            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-charcoal font-light leading-tight mb-8">
              Generations of craft, <br />
              <span className="italic">woven by hand.</span>
            </h2>

            <div className="space-y-6 text-charcoal/70 leading-relaxed text-sm md:text-base max-w-md">
              <p>
                Behind every beautiful thread, every block print, and every
                intricate Zari border, there is a pair of hands.
              </p>
              <p>
                Our Karigars (artisans) are the true soul of Rangat Pehnawa.
                They don&apos;t just stitch fabric; they weave their ancestral
                knowledge, their patience, and their quiet dedication into every
                single garment.
              </p>
              <p className="font-serif italic text-xl text-charcoal mt-8 border-l-2 border-gold pl-4 py-1">
                &quot;It takes 40 hours of focused silence to complete one
                handcrafted dupatta. It is a meditation.&quot;
              </p>
            </div>
          </motion.div>

          {/* Right: Immersive Media Collage */}
          <div className="relative h-[50vh] sm:h-[60vh] lg:h-[70vh] w-full order-1 lg:order-2 group">
            {/* Main Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl z-10"
            >
              <Image
                src="https://images.unsplash.com/photo-1605367302482-19e4871ba826?q=80&w=1200&auto=format&fit=crop"
                alt="Artisan Hands Weaving"
                fill
                className="object-cover transition-transform duration-[2s] group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent opacity-60" />
            </motion.div>

            {/* Overlapping Detail Video/Image */}
            <motion.div
              initial={{ opacity: 0, y: 30, x: 20 }}
              whileInView={{ opacity: 1, y: 0, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="absolute -bottom-8 -left-8 w-48 h-56 bg-white p-2 pb-8 shadow-2xl z-20 hidden md:block rounded-sm transform -rotate-6 group-hover:-rotate-3 transition-transform duration-500"
            >
              <div className="relative w-full h-full bg-warm-gray overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1598460592928-8254c0e66e60?q=80&w=800&auto=format&fit=crop"
                  alt="Block Printing"
                  fill
                  className="object-cover"
                  sizes="192px"
                />
              </div>
              <p className="absolute bottom-2 left-3 font-serif italic text-xs text-charcoal/60">
                Block printing, Jaipur
              </p>
            </motion.div>

            {/* Hand-drawn scribble overlay on main image */}
            <svg
              className="absolute top-4 right-4 w-16 h-16 text-white z-20 opacity-70 animate-pulse-slow"
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path
                d="M50,10 C60,30 80,40 50,70 C30,90 20,60 50,40"
                strokeDasharray="4,4"
              />
              <circle cx="50" cy="50" r="40" strokeDasharray="5,10" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
