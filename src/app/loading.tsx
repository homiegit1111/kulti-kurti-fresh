"use client";

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-warm-white">
      <p
        aria-hidden
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 select-none pointer-events-none text-center text-[26vw] font-black uppercase leading-none tracking-[-0.06em] text-charcoal/[0.05] animate-pulse"
      >
        Loading
      </p>
      <div className="relative flex flex-col items-center gap-4">
        <span className="w-10 h-[2px] bg-accent-red animate-pulse" />
        <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-charcoal/50">
          Loading
        </p>
      </div>
    </div>
  );
}
