"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles } from "lucide-react";

/* ── Avatar gradient colors for social proof ── */
const AVATAR_GRADIENTS = [
  "from-gold to-gold-dark",
  "from-amber-400 to-amber-600",
  "from-stone-500 to-stone-700",
  "from-yellow-600 to-amber-700",
];

/* ── Component ── */
export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  }

  return (
    <section className="bg-warm-white px-6 py-24 md:py-32 lg:px-20">
      <div className="mx-auto max-w-5xl bg-charcoal text-white p-8 md:p-16 lg:p-20 relative overflow-hidden shadow-2xl">
        
        {/* Decorative Gold Accent Borders */}
        <div className="absolute inset-4 border border-gold/20 pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-[50px]" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gold/5 blur-[50px]" />

        <div className="relative z-10 mx-auto max-w-2xl text-center space-y-6">
          {/* Header Icon */}
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gold/10 border border-gold/30 text-gold animate-float">
            <Sparkles className="h-4 w-4" />
          </div>

          {/* Header */}
          <div className="space-y-2">
            <p className="text-[10px] font-sans uppercase tracking-[0.4em] text-gold font-semibold">
              Exclusive Privilege
            </p>
            <h2 className="font-serif text-3xl md:text-5xl text-white font-light tracking-wide">
              Join the <span className="font-serif italic font-normal text-gold">Inner Circle</span>
            </h2>
          </div>

          <p className="text-sm text-white/70 max-w-md mx-auto leading-relaxed font-light">
            Be the first to access limited-edition drops, private sales, and seasonal styling portfolios curated by our design house.
          </p>

          <div className="mx-auto h-px w-16 bg-gold/40" />

          {/* Email form / Success */}
          {submitted ? (
            <div className="animate-scale-in mx-auto max-w-md rounded-none border border-gold/30 bg-gold/5 px-6 py-8">
              <p className="font-serif text-lg text-gold italic">
                Welcome to the circle ✨
              </p>
              <p className="mt-2 text-xs text-white/60">
                You will receive your private invitation code via email shortly.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row items-stretch"
            >
              <div className="relative flex-1">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="h-12 w-full rounded-none border-white/20 bg-white/5 text-white placeholder:text-white/40 text-xs focus-visible:border-gold focus-visible:ring-0"
                />
              </div>
              <button
                type="submit"
                className="h-12 shrink-0 rounded-none bg-gold hover:bg-gold-dark text-white px-8 text-xs font-semibold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span>Request Invite</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* Social proof */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Avatar stack */}
            <div className="flex items-center">
              {AVATAR_GRADIENTS.map((gradient, idx) => (
                <div
                  key={idx}
                  className={`h-8 w-8 rounded-full border-2 border-charcoal bg-gradient-to-br ${gradient} ${
                    idx > 0 ? "-ml-2.5" : ""
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-white/50 tracking-wide font-light">
              Join <span className="text-gold font-medium">50,000+</span> luxury fashion patrons globally.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}

