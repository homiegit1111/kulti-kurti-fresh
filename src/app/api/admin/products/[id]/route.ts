/**
 * Admin single-product API — update + delete.
 *
 *   PATCH  /api/admin/products/:id   application/json
 *          Update product fields and (optionally) replace its variants.
 *   DELETE /api/admin/products/:id
 *          Unpublish and soft-delete the product, preserving order history.
 *
 * Admin-gated + service-role. RLS blocks direct client writes to the catalog.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";
import {
  guardAdminMutation,
  parseProductPayload,
  recordAdminAudit,
  serviceUnavailable,
  validatePublishedProduct,
} from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const limited = checkRateLimit(req, "admin-products-write", {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.ok) return tooManyRequests(limited);

  const mutationGate = await guardAdminMutation(req, "catalog:write");
  if (!mutationGate.ok) return mutationGate.response;

  const supabase = createServiceRoleClient();
  if (!supabase) return serviceUnavailable();

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing product id." }, { status: 400 });

  const { data: existing, error: existingError } = await supabase
    .from("commerce_products")
    .select(
      "id,handle,title,status,deleted_at,variants:commerce_product_variants(id,size,sku,set_price_inr,inventory_quantity,manage_inventory,allow_backorder,position,archived_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (existingError) {
    return NextResponse.json({ error: "Could not load product." }, { status: 500 });
  }
  if (!existing || existing.deleted_at) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // On update, variants are optional; only replace them when explicitly sent.
  const hasVariants =
    typeof raw === "object" && raw !== null && Array.isArray((raw as Record<string, unknown>).variants);
  const parsed = parseProductPayload(raw, {
    requireVariants: false,
    // If variants are omitted, validate the current database variants below.
    validatePublish: hasVariants,
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { product, variants } = parsed.value;

  if (product.status === "published" && !hasVariants) {
    const publishError = validatePublishedProduct(
      product,
      (existing.variants ?? []) as Parameters<typeof validatePublishedProduct>[1],
    );
    if (publishError) {
      return NextResponse.json({ error: publishError }, { status: 400 });
    }
  }

  const { error: updateError } = await supabase
    .from("commerce_products")
    .update(product)
    .eq("id", id)
    .is("deleted_at", null);

  if (updateError) {
    const conflict = updateError.code === "23505";
    return NextResponse.json(
      {
        error: conflict
          ? "Another product already uses that handle."
          : "Could not update product.",
      },
      { status: conflict ? 409 : 500 },
    );
  }

  if (hasVariants) {
    const existingIds = new Set(
      ((existing.variants ?? []) as Array<{ id: string }>).map((variant) => variant.id),
    );
    const submittedIds = new Set(variants.flatMap((variant) => (variant.id ? [variant.id] : [])));
    if ([...submittedIds].some((variantId) => !existingIds.has(variantId))) {
      return NextResponse.json({ error: "A variant does not belong to this product." }, { status: 400 });
    }

    for (const variant of variants) {
      const { id: variantId, ...variantPatch } = variant;
      const { error: variantError } = variantId
        ? await supabase
            .from("commerce_product_variants")
            .update({ ...variantPatch, archived_at: null })
            .eq("id", variantId)
            .eq("product_id", id)
        : await supabase
            .from("commerce_product_variants")
            .insert({ ...variantPatch, product_id: id });
      if (variantError) {
        return NextResponse.json({ error: "Could not save product variants." }, { status: 500 });
      }
    }

    const removedIds = [...existingIds].filter((variantId) => !submittedIds.has(variantId));
    if (removedIds.length) {
      const { error: archiveError } = await supabase
        .from("commerce_product_variants")
        .update({ archived_at: new Date().toISOString() })
        .eq("product_id", id)
        .in("id", removedIds)
        .is("archived_at", null);
      if (archiveError) {
        return NextResponse.json({ error: "Could not retire removed variants." }, { status: 500 });
      }
    }
  }

  await recordAdminAudit(supabase, {
    actorUserId: mutationGate.userId,
    action: "product.update",
    entityType: "product",
    entityId: id,
    beforeState: {
      handle: existing.handle,
      title: existing.title,
      status: existing.status,
      variant_count: Array.isArray(existing.variants) ? existing.variants.length : 0,
    },
    afterState: {
      handle: product.handle,
      title: product.title,
      status: product.status,
      variant_count: hasVariants
        ? variants.length
        : Array.isArray(existing.variants)
          ? existing.variants.length
          : 0,
    },
  });

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const limited = checkRateLimit(req, "admin-products-write", {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.ok) return tooManyRequests(limited);

  const mutationGate = await guardAdminMutation(req, "catalog:delete");
  if (!mutationGate.ok) return mutationGate.response;

  const supabase = createServiceRoleClient();
  if (!supabase) return serviceUnavailable();

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing product id." }, { status: 400 });

  const { data: existing, error: existingError } = await supabase
    .from("commerce_products")
    .select("id,handle,title,status,deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (existingError) {
    return NextResponse.json({ error: "Could not load product." }, { status: 500 });
  }
  if (!existing || existing.deleted_at) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("commerce_products")
    .update({ status: "draft", deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) {
    return NextResponse.json({ error: "Could not unpublish product." }, { status: 500 });
  }

  await recordAdminAudit(supabase, {
    actorUserId: mutationGate.userId,
    action: "product.soft_delete",
    entityType: "product",
    entityId: id,
    beforeState: { handle: existing.handle, title: existing.title, status: existing.status },
    afterState: { status: "draft", deleted: true },
  });

  return NextResponse.json({ ok: true, softDeleted: true });
}
