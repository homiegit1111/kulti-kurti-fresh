"use client";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function AboutLoading() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-warm-white relative pt-32 pb-24 min-h-screen flex flex-col items-center justify-center">
        <div className="max-w-5xl mx-auto px-6 w-full relative z-10">
          
          {/* Header Skeleton */}
          <div className="text-center mb-12 flex flex-col items-center">
            <div className="w-12 h-[2px] bg-line/40 mb-4" />
            <div className="w-64 md:w-96 h-12 md:h-16 bg-surface-hover mb-5" />
            <div className="w-48 h-4 bg-surface-hover" />
          </div>

          {/* Bento Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 h-auto md:h-[550px]">
            
            {/* Left Large Skeleton */}
            <div className="md:col-span-6 bg-surface-hover overflow-hidden relative h-[400px] md:h-full" />

            {/* Right Column (2 Stacked Blocks Skeleton) */}
            <div className="md:col-span-6 flex flex-col gap-4 lg:gap-6">
              <div className="flex-1 bg-surface-hover p-8 md:p-12" />
              <div className="flex-[0.7] bg-surface-hover p-8 md:p-10" />
            </div>
            
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
