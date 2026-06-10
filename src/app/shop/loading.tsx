"use client";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function ShopLoading() {
  return (
    <>
      <Navbar />
      <main className="flex-1 relative z-10 bg-[#fcfbf9] pt-28 lg:pt-32 overflow-hidden min-h-screen">
        {/* Header Skeleton */}
        <div className="px-4 lg:px-20 mb-10 flex flex-col items-center text-center relative z-10">
          <div className="h-[1px] w-12 bg-charcoal/10 mb-4 animate-pulse" />
          <div className="w-64 h-16 md:h-24 bg-charcoal/5 rounded-2xl animate-pulse mb-4" />
        </div>

        {/* Toolbar Skeleton */}
        <div className="px-6 lg:px-20 mb-12 flex flex-col md:flex-row items-center justify-between gap-8 border-b border-charcoal/5 pb-6">
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-24 h-10 bg-charcoal/5 rounded-full animate-pulse"
              />
            ))}
          </div>
          <div className="w-32 h-10 bg-charcoal/5 rounded-full animate-pulse" />
        </div>

        {/* Masonry Grid Skeleton */}
        <div className="px-3 md:px-6 lg:px-20 pb-24 columns-2 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 md:gap-6 space-y-3 md:space-y-6">
          {[...Array(8)].map((_, idx) => {
            const heights = [
              "h-[250px] md:h-[450px]",
              "h-[320px] md:h-[550px]",
              "h-[400px] md:h-[650px]",
            ];
            const heightClass = heights[idx % 3];

            return (
              <div
                key={idx}
                className={`break-inside-avoid w-full rounded-[2rem] bg-charcoal/5 animate-pulse ${heightClass}`}
              />
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
