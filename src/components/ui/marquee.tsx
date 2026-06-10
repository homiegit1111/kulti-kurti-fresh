"use client";

import Image from "next/image";

export function Marquee() {
  const content = (
    <>
      <span className="mx-8 font-serif italic text-6xl md:text-8xl lg:text-[140px] uppercase tracking-tighter text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.5)] lg:[-webkit-text-stroke:2px_rgba(255,255,255,0.6)] opacity-90">
        Handcrafted Luxury
      </span>
      <span className="text-gold text-4xl lg:text-6xl mx-4">&bull;</span>
      <span className="mx-8 font-serif italic text-6xl md:text-8xl lg:text-[140px] uppercase tracking-tighter text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.5)] lg:[-webkit-text-stroke:2px_rgba(255,255,255,0.6)] opacity-90">
        Timeless Elegance
      </span>
      <span className="text-gold text-4xl lg:text-6xl mx-4">&bull;</span>
      <span className="mx-8 font-serif italic text-6xl md:text-8xl lg:text-[140px] uppercase tracking-tighter text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.5)] lg:[-webkit-text-stroke:2px_rgba(255,255,255,0.6)] opacity-90">
        Artisanal Excellence
      </span>
      <span className="text-gold text-4xl lg:text-6xl mx-4">&bull;</span>
    </>
  );

  return (
    <div className="content-auto w-full overflow-hidden py-16 md:py-32 flex items-center relative z-0 border-y border-charcoal/10 bg-charcoal">
      {/* ── LIVE VIDEO / DYNAMIC BACKGROUND ── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* High-res aesthetic fallback image that scales slowly to feel "alive" if video fails */}
        <Image
          src="https://images.unsplash.com/photo-1605367302482-19e4871ba826?q=80&w=2000&auto=format&fit=crop"
          alt="Artisanal Weaving"
          fill
          className="object-cover opacity-40 scale-110"
          style={{
            willChange: "transform",
            transform: "translateZ(0) scale(1.1)",
          }}
          sizes="100vw"
        />

        {/* Local MP4 Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
        >
          <source src="/videos/background.mp4" type="video/mp4" />
        </video>

        {/* Gradient Overlay to ensure the hollow white text pops powerfully */}
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/80 via-charcoal/50 to-charcoal/80" />
      </div>

      {/* ── SCROLLING TEXT ── */}
      <div className="flex w-max animate-marquee whitespace-nowrap relative z-10 will-change-transform">
        {[0, 1].map((item) => (
          <div key={item} className="flex items-center">
            {content}
          </div>
        ))}
      </div>
    </div>
  );
}
