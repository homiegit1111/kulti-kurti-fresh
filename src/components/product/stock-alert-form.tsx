"use client";

/**
 * Back-in-stock / size alert — shown on the PDP when a piece is sold out.
 *
 * Captures lost demand: a single editorial email field (pre-filled for
 * signed-in clients) registering against /api/stock-alerts. The optional
 * size comes from the size selector so "notify me for an M" just works.
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
      const data = await res.json().catch(() => ({}));
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
      <div className="panel-luxe p-6 mt-6">
        <p className="eyebrow eyebrow--bare mb-2">Noted</p>
        <p className="font-serif text-lg font-light">
          We&apos;ll write to you the moment it returns
          {size ? ` in size ${size}` : ""}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="frame-luxe p-6 lg:p-8 mt-6">
      <p className="eyebrow eyebrow--bare mb-2">Sold Out — For Now</p>
      <p className="font-serif text-lg font-light leading-snug">
        Be first to know when this piece{" "}
        <em className="italic">returns{size ? ` in ${size}` : ""}</em>
      </p>
      <div className="flex flex-col sm:flex-row gap-4 mt-5">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          aria-label="Email address for the back-in-stock alert"
          className="field-luxe flex-1"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="btn-luxe whitespace-nowrap"
        >
          {state === "sending" ? "Saving…" : "Notify me"}
        </button>
      </div>
      {error && (
        <p className="text-xs tracking-wide text-red-700 mt-3" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
