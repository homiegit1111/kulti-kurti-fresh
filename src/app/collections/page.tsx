"use client";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Collections from "@/components/sections/collections";

export default function CollectionsPage() {
  return (
    <div className="bg-[#fcfbf9] min-h-screen text-charcoal flex flex-col font-sans selection:bg-gold selection:text-white">
      <Navbar />
      
      <main className="flex-1 relative z-10 pt-24 lg:pt-32">
        {/* We reuse the exact same Collections component from the homepage */}
        <Collections />
      </main>
      
      <Footer />
    </div>
  );
}
