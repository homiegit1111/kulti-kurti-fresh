/**
 * THE CONTENT REGISTRY — the single declaration of everything the owner can
 * change without a developer.
 *
 * How this works, and why it is shaped this way:
 *
 *   Every `default` below is the EXACT value the storefront hardcoded before
 *   this system existed. The database stores only OVERRIDES. So an empty
 *   `site_content` table renders a byte-identical site, and "reset to default"
 *   is a row delete rather than a guess. That property is what makes wiring a
 *   component to the registry a safe, reviewable change instead of a redesign.
 *
 *   Adding a new editable field = adding an entry here. No migration, no admin
 *   UI change, no API change — the editor renders itself from this file, and
 *   the validator enforces itself from the field's declared type.
 *
 * TOKENS
 *   Text fields may contain {tokens} that resolve at render time from live data
 *   (see ./tokens.ts). This keeps a number like the minimum order quantity in
 *   ONE place: change the MOQ in Pricing and every sentence quoting it updates.
 *   Owners can also delete the token and type a literal — their call.
 *
 * Keys are permanent. Renaming one orphans the owner's saved value, so treat a
 * key like a database column: add and deprecate, never rename in place.
 */

import type { ContentField, ContentGroup, ContentValue } from "./types";
import { isListField } from "./types";

// ---------------------------------------------------------------------------
// Group: Home page
// ---------------------------------------------------------------------------

