"use client";

/**
 * Offers.
 *
 * The form is driven by `kind`: the rupee box does not exist while the offer is
 * a percentage, and the payload is rebuilt from `kind` on every submit rather
 * than shipping whatever was last typed. A percent offer therefore cannot carry
 * a rupee value even if the owner switched kinds mid-edit.
 */

import { useCallback, useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ActionButton,
  AdminPage,
  ConfirmButton,
  DataTable,
  EmptyState,
  Field,
  LoadingBlock,
  Panel,
  Pill,
  Select,
  StatusBanner,
  Td,
  TextArea,
  TextInput,
  Th,
  Toggle,
  Tr,
  adminFetch,
  useAdminResource,
} from "../_components/ui";
import type { PillTone } from "../_components/ui";

type OfferKind = "percent" | "flat_inr" | "free_shipping";
type OfferScope = "all" | "collection" | "product";
type OfferState = "scheduled" | "live" | "expired" | "paused" | "exhausted";

type Promotion = {
  id: string;
  code: string | null;
  title: string;
  description: string;
  kind: OfferKind;
  valuePercent: number | null;
  valueInr: number | null;
  scope: OfferScope;
  scopeHandles: string[];
  minSets: number;
  minSubtotalInr: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  maxRedemptions: number | null;
  maxRedemptionsPerBuyer: number | null;
  redemptionCount: number;
  badgeLabel: string;
  priority: number;
  createdAt: string;
  state: OfferState;
};

type OfferForm = {
  id?: string;
  code: string;
  title: string;
  description: string;
  kind: OfferKind;
  valuePercent: string;
  valueInr: string;
  scope: OfferScope;
  scopeHandles: string;
  minSets: string;
  minSubtotalInr: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  maxRedemptions: string;
  maxRedemptionsPerBuyer: string;
  badgeLabel: string;
  priority: string;
};

const KIND_LABEL: Record<OfferKind, string> = {
  percent: "Percentage off",
  flat_inr: "Flat rupees off",
  free_shipping: "Free shipping",
};

const SCOPE_LABEL: Record<OfferScope, string> = {
  all: "Everything in the shop",
  collection: "Chosen collections",
  product: "Chosen styles",
};

const STATE_TONE: Record<OfferState, PillTone> = {
  live: "good",
  scheduled: "accent",
  paused: "neutral",
  expired: "neutral",
  exhausted: "warn",
};

const STATE_LABEL: Record<OfferState, string> = {
  live: "Live now",
  scheduled: "Starts later",
  paused: "Switched off",
  expired: "Finished",
  exhausted: "Fully used",
};

function emptyForm(): OfferForm {
  return {
    code: "",
    title: "",
    description: "",
    kind: "percent",
    valuePercent: "10",
    valueInr: "",
    scope: "all",
    scopeHandles: "",
    minSets: "0",
    minSubtotalInr: "0",
    startsAt: "",
    endsAt: "",
    isActive: true,
    maxRedemptions: "",
    maxRedemptionsPerBuyer: "",
    badgeLabel: "",
    priority: "0",
  };
}

function formOf(offer: Promotion): OfferForm {
  return {
    id: offer.id,
    code: offer.code ?? "",
    title: offer.title,
    description: offer.description ?? "",
    kind: offer.kind,
    valuePercent: offer.valuePercent === null ? "" : String(offer.valuePercent),
    valueInr: offer.valueInr === null ? "" : String(offer.valueInr),
    scope: offer.scope,
    scopeHandles: (offer.scopeHandles ?? []).join("\n"),
    minSets: String(offer.minSets ?? 0),
    minSubtotalInr: String(offer.minSubtotalInr ?? 0),
    startsAt: toLocalInput(offer.startsAt),
    endsAt: toLocalInput(offer.endsAt),
    isActive: offer.isActive,
    maxRedemptions: offer.maxRedemptions === null ? "" : String(offer.maxRedemptions),
    maxRedemptionsPerBuyer:
      offer.maxRedemptionsPerBuyer === null ? "" : String(offer.maxRedemptionsPerBuyer),
    badgeLabel: offer.badgeLabel ?? "",
    priority: String(offer.priority ?? 0),
  };
}

