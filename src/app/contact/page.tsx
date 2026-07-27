"use client";

/**
 * §7.3 — contact as a merchant's ledger: label/value ruled rows instead of
 * icon tiles, every field labelled with htmlFor/id, WhatsApp number validated
 * on blur via the b2b validators (vermilion rail is the error register).
 * The /api/contact POST contract is untouched.
 */

import { useState, type FormEvent } from "react";
import { Send, Check, Loader2, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Turnstile } from "@/components/ui/turnstile";
import { TermsRule } from "@/components/document/terms-rule";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { isValidWhatsappPhone } from "@/lib/b2b/validation";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [whatsappError, setWhatsappError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const form = new FormData(e.currentTarget);
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          subject: form.get("subject"),
          businessType: form.get("businessType"),
          city: form.get("city"),
          whatsapp: form.get("whatsapp"),
          monthlyBuying: form.get("monthlyBuying"),
          message: form.get("message"),
          turnstileToken: token,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="relative z-10 flex-1 bg-surface pb-24 pt-24 text-content lg:pb-28 lg:pt-28">
        <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-10 lg:px-16">
          <div className="grid gap-8 border-b-2 border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-content/55">
                Wholesale support
              </p>
              <h1 className="mt-4 max-w-[16ch] text-[clamp(2.75rem,6vw,5.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
                Wholesale catalog, minimum order, payment, dispatch.
              </h1>
            </div>
            <div className="max-w-[34ch]">
              <p className="text-sm leading-6 text-content/60">
                Tell us about your boutique, reseller channel, or bulk buying
                plan. WhatsApp is fastest for catalog requests and availability.
              </p>
              <a href={buildCatalogRequestUrl()} className="btn-luxe mt-6 inline-flex">
                Get catalog on WhatsApp <MessageCircle className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-16">
            {/* Contact ledger — label/value ruled rows. */}
            <div>
              <div className="divide-y divide-line/20 border-t border-line/25">
                <ContactRow
                  label="Email"
                  value={
                    <a
                      href="mailto:rangatpehnawa@gmail.com"
                      className="underline-offset-2 hover:underline"
                    >
                      rangatpehnawa@gmail.com
                    </a>
                  }
                />
                <ContactRow
                  label="Phone"
                  value={
                    <a href="tel:8660452247" className="underline-offset-2 hover:underline">
                      8660452247
                    </a>
                  }
                />
                <ContactRow
                  label="Studio"
                  value={
                    <>
                      3rd Floor, NR Complex, 36,
                      <br />
                      Siddanna Ln, Cubbonpete,
                      <br />
                      Bengaluru 560002
                    </>
                  }
                />
                <ContactRow label="Hours" value="Mon – Sat, 10am – 7pm IST" />
                <ContactRow label="Sunday" value="Closed" />
              </div>

              <div className="mt-8">
                <TermsRule />
                <p className="mt-3 text-sm leading-6 text-content/60">
                  GST invoice and Razorpay payment support available after order
                  confirmation.
                </p>
              </div>
            </div>

            {/* Contact form */}
            <div className="lg:col-span-2">
              {submitted ? (
                <div className="border border-line/25 px-8 py-20 text-center">
                  <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center bg-surface-inverse text-accent-lime">
                    <Check className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-4xl font-black uppercase leading-[0.9] tracking-[-0.04em]">
                    Message sent
                  </h2>
                  <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-content/60">
                    Thank you for reaching out. We&apos;ll reply with wholesale
                    catalog, minimum order, dispatch, and payment guidance.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                    <div>
                      <label htmlFor="contact-name" className="field-label">
                        Name *
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        name="name"
                        required
                        className="field-luxe"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="field-label">
                        Email *
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        name="email"
                        required
                        className="field-luxe"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                    <div>
                      <label htmlFor="contact-business-type" className="field-label">
                        Business Type
                      </label>
                      <select
                        id="contact-business-type"
                        name="businessType"
                        className="field-luxe cursor-pointer"
                      >
                        {B2B_CONFIG.businessTypes.map((type) => (
                          <option key={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="contact-city" className="field-label">
                        City
                      </label>
                      <input id="contact-city" name="city" className="field-luxe" />
                    </div>
                    <div
                      className={
                        whatsappError ? "border-l-2 border-l-accent-red pl-3" : ""
                      }
                    >
                      <label htmlFor="contact-whatsapp" className="field-label">
                        WhatsApp Number
                      </label>
                      <input
                        id="contact-whatsapp"
                        name="whatsapp"
                        inputMode="tel"
                        className={`field-luxe ${
                          whatsappError
                            ? "border-b-accent-red focus:border-b-accent-red"
                            : ""
                        }`}
                        aria-invalid={whatsappError ? "true" : undefined}
                        aria-describedby={
                          whatsappError ? "contact-whatsapp-error" : undefined
                        }
                        onBlur={(event) => {
                          const value = event.target.value.trim();
                          setWhatsappError(
                            value && !isValidWhatsappPhone(value)
                              ? "Enter a 10-digit Indian WhatsApp number"
                              : "",
                          );
                        }}
                        onChange={(event) => {
                          if (!whatsappError) return;
                          const value = event.target.value.trim();
                          if (!value || isValidWhatsappPhone(value)) {
                            setWhatsappError("");
                          }
                        }}
                      />
                      {whatsappError && (
                        <p
                          id="contact-whatsapp-error"
                          role="alert"
                          className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-red"
                        >
                          {whatsappError}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="contact-monthly-buying" className="field-label">
                        Monthly Buying Estimate
                      </label>
                      <select
                        id="contact-monthly-buying"
                        name="monthlyBuying"
                        className="field-luxe cursor-pointer"
                      >
                        <option>4-7 sets</option>
                        <option>8-19 sets</option>
                        <option>20+ sets</option>
                        <option>Still exploring</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-subject" className="field-label">
                      Subject
                    </label>
                    <select
                      id="contact-subject"
                      name="subject"
                      className="field-luxe cursor-pointer"
                    >
                      <option>Wholesale Catalog Request</option>
                      <option>Minimum Order & Pricing</option>
                      <option>Razorpay Payment Help</option>
                      <option>GST Invoice Question</option>
                      <option>Dispatch & Availability</option>
                      <option>Repeat Order Support</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="field-label">
                      Message *
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      required
                      rows={6}
                      className="field-luxe resize-none"
                    />
                  </div>

                  <Turnstile onVerify={setToken} onExpire={() => setToken("")} />

                  {error && (
                    <div
                      role="alert"
                      className="border border-line/20 border-l-2 border-l-accent-red p-4 text-xs font-semibold uppercase tracking-[0.1em] text-accent-red"
                    >
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={submitting} className="btn-luxe">
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span>{submitting ? "Sending…" : "Send Message"}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

/** Label/value ruled row — the order-confirmation DetailRow grammar on paper. */
function ContactRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-4">
      <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-[0.24em] text-content/45">
        {label}
      </span>
      <span className="text-right text-sm font-semibold leading-6 text-content">
        {value}
      </span>
    </div>
  );
}
