/**
 * Shop FAQ content — single source of truth for both the visible accordion
 * (shop-client.tsx) and the FAQPage JSON-LD (page.tsx). Keeping them in sync
 * is what makes the structured data trustworthy to Google + AI search.
 */
export interface Faq {
  q: string;
  a: string;
}

export const SHOP_FAQS: Faq[] = [
  {
    q: "What kinds of kurtis do you sell?",
    a: "We offer premium women's kurtis and ethnic wear — breathable cotton kurtis for daily wear, hand-finished co-ord sets, festive anarkalis, lehengas and sarees. Each piece is selected for fabric quality, fit and craft.",
  },
  {
    q: "What sizes are available?",
    a: "Our kurtis are available from XS to XXL. Every product page lists a detailed size guide along with fit notes and the model's height and size worn, so you can choose the right fit with confidence.",
  },
  {
    q: "Do you offer Cash on Delivery (COD) in India?",
    a: "Yes. Cash on Delivery is available across India, alongside UPI, cards and net banking. We confirm COD orders before dispatch to make sure your delivery arrives smoothly.",
  },
  {
    q: "What are your shipping and return policies?",
    a: "We ship pan-India with free shipping on orders over ₹1,999 and offer easy 7-day returns. Most orders are dispatched within 1–2 business days, and you'll receive tracking updates until delivery.",
  },
  {
    q: "How do I care for my kurti?",
    a: "Most of our handloom cotton and printed kurtis are best gently hand-washed in cold water and dried in the shade to keep colours rich. Detailed fabric and care instructions are listed on each product page.",
  },
];
