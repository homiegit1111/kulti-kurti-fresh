/**
 * Safe JSON-LD serialisation.
 *
 * THE BUG THIS FIXES
 * `JSON.stringify` escapes quotes and backslashes. It does NOT escape `<`, so
 * any string that reaches structured data containing the literal text
 * `</script>` closes the surrounding
 * `<script type="application/ld+json">` element early, and everything after it
 * is parsed as HTML.
 *
 * That is reachable from real input on this site: product titles and
 * descriptions come from the admin, and review bodies come from any signed-in
 * customer (2000 characters of free text, length-checked only). Those values are
 * injected into ItemList / Product / Review JSON-LD on the home page, the shop
 * index, collection pages and every product page.
 *
 * It matters most on the home page. `/` is prerendered, so it cannot carry a
 * per-request nonce, so its Content-Security-Policy keeps `'unsafe-inline'` in
 * `script-src` as the CSP2 fallback — meaning an injected inline script there
 * actually executes. On the nonce'd routes CSP3 blocks execution, but the HTML
 * is still corrupted and the structured data is still lost.
 *
 * THE FIX
 * Escape the four characters that can break out of, or be misread inside, an
 * inline script element. `\uXXXX` escapes are valid JSON, so every consumer —
 * Google's parser included — reads back the original characters:
 *
 *   <  →  <     closes no tag
 *   >  →  >     symmetry; also defuses `<!--` / `-->` comment tricks
 *   &  →  &     no HTML entity can be smuggled through
 *   U+2028 / U+2029  are literal line terminators in JavaScript but legal
 *                    inside a JSON string, so they must be escaped too
 *
 * Always use this instead of `JSON.stringify` when the result goes into
 * `dangerouslySetInnerHTML`.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

