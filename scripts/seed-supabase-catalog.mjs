#!/usr/bin/env node
/**
 * Seed the Supabase commerce catalog for the Rangat Pehnawa B2B storefront.
 *
 * HOW TO RUN:
 *   1. Apply migrations first: run supabase/20260709_commerce_backend.sql in the
 *      Supabase SQL editor (creates commerce_collections/products/variants).
 *   2. Set env (in .env.local / .env, or export them):
 *        NEXT_PUBLIC_SUPABASE_URL   = https://<project>.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY  = <service-role key>   (service role: writes catalog rows)
 *   3. node scripts/seed-supabase-catalog.mjs
 *
 * Idempotent: upserts collections (on handle), products (on handle), and variants
 * (on product_id+size), so re-running updates rows in place instead of duplicating.
 *
 * Prices are whole-rupee integers (set_price_inr). Each product sells as a set
 * (B2B_CONFIG.setSize=4, ratio S/M/L/XL); the set price = salePrice ?? price.
 * The product data below is duplicated from src/lib/shopify.ts MOCK_PRODUCTS /
 * MOCK_COLLECTIONS (that TS module can't be imported from a plain Node script),
 * with wholesale style-codes/collection mapping cross-referenced from the Medusa
 * seed (apps/rangat-commerce/.../rangat-b2b-catalog.ts). Handles match the mock
 * data exactly — the storefront and existing links depend on handle stability.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ── Minimal .env loader (no dotenv dependency required) ──────────────────────
// Loads .env.local then .env (existing process.env always wins).
function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    let raw;
    try {
      raw = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    } catch {
      continue;
    }
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!m || line.trim().startsWith("#")) continue;
      const key = m[1];
      let val = (m[2] ?? "").trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}
loadEnvFiles();

const SIZE_RATIO_LABEL = "S/M/L/XL";
const SET_SIZE = 4;

// ── Collections (from MOCK_COLLECTIONS) ──────────────────────────────────────
const COLLECTIONS = [
  {
    handle: "co-ords",
    title: "Co-ords",
    image: "/images/product-2.png",
    description:
      "Matching top-and-bottom co-ord sets, styled for effortless, put-together looks.",
    rank: 0,
  },
  {
    handle: "2-pcs-set",
    title: "2 Pcs Set",
    image: "/images/collection-minimal.png",
    description:
      "Kurta paired with a coordinated bottom — the boutique reseller's everyday bestseller.",
    rank: 1,
  },
  {
    handle: "dupatta-set",
    title: "Dupatta Set",
    image: "/images/premium_dupatta.png",
    description:
      "Complete three-piece ensembles finished with a flowing dupatta for festive racks.",
    rank: 2,
  },
];

// ── Products (from MOCK_PRODUCTS; style_code + collection_handle cross-referenced
//    against the Medusa seed by position). Handles match MOCK_PRODUCTS exactly. ─
const PRODUCTS = [
  {
    handle: "sage-chanderi-kurta",
    title: "Sage Chanderi Kurta Set",
    description:
      "A serene sage-toned Chanderi kurta set featuring intricate handblock prints. Crafted from pure Chanderi silk-cotton blend with gold zari accents.",
    thumbnail: "/images/product-1.png",
    images: ["/images/product-1.png", "/images/product-2.png"],
    category: "Kurtis",
    color_family: "sage",
    is_new: true,
    price: 4299,
    salePrice: 3499,
    available: true,
    styleCode: "RP-KURTI-001",
    collection_handle: "2-pcs-set",
  },
  {
    handle: "ivory-anarkali",
    title: "Ivory Silk Anarkali Suit",
    description:
      "An ethereal ivory Anarkali suit in pure mulberry silk with delicate chikankari embroidery.",
    thumbnail: "/kurti-ivory.png",
    images: ["/kurti-ivory.png", "/kurti-blush.png"],
    category: "Kurtis",
    color_family: "ivory",
    is_new: false,
    price: 6999,
    salePrice: null,
    available: true,
    styleCode: "RP-COTTON-002",
    collection_handle: "2-pcs-set",
  },
  {
    handle: "navy-mirror-work-kurta",
    title: "Navy Mirror Work Kurta Set",
    description:
      "A statement navy kurta set featuring traditional mirror work from Rajasthan.",
    thumbnail: "/images/product-3.png",
    images: ["/images/product-3.png", "/images/product-4.png"],
    category: "Kurtis",
    color_family: "navy",
    is_new: false,
    price: 5499,
    salePrice: 4199,
    available: true,
    styleCode: "RP-KURTI-003",
    collection_handle: "dupatta-set",
  },
  {
    handle: "terracotta-block-print",
    title: "Terracotta Block Print Saree",
    description:
      "A warm terracotta saree with traditional Bagru handblock prints.",
    thumbnail: "/images/product-4.png",
    images: ["/images/product-4.png", "/images/product-3.png"],
    category: "Sarees",
    color_family: "terracotta",
    is_new: true,
    price: 3799,
    salePrice: null,
    available: true,
    styleCode: "RP-SAREE-004",
    collection_handle: "dupatta-set",
  },
  {
    handle: "blush-silk-ensemble",
    title: "Blush Silk Lehenga Ensemble",
    description:
      "A dreamy blush pink lehenga in pure Banarasi silk with gold zardozi work.",
    thumbnail: "/images/product-1.png",
    images: ["/images/product-1.png", "/images/product-2.png"],
    category: "Lehengas",
    color_family: "blush",
    is_new: false,
    price: 8999,
    salePrice: null,
    available: true,
    styleCode: "RP-LEHENGA-005",
    collection_handle: "dupatta-set",
  },
  {
    handle: "forest-embroidered-set",
    title: "Forest Embroidered Co-ord Set",
    description:
      "A sophisticated forest green co-ord set with copper threadwork embroidery.",
    thumbnail: "/images/product-2.png",
    images: ["/images/product-2.png", "/images/product-3.png"],
    category: "Co-ords",
    color_family: "forest",
    is_new: true,
    price: 5299,
    salePrice: 4499,
    available: true,
    styleCode: "RP-COORD-006",
    collection_handle: "co-ords",
  },
  {
    handle: "pearl-georgette-kurta",
    title: "Pearl Georgette Kurta Set",
    description:
      "An elegant pearl-white georgette kurta set with silver sequin detailing.",
    thumbnail: "/images/product-3.png",
    images: ["/images/product-3.png", "/images/product-1.png"],
    category: "Kurtis",
    color_family: "pearl",
    is_new: false,
    price: 4799,
    salePrice: null,
    available: true,
    styleCode: "RP-KURTI-007",
    collection_handle: "co-ords",
  },
  {
    handle: "mustard-cotton-anarkali",
    title: "Mustard Cotton Anarkali Suit",
    description:
      "A vibrant mustard Anarkali suit in handloom cotton with ajrakh block prints.",
    thumbnail: "/images/product-4.png",
    images: ["/images/product-4.png", "/images/product-2.png"],
    category: "Kurtis",
    color_family: "mustard",
    is_new: false,
    price: 3299,
    salePrice: null,
    available: true,
    styleCode: "RP-KURTI-008",
    collection_handle: "2-pcs-set",
  },
];

// ── Client ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
      "(in .env.local/.env or the environment) before running.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function setPriceInr(p) {
  const price = p.salePrice ?? p.price;
  if (!Number.isInteger(price) || price <= 0) {
    throw new Error(
      `Product ${p.handle} has an invalid set price (${price}); must be a whole rupee integer > 0.`,
    );
  }
  return price;
}

async function main() {
  // 1) Collections (upsert on handle) ────────────────────────────────────────
  const { error: colErr } = await supabase
    .from("commerce_collections")
    .upsert(
      COLLECTIONS.map((c) => ({
        handle: c.handle,
        title: c.title,
        image: c.image,
        description: c.description,
        rank: c.rank,
      })),
      { onConflict: "handle", count: "exact" },
    );
  if (colErr) throw colErr;

  // 2) Products (upsert on handle, select back to map handle → id) ────────────
  const productRows = PRODUCTS.map((p, i) => ({
    handle: p.handle,
    title: p.title,
    description: p.description,
    thumbnail: p.thumbnail,
    images: p.images,
    category: p.category,
    color_family: p.color_family,
    is_new: p.is_new,
    status: "published",
    collection_handle: p.collection_handle,
    rank: i,
    metadata: {
      style_code: p.styleCode,
      b2b_catalog: true,
      wholesale_set_price: setPriceInr(p),
      set_size: SET_SIZE,
      size_ratio: SIZE_RATIO_LABEL,
      list_price_inr: p.price,
      sale_price_inr: p.salePrice,
    },
  }));

  const { data: upsertedProducts, error: prodErr } = await supabase
    .from("commerce_products")
    .upsert(productRows, { onConflict: "handle" })
    .select("id, handle");
  if (prodErr) throw prodErr;

  const idByHandle = new Map(
    (upsertedProducts ?? []).map((r) => [r.handle, r.id]),
  );

  // 3) Variants — one set variant per product (no per-size variant ids in mock).
  //    size = ratio label; manage_inventory=false (infinite) unless unavailable.
  const variantRows = PRODUCTS.map((p) => {
    const productId = idByHandle.get(p.handle);
    if (!productId) {
      throw new Error(`No product id returned for handle ${p.handle}.`);
    }
    const tracked = p.available === false; // untracked/infinite by default
    return {
      product_id: productId,
      size: SIZE_RATIO_LABEL,
      sku: `${p.styleCode}-SET`,
      set_price_inr: setPriceInr(p),
      inventory_quantity: 0,
      manage_inventory: tracked,
      allow_backorder: false,
      position: 0,
    };
  });

  const { data: upsertedVariants, error: varErr } = await supabase
    .from("commerce_product_variants")
    .upsert(variantRows, { onConflict: "product_id,size" })
    .select("id");
  if (varErr) throw varErr;

  console.log("Supabase commerce catalog seed complete.");
  console.log(`  Collections upserted: ${COLLECTIONS.length}`);
  console.log(
    `  Products upserted:    ${upsertedProducts?.length ?? productRows.length}`,
  );
  console.log(
    `  Variants upserted:    ${upsertedVariants?.length ?? variantRows.length}`,
  );
}

main().catch((err) => {
  console.error("Seed failed:", err.message ?? err);
  process.exit(1);
});
