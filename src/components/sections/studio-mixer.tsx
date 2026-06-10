"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MatchResult {
  silhouette: string;
  craft: string;
  occasion: string;
  name: string;
  image: string;
  price: number;
  description: string;
  designerNote: string;
  swatchName: string;
  swatchColor: string;
}

const MATCHER_DATABASE: MatchResult[] = [
  {
    silhouette: "Anarkali",
    craft: "Chanderi Loom",
    occasion: "Festive Sangeet",
    name: "Ivory Silk Anarkali Suit",
    image: "/images/product-2.png",
    price: 6999,
    description: "Handloomed silk with high flares and heavy golden borders.",
    designerNote:
      "Anarkali suits woven on Chanderi looms bring majestic flare to Sangeets. The lightweight silk shines under warm lights, providing luxury without weight.",
    swatchName: "Royal Ivory Silk",
    swatchColor: "#FFFFF0",
  },
  {
    silhouette: "Kurta Suit",
    craft: "Handblock Print",
    occasion: "Summer Brunch",
    name: "Terracotta Block Print Set",
    image: "/images/product-4.png",
    price: 3799,
    description: "Organic cotton hand-pressed using traditional teak blocks.",
    designerNote:
      "A terracotta hue captures sunlit noon vibes. The breathable natural cotton keeps you exceptionally cool for outdoor summer brunches.",
    swatchName: "Teak Terracotta",
    swatchColor: "#C75B3A",
  },
  {
    silhouette: "Kurta Suit",
    craft: "Chanderi Loom",
    occasion: "Daily Luxury",
    name: "Sage Chanderi Kurta Set",
    image: "/images/product-1.png",
    price: 4299,
    description: "Premium cotton-silk blend with fine gold hand-embroidery.",
    designerNote:
      "Sage Chanderi provides a subtle pastel luster, blending low-profile luxury into daily routines. Easy to drape, breathable, and instantly classic.",
    swatchName: "Champagne Sage",
    swatchColor: "#B2BFA8",
  },
  {
    silhouette: "Kurta Suit",
    craft: "Mirror Work",
    occasion: "Festive Sangeet",
    name: "Navy Mirror Work Kurta Set",
    image: "/images/product-3.png",
    price: 5499,
    description: "Deep indigo silk embedded with hand-stitched mirrors.",
    designerNote:
      "Midnight Navy combined with reflective mirrors mimics the clear star-filled skies of Rajasthan. Perfect for capturing celebratory moments.",
    swatchName: "Starry Indigo",
    swatchColor: "#1B2A4A",
  },
  {
    silhouette: "Co-ord Set",
    craft: "Silk Zari",
    occasion: "Midnight Gala",
    name: "Forest Embroidered Co-ord",
    image: "/images/product-2.png",
    price: 5299,
    description:
      "Structured modern silhouette accented with fine gold threads.",
    designerNote:
      "Co-ord sets are modern silhouettes. Infused with traditional Zari embroidery, they serve as the perfect transition piece for evening galas.",
    swatchName: "Zari Forest Green",
    swatchColor: "#2D5A27",
  },
  {
    silhouette: "Saree",
    craft: "Handblock Print",
    occasion: "Summer Brunch",
    name: "Terracotta Block Print Saree",
    image: "/images/product-4.png",
    price: 3799,
    description: "Classic hand block print saree with a contemporary border.",
    designerNote:
      "A cotton saree is a summer masterpiece. The rustic handblock prints look incredibly chic when styled for high-society day brunches.",
    swatchName: "Rustic Block Print",
    swatchColor: "#C75B3A",
  },
];

