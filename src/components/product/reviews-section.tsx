"use client";

/**
 * PDP "Client Voices" — customer reviews with photos.
 *
 * Reads/writes /api/reviews. Strictly on the luxe design system: eyebrow
 * label, serif-light headings, gold stars, hairline dividers, field-luxe
 * inputs and btn-luxe CTAs. Signed-out visitors get a quiet invitation to
 * sign in rather than a dead form.
 */

import { useCallback, useEffect, useRef, useState } from "react";
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

function Stars({
  value,
  size = "text-sm",
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
      className={`flex items-center gap-1 ${size}`}
      role={interactive ? "radiogroup" : undefined}
      aria-label={interactive ? "Select a rating" : `Rated ${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) =>
        interactive ? (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onClick={() => onSelect?.(star)}
            className={`tap-luxe transition-colors duration-300 ${
              star <= value ? "text-gold" : "text-charcoal/20 hover:text-gold/60"
            }`}
          >
            ★
          </button>
        ) : (
          <span
            key={star}
            aria-hidden
            className={star <= value ? "text-gold" : "text-charcoal/15"}
          >
            ★
          </span>
        ),
      )}
    </div>
  );
}

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

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews?handle=${encodeURIComponent(handle)}`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data.reviews ?? []);
      setSummary(data.summary ?? { count: 0, average: 0 });
    } catch {
      /* reviews are an enhancement — fail silently */
    } finally {
      setLoaded(true);
    }
  }, [handle]);

  useEffect(() => {
    load();
  }, [load]);

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
      const data = await res.json().catch(() => ({}));
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
    <section className="mt-20 lg:mt-28" aria-label="Customer reviews">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-8 border-b border-charcoal/10">
        <div>
          <p className="eyebrow mb-3">Client Voices</p>
          <h2 className="font-serif text-3xl lg:text-4xl font-light tracking-tight">
            Worn &amp; <em className="italic">loved</em>
          </h2>
          {summary.count > 0 && (
            <div className="flex items-center gap-3 mt-4">
              <Stars value={Math.round(summary.average)} />
              <span className="font-serif text-lg">{summary.average.toFixed(1)}</span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-charcoal/50">
                {summary.count} review{summary.count > 1 ? "s" : ""}
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
              className="btn-luxe-outline self-start sm:self-auto"
            >
              Write a review
            </button>
          )
        ) : (
          <p className="text-[11px] uppercase tracking-[0.2em] text-charcoal/50">
            <Link href="/login" className="link-luxe text-charcoal">
              Sign in
            </Link>{" "}
            to share your experience
          </p>
        )}
      </div>

      {thanks && (
        <div className="panel-luxe p-6 mt-8">
          <p className="font-serif text-lg">
            Thank you — your words are now part of this piece&apos;s story.
          </p>
        </div>
      )}

      {/* ── Write form ── */}
      {formOpen && (
        <form onSubmit={submit} className="frame-luxe p-8 lg:p-10 mt-10 space-y-7">
          <p className="eyebrow eyebrow--bare">Your Review</p>

          <div>
            <span className="field-label">Rating</span>
            <div className="mt-2">
              <Stars value={rating} size="text-2xl" interactive onSelect={setRating} />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="review-title">
              Title <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id="review-title"
              type="text"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A single line that says it all"
              className="field-luxe"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="review-body">
              Your experience
            </label>
            <textarea
              id="review-body"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="The fit, the fabric, the moment you wore it…"
              className="field-luxe resize-none"
            />
          </div>

          <div>
            <span className="field-label">Photos (up to 3)</span>
            <div className="flex items-center gap-4 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-luxe-outline !px-6 !py-3"
              >
                Add photos
              </button>
              {photos.length > 0 && (
                <span className="text-[11px] uppercase tracking-[0.2em] text-charcoal/50">
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
            <p className="text-xs tracking-wide text-red-700" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center gap-6">
            <button type="submit" disabled={submitting} className="btn-luxe">
              {submitting ? "Sending…" : "Submit review"}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="link-luxe text-[11px] uppercase tracking-[0.2em] text-charcoal/60"
            >
              Cancel
            </button>
          </div>
          {user?.firstName && (
            <p className="text-[10px] uppercase tracking-[0.2em] text-charcoal/40">
              Posting as {user.firstName}
            </p>
          )}
        </form>
      )}

      {/* ── Review list ── */}
      {reviews.length === 0 ? (
        !formOpen && (
          <p className="font-serif text-lg text-charcoal/45 italic mt-10">
            This piece is waiting for its first story — be the one to tell it.
          </p>
        )
      ) : (
        <ul className="divide-y divide-charcoal/10">
          {reviews.map((review) => (
            <li key={review.id} className="py-10">
              <div className="flex items-center gap-4">
                <Stars value={review.rating} />
                <span className="text-[11px] uppercase tracking-[0.2em] text-charcoal/50">
                  {review.author_name}
                </span>
                <span className="text-[11px] tracking-wide text-charcoal/30">
                  {new Date(review.created_at).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                  })}
                </span>
              </div>
              {review.title && (
                <h3 className="font-serif text-xl font-light mt-4">{review.title}</h3>
              )}
              <p className="text-sm leading-relaxed text-charcoal/70 mt-3 max-w-2xl">
                {review.body}
              </p>
              {review.photo_urls.length > 0 && (
                <div className="flex gap-3 mt-6">
                  {review.photo_urls.map((url) => (
                    <div
                      key={url}
                      className="relative w-24 h-32 border border-charcoal/10 overflow-hidden"
                    >
                      <Image
                        src={url}
                        alt={`Photo from ${review.author_name}'s review`}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
