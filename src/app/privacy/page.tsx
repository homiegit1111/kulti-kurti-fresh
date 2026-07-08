import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { LegalLayout, LegalSection } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Rangat Pehnawa collects, uses, and protects your personal data, in line with India's DPDP Act, 2023.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <LegalLayout title="Privacy Policy" updated="June 2026" eyebrow="Privacy">
        <p>
          Rangat Pehnawa (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;)
          respects your privacy. This policy explains what personal data we
          collect, why, and the choices you have. It is designed to be read
          alongside India&rsquo;s Digital Personal Data Protection Act, 2023
          (&ldquo;DPDP Act&rdquo;).
        </p>

        <LegalSection title="1. Data we collect">
          <ul>
            <li>
              <strong>Account data</strong> — name, email, and authentication
              details, handled by our auth provider (Clerk).
            </li>
            <li>
              <strong>Order data</strong> — items, shipping address, contact
              number, business details, GST invoice preferences, and order
              history, processed through our wholesale commerce and support
              systems.
            </li>
            <li>
              <strong>Wishlist &amp; preferences</strong> — saved items and
              settings, stored against your account.
            </li>
            <li>
              <strong>Usage &amp; device data</strong> — pages viewed and
              interactions, collected only with your consent via analytics
              cookies (see below).
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="2. How we use your data">
          <p>
            To process and deliver orders, manage your account, provide support,
            prevent fraud, comply with legal obligations (including GST
            invoicing), and — with consent — improve our store and send you
            marketing you have opted in to.
          </p>
        </LegalSection>

        <LegalSection title="3. Cookies &amp; analytics">
          <p>
            We use essential cookies to run the store and keep you signed in.
            Analytics cookies (Google Analytics 4) load only after you accept
            them in our cookie banner — until then, Google Consent Mode keeps
            them denied and no analytics data is collected. You can withdraw
            consent at any time by clearing cookies or contacting us.
          </p>
        </LegalSection>

        <LegalSection title="4. Sharing &amp; processors">
          <p>
            We share data only with the processors that run our store — Clerk
            (authentication), Medusa or our legacy commerce adapters
            (catalog/order operations), Razorpay (payments when enabled),
            Supabase (data storage), WhatsApp support tools, and Cloudflare
            Turnstile (bot protection) — each bound to protect your data. We
            do not sell your personal data.
          </p>
        </LegalSection>

        <LegalSection title="5. Payments">
          <p>
            Payments may be completed through Razorpay checkout, Razorpay
            payment links, bank transfer, or another confirmed wholesale method.
            We do not store your full card details on our servers.
          </p>
        </LegalSection>

        <LegalSection title="6. Data retention">
          <p>
            We keep personal data for as long as your account is active or as
            needed to provide services and meet legal, tax, and accounting
            requirements, after which it is deleted or anonymised.
          </p>
        </LegalSection>

        <LegalSection title="7. Your rights">
          <p>
            Under the DPDP Act you may request access to, correction of, or
            erasure of your personal data, and withdraw consent. To exercise
            these rights, contact us using the details below; we will respond
            within the timelines required by law.
          </p>
        </LegalSection>

        <LegalSection title="8. Children">
          <p>
            Our store is not directed to children under 18. We do not knowingly
            collect their data without verifiable parental consent.
          </p>
        </LegalSection>

        <LegalSection title="9. Contact">
          <p>
            Questions or requests about this policy? Reach our grievance contact
            via our{" "}
            <a href="/contact" className="underline hover:text-gold">
              contact page
            </a>
            .
          </p>
        </LegalSection>

        <p className="text-[11px] text-charcoal/40 italic">
          This policy is provided as a starting template and should be reviewed
          by qualified legal counsel before launch to confirm it reflects your
          actual data practices and obligations.
        </p>
      </LegalLayout>
      <Footer />
    </>
  );
}
