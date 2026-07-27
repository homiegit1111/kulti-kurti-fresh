/**
 * TEMPORARY preview route for the Instagram "thread" section.
 *
 * It exists only so the section can be looked at while another change is in
 * flight on the homepage file that will host it. Delete this route once the
 * section is mounted for real.
 */
import { InstagramThread } from "@/components/sections/instagram-thread";

export const metadata = { robots: { index: false, follow: false } };

export default function ThreadPreviewPage() {
  return (
    <main className="min-h-screen bg-home-ground px-6 py-20 text-home-ink sm:px-12 lg:px-20">
      <div className="mx-auto max-w-[1200px]">
        <header className="border-b border-home-rule pb-6">
          <p className="inline-flex items-center gap-2.5 text-[10px] font-extrabold uppercase tracking-[0.36em] text-home-vermilion">
            <span
              aria-hidden="true"
              className="h-[5px] w-[5px] rounded-full bg-home-vermilion"
            />
            On Instagram
          </p>
          <h1 className="mt-3 font-editorial text-[clamp(1.6rem,2.6vw,2.3rem)] font-light leading-[1.14]">
            Rack shots,{" "}
            <span className="font-semibold italic text-home-vermilion">
              as they go up.
            </span>
          </h1>
        </header>

        <InstagramThread className="mt-14" />
      </div>
    </main>
  );
}
