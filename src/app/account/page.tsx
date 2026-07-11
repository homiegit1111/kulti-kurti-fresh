"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, LogOut, User } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useClerk, useUser, isAuthEnabled } from "@/lib/auth/client";
import { B2B_CONFIG, type BusinessType } from "@/lib/b2b/config";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";

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
        setMessage("Wholesale profile will be available once Supabase is configured.");
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
      <main className="flex-1 pt-28 pb-24 lg:pt-36">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="mb-12 border-b-2 border-line pb-8"
          >
            <p className="eyebrow mb-4">Wholesale account</p>
            <h1 className="text-[clamp(3rem,9vw,7rem)] font-black uppercase leading-[0.82] tracking-[-0.06em]">
              Buyer profile
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-6 text-content/60">
              Save your business details for faster WhatsApp inquiries, GST
              invoice confirmation, and repeat wholesale ordering.
            </p>
          </motion.div>

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
                    Buyer Linesheet
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
                className="border border-line/20 bg-surface-2 p-6 sm:p-8 lg:p-12"
              >
                <div className="mb-8 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Profile", form.business_name && form.city && form.whatsapp_phone ? "Complete" : "Needs details"],
                    ["Linesheet", "Saved styles"],
                    ["MOQ", `${B2B_CONFIG.minimumOrderSets} sets`],
                  ].map(([label, value]) => (
                    <div key={label} className="border border-line/20 px-4 py-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-content/45">
                        {label}
                      </p>
                      <p className="mt-1 text-lg font-black uppercase tracking-[-0.02em] text-content">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <Field
                    label="Business Name"
                    value={form.business_name}
                    onChange={(value) => updateField("business_name", value)}
                    required
                  />
                  <Field
                    label="City"
                    value={form.city}
                    onChange={(value) => updateField("city", value)}
                    required
                  />
                  <Field
                    label="WhatsApp Phone"
                    value={form.whatsapp_phone}
                    onChange={(value) => updateField("whatsapp_phone", value)}
                    required
                  />
                  <Field
                    label="GSTIN Optional"
                    value={form.gstin}
                    onChange={(value) => updateField("gstin", value)}
                  />
                  <div>
                    <label className="field-label">Business Type</label>
                    <select
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
                  <Link href="/bulk-order" className="btn-luxe-outline">
                    Start Bulk Order <ArrowRight className="h-3.5 w-3.5" />
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

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="field-luxe"
      />
    </div>
  );
}

function AccountUnavailable() {
  return (
    <PageShell>
      <main className="flex flex-1 flex-col items-center justify-center px-6 pt-32 pb-24 text-center">
        <p className="eyebrow eyebrow--bare mb-5">Wholesale accounts</p>
        <h1 className="text-[clamp(3rem,9vw,7rem)] font-black uppercase leading-[0.82] tracking-[-0.06em]">
          Register soon
        </h1>
        <p className="mt-6 max-w-md text-sm leading-6 text-content/60">
          Buyer accounts need Clerk keys. You can still build a wholesale cart
          and send your order on WhatsApp.
        </p>
        <Link href="/bulk-order" className="btn-luxe mt-10">
          Bulk Order <ArrowRight className="h-3.5 w-3.5" />
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