/** `datetime-local` wants wall-clock text; the API wants ISO 8601 UTC. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string | null {
  if (!local.trim()) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function intOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isInteger(n) ? n : null;
}

function intOr(raw: string, fallback: number): number {
  return intOrNull(raw) ?? fallback;
}

function parseHandles(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function rupees(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

function whenText(offer: Promotion): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (offer.startsAt && offer.endsAt) return `${fmt(offer.startsAt)} → ${fmt(offer.endsAt)}`;
  if (offer.startsAt) return `From ${fmt(offer.startsAt)}`;
  if (offer.endsAt) return `Until ${fmt(offer.endsAt)}`;
  return "No dates set";
}

function valueText(offer: Promotion): string {
  if (offer.kind === "percent") return `${offer.valuePercent ?? 0}% off`;
  if (offer.kind === "flat_inr") return `${rupees(offer.valueInr ?? 0)} off`;
  return "Free shipping";
}

export default function AdminOffersPage() {
  const { data, loading, error, setError, reload } =
    useAdminResource<{ promotions: Promotion[] }>("/api/admin/promotions");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<OfferForm>(emptyForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const [notice, setNotice] = useState("");

  const offers = useMemo(() => data?.promotions ?? [], [data]);

  const patch = useCallback((next: Partial<OfferForm>) => {
    setForm((prev) => ({ ...prev, ...next }));
  }, []);

  function openCreate() {
    setForm(emptyForm());
    setFormError("");
    setSheetOpen(true);
  }

  function openEdit(offer: Promotion) {
    setForm(formOf(offer));
    setFormError("");
    setSheetOpen(true);
  }

  function buildBody(): Record<string, unknown> | string {
    const title = form.title.trim();
    if (!title) return "Give the offer a name — buyers see it on the basket.";
    if (title.length > 120) return "The name is longer than 120 characters.";

    const handles = parseHandles(form.scopeHandles);
    if (form.scope !== "all" && handles.length === 0) {
      return form.scope === "collection"
        ? "Add at least one collection web address, or set the offer to everything."
        : "Add at least one style web address, or set the offer to everything.";
    }
    if (handles.length > 50) return "That is more than 50 web addresses.";

    const startsAt = fromLocalInput(form.startsAt);
    const endsAt = fromLocalInput(form.endsAt);
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      return "The end date has to be after the start date.";
    }

    // Rebuilt per kind — the value that does not belong to this kind is sent as
    // null, never carried over from an earlier choice.
    let value: { valuePercent: number | null; valueInr: number | null };
    if (form.kind === "percent") {
      const pct = intOrNull(form.valuePercent);
      if (pct === null || pct < 1 || pct > 90) {
        return "A percentage offer needs a whole number between 1 and 90.";
      }
      value = { valuePercent: pct, valueInr: null };
    } else if (form.kind === "flat_inr") {
      const inr = intOrNull(form.valueInr);
      if (inr === null || inr <= 0) {
        return "A flat-rupees offer needs an amount above zero.";
      }
      value = { valuePercent: null, valueInr: inr };
    } else {
      value = { valuePercent: null, valueInr: null };
    }

    const code = form.code.trim().toUpperCase();
    if (code && !/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) {
      return "A code must be 3–32 characters: letters, numbers, dash or underscore.";
    }

    return {
      code: code || null,
      title,
      description: form.description.trim(),
      kind: form.kind,
      ...value,
      scope: form.scope,
      scopeHandles: form.scope === "all" ? [] : handles,
      minSets: intOr(form.minSets, 0),
      minSubtotalInr: intOr(form.minSubtotalInr, 0),
      startsAt,
      endsAt,
      isActive: form.isActive,
      maxRedemptions: intOrNull(form.maxRedemptions),
      maxRedemptionsPerBuyer: intOrNull(form.maxRedemptionsPerBuyer),
      badgeLabel: form.badgeLabel.trim(),
      priority: intOr(form.priority, 0),
    };
  }

  async function save() {
    const body = buildBody();
    if (typeof body === "string") {
      setFormError(body);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await adminFetch<{ promotion: Promotion }>(
        form.id ? `/api/admin/promotions/${form.id}` : "/api/admin/promotions",
        { method: form.id ? "PATCH" : "POST", body },
      );
      setSheetOpen(false);
      await reload();
      setNotice(
        form.id
          ? "Offer saved. The shop shows it within about a minute."
          : "Offer created. The shop shows it within about a minute.",
      );
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save the offer.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(offer: Promotion) {
    setRemovingId(offer.id);
    setError("");
    setNotice("");
    try {
      const res = await adminFetch<{ ok: true; deactivated?: boolean; deleted?: boolean }>(
        `/api/admin/promotions/${offer.id}`,
        { method: "DELETE" },
      );
      await reload();
      setNotice(
        res.deactivated
          ? `"${offer.title}" was switched off rather than deleted, because buyers have already used it — the record has to stay for your order history. It no longer applies to new orders.`
          : `"${offer.title}" was deleted.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove the offer.");
    } finally {
      setRemovingId("");
    }
  }

  return (
    <AdminPage
      eyebrow="Selling"
      title="Offers"
      description="Discounts and codes. An offer only applies while it is live, within its dates, and under its usage limit."
      actions={
        <ActionButton onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> New offer
        </ActionButton>
      }
    >
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

      {loading && !data ? (
        <LoadingBlock label="Loading offers" />
      ) : offers.length === 0 ? (
        <EmptyState
          title="No offers yet"
          action={
            <ActionButton onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Create the first offer
            </ActionButton>
          }
        >
          Set up a percentage off, a flat rupee discount, or free shipping — with or
          without a code buyers have to type.
        </EmptyState>
      ) : (
        <Panel>
          <DataTable
            head={
              <Tr>
                <Th>Offer</Th>
                <Th>Discount</Th>
                <Th>Applies to</Th>
                <Th>Dates</Th>
                <Th>Used</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            }
          >
            {offers.map((offer) => (
              <Tr key={offer.id}>
                <Td>
                  <p className="font-medium text-content">{offer.title}</p>
                  <p className="mt-0.5 text-[11px] text-content/45">
                    {offer.code ? `Code: ${offer.code}` : "Applied automatically"}
                  </p>
                </Td>
                <Td className="text-content/70">{valueText(offer)}</Td>
                <Td className="text-content/70">
                  <p>{SCOPE_LABEL[offer.scope]}</p>
                  {offer.scope !== "all" ? (
                    <p className="mt-0.5 text-[11px] text-content/45">
                      {offer.scopeHandles.length} listed
                    </p>
                  ) : null}
                  {offer.minSets > 0 ? (
                    <p className="mt-0.5 text-[11px] text-content/45">
                      {offer.minSets}+ sets
                    </p>
                  ) : null}
                </Td>
                <Td className="whitespace-nowrap text-[11px] text-content/55">
                  {whenText(offer)}
                </Td>
                <Td className="tabular-nums text-content/70">
                  {offer.maxRedemptions
                    ? `${offer.redemptionCount} / ${offer.maxRedemptions}`
                    : `${offer.redemptionCount} times`}
                </Td>
                <Td>
                  <Pill tone={STATE_TONE[offer.state]}>{STATE_LABEL[offer.state]}</Pill>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      aria-label={`Edit ${offer.title}`}
                      onClick={() => openEdit(offer)}
                      className="border border-line/20 p-1.5 text-content/50 transition-colors hover:border-content/40 hover:text-content"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <ConfirmButton
                      label="Delete"
                      confirmLabel="Tap again to delete"
                      onConfirm={() => void remove(offer)}
                      busy={removingId === offer.id}
                    />
                  </div>
                </Td>
              </Tr>
            ))}
          </DataTable>
        </Panel>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="text-2xl font-black uppercase leading-[0.9] tracking-[-0.055em]">
              {form.id ? "Edit offer" : "New offer"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 pb-10">
            {formError ? (
              <StatusBanner tone="error" onDismiss={() => setFormError("")}>
                {formError}
              </StatusBanner>
            ) : null}

            <Field
              label="Offer name"
              help="Buyers see this on the basket."
              htmlFor="offer-title"
            >
              <TextInput
                id="offer-title"
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Diwali 10%"
              />
            </Field>

            <Field
              label="Code buyers type"
              help="Leave blank and the offer applies on its own, with no code."
              htmlFor="offer-code"
            >
              <TextInput
                id="offer-code"
                value={form.code}
                spellCheck={false}
                onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
                placeholder="DIWALI10"
              />
            </Field>

            <Field label="Kind of discount" htmlFor="offer-kind">
              <Select
                id="offer-kind"
                value={form.kind}
                onChange={(e) => patch({ kind: e.target.value as OfferKind })}
              >
                {(Object.keys(KIND_LABEL) as OfferKind[]).map((kind) => (
                  <option key={kind} value={kind}>
                    {KIND_LABEL[kind]}
                  </option>
                ))}
              </Select>
            </Field>

            {form.kind === "percent" ? (
              <Field
                label="Percentage off"
                help="Between 1 and 90."
                htmlFor="offer-percent"
              >
                <TextInput
                  id="offer-percent"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={90}
                  value={form.valuePercent}
                  onChange={(e) => patch({ valuePercent: e.target.value })}
                />
              </Field>
            ) : null}

            {form.kind === "flat_inr" ? (
              <Field
                label="Rupees off"
                help="Taken off the order total."
                htmlFor="offer-inr"
              >
                <TextInput
                  id="offer-inr"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={form.valueInr}
                  onChange={(e) => patch({ valueInr: e.target.value })}
                />
              </Field>
            ) : null}

            {form.kind === "free_shipping" ? (
              <p className="border border-line/15 bg-surface-hover/40 px-3 py-2.5 text-xs leading-relaxed text-content/55">
                Free shipping has no amount to set. Use the minimums below if it
                should only apply to bigger orders.
              </p>
            ) : null}

            <Field label="Applies to" htmlFor="offer-scope">
              <Select
                id="offer-scope"
                value={form.scope}
                onChange={(e) => patch({ scope: e.target.value as OfferScope })}
              >
                {(Object.keys(SCOPE_LABEL) as OfferScope[]).map((scope) => (
                  <option key={scope} value={scope}>
                    {SCOPE_LABEL[scope]}
                  </option>
                ))}
              </Select>
            </Field>

            {form.scope !== "all" ? (
              <Field
                label={form.scope === "collection" ? "Collection web addresses" : "Style web addresses"}
                help="One per line. This is the last part of the web address, e.g. summer-edit. Up to 50."
                htmlFor="offer-handles"
              >
                <TextArea
                  id="offer-handles"
                  rows={4}
                  spellCheck={false}
                  value={form.scopeHandles}
                  onChange={(e) => patch({ scopeHandles: e.target.value })}
                  placeholder={"summer-edit\nchikankari"}
                />
              </Field>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Minimum sets"
                help="0 means no minimum."
                htmlFor="offer-min-sets"
              >
                <TextInput
                  id="offer-min-sets"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.minSets}
                  onChange={(e) => patch({ minSets: e.target.value })}
                />
              </Field>
              <Field
                label="Minimum order value (₹)"
                help="0 means no minimum."
                htmlFor="offer-min-total"
              >
                <TextInput
                  id="offer-min-total"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.minSubtotalInr}
                  onChange={(e) => patch({ minSubtotalInr: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Starts"
                help="Leave blank to start straight away."
                htmlFor="offer-starts"
              >
                <TextInput
                  id="offer-starts"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => patch({ startsAt: e.target.value })}
                />
              </Field>
              <Field label="Ends" help="Leave blank to run until you stop it." htmlFor="offer-ends">
                <TextInput
                  id="offer-ends"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => patch({ endsAt: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Total uses allowed"
                help="Blank means unlimited."
                htmlFor="offer-max"
              >
                <TextInput
                  id="offer-max"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={form.maxRedemptions}
                  onChange={(e) => patch({ maxRedemptions: e.target.value })}
                />
              </Field>
              <Field
                label="Uses per buyer"
                help="Blank means unlimited."
                htmlFor="offer-max-buyer"
              >
                <TextInput
                  id="offer-max-buyer"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={form.maxRedemptionsPerBuyer}
                  onChange={(e) => patch({ maxRedemptionsPerBuyer: e.target.value })}
                />
              </Field>
            </div>

            <Field
              label="Badge on the style card"
              help="Short — up to 40 characters. Blank shows no badge."
              htmlFor="offer-badge"
            >
              <TextInput
                id="offer-badge"
                value={form.badgeLabel}
                onChange={(e) => patch({ badgeLabel: e.target.value })}
                placeholder="10% off"
              />
            </Field>

            <Field
              label="Note for yourself"
              help="Not shown to buyers."
              htmlFor="offer-description"
            >
              <TextArea
                id="offer-description"
                rows={2}
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>

            <Field
              label="Order of preference"
              help="When two offers could both apply, the higher number wins."
              htmlFor="offer-priority"
            >
              <TextInput
                id="offer-priority"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.priority}
                onChange={(e) => patch({ priority: e.target.value })}
              />
            </Field>

            <Toggle
              checked={form.isActive}
              onChange={(next) => patch({ isActive: next })}
              label={form.isActive ? "Switched on" : "Switched off"}
            />

            <div className="flex flex-wrap gap-2 pt-2">
              <ActionButton onClick={() => void save()} busy={saving} className="flex-1">
                {form.id ? "Save offer" : "Create offer"}
              </ActionButton>
              <ActionButton variant="outline" onClick={() => setSheetOpen(false)}>
                Cancel
              </ActionButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AdminPage>
  );
}
