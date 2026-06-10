import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { LegalLayout, LegalSection } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of Rangat Pehnawa and any purchase you make.",
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
          purchase of our products. By using the site or placing an order, you
          agree to them.
        </p>

        <LegalSection title="1. Orders &amp; acceptance">
          <p>
            An order is an offer to buy. We confirm acceptance when we dispatch
            your order. We may decline or cancel an order — for example, if an
            item is out of stock, a pricing error occurred, or payment could not
            be verified — and will refund any amount charged.
          </p>
        </LegalSection>

        <LegalSection title="2. Pricing &amp; payment">
          <p>
            Prices are listed in Indian Rupees (INR) and, where applicable,
            include taxes such as GST. Payment is processed securely through
            Shopify and its payment partners. In the event of an obvious pricing
            error, we are not obliged to fulfil the order at the incorrect
            price.
          </p>
        </LegalSection>

        <LegalSection title="3. Shipping &amp; delivery">
          <p>
            Delivery timelines are estimates. Risk passes to you on delivery.
            Any customs duties or charges for international orders are your
            responsibility.
          </p>
        </LegalSection>

        <LegalSection title="4. Returns &amp; refunds">
          <p>
            Eligible items may be returned in unused, original condition within
            the window stated at checkout. Made-to-order, altered, or final-sale
            items may be non-returnable. Approved refunds are issued to the
            original payment method.
          </p>
        </LegalSection>

        <LegalSection title="5. Product representation">
          <p>
            As our pieces are handcrafted, slight variations in colour, weave,
            and finish are natural and celebrated — they are not defects. Screen
            colours may differ from the actual fabric.
          </p>
        </LegalSection>

        <LegalSection title="6. Accounts">
          <p>
            You are responsible for keeping your account credentials secure and
            for activity under your account. Authentication is provided by
            Clerk; your use of it is also subject to its terms.
          </p>
        </LegalSection>

        <LegalSection title="7. Intellectual property">
          <p>
            All content on this site — imagery, designs, text, and the Rangat
            Pehnawa name and marks — is our property or licensed to us and may
            not be used without written permission.
          </p>
        </LegalSection>

        <LegalSection title="8. Limitation of liability">
          <p>
            To the extent permitted by law, our liability for any claim relating
            to a product or the site is limited to the amount you paid for the
            relevant order.
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
