import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Hero from "@/components/sections/hero";
import { Marquee } from "@/components/ui/marquee";
import FeaturedProducts from "@/components/sections/featured-products";
import MobileTikTokFeed from "@/components/sections/mobile-tiktok-feed.lazy";
import FounderFav from "@/components/sections/founder-fav";
import Heritage from "@/components/sections/heritage";
import Collections from "@/components/sections/collections";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 relative z-10 bg-warm-white overflow-hidden">
        {/* Quiet editorial accents — hairline geometry, no noise */}
        <div className="absolute inset-0 z-0 pointer-events-none hidden lg:block">
          {/* Soft warm wash near Collections */}
          <div
            className="absolute left-[-12%] top-[24%] w-[480px] h-[480px] bg-gold/[0.07] rounded-full blur-[100px]"
            style={{ willChange: "transform", transform: "translateZ(0)" }}
          />

          {/* Slow-turning hairline ring */}
          <svg
            className="absolute right-[6%] top-[14%] w-44 h-44 text-gold/25 animate-[spin_90s_linear_infinite]"
            viewBox="0 0 100 100"
            fill="none"
            style={{ willChange: "transform", transform: "translateZ(0)" }}
          >
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeDasharray="2 6"
            />
            <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="0.5" />
          </svg>

          {/* Vertical hairline rule with diamond, near Founder Fav */}
          <svg
            className="absolute right-[8%] top-[62%] w-10 h-64 text-charcoal/15"
            viewBox="0 0 40 260"
            fill="none"
            style={{ willChange: "transform", transform: "translateZ(0)" }}
          >
            <line x1="20" y1="0" x2="20" y2="110" stroke="currentColor" strokeWidth="1" />
            <rect x="16" y="118" width="8" height="8" transform="rotate(45 20 122)" stroke="currentColor" strokeWidth="1" fill="none" />
            <line x1="20" y1="138" x2="20" y2="260" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>

        {/* Main Content wrapped to stay above the doodles */}
        <div className="relative z-10">
          <Hero />
          <Marquee />
          <Collections />
          <FeaturedProducts />
          <MobileTikTokFeed />
          <FounderFav />
          <Heritage />
        </div>
      </main>
      <Footer />
    </>
  );
}
