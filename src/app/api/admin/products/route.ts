/**
 * Admin products API — list + create.
 *
 *   GET  /api/admin/products
 *        → { products: AdminProduct[] }  (ALL products incl. draft, + variants)
 *
 *   POST /api/admin/products   application/json
 *        Create a product with its size variants.
 *
 * Admin-gated (Clerk allowlist) + service-role writes. RLS blocks direct client
 * writes to the catalog, so every mutation lives behind this route.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";
import {
  guardAdminMutation,
  guardAdminRead,
  parseProductPayload,
  recordAdminAudit,
  serviceUnavailable,
  variantRowsForInsert,
} from "./_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const limited = checkRateLimit(req, "admin-products-read", {
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.ok) return tooManyRequests(limited);

  const gate = await guardAdminRead("catalog:read");
  if (!gate.ok) return gate.response;

  const supabase = createServiceRoleClient();
  if (!supabase) return serviceUnavailable();

  const { data, error } = await supabase
    .from("commerce_products")
    .select(
      "*, variants:commerce_product_variants(*)",
    )
    .is("deleted_at", null)
    .order("rank", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Could not load products." },
      { status: 500 },
    );
  }

  return NextResponse.json({ products: data ?? [] });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = checkRateLimit(req, "admin-products-write", {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) return tooManyRequests(limited);

  const mutationGate = await guardAdminMutation(req, "catalog:write");
  if (!mutationGate.ok) return mutationGate.response;

  const supabase = createServiceRoleClient();
  if (!supabase) return serviceUnavailable();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseProductPayload(raw, { requireVariants: true });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { product, variants } = parsed.value;

  const { data: created, error: insertError } = await supabase
    .from("commerce_products")
    .insert(product)
    .select("id")
    .single();

  if (insertError || !created) {
    const conflict = insertError?.code === "23505";
    return NextResponse.json(
      {
        error: conflict
          ? "A product with that handle already exists."
          : "Could not create product.",
      },
      { status: conflict ? 409 : 500 },
    );
  }

  const productId = created.id as string;

  const variantRows = variantRowsForInsert(productId, variants);
  const { error: variantError } = await supabase
    .from("commerce_product_variants")
    .insert(variantRows);

  if (variantError) {
    // Roll back the orphaned product so we don't leave a variant-less shell.
    await supabase.from("commerce_products").delete().eq("id", productId);
    const conflict = variantError.code === "23505";
    return NextResponse.json(
      {
        error: conflict
          ? "Duplicate size in variants — each size must be unique."
          : "Could not save product variants.",
      },
      { status: conflict ? 409 : 500 },
    );
  }

  await recordAdminAudit(supabase, {
    actorUserId: mutationGate.userId,
    action: "product.create",
    entityType: "product",
    entityId: productId,
    afterState: {
      handle: product.handle,
      title: product.title,
      status: product.status,
      variant_count: variants.length,
    },
  });

  return NextResponse.json({ ok: true, id: productId }, { status: 201 });
}
