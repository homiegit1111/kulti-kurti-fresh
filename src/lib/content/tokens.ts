/**
 * Token substitution for content strings.
 *
 * Content text may contain {tokens} that resolve from live data at render time,
 * so a number like the minimum order quantity is quoted from one source instead
 * of being retyped into a dozen sentences. Change the MOQ in Pricing and every
 * sentence follows.
 *
 * Deliberately not a template engine: no expressions, no function calls, no
 * nesting. It replaces a fixed set of {name} placeholders with strings and
 * leaves everything else — including an unknown {token} — exactly as typed, so
 * a typo shows up as itself rather than silently vanishing.
 *
 * Client-safe: no server imports.
 */

export type ContentTokenName =
  | "setSize"
  | "sizeRatio"
  | "minSets"
  | "styleCount"
  | "collectionCount"
  | "season"
  | "gstLow"
  | "gstHigh";

export type ContentTokens = Partial<Record<ContentTokenName, string | number>>;

const TOKEN_PATTERN = /\{([a-zA-Z]+)\}/g;

/**
 * Replace {tokens} in `text`. Unknown tokens are left untouched — visible in
 * the rendered page, which is the fastest way for the owner to notice a typo.
 */
export function renderTokens(text: string, tokens: ContentTokens): string {
  if (!text || !text.includes("{")) return text;
  return text.replace(TOKEN_PATTERN, (whole, name: string) => {
    const value = tokens[name as ContentTokenName];
    return value === undefined || value === null ? whole : String(value);
  });
}

/** Apply `renderTokens` to every string value of a list item. */
export function renderItemTokens<T extends Record<string, string | number | boolean>>(
  item: T,
  tokens: ContentTokens,
): T {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(item)) {
    out[key] = typeof value === "string" ? renderTokens(value, tokens) : value;
  }
  return out as T;
}
