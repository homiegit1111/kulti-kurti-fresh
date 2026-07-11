"use client";

import { useState, type FormEvent } from "react";
import { Mail, Phone, MapPin, Send, Check, Loader2, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Turnstile } from "@/components/ui/turnstile";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

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
      <main className="flex-1 relative z-10 bg-surface text-content pt-28 lg:pt-36 pb-24 lg:pb-28">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-8 border-b-2 border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end"
          >
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-accent-red">
                Wholesale support
              </p>
              <h1 className="mt-4 max-w-[13ch] text-[clamp(2.8rem,7vw,7rem)] font-black uppercase leading-[0.82] tracking-[-0.07em]">
                Catalog, MOQ, payment, dispatch.
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
          </motion.div>

          <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-16">
            {/* Contact Info */}
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-line/20">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-content/45">Email</h3>
                  <a href="mailto:rangatpehnawa@gmail.com" className="mt-1 block text-sm font-semibold text-content transition-colors hover:text-accent-red">
                    rangatpehnawa@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-line/20">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-content/45">Phone</h3>
                  <a href="tel:8660452247" className="mt-1 block text-sm font-semibold text-content transition-colors hover:text-accent-red">
                    8660452247
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-line/20">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-content/45">Studio</h3>
                  <p className="mt-1 text-sm leading-6 text-content/60">
                    3rd Floor, NR Complex, 36,<br />
                    Siddanna Ln, Cubbonpete,<br />
                    Bengaluru 560002
                  </p>
                </div>
              </div>

              <div className="border-t border-line/20 pt-8">
                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.24em] text-content/45">Wholesale rules</p>
                <p className="text-sm leading-6 text-content/60">
                  MOQ {B2B_CONFIG.minimumOrderSets} sets. 1 set ={" "}
                  {B2B_CONFIG.setSize} pcs in {SIZE_RATIO_LABEL}.
                </p>
                <p className="mt-2 text-sm leading-6 text-content/60">
                  GST invoice and Razorpay payment support available after order
                  confirmation.
                </p>
              </div>

              <div className="border-t border-line/20 pt-8">
                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.24em] text-content/45">Hours</p>
                <p className="text-sm leading-6 text-content/60">Mon – Sat: 10am – 7pm IST</p>
                <p className="text-sm leading-6 text-content/60">Sun: Closed</p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
                  className="border border-line/20 bg-surface-2 px-8 py-20 text-center"
                >
                  <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center bg-surface-inverse text-accent-lime">
                    <Check className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-4xl font-black uppercase leading-[0.9] tracking-[-0.04em]">
                    Message sent
                  </h2>
                  <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-content/60">
                    Thank you for reaching out. We&apos;ll reply with wholesale
                    catalog, MOQ, dispatch, and payment guidance.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                      <label className="field-label">
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        className="field-luxe"
                      />
                    </div>
                    <div>
                      <label className="field-label">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        className="field-luxe"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                      <label className="field-label">Business Type</label>
                      <select name="businessType" className="field-luxe cursor-pointer">
                        {B2B_CONFIG.businessTypes.map((type) => (
                          <option key={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label">City</label>
                      <input name="city" className="field-luxe" />
                    </div>
                    <div>
                      <label className="field-label">WhatsApp Number</label>
                      <input name="whatsapp" className="field-luxe" />
                    </div>
                    <div>
                      <label className="field-label">Monthly Buying Estimate</label>
                      <select name="monthlyBuying" className="field-luxe cursor-pointer">
                        <option>4-7 sets</option>
                        <option>8-19 sets</option>
                        <option>20+ sets</option>
                        <option>Still exploring</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="field-label">
                      Subject
                    </label>
                    <select name="subject" className="field-luxe cursor-pointer">
                      <option>Wholesale Catalog Request</option>
                      <option>MOQ & Tier Pricing</option>
                      <option>Razorpay Payment Help</option>
                      <option>GST Invoice Question</option>
                      <option>Dispatch & Availability</option>
                      <option>Repeat Order Support</option>
                    </select>
                  </div>

                  <div>
                    <label className="field-label">
                      Message *
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={6}
                      className="field-luxe resize-none"
                    />
                  </div>

                  <Turnstile onVerify={setToken} onExpire={() => setToken("")} />

                  {error && (
                    <div className="border border-accent-red/40 bg-accent-red/10 p-4 text-xs font-semibold uppercase tracking-[0.1em] text-accent-red">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-luxe"
                  >
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
