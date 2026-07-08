/**
 * Wishlist persistence API — backed by Supabase `public.wishlist_items`.
 *
 * Auth: Clerk. Every query runs through a Clerk-token Supabase client, so RLS
 * scopes rows to the signed-in user (no service-role key, no cross-user leak).
 *
 *   GET    /api/wishlist                     → { items: MockProduct[] }
 *   POST   /api/wishlist  { product_id, product_handle }  → add (idempotent)
 *   DELETE /api/wishlist?product_id=...       → remove one
 *   DELETE /api/wishlist                      → clear all (this user's rows)
 *
 * GET hydrates stored product handles into full products via Shopify so the
 * wishlist renders identically across devices.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createClerkSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { getProductByHandle, type MockProduct } from "@/lib/commerce/catalog";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, { status });

type WishlistRow = {
  product_id: string;
  product_handle: string | null;
  created_at: string;
};

export async function GET(): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return json({ items: [], signedIn: false });

  if (!isSupabaseConfigured()) return json({ items: [], configured: false });
  const supabase = createClerkSupabaseClient();
  if (!supabase) return json({ items: [], configured: false });

  const { data, error } = await supabase
    .from("wishlist_items")
    .select("product_id, product_handle, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[wishlist GET]", error.message);
    return json({ items: [], error: "Could not load wishlist." }, 500);
  }

  const rows = (data ?? []) as WishlistRow[];

  // Hydrate handles → full products (small lists; runs in parallel).
  const resolved = await Promise.all(
    rows.map((r) =>
      r.product_handle
        ? getProductByHandle(r.product_handle).catch(() => null)
        : Promise.resolve(null),
    ),
  );
  const items = resolved.filter((p): p is MockProduct => Boolean(p));

  return json({ items });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rl = checkRateLimit(req, "wishlist", { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequests(rl);

  const { userId } = await auth();
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const supabase = createClerkSupabaseClient();
  if (!supabase) return json({ configured: false });

  const body = (await req.json().catch(() => ({}))) as {
    product_id?: unknown;
    product_handle?: unknown;
  };
  const productId =
    typeof body.product_id === "string" ? body.product_id.trim() : "";
  const productHandle =
    typeof body.product_handle === "string"
      ? body.product_handle.trim() || null
      : null;

  if (!productId) return json({ error: "product_id is required" }, 400);

  const { error } = await supabase.from("wishlist_items").upsert(
    {
      clerk_user_id: userId,
      product_id: productId,
      product_handle: productHandle,
    },
    { onConflict: "clerk_user_id,product_id", ignoreDuplicates: true },
  );

  if (error) {
    console.error("[wishlist POST]", error.message);
    return json({ error: "Could not save to wishlist." }, 500);
  }
  return json({ ok: true });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const rl = checkRateLimit(req, "wishlist", { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequests(rl);

  const { userId } = await auth();
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const supabase = createClerkSupabaseClient();
  if (!supabase) return json({ configured: false });

  const productId = new URL(req.url).searchParams.get("product_id");
  const query = supabase.from("wishlist_items").delete();

  // Single item, or clear-all. Always pin to the owner explicitly
  // (defense-in-depth on top of RLS) so a delete can never touch another
  // user's rows even if an RLS policy is later misconfigured.
  const { error } = productId
    ? await query.eq("clerk_user_id", userId).eq("product_id", productId)
    : await query.eq("clerk_user_id", userId);

  if (error) {
    console.error("[wishlist DELETE]", error.message);
    return json({ error: "Could not update wishlist." }, 500);
  }
  return json({ ok: true });
}
