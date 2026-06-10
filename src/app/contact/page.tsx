"use client";

import { useState, type FormEvent } from "react";
import { Mail, Phone, MapPin, Send, Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Turnstile } from "@/components/ui/turnstile";

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
      <main className="flex-1 relative z-10 bg-warm-white pt-28 lg:pt-32 pb-24">
        <div className="px-6 lg:px-20 max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
            <p className="eyebrow mb-4">Get in Touch</p>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-charcoal font-light">
              We&apos;d Love to <span className="italic text-gold">Hear from You</span>
            </h1>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            {/* Contact Info */}
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-11 h-11 flex items-center justify-center border border-gold/30 text-gold-dark shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider">Email</h3>
                  <a href="mailto:rangatpehnawa@gmail.com" className="text-sm text-muted-foreground hover:text-gold transition-colors mt-1 block">
                    rangatpehnawa@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-11 h-11 flex items-center justify-center border border-gold/30 text-gold-dark shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider">Phone</h3>
                  <a href="tel:8660452247" className="text-sm text-muted-foreground hover:text-gold transition-colors mt-1 block">
                    8660452247
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-11 h-11 flex items-center justify-center border border-gold/30 text-gold-dark shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider">Studio</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    3rd Floor, NR Complex, 36,<br />
                    Siddanna Ln, Cubbonpete,<br />
                    Bengaluru 560002
                  </p>
                </div>
              </div>

              <div className="pt-8 border-t border-charcoal/10">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Hours</p>
                <p className="text-sm text-muted-foreground">Mon – Sat: 10am – 7pm IST</p>
                <p className="text-sm text-muted-foreground">Sun: Closed</p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-20 border border-charcoal/10 bg-white frame-luxe"
                >
                  <div className="w-14 h-14 rounded-full border border-gold/40 flex items-center justify-center mx-auto mb-6">
                    <Check className="h-6 w-6 text-gold-dark" strokeWidth={1.5} />
                  </div>
                  <h2 className="font-serif text-3xl font-light text-charcoal mb-3">
                    Message <span className="italic">Sent</span>
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Thank you for reaching out. We&apos;ll get back to you within 24 hours.
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

                  <div>
                    <label className="field-label">
                      Subject
                    </label>
                    <select name="subject" className="field-luxe cursor-pointer">
                      <option>General Inquiry</option>
                      <option>Order Issue</option>
                      <option>Returns & Exchange</option>
                      <option>Wholesale Inquiry</option>
                      <option>Collaboration</option>
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
                    <div className="p-4 text-xs font-medium bg-red-50 text-red-700 border border-red-100">
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
