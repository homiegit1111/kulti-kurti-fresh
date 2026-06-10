-- ============================================================================
-- Rangat Pehnawa — Customer reviews with photos
--
-- Writes go through /api/reviews (Clerk-authenticated, validated, photo-type
-- and size-checked) using the SERVICE ROLE, so RLS here only needs to:
--   • let anyone read PUBLISHED reviews (the storefront + JSON-LD need them)
--   • block all direct client writes (no insert/update/delete policies)
--
-- PHOTO STORAGE: create a PUBLIC bucket named `review-photos`
-- (Dashboard → Storage → New bucket → public). Uploads happen server-side
-- via the service role only, so no storage RLS policies are required for
-- clients; public-read serves the images on the PDP.
--
-- Run after wishlist_profile_schema.sql.
-- ============================================================================

create table if not exists public.product_reviews (
  id              uuid primary key default gen_random_uuid(),
  product_handle  text not null,
  clerk_user_id   text not null,
  author_name     text not null,
  rating          int  not null check (rating between 1 and 5),
  title           text,
  body            text not null check (char_length(body) between 10 and 2000),
  photo_urls      text[] not null default '{}',
  -- 'published' | 'hidden' — flip to 'hidden' to moderate without deleting.
  status          text not null default 'published'
                  check (status in ('published', 'hidden')),
  created_at      timestamptz not null default now(),
  -- One review per customer per product; resubmitting replaces it.
  unique (product_handle, clerk_user_id)
);

create index if not exists product_reviews_handle_idx
  on public.product_reviews (product_handle)
  where status = 'published';

alter table public.product_reviews enable row level security;

-- Anyone (anon included) may read published reviews.
drop policy if exists "reviews_select_published" on public.product_reviews;
create policy "reviews_select_published" on public.product_reviews
  for select to anon, authenticated
  using (status = 'published');

-- No insert/update/delete policies: the service-role API route is the only
-- write path (it enforces Clerk auth + validation in code).
