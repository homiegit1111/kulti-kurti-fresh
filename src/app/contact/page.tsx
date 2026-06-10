"use client";

import { useState, type FormEvent } from "react";
import { Mail, Phone, MapPin, Send, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 relative z-10 bg-warm-white pt-28 lg:pt-32 pb-24">
        <div className="px-6 lg:px-20 max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
            <div className="inline-flex items-center gap-3 mb-4">
              <span className="h-[1px] w-6 bg-gold" />
              <p className="text-[10px] font-sans uppercase tracking-[0.4em] text-gold font-semibold">
                Get in Touch
              </p>
            </div>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-charcoal font-light">
              We&apos;d Love to <span className="italic text-gold">Hear from You</span>
            </h1>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            {/* Contact Info */}
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-10 h-10 flex items-center justify-center bg-gold/10 text-gold shrink-0">
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
                <div className="w-10 h-10 flex items-center justify-center bg-gold/10 text-gold shrink-0">
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
                <div className="w-10 h-10 flex items-center justify-center bg-gold/10 text-gold shrink-0">
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
                  className="text-center py-20 bg-warm-gray"
                >
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <h2 className="font-serif text-2xl text-charcoal mb-3">Message Sent</h2>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Thank you for reaching out. We&apos;ll get back to you within 24 hours.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">
                        Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full h-11 px-4 text-sm bg-white border border-charcoal/20 focus:border-gold focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        className="w-full h-11 px-4 text-sm bg-white border border-charcoal/20 focus:border-gold focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">
                      Subject
                    </label>
                    <select className="w-full h-11 px-4 text-sm bg-white border border-charcoal/20 focus:border-gold focus:outline-none transition-colors appearance-none">
                      <option>General Inquiry</option>
                      <option>Order Issue</option>
                      <option>Returns & Exchange</option>
                      <option>Wholesale Inquiry</option>
                      <option>Collaboration</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={6}
                      className="w-full px-4 py-3 text-sm bg-white border border-charcoal/20 focus:border-gold focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="h-12 px-8 flex items-center gap-3 bg-charcoal text-white text-xs font-semibold uppercase tracking-widest hover:bg-gold transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    <span>Send Message</span>
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
