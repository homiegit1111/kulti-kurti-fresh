"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type OrderItem = {
  id: string;
  handle: string;
  title: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unit_price_inr: number;
  line_total_inr: number;
};

type Buyer = {
  name?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  city?: string;
  gstin?: string;
};

type Order = {
  id: string;
  display_number: number;
  status: string;
  source: string;
  buyer: Buyer;
  currency: string;
  total_inr: number;
  total_sets: number;
  total_pieces: number;
  payment_provider: string | null;
  payment_transaction_id: string | null;
  completed_at: string | null;
  created_at: string;
  commerce_order_items: OrderItem[];
};

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "pending_payment", label: "Pending" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
];

// Which transitions the UI offers, mirroring the API's ALLOWED_TRANSITIONS.
const NEXT_STATUSES: Record<string, string[]> = {
  pending_payment: ["fulfilled", "cancelled", "paid"],
  paid: ["fulfilled", "cancelled"],
  fulfilled: ["paid"],
  draft: ["cancelled"],
  cancelled: [],
};

function statusTone(status: string): string {
  switch (status) {
    case "paid":
      return "text-emerald-600";
    // Fulfilled is the terminal SUCCESS state, so it must not read as red like
    // `cancelled`. Lime is the brand's positive/active accent, but lime *text*
    // on the light paper background fails contrast — so it lands as a filled
    // lime chip with ink text instead. That also gives the terminal state more
    // visual weight than in-flight `paid`, and keeps the two distinguishable.
    case "fulfilled":
      return "bg-accent-lime px-1.5 py-0.5 text-on-accent";
    case "cancelled":
      return "text-destructive";
    default:
      return "text-charcoal/45";
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = filter
        ? `/api/admin/orders?status=${encodeURIComponent(filter)}`
        : "/api/admin/orders";
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        orders?: Order[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Could not load orders.");
      setOrders(data.orders ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // Intentional load-on-mount / on-filter-change; the setState inside load()
    // runs after the async fetch, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function setStatus(order: Order, status: string) {
    setUpdating(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not update order.");
      setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update order.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div>
      <div className="mb-8 border-b border-charcoal/10 pb-6">
        <p className="eyebrow mb-3">Operations</p>
        <h2 className="text-[clamp(2.25rem,6vw,3rem)] font-black uppercase leading-[0.85] tracking-[-0.07em]">
          Orders
        </h2>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors",
              filter === f.value
                ? "border-b-2 border-accent-red text-charcoal"
                : "border-b-2 border-transparent text-charcoal/40 hover:text-charcoal",
            )}
          >
            {f.label}
          </button>
        ))}
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
      ) : orders.length === 0 ? (
        <div className="panel-luxe p-12 text-center text-sm text-charcoal/55">
          No orders in this view yet.
        </div>
      ) : (
        <div className="panel-luxe overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-charcoal/10 bg-warm-gray/40 text-[10px] uppercase tracking-[0.18em] text-charcoal/50">
              <tr>
                <th className="px-4 py-3 font-bold">Order</th>
                <th className="px-4 py-3 font-bold">Buyer</th>
                <th className="px-4 py-3 font-bold">Total</th>
                <th className="px-4 py-3 font-bold">Sets</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className="cursor-pointer border-b border-charcoal/5 last:border-0 hover:bg-warm-gray/20"
                >
                  <td className="px-4 py-3 font-medium">#{o.display_number}</td>
                  <td className="px-4 py-3 text-charcoal/70">
                    {o.buyer?.businessName || o.buyer?.name || o.buyer?.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-charcoal/70">
                    ₹{Number(o.total_inr).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-charcoal/70">{o.total_sets}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-[0.15em]",
                        statusTone(o.status),
                      )}
                    >
                      {o.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-charcoal/50">
                    {new Date(o.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-2xl font-black uppercase leading-[0.9] tracking-[-0.055em]">
                  Order #{selected.display_number}
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 px-4 pb-8">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal/45">
                    Buyer
                  </p>
                  <div className="mt-2 space-y-0.5 text-sm text-charcoal/75">
                    <p className="font-medium text-charcoal">
                      {selected.buyer?.businessName ||
                        selected.buyer?.name ||
                        "—"}
                    </p>
                    {selected.buyer?.email && <p>{selected.buyer.email}</p>}
                    {selected.buyer?.phone && <p>{selected.buyer.phone}</p>}
                    {selected.buyer?.city && <p>{selected.buyer.city}</p>}
                    {selected.buyer?.gstin && <p>GSTIN: {selected.buyer.gstin}</p>}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal/45">
                    Line items
                  </p>
                  <div className="mt-2 divide-y divide-charcoal/5 border border-charcoal/10">
                    {selected.commerce_order_items?.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-charcoal">{it.title}</p>
                          <p className="text-[11px] text-charcoal/45">
                            {it.size ? `${it.size} · ` : ""}
                            {it.quantity} set{it.quantity > 1 ? "s" : ""} × ₹
                            {Number(it.unit_price_inr).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <p className="text-charcoal/70">
                          ₹{Number(it.line_total_inr).toLocaleString("en-IN")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-charcoal/10 pt-3">
                  <span className="text-sm text-charcoal/55">Total</span>
                  <span className="text-xl font-bold tracking-[0.06em]">
                    ₹{Number(selected.total_inr).toLocaleString("en-IN")}
                  </span>
                </div>

                {selected.payment_transaction_id && (
                  <p className="text-[11px] text-charcoal/40">
                    Paid via {selected.payment_provider} ·{" "}
                    {selected.payment_transaction_id}
                  </p>
                )}

                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal/45">
                    Update status — currently{" "}
                    <span className={statusTone(selected.status)}>
                      {selected.status.replace("_", " ")}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(NEXT_STATUSES[selected.status] ?? []).map((s) => (
                      <Button
                        key={s}
                        variant={s === "cancelled" ? "destructive" : "default"}
                        size="sm"
                        disabled={updating}
                        onClick={() => setStatus(selected, s)}
                      >
                        {updating ? <Loader2 className="animate-spin" /> : null}
                        Mark {s.replace("_", " ")}
                      </Button>
                    ))}
                    {(NEXT_STATUSES[selected.status] ?? []).length === 0 && (
                      <p className="text-sm text-charcoal/40">
                        No further transitions available.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
