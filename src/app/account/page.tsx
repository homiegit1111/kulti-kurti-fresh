"use client";

/**
 * §7.3 — the buyer profile as a ledger: real rows only (saved profile facts,
 * saved-linesheet count, MOQ from config), on-blur b2b validation with the
 * vermilion rail, and a pre-addressed PO — the saved profile feeds
 * `buildWholesaleWhatsAppUrl` so a repeat buyer's order opens addressed.
 */

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, LogOut, MessageCircle, User } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useClerk, useUser, isAuthEnabled } from "@/lib/auth/client";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { B2B_CONFIG, type BusinessType } from "@/lib/b2b/config";
import { isValidGSTIN, isValidWhatsappPhone } from "@/lib/b2b/validation";
import {
  buildCatalogRequestUrl,
  buildWholesaleWhatsAppUrl,
} from "@/lib/b2b/whatsapp";

type ProfileForm = {
  business_name: string;
  city: string;
  gstin: string;
  whatsapp_phone: string;
  business_type: BusinessType;
};

const emptyProfile: ProfileForm = {
  business_name: "",
  city: "",
  gstin: "",
  whatsapp_phone: "",
  business_type: "Boutique",
};

export default function AccountPage() {
  if (!isAuthEnabled) return <AccountUnavailable />;
  return <AccountInner />;
}

