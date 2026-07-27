"use client";

import { Fragment, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  History,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ActionButton,
  AdminPage,
  DataTable,
  EmptyState,
  Field,
  LoadingBlock,
  Panel,
  Pill,
  SectionGrid,
  Spinner,
  StatusBanner,
  Td,
  TextInput,
  Th,
  Toggle,
  Tr,
  adminFetch,
  useAdminResource,
  type PillTone,
} from "../_components/ui";

// ---------------------------------------------------------------------------
// Contract types — /api/admin/stock
// ---------------------------------------------------------------------------

type StockState = "in_stock" | "low" | "out" | "untracked";

type StockRow = {
  variantId: string;
  productId: string;
  productTitle: string;
  handle: string;
  thumbnail: string | null;
  size: string;
  sku: string | null;
  status: "published" | "draft";
  setPriceInr: number;
  salePriceInr: number | null;
  inventoryQuantity: number;
  manageInventory: boolean;
  allowBackorder: boolean;
  lowStockThreshold: number;
  state: StockState;
};

type StockSummary = {
  tracked: number;
  low: number;
  out: number;
  untracked: number;
  totalSets: number;
};

type StockResponse = { rows: StockRow[]; summary: StockSummary };

type Movement = {
  id: string;
  variant_id: string;
  delta: number;
  quantity_after: number;
  reason: string;
  note: string | null;
  order_id: string | null;
  actor_clerk_user_id: string | null;
  created_at: string;
};

type AdjustResult = {
  variantId: string;
  ok: boolean;
  before?: number;
  after?: number;
  error?: string;
};

/** One queued adjustment per variant, matching the PATCH body's shape exactly. */
type PendingEdit = { mode: "delta" | "absolute"; amount: number };

type SettingsDraft = {
  variantId: string;
  manageInventory: boolean;
  allowBackorder: boolean;
  lowStockThreshold: string;
};

// ---------------------------------------------------------------------------

