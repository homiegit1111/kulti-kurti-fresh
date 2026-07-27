/**
 * Shop FAQ content - single source of truth for both the visible accordion
 * (shop-client.tsx) and the FAQPage JSON-LD.
 */
export interface Faq {
  q: string;
  a: string;
}

export const SHOP_FAQS: Faq[] = [
  {
    q: "Do you sell kurtis wholesale online in India?",
    a: "Yes. Rangat Pehnawa is being set up as a wholesale kurti catalog for boutique owners, resellers, online sellers, and distributors across India.",
  },
  {
    q: "What is the minimum wholesale order?",
    a: "The minimum order is 4 sets total. Each set has 4 pieces in the S/M/L/XL size ratio, so the minimum wholesale order is 16 pieces across one or more styles.",
  },
  {
    q: "How does wholesale pricing work?",
    a: "Prices are shown per set with a per-piece equivalent. Every order past the 4-set minimum is priced at the same flat wholesale rate — the rate you see is the rate you pay.",
  },
  {
    q: "How do I place a wholesale order?",
    a: "Add styles as sets, review your order, and send the order on WhatsApp. The team confirms availability, GST invoice details, dispatch city, and Razorpay payment link before shipping.",
  },
  {
    q: "Do you provide GST invoices and all-India dispatch?",
    a: "GST invoice support is available on request, and orders can be dispatched across India after stock and payment confirmation.",
  },
];
