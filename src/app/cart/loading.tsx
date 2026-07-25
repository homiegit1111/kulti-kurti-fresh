"use client";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function CartLoading() {
  return (
    <>
      <Navbar />
      <main className="flex-1 relative z-10 bg-warm-white pt-28 lg:pt-32 pb-24 min-h-screen">
        <div className="px-6 lg:px-20">
          {/* Header Skeleton */}
          <div className="mb-12 flex flex-col">
            <div className="w-12 h-[2px] bg-accent-red mb-4 animate-pulse" />
            <div className="w-64 h-12 md:h-16 bg-charcoal/5 animate-pulse" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Items Skeleton */}
            <div className="lg:col-span-2">
              <div className="hidden md:block h-6 w-full bg-charcoal/5 mb-6 animate-pulse" />

              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 border-b border-charcoal/5 pb-6">
                    <div className="w-20 h-24 bg-charcoal/5 animate-pulse shrink-0" />
                    <div className="flex-1 flex flex-col gap-2 justify-center">
                      <div className="w-48 h-5 bg-charcoal/5 animate-pulse" />
                      <div className="w-24 h-3 bg-charcoal/5 animate-pulse" />
                      <div className="w-32 h-4 bg-charcoal/5 animate-pulse mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary Skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-charcoal/5 p-8 animate-pulse h-96" />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
