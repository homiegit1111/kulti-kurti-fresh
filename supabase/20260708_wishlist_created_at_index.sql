-- Wishlist nudge sweep filters `created_at < cutoff` and orders by it
-- (see src/lib/server/wishlist-nudge.ts). The base schema only indexes
-- clerk_user_id, so the daily cron scans the table. Add a created_at index
-- to keep the sweep cheap as the table grows.
create index if not exists wishlist_items_created_at_idx
  on public.wishlist_items (created_at);
