"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
  type Variants,
} from "framer-motion";
import { useRef, useState, useEffect } from "react";

export default function Hero() {
  const containerRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(true);

  useEffect(() => {
    // Hide the hint after 5 seconds
    const timer = setTimeout(() => {
      setShowScrollHint(false);
    }, 5000);

    // Also hide the hint immediately if the user scrolls
    const handleScroll = () => {
      if (window.scrollY > 20) setShowScrollHint(false);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const rawY1 = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
  const rawY2 = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
  // Spring smoothing removes high-frequency scroll jitter for 120fps feel
  const imgY1 = useSpring(rawY1, { stiffness: 80, damping: 20, mass: 0.5 });
  const imgY2 = useSpring(rawY2, { stiffness: 80, damping: 20, mass: 0.5 });

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 30, opacity: 0, filter: "blur(4px)" },
    visible: {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden pt-24 lg:pt-0 flex items-center"
    >
      <div className="relative z-10 w-full px-6 lg:px-20 py-12 lg:py-0">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8 items-center">
          {/* ── Left Column: Editorial Typography ── */}
          <motion.div
            className="lg:col-span-6 space-y-6 md:space-y-8 text-left"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-3"
            >
              <span className="h-px w-8 bg-gold animate-slide-in-left" />
              <p className="text-xs font-sans uppercase tracking-[0.4em] text-gold font-semibold">
                The Summer Edit 2026
              </p>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-[1.1] text-charcoal font-light"
            >
              Redefine <br />
              <span className="font-serif italic text-gold font-normal">
                Your Elegance
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="max-w-md text-sm md:text-base text-muted-foreground leading-relaxed"
            >
              Where time-honored Indian craftsmanship meets contemporary
              silhouettes. Discover handcrafted pieces designed for the modern
              connoisseur.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-wrap gap-4 pt-4"
            >
              <Link
                href="/shop"
                className="group relative inline-flex min-h-12 items-center justify-between gap-4 bg-charcoal px-8 py-4 text-xs font-semibold uppercase tracking-widest text-white transition-all duration-300 hover:bg-gold active:scale-[0.99] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-warm-white"
              >
                <span>Shop The Collection</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-2" />
              </Link>
              <Link
                href="/collections"
                className="inline-flex min-h-12 items-center justify-center border border-charcoal/20 px-8 py-4 text-xs font-semibold uppercase tracking-widest text-charcoal transition-all duration-300 hover:border-charcoal hover:bg-charcoal/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
              >
                Explore Collections
              </Link>
            </motion.div>

            {/* Quick stats / trust points */}
            <motion.div
              variants={itemVariants}
              className="pt-8 mt-4 grid grid-cols-3 gap-4"
            >
              <div>
                <p className="font-serif text-xl md:text-2xl text-charcoal font-semibold">
                  100%
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                  Handcrafted
                </p>
              </div>
              <div>
                <p className="font-serif text-xl md:text-2xl text-charcoal font-semibold">
                  Pure
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                  Luxe Fabrics
                </p>
              </div>
              <div>
                <p className="font-serif text-xl md:text-2xl text-charcoal font-semibold">
                  Global
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                  Free Delivery
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* ── Right Column: Asymmetric Overlapping Images ── */}
          <div className="lg:col-span-6 relative h-[450px] sm:h-[550px] lg:h-[650px] w-full flex items-center justify-center">
            {/* Background Accent Shape */}
            <div className="absolute right-0 bottom-10 w-[75%] h-[80%] bg-warm-gray pointer-events-none -z-10" />

            {/* Main Image (Floating Right) */}
            <motion.div
              style={{
                y: imgY1,
                willChange: "transform",
                backfaceVisibility: "hidden",
              }}
              className="absolute right-0 top-0 w-[70%] h-[80%] overflow-hidden shadow-2xl"
            >
              <Image
                src="/images/hero.png"
                alt="Rangat Pehnawa Luxury Kurta"
                fill
                priority
                className="object-cover transition-transform duration-700 hover:scale-105"
                sizes="(max-width: 1024px) 70vw, 35vw"
              />
            </motion.div>

            {/* Inset Overlapping Image (Bottom Left) */}
            <motion.div
              style={{
                y: imgY2,
                willChange: "transform",
                backfaceVisibility: "hidden",
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 1 }}
              className="absolute left-0 bottom-0 w-[45%] h-[55%] overflow-hidden border-8 border-warm-white shadow-2xl"
            >
              <Image
                src="/images/product-1.png"
                alt="Detail Craftsmanship"
                fill
                priority
                className="object-cover transition-transform duration-700 hover:scale-110"
                sizes="(max-width: 1024px) 45vw, 20vw"
              />
            </motion.div>

            {/* Accent tag badge */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="absolute right-4 bottom-24 bg-white/95 backdrop-blur px-6 py-4 shadow-lg border border-gold/10 hidden md:block"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Artisanal Choice
              </p>
              <p className="font-serif text-sm font-semibold text-charcoal mt-1">
                Chanderi Sage Suit
              </p>
              <Link
                href="/shop/sage-chanderi-kurta"
                className="text-[10px] text-gold hover:text-gold-dark mt-2 block underline"
              >
                View Details
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modern, Dope Scroll Indicator (Auto-hides after 5s or on scroll) */}
      <AnimatePresence>
        {showScrollHint && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 1 }}
            role="button"
            tabIndex={0}
            aria-label="Scroll to explore"
            className="fixed bottom-12 md:bottom-16 left-1/2 z-[999] -translate-x-1/2 flex items-center gap-4 bg-white/70 backdrop-blur-md border border-white/50 px-5 py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.1)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
            onClick={() => {
              setShowScrollHint(false);
              window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setShowScrollHint(false);
                window.scrollTo({
                  top: window.innerHeight,
                  behavior: "smooth",
                });
              }
            }}
          >
            <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-charcoal font-bold whitespace-nowrap">
              Swipe to Explore
            </span>
            <div className="w-5 h-8 rounded-full border-2 border-charcoal/30 flex justify-center p-[2px] relative overflow-hidden bg-white/50">
              <motion.div
                animate={{ y: [0, 14, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  ease: "easeInOut",
                }}
                className="w-1.5 h-1.5 bg-charcoal rounded-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
