import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      <Navbar />

      <main className="flex-1 bg-[#fcfbf9] relative pt-32 pb-24 min-h-screen flex flex-col items-center justify-center">
        {/* Subtle Background Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] bg-orange-300/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-5xl mx-auto px-6 w-full relative z-10">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-4 h-[1px] bg-gold"></span>
              <span className="text-[9px] uppercase tracking-[0.3em] text-gold font-bold">
                About Us
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-charcoal mb-5 tracking-tight leading-[1.1]">
              Preserving the past, <br />
              <span className="text-charcoal/40 italic font-light">
                sculpting the future.
              </span>
            </h1>
            <p className="text-sm md:text-base text-charcoal/60 max-w-md mx-auto font-light leading-relaxed">
              Rangat Pehnawa bridges historic Indian craftsmanship with
              contemporary, minimalist luxury.
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 h-auto md:h-[550px]">
            {/* Left Large Image (Founder) */}
            <div className="md:col-span-6 bg-charcoal rounded-[2rem] overflow-hidden relative h-[400px] md:h-full group shadow-sm">
              {/* Studio Wall Background with Spotlight effect */}
              <div className="absolute inset-0 bg-charcoal overflow-hidden z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_#2a2a2a_0%,_transparent_70%)]" />
              </div>

              {/* Physical Studio Text on Wall */}
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-24 md:pb-28 px-4 overflow-hidden pointer-events-none z-0 transition-transform duration-[2s] group-hover:scale-[1.02] w-full text-center">
                {/* PEHNAWA */}
                <span
                  className="text-[40px] md:text-[50px] lg:text-[65px] font-sans font-black uppercase text-white tracking-[0.2em] leading-none ml-2 lg:ml-3 mb-2"
                  style={{
                    textShadow:
                      "0 15px 35px rgba(0,0,0,0.8), 0 2px 5px rgba(0,0,0,0.5)",
                  }}
                >
                  PEHNAWA
                </span>

                {/* RANGAT */}
                <span
                  className="text-[28px] md:text-[35px] lg:text-[45px] font-sans font-bold uppercase text-white tracking-[0.3em] leading-none ml-2 lg:ml-3 opacity-90"
                  style={{
                    textShadow:
                      "0 15px 35px rgba(0,0,0,0.8), 0 2px 5px rgba(0,0,0,0.5)",
                  }}
                >
                  RANGAT
                </span>
              </div>

              {/* Foreground Founder Image (Transparent Background) */}
              <Image
                src="/images/foundernew.png"
                alt="Harsh Jangid - Founder of Rangat Pehnawa"
                fill
                className="object-cover object-bottom grayscale relative z-10 transition-all duration-[1.5s] ease-out drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/20 to-transparent pointer-events-none z-20" />

              <div className="absolute bottom-8 left-8 text-white z-30">
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/50 mb-1">
                  Founder
                </p>
                <p className="text-2xl font-serif italic text-white tracking-wide">
                  Harsh Jangid
                </p>
              </div>
            </div>

            {/* Right Column (2 Stacked Blocks) */}
            <div className="md:col-span-6 flex flex-col gap-4 lg:gap-6">
              {/* Top Block: Quote / Vision */}
              <div className="flex-1 bg-white rounded-[2rem] p-8 md:p-12 flex flex-col justify-center border border-charcoal/5 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                <svg
                  className="absolute -top-4 -left-4 w-24 h-24 text-gold/10 -rotate-12 group-hover:rotate-0 transition-transform duration-700"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>

                <h3 className="text-xl md:text-2xl lg:text-3xl font-serif text-charcoal leading-snug relative z-10 mb-6">
                  &quot;We don&apos;t just sell clothes; we curate a lifestyle
                  of modern elegance infused with heritage.&quot;
                </h3>
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-8 h-[1px] bg-gold" />
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-charcoal/50">
                    The Vision
                  </p>
                </div>
              </div>

              {/* Bottom Block: Contact / Atelier */}
              <div className="bg-charcoal text-warm-white rounded-[2rem] p-6 md:p-10 flex flex-col justify-center gap-6 border border-charcoal/10 relative overflow-hidden shadow-sm md:flex-[0.7]">
                {/* Subtle pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                  <svg width="100%" height="100%">
                    <pattern
                      id="bento-grid"
                      width="20"
                      height="20"
                      patternUnits="userSpaceOnUse"
                    >
                      <circle cx="2" cy="2" r="1" fill="currentColor" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#bento-grid)" />
                  </svg>
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="text-[10px] uppercase tracking-[0.3em] text-gold mb-2 md:mb-3 font-semibold">
                      The Atelier
                    </h4>
                    <p className="text-xs md:text-sm text-white/60 leading-relaxed font-light">
                      3rd Floor, NR Complex, 36,
                      <br />
                      Siddanna Ln, Cubbonpete,
                      <br />
                      Bengaluru 560002
                    </p>
                  </div>
                  <a
                    href="https://maps.app.goo.gl/ZRJ5Qda5iPvYxb868"
                    target="_blank"
                    rel="noreferrer"
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold hover:text-charcoal transition-colors shrink-0 mt-2 sm:mt-0"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-6 md:mt-8 relative z-10 border-t border-white/10 pt-6">
                  <a
                    href="tel:8660452247"
                    className="text-[10px] md:text-xs font-semibold uppercase tracking-widest text-white/70 hover:text-gold transition-colors"
                  >
                    8660452247
                  </a>
                  <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />
                  <a
                    href="mailto:rangatpehnawa@gmail.com"
                    className="text-[10px] md:text-xs font-semibold uppercase tracking-widest text-white/70 hover:text-gold transition-colors"
                  >
                    Email Us
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
