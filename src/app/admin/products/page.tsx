"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Plus, Pencil, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { cn } from "@/lib/utils";

type Variant = {
  id?: string;
  size: string;
  sku?: string | null;
  set_price_inr: number | string;
  inventory_quantity: number | string;
  manage_inventory: boolean;
  allow_backorder: boolean;
  archived_at?: string | null;
};

type Product = {
  id: string;
  handle: string;
  title: string;
  description: string;
  thumbnail: string | null;
  images: string[];
  category: string;
  color_family: string;
  is_new: boolean;
  status: "draft" | "published";
  collection_handle: string | null;
  variants: Variant[];
};

type FormState = {
  id?: string;
  handle: string;
  title: string;
  description: string;
  category: string;
  color_family: string;
  status: "draft" | "published";
  collection_handle: string;
  images: string[];
  variants: Variant[];
};

const emptyVariant = (): Variant => ({
  size: B2B_CONFIG.sizeRatio.join("/"),
  sku: "",
  set_price_inr: "",
  inventory_quantity: "",
  manage_inventory: false,
  allow_backorder: false,
});

const emptyForm = (): FormState => ({
  handle: "",
  title: "",
  description: "",
  category: "Kurtis",
  color_family: "ivory",
  status: "draft",
  collection_handle: "",
  images: [],
  variants: [emptyVariant()],
});

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/products", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        products?: Product[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Could not load products.");
      setProducts(data.products ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Intentional load-on-mount; setState inside load() runs after the async
    // fetch resolves, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function openCreate() {
    setForm(emptyForm());
    setSheetOpen(true);
  }

  function openEdit(p: Product) {
    setForm({
      id: p.id,
      handle: p.handle,
      title: p.title,
      description: p.description ?? "",
      category: p.category,
      color_family: p.color_family,
      status: p.status,
      collection_handle: p.collection_handle ?? "",
      images: p.images ?? [],
      variants:
        p.variants?.some((v) => !v.archived_at)
          ? p.variants.filter((v) => !v.archived_at).map((v) => ({
              id: v.id,
              size: v.size,
              sku: v.sku ?? "",
              set_price_inr: v.set_price_inr,
              inventory_quantity: v.inventory_quantity,
              manage_inventory: v.manage_inventory,
              allow_backorder: v.allow_backorder,
            }))
          : [emptyVariant()],
    });
    setSheetOpen(true);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed.");
      setForm((f) => ({ ...f, images: [...f.images, data.url as string] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        variants: form.variants.map((v) => ({
          ...v,
          set_price_inr: Number(v.set_price_inr),
          inventory_quantity: Number(v.inventory_quantity) || 0,
        })),
      };
      const url = form.id ? `/api/admin/products/${form.id}` : "/api/admin/products";
      const res = await fetch(url, {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save product.");
      setSheetOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Product) {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not delete product.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete product.");
    }
  }

  function updateVariant(i: number, patch: Partial<Variant>) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)),
    }));
  }

  return (
    <div>
      <div className="mb-8 flex items-end justify-between border-b border-charcoal/10 pb-6">
        <div>
          <p className="eyebrow mb-3">Catalog</p>
          <h2 className="text-[clamp(2.25rem,6vw,3rem)] font-black uppercase leading-[0.85] tracking-[-0.07em]">
            Products
          </h2>
        </div>
        <Button onClick={openCreate} size="lg">
          <Plus /> New product
        </Button>
      </div>

      {error && (
        <div className="mb-6 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent-red" />
        </div>
      ) : products.length === 0 ? (
        <div className="panel-luxe p-12 text-center text-sm text-charcoal/55">
          No products yet. Create your first wholesale style.
        </div>
      ) : (
        <div className="panel-luxe overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-charcoal/10 bg-warm-gray/40 text-[10px] uppercase tracking-[0.18em] text-charcoal/50">
              <tr>
                <th className="px-4 py-3 font-bold">Product</th>
                <th className="px-4 py-3 font-bold">Category</th>
                <th className="px-4 py-3 font-bold">Set price</th>
                <th className="px-4 py-3 font-bold">Stock</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const minPrice = Math.min(
                  ...(p.variants?.length
                    ? p.variants.map((v) => Number(v.set_price_inr) || 0)
                    : [0]),
                );
                const inStock = p.variants?.some(
                  (v) =>
                    v.manage_inventory === false ||
                    v.allow_backorder ||
                    Number(v.inventory_quantity) > 0,
                );
                return (
                  <tr
                    key={p.id}
                    className="border-b border-charcoal/5 last:border-0 hover:bg-warm-gray/20"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-10 shrink-0 overflow-hidden border border-charcoal/10 bg-warm-gray/40">
                          {p.thumbnail || p.images?.[0] ? (
                            <Image
                              src={p.thumbnail || p.images[0]}
                              alt={p.title}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          ) : null}
                        </div>
                        <div>
                          <p className="font-medium text-charcoal">{p.title}</p>
                          <p className="text-[11px] text-charcoal/40">{p.handle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-charcoal/70">{p.category}</td>
                    <td className="px-4 py-3 text-charcoal/70">
                      ₹{minPrice.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block h-2 w-2 rounded-full",
                          inStock ? "bg-emerald-500" : "bg-charcoal/25",
                        )}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-[0.15em]",
                          p.status === "published"
                            ? "text-emerald-600"
                            : "text-charcoal/40",
                        )}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(p)}
                          aria-label="Edit"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => remove(p)}
                          aria-label="Delete"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="text-2xl font-black uppercase leading-[0.9] tracking-[-0.055em]">
              {form.id ? "Edit product" : "New product"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 pb-8">
            <Labeled label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Sage Chanderi Kurta"
              />
            </Labeled>
            <Labeled label="Handle (URL slug — leave blank to auto-generate)">
              <Input
                value={form.handle}
                onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))}
                placeholder="sage-chanderi-kurta"
              />
            </Labeled>
            <Labeled label="Description">
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Labeled>
            <div className="grid grid-cols-2 gap-4">
              <Labeled label="Category">
                <Input
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                />
              </Labeled>
              <Labeled label="Colour family">
                <Input
                  value={form.color_family}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color_family: e.target.value }))
                  }
                />
              </Labeled>
            </div>
            <Labeled label="Collection handle (optional)">
              <Input
                value={form.collection_handle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, collection_handle: e.target.value }))
                }
                placeholder="summer-edit"
              />
            </Labeled>

            {/* Images */}
            <Labeled label="Images">
              <div className="flex flex-wrap gap-2">
                {form.images.map((url, i) => (
                  <div
                    key={url}
                    className="relative h-20 w-16 overflow-hidden border border-charcoal/10"
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          images: f.images.filter((_, idx) => idx !== i),
                        }))
                      }
                      className="absolute right-0 top-0 bg-charcoal/80 p-0.5 text-white"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="flex h-20 w-16 cursor-pointer items-center justify-center border border-dashed border-charcoal/25 text-charcoal/40 hover:border-accent-red hover:text-accent-red">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadImage(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </Labeled>

            {/* Variants */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal/50">
                  Variants (sets)
                </p>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() =>
                    setForm((f) => ({ ...f, variants: [...f.variants, emptyVariant()] }))
                  }
                >
                  <Plus /> Add size
                </Button>
              </div>
              <div className="flex flex-col gap-3">
                {form.variants.map((v, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_1fr_auto] gap-2 border border-charcoal/10 p-3"
                  >
                    <Labeled label="Size">
                      <Input
                        value={v.size}
                        onChange={(e) => updateVariant(i, { size: e.target.value })}
                      />
                    </Labeled>
                    <Labeled label="Set price (₹)">
                      <Input
                        type="number"
                        value={v.set_price_inr}
                        onChange={(e) =>
                          updateVariant(i, { set_price_inr: e.target.value })
                        }
                      />
                    </Labeled>
                    <div className="flex items-end">
                      {form.variants.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              variants: f.variants.filter((_, idx) => idx !== i),
                            }))
                          }
                          aria-label="Remove variant"
                        >
                          <X />
                        </Button>
                      )}
                    </div>
                    <Labeled label="Inventory (0 = untracked)">
                      <Input
                        type="number"
                        value={v.inventory_quantity}
                        onChange={(e) =>
                          updateVariant(i, { inventory_quantity: e.target.value })
                        }
                      />
                    </Labeled>
                    <label className="flex items-end gap-2 text-xs text-charcoal/60">
                      <input
                        type="checkbox"
                        checked={v.manage_inventory}
                        onChange={(e) =>
                          updateVariant(i, { manage_inventory: e.target.checked })
                        }
                      />
                      Track stock
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Status + save */}
            <label className="flex items-center gap-2 text-sm text-charcoal/70">
              <input
                type="checkbox"
                checked={form.status === "published"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.checked ? "published" : "draft",
                  }))
                }
              />
              Published (visible on the storefront)
            </label>

            <div className="flex gap-3 pt-2">
              <Button onClick={save} disabled={saving} size="lg" className="flex-1">
                {saving ? <Loader2 className="animate-spin" /> : null}
                {form.id ? "Save changes" : "Create product"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-charcoal/45">
        {label}
      </span>
      {children}
    </label>
  );
}
