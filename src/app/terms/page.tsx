import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { LegalLayout, LegalSection } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern Rangat Pehnawa wholesale catalog access, orders, payments, and dispatch.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <LegalLayout
        title="Terms of Service"
        updated="June 2026"
        eyebrow="Terms"
      >
        <p>
          These terms govern your use of the Rangat Pehnawa website and your
          wholesale orders. By using the site, saving styles, or placing an
          order request, you agree to them.
        </p>

        <LegalSection title="1. Orders &amp; acceptance">
          <p>
            A submitted cart or WhatsApp inquiry is an order request. We confirm
            acceptance after stock, set quantities, buyer details, payment, GST
            information, and dispatch requirements are verified. We may decline
            or revise an order if stock changes, a pricing error occurred, MOQ
            is not met, or payment cannot be verified.
          </p>
        </LegalSection>

        <LegalSection title="2. Pricing &amp; payment">
          <p>
            Wholesale prices are listed in Indian Rupees (INR) per size-ratio
            set unless stated otherwise. Tier discounts, GST invoice details,
            and payment instructions are confirmed before dispatch. Online
            payment may be offered through Razorpay checkout or a verified
            payment link when configured. In the event of an obvious pricing
            error, we are not obliged to fulfil the order at the incorrect
            price.
          </p>
        </LegalSection>

        <LegalSection title="3. Shipping &amp; delivery">
          <p>
            Dispatch timelines and freight handling are confirmed order by
            order based on stock, order volume, packing requirements, and buyer
            city. Delivery timelines are estimates. Any duties, octroi, local
            charges, or onward reseller logistics are the buyer&apos;s responsibility.
          </p>
        </LegalSection>

        <LegalSection title="4. Cancellations, shortages &amp; claims">
          <p>
            Wholesale orders are packed as agreed size-ratio sets. Shortage,
            damage, or mismatch claims must be shared promptly with parcel
            opening proof and invoice details so the team can investigate.
            Approved adjustments may be handled through replacement, credit, or
            refund to the original payment method.
          </p>
        </LegalSection>

        <LegalSection title="5. Product representation">
          <p>
            As our pieces are handcrafted, slight variations in colour, weave,
            and finish are natural and celebrated. They are not defects. Screen
            colours may differ from the actual fabric.
          </p>
        </LegalSection>

        <LegalSection title="6. Accounts">
          <p>
            You are responsible for keeping your account credentials secure and
            for activity under your account. Buyer profile information is used
            to speed up wholesale inquiries, payment assistance, GST invoicing,
            and dispatch coordination.
          </p>
        </LegalSection>

        <LegalSection title="7. Intellectual property">
          <p>
            All content on this site, including imagery, designs, text, and the
            Rangat Pehnawa name and marks, is our property or licensed to us and
            may not be used without written permission.
          </p>
        </LegalSection>

        <LegalSection title="8. Limitation of liability">
          <p>
            To the extent permitted by law, our liability for any claim relating
            to a product, order, or the site is limited to the amount paid for
            the relevant wholesale order.
          </p>
        </LegalSection>

        <LegalSection title="9. Governing law">
          <p>
            These terms are governed by the laws of India, and disputes are
            subject to the exclusive jurisdiction of the competent courts in
            India.
          </p>
        </LegalSection>

        <LegalSection title="10. Contact">
          <p>
            Questions about these terms? Reach us via our{" "}
            <a href="/contact" className="underline hover:text-gold">
              contact page
            </a>
            .
          </p>
        </LegalSection>

        <p className="text-[11px] text-charcoal/40 italic">
          These terms are provided as a starting template and should be reviewed
          by qualified legal counsel before launch.
        </p>
      </LegalLayout>
      <Footer />
    </>
  );
}