export default function StudioMixer() {
  const [selectedSilhouette, setSelectedSilhouette] = useState("Kurta Suit");
  const [selectedCraft, setSelectedCraft] = useState("Chanderi Loom");
  const [selectedOccasion, setSelectedOccasion] = useState("Festive Sangeet");
  const [isSpinning, setIsSpinning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Find matches, default fallback to first item
  const findMatch = (): MatchResult => {
    const match = MATCHER_DATABASE.find(
      (m) =>
        m.silhouette === selectedSilhouette ||
        m.craft === selectedCraft ||
        m.occasion === selectedOccasion,
    );
    return match || MATCHER_DATABASE[0];
  };

  const currentMatch = findMatch();

  const triggerMixEffect = () => {
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
    }

    setIsSpinning(true);
    spinTimeoutRef.current = setTimeout(() => {
      setIsSpinning(false);
      spinTimeoutRef.current = null;
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  return (
    <section className="hidden md:block bg-charcoal text-white relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-gold filter blur-[120px]" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-amber-600 filter blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-20">
        {/* The Expand Trigger */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full group flex items-center justify-between py-12 md:py-16 focus:outline-none"
        >
          <div className="text-left">
            <p className="text-[10px] font-sans uppercase tracking-[0.4em] text-gold font-semibold mb-2">
              The Interactive Atelier
            </p>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-light">
              Enter{" "}
              <span className="font-serif italic font-normal text-gold">
                Rangat Studio
              </span>
            </h2>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-[9px] uppercase tracking-widest text-gold font-semibold opacity-70 group-hover:opacity-100 transition-opacity">
              {isExpanded ? "Close Studio" : "Expand to mix & match"}
            </span>
            <div className="flex items-center gap-0">
              <div
                className={`h-[1px] bg-gold transition-all duration-700 ease-out ${isExpanded ? "w-12" : "w-24 md:w-48 group-hover:w-64"}`}
              />
              <ArrowRight
                className={`h-4 w-4 text-gold transition-transform duration-700 ease-out ${isExpanded ? "rotate-90" : "group-hover:translate-x-2"}`}
              />
            </div>
          </div>
        </button>

        {/* Collapsible Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
              className="overflow-hidden"
            >
              <div className="pb-24">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
                  <div className="inline-flex items-center gap-3">
                    <span className="h-[1px] w-6 bg-gold" />
                    <p className="text-[10px] font-sans uppercase tracking-[0.4em] text-gold font-semibold">
                      The Interactive Atelier
                    </p>
                    <span className="h-[1px] w-6 bg-gold" />
                  </div>
                  <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light">
                    The{" "}
                    <span className="font-serif italic font-normal text-gold">
                      Rangat Studio
                    </span>
                  </h2>
                  <p className="text-sm text-white/60 leading-relaxed font-light">
                    Mix and match silhouettes, traditional crafts, and moods to
                    see our design workshop recommend your signature look.
                  </p>
                </div>

                {/* Mixer Board Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
                  {/* Left panel: Controls (Atelier Dialers) */}
                  <div className="lg:col-span-6 flex flex-col justify-between bg-white/5 border border-white/10 p-8 md:p-12 relative">
                    <div className="absolute inset-2 border border-white/5 pointer-events-none" />

                    <div className="space-y-10 relative z-10">
                      {/* Silhouette Selection */}
                      <div className="space-y-4">
                        <p className="text-[10px] uppercase tracking-widest text-gold font-semibold">
                          01. Select Silhouette
                        </p>
                        <div className="flex flex-wrap gap-2.5">
                          {[
                            "Kurta Suit",
                            "Anarkali",
                            "Co-ord Set",
                            "Saree",
                          ].map((item) => (
                            <button
                              key={item}
                              onClick={() => {
                                setSelectedSilhouette(item);
                                triggerMixEffect();
                              }}
                              className={`px-4 py-2 text-xs uppercase tracking-widest border transition-all duration-300 ${
                                selectedSilhouette === item
                                  ? "bg-gold border-gold text-white"
                                  : "border-white/10 hover:border-white/40 text-white/70"
                              }`}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Craft Selection */}
                      <div className="space-y-4">
                        <p className="text-[10px] uppercase tracking-widest text-gold font-semibold">
                          02. Select Craft Technique
                        </p>
                        <div className="flex flex-wrap gap-2.5">
                          {[
                            "Chanderi Loom",
                            "Handblock Print",
                            "Mirror Work",
                            "Silk Zari",
                          ].map((item) => (
                            <button
                              key={item}
                              onClick={() => {
                                setSelectedCraft(item);
                                triggerMixEffect();
                              }}
                              className={`px-4 py-2 text-xs uppercase tracking-widest border transition-all duration-300 ${
                                selectedCraft === item
                                  ? "bg-gold border-gold text-white"
                                  : "border-white/10 hover:border-white/40 text-white/70"
                              }`}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Occasion Selection */}
                      <div className="space-y-4">
                        <p className="text-[10px] uppercase tracking-widest text-gold font-semibold">
                          03. Select Vibe / Occasion
                        </p>
                        <div className="flex flex-wrap gap-2.5">
                          {[
                            "Summer Brunch",
                            "Festive Sangeet",
                            "Midnight Gala",
                            "Daily Luxury",
                          ].map((item) => (
                            <button
                              key={item}
                              onClick={() => {
                                setSelectedOccasion(item);
                                triggerMixEffect();
                              }}
                              className={`px-4 py-2 text-xs uppercase tracking-widest border transition-all duration-300 ${
                                selectedOccasion === item
                                  ? "bg-gold border-gold text-white"
                                  : "border-white/10 hover:border-white/40 text-white/70"
                              }`}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Mixer utility instructions */}
                    <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/40 relative z-10">
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-gold" /> Click any
                        combination above
                      </span>
                      <span>Rangat Studio v1.2</span>
                    </div>
                  </div>

                  {/* Right panel: Live Recommendation Output */}
                  <div className="lg:col-span-6 flex bg-white text-charcoal border border-gold/15 shadow-2xl relative overflow-hidden min-h-[480px]">
                    {isSpinning ? (
                      <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-4">
                        <RefreshCw className="h-8 w-8 text-gold animate-spin" />
                        <p className="font-serif italic text-sm text-gold">
                          Consulting Design House...
                        </p>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-12 w-full">
                      {/* Product preview image */}
                      <div className="md:col-span-5 relative min-h-[250px] md:min-h-full bg-warm-gray">
                        <Image
                          src={currentMatch.image}
                          alt={currentMatch.name}
                          fill
                          className="object-cover transition-all duration-700 hover:scale-105"
                          sizes="(max-width: 1024px) 100vw, 20vw"
                        />
                      </div>

                      {/* Recommendation details */}
                      <div className="md:col-span-7 p-8 flex flex-col justify-between space-y-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <p className="text-[9px] uppercase tracking-widest text-gold font-semibold">
                                Your Signature Look
                              </p>
                              <h3 className="font-serif text-2xl text-charcoal mt-1 leading-tight">
                                {currentMatch.name}
                              </h3>
                            </div>
                            <span className="font-serif text-lg text-gold font-medium shrink-0">
                              ₹{currentMatch.price.toLocaleString("en-IN")}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {currentMatch.description}
                          </p>

                          {/* Fabric Swatch Inspector */}
                          <div className="bg-warm-gray p-3 border border-charcoal/5 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-[8px] uppercase tracking-widest text-muted-foreground">
                                Texture Swatch
                              </p>
                              <p className="text-[10px] text-charcoal font-semibold mt-0.5">
                                {currentMatch.swatchName}
                              </p>
                            </div>
                            {/* Visual round swatch */}
                            <div
                              className="h-7 w-7 rounded-full border border-charcoal/10 shadow-inner shrink-0"
                              style={{
                                backgroundColor: currentMatch.swatchColor,
                              }}
                            />
                          </div>

                          {/* Designer advice block */}
                          <div className="border-l-2 border-gold pl-3 py-1 space-y-1">
                            <p className="text-[9px] uppercase tracking-widest text-gold font-semibold">
                              Designer Note
                            </p>
                            <p className="text-[11px] text-charcoal/80 leading-relaxed italic">
                              &ldquo;{currentMatch.designerNote}&rdquo;
                            </p>
                          </div>
                        </div>

                        {/* Call to action */}
                        <div className="pt-4 border-t border-charcoal/5">
                          <a
                            href={`/shop/${currentMatch.name.toLowerCase().replace(/ /g, "-")}`}
                            className="w-full group inline-flex items-center justify-between bg-charcoal text-white hover:bg-gold py-3.5 px-5 text-xs font-semibold uppercase tracking-widest transition-colors duration-300"
                          >
                            <span>Inspect Outfit & Shop</span>
                            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-2" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