function AccountInner() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { items } = useCart();
  const { count: linesheetCount } = useWishlist();
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch("/api/wholesale-profile", { cache: "no-store" })
      .then((res) => res.json())
      .then((raw) => {
        const data = raw as { profile?: Partial<ProfileForm> | null };
        if (data.profile) {
          setForm({
            business_name: data.profile.business_name ?? "",
            city: data.profile.city ?? "",
            gstin: data.profile.gstin ?? "",
            whatsapp_phone: data.profile.whatsapp_phone ?? "",
            business_type: data.profile.business_type ?? "Boutique",
          });
        }
      })
      .catch(() => {
        setMessage("Could not load the saved profile.");
      })
      .finally(() => setLoading(false));
  }, [isLoaded, user]);

  const updateField = <K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/wholesale-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save profile.");
      setMessage("Wholesale profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  // The saved profile, in the frozen WhatsApp-builder shape — a repeat buyer's
  // PO opens pre-addressed.
  const preAddressedPoUrl = buildWholesaleWhatsAppUrl(items, {
    businessName: form.business_name || undefined,
    city: form.city || undefined,
    whatsappPhone: form.whatsapp_phone || undefined,
    gstin: form.gstin || undefined,
  });

  if (!isLoaded || !user) {
    return (
      <PageShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin border-2 border-line border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="flex-1 pb-24 pt-24 lg:pt-28">
        <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-10 lg:px-16">
          <div className="mb-12 border-b-2 border-line pb-6">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-content/55">
              Wholesale account
            </p>
            <h1 className="mt-4 text-[clamp(2.75rem,6vw,5.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
              Wholesale buyer profile
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-6 text-content/60">
              Save your business details for faster WhatsApp inquiries, GST
              invoice confirmation, and repeat wholesale ordering.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-4">
            <aside className="lg:col-span-1">
              <div className="border border-line/20 bg-surface-inverse text-content-inverse">
                <div className="border-b border-content-inverse/20 px-6 py-10 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center border border-accent-lime/50">
                    <User className="h-7 w-7 text-accent-lime" strokeWidth={1.2} />
                  </div>
                  <h2 className="mt-5 text-2xl font-black uppercase leading-[0.9] tracking-[-0.03em]">
                    {user.firstName || "Wholesale Buyer"}
                  </h2>
                  <p className="mt-2 break-all text-[10px] tracking-[0.15em] text-content-inverse/50">
                    {user.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
                <div className="flex flex-col">
                  <Link
                    href="/bulk-order"
                    className="flex w-full items-center gap-3 border-l-2 border-accent-lime bg-content-inverse/10 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-content-inverse"
                  >
                    Bulk Order
                  </Link>
                  <Link
                    href="/wishlist"
                    className="flex w-full items-center gap-3 border-l-2 border-transparent px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-content-inverse/50 transition-colors hover:border-content-inverse/40 hover:text-content-inverse"
                  >
                    Saved styles
                  </Link>
                  <button
                    onClick={() => signOut({ redirectUrl: "/" })}
                    className="flex w-full items-center gap-3 border-l-2 border-transparent px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-content-inverse/40 transition-colors hover:border-accent-red hover:text-accent-red"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={1.5} /> Sign Out
                  </button>
                </div>
              </div>
            </aside>

            <section className="lg:col-span-3">
              <form
                onSubmit={saveProfile}
                className="border border-line/25 p-6 sm:p-8 lg:p-12"
              >
                {/* The account ledger — real registers only. */}
                <div className="ledger mb-10 divide-y divide-line/20 border-t border-line/25">
                  <AccountRow
                    label="Business"
                    value={form.business_name || "—"}
                  />
                  <AccountRow label="City" value={form.city || "—"} />
                  <AccountRow
                    label="Saved styles"
                    value={`${linesheetCount} ${
                      linesheetCount === 1 ? "style" : "styles"
                    }`}
                  />
                  <AccountRow
                    label="Minimum order"
                    value={`${B2B_CONFIG.minimumOrderSets} sets`}
                  />
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <Field
                    id="account-business-name"
                    label="Business Name"
                    value={form.business_name}
                    onChange={(value) => updateField("business_name", value)}
                    required
                  />
                  <Field
                    id="account-city"
                    label="City"
                    value={form.city}
                    onChange={(value) => updateField("city", value)}
                    required
                  />
                  <Field
                    id="account-whatsapp"
                    label="WhatsApp Phone"
                    value={form.whatsapp_phone}
                    onChange={(value) => updateField("whatsapp_phone", value)}
                    validate={(value) =>
                      value && !isValidWhatsappPhone(value)
                        ? "Enter a 10-digit Indian WhatsApp number"
                        : ""
                    }
                    required
                  />
                  <Field
                    id="account-gstin"
                    label="GSTIN Optional"
                    value={form.gstin}
                    onChange={(value) =>
                      updateField("gstin", value.toUpperCase())
                    }
                    validate={(value) =>
                      value && !isValidGSTIN(value)
                        ? "Enter a 15-character GSTIN or leave it blank"
                        : ""
                    }
                  />
                  <div>
                    <label htmlFor="account-business-type" className="field-label">
                      Business Type
                    </label>
                    <select
                      id="account-business-type"
                      value={form.business_type}
                      onChange={(event) =>
                        updateField(
                          "business_type",
                          event.target.value as BusinessType,
                        )
                      }
                      className="field-luxe"
                    >
                      {B2B_CONFIG.businessTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {message && (
                  <p className="mt-8 border border-line/20 border-l-2 border-l-accent-red bg-surface px-4 py-3 text-xs leading-6 text-content/65">
                    {message}
                  </p>
                )}

                <div className="mt-10 flex flex-wrap gap-4">
                  <button type="submit" disabled={saving || loading} className="btn-luxe">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Profile"}
                  </button>
                  <a href={preAddressedPoUrl} className="btn-luxe-outline">
                    Send a pre-addressed PO <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                  <Link href="/bulk-order" className="btn-luxe-outline">
                    Open the bulk desk <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link href="/wishlist" className="btn-luxe-outline">
                    Saved Linesheet <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <a href={buildCatalogRequestUrl()} className="btn-luxe-outline">
                    WhatsApp Catalog <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </form>
            </section>
          </div>
        </div>
      </main>
    </PageShell>
  );
}

/** Label/value ruled row — real registers only (no decorative stats). */
function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3.5">
      <span className="text-[9px] font-extrabold uppercase tracking-[0.24em] text-content/45">
        {label}
      </span>
      <span className="text-right text-sm font-bold text-content">{value}</span>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  validate,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  validate?: (value: string) => string;
  required?: boolean;
}) {
  const [error, setError] = useState("");

  return (
    <div className={error ? "border-l-2 border-l-accent-red pl-3" : ""}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          if (error && validate) {
            setError(validate(event.target.value));
          }
        }}
        onBlur={() => {
          if (validate) setError(validate(value));
        }}
        required={required}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`field-luxe ${
          error ? "border-b-accent-red focus:border-b-accent-red" : ""
        }`}
      />
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-red"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function AccountUnavailable() {
  return (
    <PageShell>
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-32 text-center">
        <p className="mb-5 text-[9px] font-extrabold uppercase tracking-[0.3em] text-content/55">
          Wholesale accounts
        </p>
        <h1 className="text-[clamp(2.75rem,6vw,5.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
          Wholesale accounts open soon
        </h1>
        <p className="mt-6 max-w-md text-sm leading-6 text-content/60">
          You can still build a wholesale cart and send your order on WhatsApp.
        </p>
        <Link href="/bulk-order" className="btn-luxe mt-10">
          Open the bulk desk <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </main>
    </PageShell>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-content">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