const HOME_GROUP: ContentGroup = {
  id: "home",
  title: "Home page",
  description:
    "The cover, the film, and every block down the home page. Changes appear within a minute.",
  sections: [
    {
      id: "cover",
      title: "Cover (top of the page)",
      description:
        "The first screen. The model cut-out is the largest image on the site — use a PNG with a transparent background.",
      fields: [
        {
          key: "home.cover.eyebrow",
          label: "Eyebrow",
          help: "Small label above the headline.",
          type: "text",
          max: 80,
          default: "Rangat Pehnawa — Wholesale",
        },
        {
          key: "home.cover.headline",
          label: "Headline",
          type: "text",
          max: 120,
          default: "Wholesale kurtis for the trade,",
        },
        {
          key: "home.cover.headlineAccent",
          label: "Headline — accent line",
          help: "Printed in the accent colour, on its own line under the headline.",
          type: "text",
          max: 120,
          default: "priced to move.",
        },
        {
          key: "home.cover.body",
          label: "Intro paragraph",
          help: "Tokens: {setSize}, {sizeRatio}, {minSets}, {styleCount}, {season}.",
          type: "textarea",
          rows: 3,
          max: 400,
          default:
            "The name is made of this season's cloth. Priced per piece, {setSize} to a set, in full {sizeRatio} size runs.",
        },
        {
          key: "home.cover.modelImage",
          label: "Model cut-out",
          help: "Transparent PNG. This is the page's largest image — keep it under about 400 KB.",
          type: "image",
          default: "/images/model-sage.png",
        },
        {
          key: "home.cover.clothImage",
          label: "Cloth inside the brand mark",
          help: "Fills the Devanagari letters. Draped bolts of embroidered fabric read best — each glyph takes its own bolt.",
          type: "image",
          default: "/images/rangat-editorial-cloth.svg",
        },
        {
          key: "home.cover.primaryCtaLabel",
          label: "Primary button — label",
          type: "text",
          max: 40,
          default: "Browse styles",
        },
        {
          key: "home.cover.primaryCtaHref",
          label: "Primary button — link",
          type: "url",
          default: "/shop",
        },
        {
          key: "home.cover.secondaryCtaLabel",
          label: "Second button — label",
          help: "Links to WhatsApp with the catalogue request message.",
          type: "text",
          max: 40,
          default: "WhatsApp us",
        },
      ],
    },
    {
      id: "film",
      title: "Film band (the video)",
      description:
        "Upload the video in Media, then pick it here. Two formats are used: WebM is served to browsers that support it (smaller), MP4 to everything else. The poster is the still frame shown before the video loads.",
      fields: [
        {
          key: "home.film.enabled",
          label: "Show the film band",
          type: "boolean",
          default: true,
        },
        {
          key: "home.film.videoWebm",
          label: "Video — WebM",
          help: "Optional. Preferred when the browser supports it.",
          type: "video",
          default: "/video/atelier.webm",
        },
        {
          key: "home.film.videoMp4",
          label: "Video — MP4",
          help: "Required. The fallback every browser can play.",
          type: "video",
          default: "/video/atelier.mp4",
        },
        {
          key: "home.film.poster",
          label: "Poster image",
          help: "Shown until the video is ready. Use a frame from the video itself.",
          type: "image",
          default: "/video/atelier-poster.jpg",
        },
        {
          key: "home.film.headline",
          label: "Headline",
          type: "text",
          max: 120,
          default: "How the cloth actually falls,",
        },
        {
          key: "home.film.headlineAccent",
          label: "Headline — accent line",
          type: "text",
          max: 120,
          default: "before you order it.",
        },
        {
          key: "home.film.caption",
          label: "Caption",
          type: "textarea",
          rows: 2,
          max: 300,
          default:
            "Fifteen seconds from the studio floor. Silent, and it only loads when you reach it.",
        },
        {
          key: "home.film.ctaLabel",
          label: "Button — label",
          type: "text",
          max: 40,
          default: "See this season",
        },
        {
          key: "home.film.ctaHref",
          label: "Button — link",
          type: "url",
          default: "/shop",
        },
      ],
    },
    {
      id: "season",
      title: "This season (three model shots)",
      fields: [
        {
          key: "home.season.eyebrow",
          label: "Eyebrow",
          type: "text",
          max: 80,
          default: "This season",
        },
        {
          key: "home.season.headline",
          label: "Headline",
          type: "text",
          max: 120,
          default: "New cloth on the rack,",
        },
        {
          key: "home.season.headlineAccent",
          label: "Headline — accent line",
          type: "text",
          max: 120,
          default: "every week.",
        },
        {
          key: "home.season.ctaLabel",
          label: "Link — label",
          type: "text",
          max: 40,
          default: "See all styles →",
        },
        {
          key: "home.season.ctaHref",
          label: "Link — target",
          type: "url",
          default: "/shop",
        },
        {
          key: "home.season.shots",
          label: "Model shots",
          help: "Three reads best. The numeral is the small figure caption.",
          type: "list",
          itemNoun: "shot",
          maxItems: 4,
          minItems: 1,
          itemFields: [
            {
              key: "image",
              label: "Image",
              type: "image",
              default: "",
            },
            {
              key: "numeral",
              label: "Figure numeral",
              type: "text",
              max: 8,
              default: "",
            },
            {
              key: "alt",
              label: "Description for screen readers",
              type: "text",
              max: 160,
              default: "",
            },
          ],
          default: [
            { image: "/images/models/model-01.png", numeral: "०१", alt: "Kurta set on the rack" },
            { image: "/images/models/model-02.png", numeral: "०२", alt: "Kurta set on the rack" },
            { image: "/images/models/model-03.png", numeral: "०३", alt: "Kurta set on the rack" },
          ],
        },
      ],
    },
    {
      id: "rates",
      title: "Price list block",
      fields: [
        {
          key: "home.rates.eyebrow",
          label: "Eyebrow",
          help: "Tokens: {styleCount}, {season}.",
          type: "text",
          max: 80,
          default: "Price list · {styleCount} styles live",
        },
        {
          key: "home.rates.headline",
          label: "Headline",
          type: "text",
          max: 120,
          default: "Today's rates,",
        },
        {
          key: "home.rates.headlineAccent",
          label: "Headline — accent line",
          type: "text",
          max: 120,
          default: "open for the trade.",
        },
        {
          key: "home.rates.body",
          label: "Paragraph",
          type: "textarea",
          rows: 2,
          max: 300,
          default:
            "Add sets straight from this sheet — your order follows you across the site and onto WhatsApp.",
        },
        {
          key: "home.rates.emptyState",
          label: "When no styles are live",
          help: "Shown instead of the table if the catalogue is empty.",
          type: "textarea",
          rows: 2,
          max: 200,
          default: "New styles coming — WhatsApp for today's price list.",
        },
      ],
    },
    {
      id: "collections",
      title: "Collections block",
      fields: [
        {
          key: "home.collections.eyebrow",
          label: "Eyebrow",
          help: "Token: {collectionCount}.",
          type: "text",
          max: 80,
          default: "Collections · {collectionCount}",
        },
        {
          key: "home.collections.headline",
          label: "Headline",
          type: "text",
          max: 120,
          default: "Racks built",
        },
        {
          key: "home.collections.headlineAccent",
          label: "Headline — accent line",
          type: "text",
          max: 120,
          default: "around a theme.",
        },
        {
          key: "home.collections.ctaLabel",
          label: "Link — label",
          type: "text",
          max: 40,
          default: "All collections →",
        },
        {
          key: "home.collections.ctaHref",
          label: "Link — target",
          type: "url",
          default: "/collections",
        },
      ],
    },
    {
      id: "sets",
      title: "Every set, in the hand",
      description:
        "The flat-lay carousel. These are shown as examples of what a set contains — the rate you type here is display copy, not a live price.",
      fields: [
        {
          key: "home.sets.eyebrow",
          label: "Eyebrow",
          type: "text",
          max: 80,
          default: "Kurta · trouser · dupatta",
        },
        {
          key: "home.sets.headline",
          label: "Headline",
          type: "text",
          max: 120,
          default: "Every set, complete",
        },
        {
          key: "home.sets.headlineAccent",
          label: "Headline — accent line",
          type: "text",
          max: 120,
          default: "in the hand.",
        },
        {
          key: "home.sets.body",
          label: "Paragraph",
          type: "textarea",
          rows: 2,
          max: 300,
          default:
            "What you get per set, laid out exactly as it ships. Move your cursor — the cloth turns with you.",
        },
        {
          key: "home.sets.wornImage",
          label: "Worn shot",
          type: "image",
          default: "/images/model-rose.png",
        },
        {
          key: "home.sets.wornImageAlt",
          label: "Worn shot — description",
          type: "text",
          max: 160,
          default: "Rose block-print kurta set, worn",
        },
        {
          key: "home.sets.items",
          label: "Flat-lay sets",
          type: "list",
          itemNoun: "set",
          maxItems: 6,
          minItems: 1,
          itemFields: [
            { key: "src", label: "Image", type: "image", default: "" },
            { key: "label", label: "Name", type: "text", max: 60, default: "" },
            { key: "code", label: "Style code", type: "text", max: 40, default: "" },
            {
              key: "rate",
              label: "Rate (display text)",
              help: "Free text, e.g. ₹875/pc.",
              type: "text",
              max: 30,
              default: "",
            },
          ],
          default: [
            { src: "/images/catalog/set-15.png", label: "Rose Chikan Set", code: "RP-SET-015", rate: "₹875/pc" },
            { src: "/images/catalog/set-16.png", label: "Rust Bagh Set", code: "RP-SET-016", rate: "₹950/pc" },
            { src: "/images/catalog/set-17.png", label: "Mint Thread Set", code: "RP-SET-017", rate: "₹825/pc" },
          ],
        },
      ],
    },
    {
      id: "howto",
      title: "How to order",
      fields: [
        {
          key: "home.howto.eyebrow",
          label: "Eyebrow",
          type: "text",
          max: 80,
          default: "How to order",
        },
        {
          key: "home.howto.headline",
          label: "Headline",
          type: "text",
          max: 120,
          default: "Four sets, one message,",
        },
        {
          key: "home.howto.headlineAccent",
          label: "Headline — accent line",
          type: "text",
          max: 120,
          default: "done.",
        },
        {
          key: "home.howto.ctaLabel",
          label: "Button — label",
          type: "text",
          max: 40,
          default: "WhatsApp catalog",
        },
        {
          key: "home.howto.steps",
          label: "Steps",
          help: "Tokens work in step text: {minSets}, {setSize}, {sizeRatio}, {gstLow}, {gstHigh}.",
          type: "list",
          itemNoun: "step",
          maxItems: 6,
          minItems: 1,
          itemFields: [
            { key: "title", label: "Step title", type: "text", max: 80, default: "" },
            {
              key: "body",
              label: "Step text",
              type: "textarea",
              rows: 2,
              max: 300,
              default: "",
            },
          ],
          default: [
            {
              title: "Add sets from the price list",
              body: "Minimum order {minSets} sets across your whole order — mix any styles. One set = {setSize} pieces in {sizeRatio}.",
            },
            {
              title: "Review your order",
              body: "Every line shows its set rate and per-piece rate; totals update as you add sets.",
            },
            {
              title: "Send order on WhatsApp",
              body: "Your order reaches us exactly as shown, every line priced.",
            },
            {
              title: "Invoice at dispatch",
              body: "GST {gstLow}–{gstHigh}% on per-piece value. Final GST invoice at dispatch.",
            },
          ],
        },
      ],
    },
    {
      id: "instagram",
      title: "Instagram block",
      fields: [
        {
          key: "home.instagram.eyebrow",
          label: "Eyebrow",
          type: "text",
          max: 80,
          default: "On Instagram",
        },
        {
          key: "home.instagram.headline",
          label: "Headline",
          type: "text",
          max: 120,
          default: "Rack shots,",
        },
        {
          key: "home.instagram.headlineAccent",
          label: "Headline — accent line",
          type: "text",
          max: 120,
          default: "as they go up.",
        },
        {
          key: "home.instagram.body",
          label: "Paragraph",
          type: "textarea",
          rows: 2,
          max: 300,
          default:
            "New arrivals and rack shots as they go up. Tap any post to open it on Instagram.",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Group: Collections pages
// ---------------------------------------------------------------------------

const COLLECTIONS_GROUP: ContentGroup = {
  id: "collections",
  title: "Collections pages",
  description:
    "The collections index. A single collection's own title, note and image are edited in Collections, not here.",
  sections: [
    {
      id: "masthead",
      title: "Index masthead",
      fields: [
        {
          key: "collections.masthead.eyebrow",
          label: "Eyebrow",
          type: "text",
          max: 80,
          default: "Rangat Pehnawa — wholesale line book",
        },
        {
          key: "collections.masthead.headline",
          label: "Page heading",
          type: "text",
          max: 120,
          default: "Wholesale kurti collections",
        },
        {
          key: "collections.masthead.washImage",
          label: "Background wash",
          help: "Multiplied over the paper. Light-mode only.",
          type: "image",
          default: "/images/botanical_shadow.png",
        },
        {
          key: "collections.masthead.drapeImage",
          label: "Drape overlay",
          type: "image",
          default: "/images/premium_dupatta_v2.png",
        },
      ],
    },
    {
      id: "index",
      title: "Index body",
      fields: [
        {
          key: "collections.index.intro",
          label: "Intro line",
          help: "Tokens: {season}, {collectionCount}.",
          type: "text",
          max: 160,
          default: "{season}, issued Bengaluru",
        },
        {
          key: "collections.index.ctaLabel",
          label: "Open-collection link label",
          type: "text",
          max: 40,
          default: "Open collection →",
        },
        {
          key: "collections.index.emptyState",
          label: "When no collections are published",
          type: "textarea",
          rows: 2,
          max: 240,
          default:
            "Collections updating — WhatsApp for the current wholesale catalog and today's price list.",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Group: Site-wide settings
// ---------------------------------------------------------------------------

const SETTINGS_GROUP: ContentGroup = {
  id: "settings",
  title: "Site settings",
  description:
    "Facts that appear in many places at once. Editing the address here changes it on the footer, contact page, price list and shop colophon together.",
  sections: [
    {
      id: "announcement",
      title: "Announcement bar",
      description:
        "The thin strip above the navigation. Use it for a sale, a dispatch delay, or an exhibition date.",
      fields: [
        {
          key: "settings.announcement.enabled",
          label: "Show the announcement bar",
          type: "boolean",
          default: false,
        },
        {
          key: "settings.announcement.text",
          label: "Message",
          type: "text",
          max: 160,
          default: "",
          placeholder: "Diwali drop live — 10% off orders over 20 sets",
        },
        {
          key: "settings.announcement.linkLabel",
          label: "Link label",
          type: "text",
          max: 40,
          default: "",
          placeholder: "See the drop",
        },
        {
          key: "settings.announcement.linkHref",
          label: "Link target",
          type: "url",
          default: "",
          placeholder: "/shop",
        },
      ],
    },
    {
      id: "brand",
      title: "Brand",
      fields: [
        {
          key: "settings.brand.wordmarkFirst",
          label: "Wordmark — first word",
          type: "text",
          max: 30,
          default: "Rangat",
        },
        {
          key: "settings.brand.wordmarkSecond",
          label: "Wordmark — second word",
          type: "text",
          max: 30,
          default: "Pehnawa",
        },
        {
          key: "settings.brand.devanagariMark",
          label: "Devanagari brand mark",
          help: "The large cloth-filled letters on the cover.",
          type: "text",
          max: 20,
          default: "रंगत",
        },
        {
          key: "settings.brand.blurb",
          label: "Short description",
          help: "Used in the footer.",
          type: "textarea",
          rows: 2,
          max: 300,
          default:
            "Wholesale kurtis for boutiques and resellers. Browse the styles, build your order, send it on WhatsApp.",
        },
      ],
    },
    {
      id: "contact",
      title: "Contact details",
      description:
        "One edit here updates the footer, contact page, shop colophon, printed price list and the structured data search engines read.",
      fields: [
        {
          key: "settings.contact.whatsapp",
          label: "WhatsApp number",
          help: "Digits only, as customers should see it.",
          type: "text",
          max: 20,
          default: "8660452247",
        },
        {
          key: "settings.contact.email",
          label: "Email address",
          type: "text",
          max: 120,
          default: "rangatpehnawa@gmail.com",
        },
        {
          key: "settings.contact.addressLine1",
          label: "Address — line 1",
          type: "text",
          max: 120,
          default: "3rd Floor, NR Complex, 36,",
        },
        {
          key: "settings.contact.addressLine2",
          label: "Address — line 2",
          type: "text",
          max: 120,
          default: "Siddanna Ln, Cubbonpete,",
        },
        {
          key: "settings.contact.addressLine3",
          label: "Address — line 3",
          type: "text",
          max: 120,
          default: "Bengaluru 560002",
        },
        {
          key: "settings.contact.hours",
          label: "Opening hours",
          type: "text",
          max: 120,
          default: "Mon–Sat 10am–7pm IST · Sun closed",
        },
        {
          key: "settings.contact.mapsUrl",
          label: "Google Maps link",
          type: "url",
          default: "https://maps.app.goo.gl/ZRJ5Qda5iPvYxb868",
        },
        {
          key: "settings.contact.instagramUrl",
          label: "Instagram",
          type: "url",
          default: "https://www.instagram.com/rangatpehnawa/",
        },
      ],
    },
    {
      id: "terms",
      title: "Trade terms strip",
      description:
        "The four facts printed across the top rail, footer, price list and every product page. The values come from Pricing — only the labels live here.",
      fields: [
        {
          key: "settings.terms.minimumLabel",
          label: "Minimum-order label",
          type: "text",
          max: 40,
          default: "Minimum order",
        },
        {
          key: "settings.terms.packLabel",
          label: "Pack label",
          type: "text",
          max: 40,
          default: "Pack",
        },
        {
          key: "settings.terms.ratioLabel",
          label: "Size-ratio label",
          type: "text",
          max: 40,
          default: "Size ratio",
        },
        {
          key: "settings.terms.gstValue",
          label: "GST value text",
          help: "Tokens: {gstLow}, {gstHigh}.",
          type: "text",
          max: 80,
          default: "{gstLow}–{gstHigh}%, invoice at dispatch",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Assembly + lookups
// ---------------------------------------------------------------------------

export const CONTENT_GROUPS: ContentGroup[] = [
  HOME_GROUP,
  COLLECTIONS_GROUP,
  SETTINGS_GROUP,
];

/** Every field, flattened. */
export const CONTENT_FIELDS: ContentField[] = CONTENT_GROUPS.flatMap((group) =>
  group.sections.flatMap((section) => section.fields),
);

const FIELD_BY_KEY = new Map<string, ContentField>(
  CONTENT_FIELDS.map((field) => [field.key, field]),
);

export function getContentField(key: string): ContentField | undefined {
  return FIELD_BY_KEY.get(key);
}

/**
 * Registry defaults, keyed. List defaults are deep-copied on read so a caller
 * mutating a returned array cannot poison the defaults for the whole isolate.
 */
export const CONTENT_DEFAULTS: Readonly<Record<string, ContentValue>> =
  Object.freeze(
    Object.fromEntries(
      CONTENT_FIELDS.map((field) => [field.key, field.default as ContentValue]),
    ),
  );

export function getContentDefault(key: string): ContentValue | undefined {
  const field = FIELD_BY_KEY.get(key);
  if (!field) return undefined;
  if (isListField(field)) {
    return field.default.map((item) => ({ ...item }));
  }
  return field.default;
}

/** Guard against a copy/paste duplicating a key, which would silently shadow. */
if (process.env.NODE_ENV !== "production") {
  const seen = new Set<string>();
  for (const field of CONTENT_FIELDS) {
    if (seen.has(field.key)) {
      throw new Error(
        `[content/registry] Duplicate content key "${field.key}". Keys must be unique.`,
      );
    }
    seen.add(field.key);
  }
}
