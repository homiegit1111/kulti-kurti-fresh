"use client";

/**
 * Wholesale pricing rules.
 *
 * These values decide what buyers are charged, so the page is deliberately
 * cautious: a two-step save, a warning above it, and no editable form at all for
 * an account that cannot write pricing.
 *
 * `pricing:write` and `team:manage` are both owner-only, so a successful team
 * read is the cheapest honest signal that this account may change prices. Without
 * the probe a manager would get a form that looks fine and 403s on save.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  ActionButton,
  AdminPage,
  ConfirmButton,
  DataTable,
  Field,
  LoadingBlock,
  Panel,
  Pill,
  SectionGrid,
  StatusBanner,
  Td,
  TextInput,
  Th,
  Tr,
  adminFetch,
  useAdminResource,
} from "../_components/ui";

type PricingConfig = {
  minimumOrderSets: number;
  setSize: number;
  sizeRatio: string;
  currency: string;
};

type PricingTier = {
  minSets: number;
  discountPercent: number;
  label: string;
};

type PricingPayload = { config: PricingConfig; tiers: PricingTier[] };

type TierRow = { minSets: string; discountPercent: string; label: string };

type PricingForm = {
  minimumOrderSets: string;
  setSize: string;
  sizeRatio: string;
  tiers: TierRow[];
};

const MAX_TIERS = 8;

function formOf(payload: PricingPayload): PricingForm {
  return {
    minimumOrderSets: String(payload.config.minimumOrderSets),
    setSize: String(payload.config.setSize),
    sizeRatio: payload.config.sizeRatio,
    tiers: (payload.tiers.length > 0
      ? payload.tiers
      : [{ minSets: 0, discountPercent: 0, label: "Wholesale" }]
    ).map((tier) => ({
      minSets: String(tier.minSets),
      discountPercent: String(tier.discountPercent),
      label: tier.label ?? "",
    })),
  };
}

function intOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isInteger(n) ? n : null;
}

export default function AdminPricingPage() {
  const { data, loading, error, setError, reload } =
    useAdminResource<PricingPayload>("/api/admin/pricing");

  const [form, setForm] = useState<PricingForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [role, setRole] = useState("");
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [probing, setProbing] = useState(false);

  const probe = useCallback(async () => {
    try {
      const res = await adminFetch<{ you: { role: string } }>("/api/admin/team");
      setRole(res.you?.role ?? "");
      setCanEdit(res.you?.role === "owner");
    } catch {
      setCanEdit(false);
    }
  }, []);

  const recheck = useCallback(async () => {
    setProbing(true);
    try {
      await probe();
    } finally {
      setProbing(false);
    }
  }, [probe]);

  useEffect(() => {
    // Every setState in probe() runs after the await, never in this effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void probe();
  }, [probe]);

  useEffect(() => {
    if (!data) return;
    // Re-seed on every new payload, not just the first. `data` only changes on
    // mount and after a save, so this never eats an in-progress edit.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(formOf(data));
  }, [data]);

  const live = data ? formOf(data) : null;
  const dirty = useMemo(
    () => Boolean(form && live) && JSON.stringify(form) !== JSON.stringify(live),
    [form, live],
  );

  function patchConfig(next: Partial<Omit<PricingForm, "tiers">>) {
    setForm((prev) => (prev ? { ...prev, ...next } : prev));
  }

  function patchTier(index: number, next: Partial<TierRow>) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            tiers: prev.tiers.map((tier, i) => (i === index ? { ...tier, ...next } : tier)),
          }
        : prev,
    );
  }

  function addTier() {
    setForm((prev) =>
      prev && prev.tiers.length < MAX_TIERS
        ? { ...prev, tiers: [...prev.tiers, { minSets: "", discountPercent: "", label: "" }] }
        : prev,
    );
  }

  function removeTier(index: number) {
    setForm((prev) =>
      prev && prev.tiers.length > 1
        ? { ...prev, tiers: prev.tiers.filter((_, i) => i !== index) }
        : prev,
    );
  }

  function buildBody(current: PricingForm): { config: unknown; tiers: unknown } | string {
    const minimumOrderSets = intOrNull(current.minimumOrderSets);
    if (minimumOrderSets === null || minimumOrderSets < 1 || minimumOrderSets > 1000) {
      return "Minimum order has to be a whole number of sets between 1 and 1000.";
    }
    const setSize = intOrNull(current.setSize);
    if (setSize === null || setSize < 1 || setSize > 1000) {
      return "Pieces per set has to be a whole number between 1 and 1000.";
    }
    if (current.sizeRatio.trim().length > 40) {
      return "The size run is longer than 40 characters.";
    }

    if (current.tiers.length < 1 || current.tiers.length > MAX_TIERS) {
      return `Keep between 1 and ${MAX_TIERS} price steps.`;
    }

    const tiers: PricingTier[] = [];
    const seen = new Set<number>();
    for (const [index, row] of current.tiers.entries()) {
      const minSets = intOrNull(row.minSets);
      if (minSets === null || minSets < 0 || minSets > 10000) {
        return `Step ${index + 1}: "from sets" has to be a whole number between 0 and 10000.`;
      }
      if (seen.has(minSets)) {
        return `Two steps both start at ${minSets} sets. Each step needs its own starting number.`;
      }
      seen.add(minSets);

      const discountPercent = intOrNull(row.discountPercent);
      if (discountPercent === null || discountPercent < 0 || discountPercent > 50) {
        return `Step ${index + 1}: the discount has to be a whole number between 0 and 50.`;
      }
      tiers.push({ minSets, discountPercent, label: row.label.trim() });
    }

    if (!seen.has(0)) {
      return "One step has to start at 0 sets, otherwise a small order has no price to fall back on.";
    }

    return {
      config: {
        minimumOrderSets,
        setSize,
        sizeRatio: current.sizeRatio.trim(),
      },
      tiers,
    };
  }

  async function save() {
    if (!form) return;
    const body = buildBody(form);
    if (typeof body === "string") {
      setFormError(body);
      return;
    }
    setSaving(true);
    setFormError("");
    setError("");
    setNotice("");
    try {
      await adminFetch<{ ok: true }>("/api/admin/pricing", { method: "PATCH", body });
      await reload();
      setNotice(
        "Pricing saved. The shop, the price list and every quote use the new rules within about a minute.",
      );
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save the pricing rules.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) {
    return (
      <AdminPage eyebrow="Money" title="Pricing">
        <LoadingBlock label="Loading pricing" />
      </AdminPage>
    );
  }

  const readOnly = canEdit === false;
  const shown = readOnly ? live : form;

  return (
    <AdminPage
      eyebrow="Money"
      title="Pricing"
      description="How wholesale orders are priced: the smallest order you accept, what a set contains, and the discount steps for larger orders."
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
      {formError ? (
        <StatusBanner tone="error" onDismiss={() => setFormError("")}>
          {formError}
        </StatusBanner>
      ) : null}

      {readOnly ? (
        <StatusBanner tone="info">
          <p>
            These are your current pricing rules, shown for reference only.
            {role ? ` Your role is ${role}, and only` : " Only"} an owner account
            can change what buyers are charged.
          </p>
          <div className="mt-2">
            <ActionButton
              size="sm"
              variant="outline"
              onClick={() => void recheck()}
              busy={probing}
            >
              Check again
            </ActionButton>
          </div>
        </StatusBanner>
      ) : null}

      {!shown ? (
        <LoadingBlock label="Loading pricing" />
      ) : (
        <SectionGrid>
          <Panel
            title="Order rules"
            description="The terms printed across the site — the trade strip, the price list and every product page read these."
          >
            <div className="grid gap-5 sm:grid-cols-3">
              <Field
                label="Minimum order (sets)"
                help="Across the whole order, mixing styles."
                htmlFor="pricing-min"
              >
                <TextInput
                  id="pricing-min"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000}
                  disabled={readOnly}
                  value={shown.minimumOrderSets}
                  onChange={(e) => patchConfig({ minimumOrderSets: e.target.value })}
                />
              </Field>
              <Field
                label="Pieces per set"
                help="One set of a style contains this many garments."
                htmlFor="pricing-set-size"
              >
                <TextInput
                  id="pricing-set-size"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000}
                  disabled={readOnly}
                  value={shown.setSize}
                  onChange={(e) => patchConfig({ setSize: e.target.value })}
                />
              </Field>
              <Field
                label="Size run"
                help="The sizes in one set, as buyers should read it."
                htmlFor="pricing-ratio"
              >
                <TextInput
                  id="pricing-ratio"
                  disabled={readOnly}
                  value={shown.sizeRatio}
                  onChange={(e) => patchConfig({ sizeRatio: e.target.value })}
                  placeholder="S/M/L/XL"
                />
              </Field>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-content/50">
              Prices are in {data?.config.currency ?? "INR"}. A minimum of{" "}
              {shown.minimumOrderSets || "—"} sets at {shown.setSize || "—"} pieces a
              set is {Number(shown.minimumOrderSets) * Number(shown.setSize) || "—"}{" "}
              pieces.
            </p>
          </Panel>

          <Panel
            title="Volume ladder"
            description="Bigger orders, better rate. A basket takes the highest step it qualifies for."
            actions={
              readOnly ? null : (
                <ActionButton
                  size="sm"
                  variant="outline"
                  onClick={addTier}
                  disabled={shown.tiers.length >= MAX_TIERS}
                >
                  <Plus className="h-3.5 w-3.5" /> Add step
                </ActionButton>
              )
            }
          >
            <DataTable
              head={
                <Tr>
                  <Th className="w-32">From sets</Th>
                  <Th className="w-32">Discount %</Th>
                  <Th>What buyers see</Th>
                  {readOnly ? null : <Th className="w-20 text-right">Remove</Th>}
                </Tr>
              }
            >
              {shown.tiers.map((tier, index) => (
                <Tr key={index}>
                  <Td>
                    {readOnly ? (
                      <span className="tabular-nums text-content/75">{tier.minSets}</span>
                    ) : (
                      <TextInput
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={10000}
                        aria-label={`Step ${index + 1} — from how many sets`}
                        value={tier.minSets}
                        onChange={(e) => patchTier(index, { minSets: e.target.value })}
                      />
                    )}
                  </Td>
                  <Td>
                    {readOnly ? (
                      <span className="tabular-nums text-content/75">
                        {tier.discountPercent}%
                      </span>
                    ) : (
                      <TextInput
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={50}
                        aria-label={`Step ${index + 1} — discount percent`}
                        value={tier.discountPercent}
                        onChange={(e) =>
                          patchTier(index, { discountPercent: e.target.value })
                        }
                      />
                    )}
                  </Td>
                  <Td>
                    {readOnly ? (
                      <span className="text-content/75">{tier.label || "—"}</span>
                    ) : (
                      <TextInput
                        aria-label={`Step ${index + 1} — label`}
                        value={tier.label}
                        placeholder="Volume 8+ sets"
                        onChange={(e) => patchTier(index, { label: e.target.value })}
                      />
                    )}
                  </Td>
                  {readOnly ? null : (
                    <Td>
                      <div className="flex justify-end">
                        {shown.tiers.length > 1 ? (
                          <ConfirmButton
                            label={
                              <>
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="sr-only">Remove step {index + 1}</span>
                              </>
                            }
                            confirmLabel="Tap again to remove"
                            onConfirm={() => removeTier(index)}
                          />
                        ) : null}
                      </div>
                    </Td>
                  )}
                </Tr>
              ))}
            </DataTable>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {shown.tiers.some((t) => t.minSets.trim() === "0") ? (
                <Pill tone="good">Base step at 0 sets</Pill>
              ) : (
                <Pill tone="bad">No step at 0 sets</Pill>
              )}
              <span className="text-xs text-content/50">
                One step must start at 0 sets so every basket has a rate.
              </span>
            </div>
          </Panel>

          {readOnly ? null : (
            <Panel>
              <p className="text-sm font-bold leading-relaxed text-accent-red">
                Saving this changes what every buyer is charged, immediately, on the
                whole shop. Check the numbers before you confirm.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-content/55">
                Existing orders keep the price they were placed at. Baskets that have
                not been sent yet will be re-priced.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <ConfirmButton
                  label="Save pricing"
                  confirmLabel="Tap again to change buyer prices"
                  onConfirm={() => void save()}
                  busy={saving}
                  disabled={!dirty}
                  className="px-4 py-2.5 text-xs"
                />
                {dirty ? (
                  <ActionButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setForm(live)}
                    disabled={saving}
                  >
                    Undo my changes
                  </ActionButton>
                ) : (
                  <span className="text-xs text-content/45">
                    Nothing changed yet.
                  </span>
                )}
              </div>
            </Panel>
          )}
        </SectionGrid>
      )}
    </AdminPage>
  );
}
