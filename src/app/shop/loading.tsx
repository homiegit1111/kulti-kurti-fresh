import { Navbar } from "@/components/layout/navbar";

/**
 * /shop loading register (§4): a ghost ledger under a `.ledger-scan` sweep.
 * The keyframes live in globals.css behind prefers-reduced-motion — with
 * motion off, the ghost sits still. No animate-pulse, no masonry.
 */
export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-surface text-content">
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-5 pt-28 pb-24 md:px-10 lg:px-16 lg:pt-36">
        {/* Letterhead ghost */}
        <div className="h-3 w-56 bg-surface-hover" />
        <div className="mt-5 h-12 w-[min(38rem,100%)] bg-surface-hover lg:h-16" />
        <div className="mt-6 border-y border-line/25 py-2">
          <div className="h-3 w-72 max-w-full bg-surface-hover" />
        </div>

        {/* Ghost ledger + scan line */}
        <div className="relative mt-12 overflow-hidden">
          <div className="hidden gap-4 border-b border-line/25 py-3 pl-3 md:grid md:grid-cols-[3.5rem_minmax(0,1fr)_7rem_7.5rem_3rem_10rem]">
            <span />
            <span className="h-2 w-16 bg-surface-hover" />
            <span className="h-2 w-12 bg-surface-hover" />
            <span className="h-2 w-10 bg-surface-hover" />
            <span className="h-2 w-8 bg-surface-hover" />
            <span className="h-2 w-14 justify-self-end bg-surface-hover" />
          </div>
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-line/20 py-3 pl-3 md:grid-cols-[3.5rem_minmax(0,1fr)_7rem_7.5rem_3rem_10rem]"
            >
              <span className="aspect-[4/5] w-full bg-surface-hover" />
              <span className="flex flex-col gap-2">
                <span className="h-2.5 w-24 bg-surface-hover" />
                <span className="h-3 w-2/3 bg-surface-hover" />
              </span>
              <span className="hidden h-2.5 w-16 bg-surface-hover md:block" />
              <span className="hidden h-3 w-14 bg-surface-hover md:block" />
              <span className="hidden h-2.5 w-8 bg-surface-hover md:block" />
              <span className="h-7 w-24 justify-self-end border border-line/20" />
            </div>
          ))}
          <div
            aria-hidden="true"
            className="ledger-scan pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-b from-transparent via-content/5 to-transparent"
          />
        </div>
      </main>
    </div>
  );
}
