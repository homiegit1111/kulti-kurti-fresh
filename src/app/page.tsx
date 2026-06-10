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
        {/* Global Homepage Doodles & Aesthetic Space Fillers */}
        <div className="absolute inset-0 z-0 pointer-events-none hidden lg:block">
          {/* Top-Right looping arrow */}
          <svg
            className="absolute right-[-2%] lg:right-[5%] top-[12%] w-48 h-48 lg:w-64 lg:h-64 text-charcoal/30 -rotate-12"
            viewBox="0 0 200 200"
            fill="none"
            style={{ willChange: "transform", transform: "translateZ(0)" }}
          >
            <path
              d="M50 150 Q 150 180 180 50 T 50 150"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="5 5"
              fill="none"
            />
            <path
              d="M40 140 L 50 150 L 65 145"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <text
              x="120"
              y="80"
              fontFamily="cursive"
              fontSize="14"
              fill="currentColor"
              className="opacity-80 rotate-12"
            >
              Handcrafted
            </text>
          </svg>

          {/* Abstract soft blob for warmth near Collections */}
          <div 
            className="absolute left-[-10%] top-[25%] w-96 h-96 bg-orange-300/30 rounded-full blur-[80px]" 
            style={{ willChange: "transform", transform: "translateZ(0)" }}
          />

          {/* Dotted spinning trail */}
          <svg
            className="absolute left-[5%] lg:left-[15%] top-[30%] w-32 h-32 lg:w-48 lg:h-48 text-charcoal/25 animate-[spin_60s_linear_infinite]"
            viewBox="0 0 100 100"
            fill="none"
            style={{ willChange: "transform", transform: "translateZ(0)" }}
          >
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 8"
            />
            <circle
              cx="50"
              cy="50"
              r="30"
              stroke="currentColor"
              strokeWidth="0.5"
            />
          </svg>

          {/* Fun little starburst near Founder Fav */}
          <svg
            className="absolute right-[2%] lg:right-[10%] top-[65%] w-24 h-24 lg:w-32 lg:h-32 text-charcoal/30"
            viewBox="0 0 100 100"
            fill="none"
            style={{ willChange: "transform", transform: "translateZ(0)" }}
          >
            <path
              d="M50 10 L 50 90 M 10 50 L 90 50 M 20 20 L 80 80 M 20 80 L 80 20"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <circle
              cx="50"
              cy="50"
              r="10"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
            <text
              x="50"
              y="85"
              fontFamily="cursive"
              fontSize="12"
              fill="currentColor"
              textAnchor="middle"
              className="opacity-80 rotate-6"
            >
              Vibes
            </text>
          </svg>

          {/* Architectural grid floating near the bottom Heritage section */}
          <svg
            className="absolute left-[-5%] lg:left-[20%] bottom-[5%] w-[400px] h-[400px] lg:w-[600px] lg:h-[600px] text-charcoal/15"
            viewBox="0 0 100 100"
            style={{ willChange: "transform", transform: "translateZ(0)" }}
          >
            <pattern
              id="home-grid"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 10 0 L 0 0 0 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </pattern>
            <rect width="100" height="100" fill="url(#home-grid)" />
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
