"use client";

/**
 * Back-in-stock alert, shown on the PDP only when a wholesale style is sold out.
 *
 * Captures lost B2B demand with a single email field. The optional size comes
 * from the selected ratio context when present. Styled in the cover's
 * vocabulary — cream paper, brown-black ink, one vermilion — so it reads as a
 * ruled note on the same sheet rather than a widget dropped onto it.
 */

import { useState } from "react";
import { useUser } from "@/lib/auth/client";

export default function StockAlertForm({
  handle,
  size,
}: {
  handle: string;
  /** Currently selected size, if any — null registers for any size. */
  size: string | null;
}) {
  const { user } = useUser();
  const [email, setEmail] = useState(
    user?.primaryEmailAddress?.emailAddress ?? "",
  );
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (state === "sending") return;
    setError(null);
    setState("sending");
    try {
      const res = await fetch("/api/stock-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, product_handle: handle, size }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save your alert. Please try again.");
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setError("Could not save your alert. Please try again.");
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <div className="mt-4 border border-home-rule bg-home-panel px-5 py-4">
        <p className="inline-flex items-center gap-2.5 text-[10px] font-extrabold uppercase tracking-[0.32em] text-home-vermilion">
          <span
            aria-hidden="true"
            className="h-[5px] w-[5px] rounded-full bg-home-vermilion"
          />
          Noted
        </p>
        <p className="mt-2.5 max-w-[46ch] text-[14px] leading-[1.6] text-home-ink-soft">
          We&apos;ll write to you when this style is back in wholesale sets
          {size ? ` in ${size}` : ""}.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 border border-home-rule bg-home-panel px-5 py-4"
    >
      <p className="inline-flex items-center gap-2.5 text-[10px] font-extrabold uppercase tracking-[0.32em] text-home-vermilion">
        <span
          aria-hidden="true"
          className="h-[5px] w-[5px] rounded-full bg-home-vermilion"
        />
        Tell me when it&apos;s back
      </p>
      <p className="mt-2.5 max-w-[46ch] text-[14px] leading-[1.6] text-home-ink-soft">
        Leave an address and we&apos;ll write the day this style is ready for
        wholesale sets{size ? ` in ${size}` : ""}.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourshop.in"
          aria-label="Email address for the back-in-stock alert"
          className="h-12 flex-1 border-0 border-b border-home-rule bg-transparent px-0 text-[14px] text-home-ink outline-none transition-colors duration-200 placeholder:text-home-ink-mute focus:border-home-ink"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="flex h-12 shrink-0 items-center justify-center bg-home-ink px-6 text-[11px] font-extrabold uppercase tracking-[0.16em] text-home-ground transition-opacity duration-200 hover:opacity-85 disabled:opacity-55"
        >
          {state === "sending" ? "Saving…" : "Notify me"}
        </button>
      </div>
      {error && (
        <p
          className="mt-3 text-[12px] text-home-vermilion"
          role="alert"
        >
          {error}
        </p>
      )}
    </form>
  );
}