const FILTERS = [
  { value: "all", label: "All" },
  { value: "low", label: "Low" },
  { value: "out", label: "Out of stock" },
  { value: "tracked", label: "Tracked" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

function toFilter(raw: string | null): FilterValue {
  const hit = FILTERS.find((f) => f.value === raw);
  return hit ? hit.value : "all";
}

const STATE_LABEL: Record<StockState, string> = {
  in_stock: "In stock",
  low: "Low",
  out: "Out",
  untracked: "Not tracked",
};

const STATE_TONE: Record<StockState, PillTone> = {
  in_stock: "good",
  low: "warn",
  out: "bad",
  untracked: "neutral",
};

const REASON_WORDS: Record<string, string> = {
  manual_adjust: "Changed by hand",
  manual_set: "Set by hand",
  restock: "Restock",
  correction: "Correction",
  bulk_import: "Bulk import",
  order: "Order",
  order_paid: "Order paid",
  order_cancelled: "Order cancelled",
};

function reasonWords(reason: string): string {
  return REASON_WORDS[reason] ?? reason.replace(/_/g, " ");
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

// useSearchParams needs a boundary, so the interactive page is a child.
export default function AdminStockPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading stock" />}>
      <StockStudio />
    </Suspense>
  );
}

function StockStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filter, setFilter] = useState<FilterValue>(() =>
    toFilter(searchParams.get("filter")),
  );
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  const [pending, setPending] = useState<Record<string, PendingEdit>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, AdjustResult>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const [openRow, setOpenRow] = useState<string | null>(null);
  const [movements, setMovements] = useState<Record<string, Movement[]>>({});
  const [movementsBusy, setMovementsBusy] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsDraft | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const url = useMemo(() => {
    const params = new URLSearchParams({ filter, limit: "200" });
    if (search) params.set("q", search);
    return `/api/admin/stock?${params.toString()}`;
  }, [filter, search]);

  const { data, setData, loading, error, setError, reload } =
    useAdminResource<StockResponse>(url);

  const chooseFilter = useCallback(
    (next: FilterValue) => {
      setFilter(next);
      // Per-row save results belong to the view they were saved in.
      setResults({});
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete("filter");
      else params.set("filter", next);
      const qs = params.toString();
      // replace, not push: filter tabs should not stack up in the back button.
      router.replace(qs ? `/admin/stock?${qs}` : "/admin/stock", { scroll: false });
    },
    [router, searchParams],
  );

  const clearResult = useCallback((variantId: string) => {
    setResults((prev) => {
      if (!(variantId in prev)) return prev;
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
  }, []);

  const clearDraft = useCallback((variantId: string) => {
    setDrafts((prev) => {
      if (!(variantId in prev)) return prev;
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
  }, []);

  /**
   * −/+ queue a delta so repeated taps stay one adjustment. Once a row has an
   * absolute set queued, the buttons move that number instead — mixing the two
   * modes on one variant would make the projected count a lie.
   */
  const bump = useCallback(
    (row: StockRow, step: number) => {
      setNotice("");
      clearResult(row.variantId);
      clearDraft(row.variantId);
      setPending((prev) => {
        const current = prev[row.variantId];
        const next = { ...prev };
        if (current?.mode === "absolute") {
          const amount = current.amount + step;
          if (amount < 0) return prev;
          if (amount === row.inventoryQuantity) delete next[row.variantId];
          else next[row.variantId] = { mode: "absolute", amount };
          return next;
        }
        const amount = (current?.amount ?? 0) + step;
        if (row.inventoryQuantity + amount < 0) return prev;
        if (amount === 0) delete next[row.variantId];
        else next[row.variantId] = { mode: "delta", amount };
        return next;
      });
    },
    [clearDraft, clearResult],
  );

  const typeAbsolute = useCallback(
    (row: StockRow, text: string) => {
      setNotice("");
      clearResult(row.variantId);
      setDrafts((prev) => ({ ...prev, [row.variantId]: text }));
      const trimmed = text.trim();
      if (!trimmed) return;
      const value = Number(trimmed);
      if (!Number.isInteger(value) || value < 0) return;
      setPending((prev) => {
        const next = { ...prev };
        if (value === row.inventoryQuantity) delete next[row.variantId];
        else next[row.variantId] = { mode: "absolute", amount: value };
        return next;
      });
    },
    [clearResult],
  );

  const pendingCount = Object.keys(pending).length;

  const discardAll = useCallback(() => {
    setPending({});
    setDrafts({});
    setResults({});
    setNotice("");
  }, []);

  async function saveAll() {
    // The API takes at most 100 adjustments per call. Send the first 100 and
    // keep the rest queued rather than failing the whole batch.
    const queued = Object.entries(pending);
    const entries = queued.slice(0, 100);
    if (entries.length === 0) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await adminFetch<{ results: AdjustResult[]; applied: number }>(
        "/api/admin/stock",
        {
          method: "PATCH",
          body: {
            adjustments: entries.map(([variantId, edit]) => ({
              variantId,
              mode: edit.mode,
              amount: edit.amount,
            })),
          },
        },
      );
      const byId: Record<string, AdjustResult> = {};
      for (const result of response.results ?? []) byId[result.variantId] = result;
      setResults(byId);
      setDrafts({});
      // Failures stay queued so a retry is one tap, not a re-count.
      setPending((prev) => {
        const next: Record<string, PendingEdit> = {};
        for (const [id, edit] of Object.entries(prev)) {
          if (!byId[id]?.ok) next[id] = edit;
        }
        return next;
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              rows: prev.rows.map((row) => {
                const hit = byId[row.variantId];
                return hit?.ok && typeof hit.after === "number"
                  ? { ...row, inventoryQuantity: hit.after }
                  : row;
              }),
            }
          : prev,
      );
      const failed = (response.results ?? []).filter((r) => !r.ok).length;
      const leftover = queued.length - entries.length;
      setNotice(
        [
          failed
            ? `${response.applied} saved · ${failed} could not be saved. See the rows marked in red.`
            : `${response.applied} ${response.applied === 1 ? "change" : "changes"} saved.`,
          leftover > 0 ? `${leftover} more are still queued — tap save again.` : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      // Summary counts and state pills are server-derived, so pull them fresh.
      void reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the stock changes.");
    } finally {
      setSaving(false);
    }
  }

  async function loadMovements(variantId: string) {
    setMovementsBusy(variantId);
    try {
      const response = await adminFetch<{ movements: Movement[] }>(
        `/api/admin/stock/movements?variantId=${encodeURIComponent(variantId)}&limit=20`,
      );
      setMovements((prev) => ({ ...prev, [variantId]: response.movements ?? [] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the stock history.");
    } finally {
      setMovementsBusy(null);
    }
  }

  function toggleRow(row: StockRow) {
    if (openRow === row.variantId) {
      setOpenRow(null);
      return;
    }
    setOpenRow(row.variantId);
    setSettings({
      variantId: row.variantId,
      manageInventory: row.manageInventory,
      allowBackorder: row.allowBackorder,
      lowStockThreshold: String(row.lowStockThreshold),
    });
    if (!movements[row.variantId]) void loadMovements(row.variantId);
  }

  async function saveSettings(row: StockRow) {
    if (!settings || settings.variantId !== row.variantId) return;
    const threshold = Number(settings.lowStockThreshold.trim());
    if (!Number.isInteger(threshold) || threshold < 0 || threshold > 10000) {
      setError("The low stock warning must be a whole number between 0 and 10000.");
      return;
    }
    setSettingsBusy(true);
    setError("");
    setNotice("");
    try {
      await adminFetch<{ ok: true }>("/api/admin/stock/settings", {
        method: "PATCH",
        body: {
          variantId: row.variantId,
          manageInventory: settings.manageInventory,
          allowBackorder: settings.allowBackorder,
          lowStockThreshold: threshold,
        },
      });
      setNotice(`Tracking settings saved for ${row.productTitle} · ${row.size}.`);
      void reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the tracking settings.");
    } finally {
      setSettingsBusy(false);
    }
  }

  const summary = data?.summary;
  const rows = data?.rows ?? [];

  return (
    <AdminPage
      eyebrow="Every morning"
      title="Stock"
      description="Count what is on the shelf. Tap − or + as you check, then save everything in one go."
      actions={
        <ActionButton
          variant="outline"
          size="sm"
          onClick={() => void reload()}
          busy={loading}
        >
          Refresh
        </ActionButton>
      }
    >
      <div className={cn(pendingCount > 0 && "pb-24")}>
        {error ? (
          <StatusBanner tone="error" onDismiss={() => setError("")}>
            {error}
          </StatusBanner>
        ) : null}
        {notice ? (
          <StatusBanner tone="success" onDismiss={() => setNotice("")}>
            {notice}
          </StatusBanner>
        ) : null}

        <SectionGrid>
          {summary ? (
            <div className="grid grid-cols-2 gap-px border border-line/12 bg-line/10 sm:grid-cols-5">
              <SummaryCell label="Tracked sizes" value={summary.tracked} />
              <SummaryCell label="Low" value={summary.low} loud={summary.low > 0} />
              <SummaryCell label="Out of stock" value={summary.out} loud={summary.out > 0} />
              <SummaryCell label="Not tracked" value={summary.untracked} />
              <SummaryCell label="Sets on hand" value={summary.totalSets} />
            </div>
          ) : null}

          <Panel>
            <div className="flex flex-col gap-4">
              <div className="no-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto px-1">
                {FILTERS.map((tab) => {
                  const active = filter === tab.value;
                  const count =
                    summary && tab.value === "low"
                      ? summary.low
                      : summary && tab.value === "out"
                        ? summary.out
                        : summary && tab.value === "tracked"
                          ? summary.tracked
                          : null;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => chooseFilter(tab.value)}
                      className={cn(
                        "shrink-0 border-b-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors",
                        active
                          ? "border-accent-red text-content"
                          : "border-transparent text-content/40 hover:text-content",
                      )}
                    >
                      {tab.label}
                      {count !== null ? (
                        <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content/35" />
                <TextInput
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setResults({});
                  }}
                  placeholder="Search a style, web address or SKU"
                  aria-label="Search stock"
                  className="pl-8"
                  spellCheck={false}
                />
                {loading && data ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-content/35">
                    <Spinner className="h-3.5 w-3.5" />
                  </span>
                ) : null}
              </div>
            </div>
          </Panel>

          <Panel
            title="Sizes"
            description={
              rows.length > 0
                ? `${rows.length} ${rows.length === 1 ? "size" : "sizes"} in this view.`
                : undefined
            }
          >
            {loading && !data ? (
              <LoadingBlock label="Loading stock" />
            ) : rows.length === 0 ? (
              <EmptyState
                title={search ? "No matches" : "Nothing in this view"}
                action={
                  filter === "all" && !search ? undefined : (
                    <ActionButton
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setQuery("");
                        chooseFilter("all");
                      }}
                    >
                      Show everything
                    </ActionButton>
                  )
                }
              >
                {search
                  ? "No style, web address or SKU matches that search."
                  : "Nothing needs attention in this view."}
              </EmptyState>
            ) : (
              <DataTable
                head={
                  <tr>
                    <Th className="w-12" />
                    <Th>Style</Th>
                    <Th>Size</Th>
                    <Th>SKU</Th>
                    <Th>Set price</Th>
                    <Th>State</Th>
                    <Th className="text-right">In stock</Th>
                    <Th className="w-10" />
                  </tr>
                }
              >
                {rows.map((row) => {
                  const edit = pending[row.variantId];
                  const projected = edit
                    ? edit.mode === "absolute"
                      ? edit.amount
                      : row.inventoryQuantity + edit.amount
                    : row.inventoryQuantity;
                  const result = results[row.variantId];
                  const open = openRow === row.variantId;
                  const label = `${row.productTitle} size ${row.size}`;

                  return (
                    <Fragment key={row.variantId}>
                      <Tr className={cn(edit && "bg-accent-lime/6")}>
                        <Td>
                          <div className="relative h-12 w-10 shrink-0 overflow-hidden border border-line/10 bg-surface-hover">
                            {row.thumbnail ? (
                              <Image
                                src={row.thumbnail}
                                alt=""
                                fill
                                unoptimized
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : null}
                          </div>
                        </Td>
                        <Td>
                          <div className="min-w-[9rem]">
                            <p className="font-medium leading-snug">{row.productTitle}</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-content/40">
                              <span className="truncate">/{row.handle}</span>
                              {row.status === "draft" ? <Pill>Draft</Pill> : null}
                            </p>
                          </div>
                        </Td>
                        <Td className="font-medium tabular-nums">{row.size}</Td>
                        <Td className="text-[11px] text-content/50">{row.sku || "—"}</Td>
                        <Td className="whitespace-nowrap tabular-nums">
                          {row.salePriceInr !== null && row.salePriceInr < row.setPriceInr ? (
                            <span className="flex items-baseline gap-1.5">
                              <span className="font-medium text-accent-red">
                                {inr(row.salePriceInr)}
                              </span>
                              <span className="text-[11px] text-content/35 line-through">
                                {inr(row.setPriceInr)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-content/70">{inr(row.setPriceInr)}</span>
                          )}
                        </Td>
                        <Td>
                          <Pill tone={STATE_TONE[row.state]}>{STATE_LABEL[row.state]}</Pill>
                        </Td>
                        <Td>
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => bump(row, -1)}
                                aria-label={`One less of ${label}`}
                                className="flex h-8 w-8 items-center justify-center border border-line/20 text-content/60 transition-colors hover:border-content/45 hover:text-content"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <TextInput
                                type="number"
                                inputMode="numeric"
                                min={0}
                                value={drafts[row.variantId] ?? String(projected)}
                                onChange={(e) => typeAbsolute(row, e.target.value)}
                                onBlur={() => clearDraft(row.variantId)}
                                aria-label={`Stock count for ${label}`}
                                className={cn(
                                  // Native spinners are dead weight next to −/+.
                                  "h-8 w-16 px-2 py-0 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                                  edit && "border-accent-lime text-accent-lime",
                                )}
                              />
                              <button
                                type="button"
                                onClick={() => bump(row, 1)}
                                aria-label={`One more of ${label}`}
                                className="flex h-8 w-8 items-center justify-center border border-line/20 text-content/60 transition-colors hover:border-content/45 hover:text-content"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {edit ? (
                              <span className="flex items-center gap-1.5 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.12em] text-accent-lime">
                                Unsaved
                                <span className="tabular-nums opacity-70">
                                  {row.inventoryQuantity} → {projected}
                                </span>
                              </span>
                            ) : result?.ok ? (
                              <span className="flex items-center gap-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">
                                <Check className="h-3 w-3" />
                                Saved
                              </span>
                            ) : null}
                            {result && !result.ok ? (
                              <span className="max-w-[12rem] text-right text-[10px] leading-snug text-accent-red">
                                {result.error || "Could not save this row."}
                              </span>
                            ) : null}
                          </div>
                        </Td>
                        <Td>
                          <button
                            type="button"
                            onClick={() => toggleRow(row)}
                            aria-expanded={open}
                            aria-label={`${open ? "Hide" : "Show"} history and settings for ${label}`}
                            className="flex h-8 w-8 items-center justify-center text-content/45 transition-colors hover:text-content"
                          >
                            <ChevronDown
                              className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
                            />
                          </button>
                        </Td>
                      </Tr>

                      {open ? (
                        // Raw td: the kit's Td takes no colSpan, and a full-width
                        // detail row is the only place that needs one.
                        <tr className="border-b border-line/6 bg-surface-hover/25">
                          <td colSpan={8} className="px-4 py-5">
                            <div className="grid gap-6 lg:grid-cols-2">
                              <div>
                                <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-content/45">
                                  <Settings2 className="h-3.5 w-3.5" />
                                  Tracking
                                </p>
                                {settings && settings.variantId === row.variantId ? (
                                  <div className="flex flex-col gap-3.5">
                                    <Toggle
                                      label="Count stock for this size"
                                      checked={settings.manageInventory}
                                      onChange={(next) =>
                                        setSettings((prev) =>
                                          prev ? { ...prev, manageInventory: next } : prev,
                                        )
                                      }
                                    />
                                    <Toggle
                                      label="Let buyers order when it is finished"
                                      checked={settings.allowBackorder}
                                      onChange={(next) =>
                                        setSettings((prev) =>
                                          prev ? { ...prev, allowBackorder: next } : prev,
                                        )
                                      }
                                    />
                                    <Field
                                      label="Warn me at"
                                      help="Show this size as Low once it reaches this count. 0 turns the warning off."
                                      htmlFor={`threshold-${row.variantId}`}
                                    >
                                      <TextInput
                                        id={`threshold-${row.variantId}`}
                                        type="number"
                                        inputMode="numeric"
                                        min={0}
                                        max={10000}
                                        value={settings.lowStockThreshold}
                                        onChange={(e) =>
                                          setSettings((prev) =>
                                            prev
                                              ? { ...prev, lowStockThreshold: e.target.value }
                                              : prev,
                                          )
                                        }
                                        className="w-28 tabular-nums"
                                      />
                                    </Field>
                                    <div>
                                      <ActionButton
                                        size="sm"
                                        busy={settingsBusy}
                                        onClick={() => void saveSettings(row)}
                                      >
                                        Save settings
                                      </ActionButton>
                                    </div>
                                  </div>
                                ) : null}
                              </div>

                              <div>
                                <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-content/45">
                                  <History className="h-3.5 w-3.5" />
                                  Recent movements
                                </p>
                                {movementsBusy === row.variantId ? (
                                  <p className="flex items-center gap-2 text-sm text-content/45">
                                    <Spinner className="h-3.5 w-3.5" /> Loading history
                                  </p>
                                ) : (movements[row.variantId]?.length ?? 0) === 0 ? (
                                  <p className="text-sm text-content/45">
                                    No changes recorded for this size yet.
                                  </p>
                                ) : (
                                  <ul className="flex flex-col divide-y divide-line/8 border border-line/10">
                                    {movements[row.variantId]?.map((move) => (
                                      <li
                                        key={move.id}
                                        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2"
                                      >
                                        <span className="flex items-baseline gap-2">
                                          <span
                                            className={cn(
                                              "text-sm font-bold tabular-nums",
                                              move.delta < 0
                                                ? "text-accent-red"
                                                : "text-emerald-700 dark:text-emerald-400",
                                            )}
                                          >
                                            {move.delta > 0 ? `+${move.delta}` : move.delta}
                                          </span>
                                          <span className="text-[11px] text-content/55">
                                            {reasonWords(move.reason)}
                                            {move.note ? ` · ${move.note}` : ""}
                                          </span>
                                        </span>
                                        <span className="text-[11px] tabular-nums text-content/40">
                                          left {move.quantity_after} · {stamp(move.created_at)}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </DataTable>
            )}
          </Panel>
        </SectionGrid>
      </div>

      {pendingCount > 0 ? (
        <div
          role="status"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line/15 bg-surface/95 px-4 py-3 backdrop-blur sm:px-6"
        >
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-content/70">
              <span className="font-bold text-content">
                {pendingCount} {pendingCount === 1 ? "size" : "sizes"} counted
              </span>{" "}
              — nothing is live until you save.
            </p>
            <div className="flex items-center gap-2">
              <ActionButton variant="ghost" size="sm" onClick={discardAll} disabled={saving}>
                <RotateCcw className="h-3.5 w-3.5" />
                Discard
              </ActionButton>
              <ActionButton onClick={() => void saveAll()} busy={saving}>
                Save {pendingCount} {pendingCount === 1 ? "change" : "changes"}
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}

function SummaryCell({
  label,
  value,
  loud,
}: {
  label: string;
  value: number;
  loud?: boolean;
}) {
  return (
    <div className={cn("bg-surface-2 px-4 py-4", loud && "bg-accent-red/8")}>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-content/45">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 text-[1.6rem] font-black leading-none tracking-[-0.04em] tabular-nums",
          loud && "text-accent-red",
        )}
      >
        {value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}
