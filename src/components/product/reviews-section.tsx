"use client";

/**
 * BUYER NOTES — trade feedback with photos, on the PDP.
 *
 * Reads/writes /api/reviews. Ratings render as ink tally marks (vermilion is
 * the negative-only register — never a rating). Photo strips lead each note.
 * Signed-out visitors get a quiet invitation to sign in rather than a dead form.
 *
 * Set in the cover's vocabulary: vermilion dot eyebrow → light Fraunces line
 * closing in vermilion italic → hairline rule, then ruled entries on cream.
 * Nothing is a card.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@/lib/auth/client";

interface Review {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string;
  photo_urls: string[];
  created_at: string;
}

interface Summary {
  count: number;
  average: number;
}

/** Ink tally marks — five strokes, filled in ink, the rest faint. */
function Tally({
  value,
  size = "h-3",
  interactive = false,
  onSelect,
}: {
  value: number;
  size?: string;
  interactive?: boolean;
  onSelect?: (rating: number) => void;
}) {
  return (
    <div
      className="flex items-center gap-1"
      role={interactive ? "radiogroup" : undefined}
      aria-label={interactive ? "Select a rating" : `Rated ${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((mark) =>
        interactive ? (
          <button
            key={mark}
            type="button"
            role="radio"
            aria-checked={value === mark}
            aria-label={`${mark} of 5`}
            onClick={() => onSelect?.(mark)}
            className="flex h-11 w-6 items-center justify-center"
          >
            <span
              aria-hidden
              className={`block w-[2px] ${size} transition-colors duration-150 ${
                mark <= value
                  ? "bg-home-ink"
                  : "bg-home-rule hover:bg-home-ink-mute"
              } ${mark === 5 ? "-rotate-[24deg]" : ""}`}
            />
          </button>
        ) : (
          <span
            key={mark}
            aria-hidden
            className={`block w-[2px] ${size} ${
              mark <= value ? "bg-home-ink" : "bg-home-rule"
            } ${mark === 5 ? "-rotate-[24deg]" : ""}`}
          />
        ),
      )}
    </div>
  );
}

const FIELD =
  "w-full border-0 border-b border-home-rule bg-transparent px-0 py-3 text-[14px] text-home-ink outline-none transition-colors duration-200 placeholder:text-home-ink-mute focus:border-home-ink";

const LABEL = "font-trade text-[10px] tracking-[0.16em] text-home-ink-mute";

export default function ReviewsSection({ handle }: { handle: string }) {
  const { isSignedIn, user } = useUser();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary>({ count: 0, average: 0 });
  const [loaded, setLoaded] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reviews?handle=${encodeURIComponent(handle)}`)
      .then((res) =>
        res.ok
          ? (res.json() as Promise<{ reviews?: Review[]; summary?: Summary }>)
          : null,
      )
      .then((data) => {
        if (cancelled || !data) return;
        setReviews(data.reviews ?? []);
        setSummary(data.summary ?? { count: 0, average: 0 });
      })
      .catch(() => {
        /* reviews are an enhancement — fail silently */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    if (rating < 1) {
      setError("Please select a rating.");
      return;
    }
    if (body.trim().length < 10) {
      setError("Please share at least a sentence or two.");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("product_handle", handle);
      form.set("rating", String(rating));
      form.set("title", title.trim());
      form.set("body", body.trim());
      for (const photo of photos.slice(0, 3)) form.append("photos", photo);

      const res = await fetch("/api/reviews", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        reviews?: Review[];
        summary?: Summary;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not save your review. Please try again.");
        return;
      }
      setReviews(data.reviews ?? []);
      setSummary(data.summary ?? { count: 0, average: 0 });
      setFormOpen(false);
      setThanks(true);
      setRating(0);
      setTitle("");
      setBody("");
      setPhotos([]);
    } catch {
      setError("Could not save your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Until first load resolves, render nothing rather than a jumpy skeleton.
  if (!loaded) return null;

  return (
    <section aria-label="Buyer notes">
      <header className="border-b border-home-rule pb-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <p className="inline-flex items-center gap-2.5 text-[10px] font-extrabold uppercase tracking-[0.32em] text-home-vermilion">
              <span
                aria-hidden="true"
                className="h-[5px] w-[5px] rounded-full bg-home-vermilion"
              />
              Buyer notes
            </p>
            <h2 className="mt-3 font-editorial text-[clamp(1.6rem,2.6vw,2.3rem)] font-light leading-[1.14] tracking-[-0.01em]">
              What the trade said{" "}
              <span className="font-semibold italic text-home-vermilion">
                after it sold.
              </span>
            </h2>
            {summary.count > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <Tally value={Math.round(summary.average)} />
                <span className="text-[17px] font-semibold tabular-nums">
                  {summary.average.toFixed(1)}
                </span>
                <span className="font-trade text-[10px] tracking-[0.14em] text-home-ink-mute">
                  {summary.count} note{summary.count > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          {isSignedIn ? (
            !formOpen && (
              <button
                type="button"
                onClick={() => {
                  setThanks(false);
                  setFormOpen(true);
                }}
                className="inline-flex h-11 items-center rounded-full border border-home-ink/25 px-5 font-trade text-[11px] tracking-[0.06em] transition-colors duration-200 hover:border-home-ink hover:bg-home-ink hover:text-home-ground"
              >
                Add your note
              </button>
            )
          ) : (
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-full border border-home-ink/25 px-5 font-trade text-[11px] tracking-[0.06em] transition-colors duration-200 hover:border-home-ink hover:bg-home-ink hover:text-home-ground"
            >
              Sign in to add a note
            </Link>
          )}
        </div>
      </header>

      {thanks && (
        <p className="mt-8 max-w-[54ch] text-[15px] leading-[1.7] text-home-ink-soft">
          Thank you — your note helps the next buyer plan their rack.
        </p>
      )}

      {/* ── Write form ── */}
      {formOpen && (
        <form
          onSubmit={submit}
          className="mt-10 border border-home-rule bg-home-ground px-5 py-6 lg:px-8 lg:py-8"
        >
          <p className="inline-flex items-center gap-2.5 text-[10px] font-extrabold uppercase tracking-[0.32em] text-home-vermilion">
            <span
              aria-hidden="true"
              className="h-[5px] w-[5px] rounded-full bg-home-vermilion"
            />
            Your note
          </p>

          <div className="mt-7">
            <span className={LABEL}>Rating</span>
            <div className="mt-1">
              <Tally value={rating} size="h-5" interactive onSelect={setRating} />
            </div>
          </div>

          <div className="mt-6">
            <label className={LABEL} htmlFor="review-title">
              Title (optional)
            </label>
            <input
              id="review-title"
              type="text"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="One line that says it all"
              className={FIELD}
            />
          </div>

          <div className="mt-6">
            <label className={LABEL} htmlFor="review-body">
              What happened on your rack
            </label>
            <textarea
              id="review-body"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Fabric, customer response, reorder potential, merchandising notes."
              className={`${FIELD} resize-none`}
            />
          </div>

          <div className="mt-6">
            <span className={LABEL}>Photos (up to 3)</span>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-11 items-center rounded-full border border-home-ink/25 px-5 font-trade text-[11px] tracking-[0.06em] transition-colors duration-200 hover:border-home-ink hover:bg-home-ink hover:text-home-ground"
              >
                Add photos
              </button>
              {photos.length > 0 && (
                <span className="font-trade text-[10px] tracking-[0.14em] text-home-ink-mute">
                  {photos.length} selected
                </span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={(e) =>
                  setPhotos(Array.from(e.target.files ?? []).slice(0, 3))
                }
              />
            </div>
          </div>

          {error && (
            <p className="mt-5 text-[12px] text-home-vermilion" role="alert">
              {error}
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 items-center justify-center bg-home-ink px-7 text-[11px] font-extrabold uppercase tracking-[0.16em] text-home-ground transition-opacity duration-200 hover:opacity-85 disabled:opacity-55"
            >
              {submitting ? "Sending…" : "Post note"}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="inline-flex min-h-11 items-center font-trade text-[10px] tracking-[0.14em] text-home-ink-mute underline-offset-4 transition-colors duration-200 hover:text-home-ink hover:underline"
            >
              Cancel
            </button>
          </div>
          {user?.firstName && (
            <p className="mt-4 font-trade text-[10px] tracking-[0.14em] text-home-ink-mute">
              Posting as {user.firstName}
            </p>
          )}
        </form>
      )}

      {/* ── The notes ── */}
      {reviews.length === 0
        ? !formOpen && (
            /* An honest ruled empty row, not a void and not a fake card. */
            <div className="mt-8 flex flex-col gap-2 border-b border-home-rule py-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <p className="text-[15px] leading-[1.6] text-home-ink-soft">
                No notes on this style yet — it is waiting for its first rack.
              </p>
              <p className="shrink-0 font-trade text-[10px] tracking-[0.14em] text-home-ink-mute">
                fabric · customer response · reorder
              </p>
            </div>
          )
        : (
            <ul className="mt-2">
              {reviews.map((review) => (
                <li key={review.id} className="border-b border-home-rule py-9">
                  {review.photo_urls.length > 0 && (
                    <div className="mb-6 flex gap-3 overflow-x-auto hide-scrollbar">
                      {review.photo_urls.map((url) => (
                        <div
                          key={url}
                          className="relative h-32 w-24 shrink-0 overflow-hidden border border-home-rule bg-home-ground"
                        >
                          <Image
                            src={url}
                            alt={`Photo from ${review.author_name}'s note`}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Tally value={review.rating} />
                    <span className="font-trade text-[10px] tracking-[0.14em] text-home-ink">
                      {review.author_name}
                    </span>
                    <span className="font-trade text-[10px] tracking-[0.14em] text-home-ink-mute">
                      {new Date(review.created_at).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "long",
                      })}
                    </span>
                  </div>
                  {review.title && (
                    <h3 className="mt-4 font-editorial text-[20px] italic leading-tight">
                      {review.title}
                    </h3>
                  )}
                  <p className="mt-3 max-w-[62ch] text-[15px] leading-[1.7] text-home-ink-soft">
                    {review.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
    </section>
  );
}
