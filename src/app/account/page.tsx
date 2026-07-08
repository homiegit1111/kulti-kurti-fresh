"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, LogOut, User } from "lucide-react";
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
      .then((data: { profile?: Partial<ProfileForm> | null }) => {
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
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="flex-1 bg-warm-white pt-32 pb-24 min-h-screen">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            <aside className="lg:col-span-1">
              <div className="panel-luxe overflow-hidden mb-8 relative">
                <div className="bg-charcoal px-6 py-10 text-center relative frame-luxe">
                  <div className="w-20 h-20 border border-gold/50 mx-auto flex items-center justify-center">
                    <User className="w-7 h-7 text-gold" strokeWidth={1.2} />
                  </div>
                  <h2 className="font-serif text-2xl font-light text-warm-white mt-5 mb-1">
                    {user.firstName || "Wholesale Buyer"}
                  </h2>
                  <p className="text-[10px] text-white/50 font-sans tracking-[0.15em] break-all">
                    {user.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
                <div className="px-4 py-5 flex flex-col gap-1">
                  <Link
                    href="/bulk-order"
                    className="w-full flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] font-bold px-4 py-4 border-l-2 border-gold bg-warm-gray/60 text-charcoal"
                  >
                    Bulk Order
                  </Link>
                  <Link
                    href="/wishlist"
                    className="w-full flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] font-bold px-4 py-4 border-l-2 border-transparent text-charcoal/50 hover:text-charcoal hover:bg-warm-gray/40"
                  >
                    Buyer Linesheet
                  </Link>
                  <button
                    onClick={() => signOut({ redirectUrl: "/" })}
                    className="w-full flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] font-bold px-4 py-4 border-l-2 border-transparent text-charcoal/40 hover:text-destructive hover:bg-destructive/5 transition-all"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.5} /> Sign Out
                  </button>
                </div>
              </div>
            </aside>

            <section className="lg:col-span-3">
              <div className="mb-8 border-b border-charcoal/10 pb-6">
                <p className="eyebrow mb-3">Wholesale Account</p>
                <h1 className="font-serif text-4xl md:text-5xl font-light text-charcoal">
                  Buyer <span className="italic">Profile</span>
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-charcoal/55">
                  Save your business details for faster WhatsApp inquiries,
                  GST invoice confirmation, and repeat wholesale ordering.
                </p>
              </div>

              <form onSubmit={saveProfile} className="panel-luxe p-8 lg:p-12">
                <div className="mb-8 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Profile", form.business_name && form.city && form.whatsapp_phone ? "Complete" : "Needs details"],
                    ["Linesheet", "Saved styles"],
                    ["MOQ", `${B2B_CONFIG.minimumOrderSets} sets`],
                  ].map(([label, value]) => (
                    <div key={label} className="border border-charcoal/10 px-4 py-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-charcoal/40">
                        {label}
                      </p>
                      <p className="mt-1 font-serif text-lg text-charcoal">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                  <p className="mt-8 border border-gold/30 border-l-2 border-l-gold bg-white px-4 py-3 text-xs text-charcoal/65">
                    {message}
                  </p>
                )}

                <div className="mt-10 flex flex-wrap gap-4">
                  <button type="submit" disabled={saving || loading} className="btn-luxe">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Profile"}
                  </button>
                  <Link href="/bulk-order" className="btn-luxe-outline">
                    Start Bulk Order <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link href="/wishlist" className="btn-luxe-outline">
                    Saved Linesheet <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <a href={buildCatalogRequestUrl()} className="btn-luxe-outline">
                    WhatsApp Catalog <ArrowRight className="w-3.5 h-3.5" />
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
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center">
        <p className="eyebrow eyebrow--bare mb-4">Wholesale Accounts</p>
        <h1 className="font-serif text-5xl md:text-6xl font-light mb-5">
          Register <span className="italic">soon</span>
        </h1>
        <p className="text-charcoal/60 max-w-md mb-10 leading-relaxed">
          Buyer accounts need Clerk keys. You can still build a wholesale cart
          and send your order on WhatsApp.
        </p>
        <Link href="/bulk-order" className="btn-luxe">
          Bulk Order <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </main>
    </PageShell>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-warm-white min-h-screen text-charcoal font-sans flex flex-col">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
