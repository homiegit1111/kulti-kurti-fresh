"use client";

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-white">
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <p className="font-serif text-sm tracking-[0.3em] uppercase text-gold animate-pulse">Loading</p>
      </div>
    </div>
  );
}
