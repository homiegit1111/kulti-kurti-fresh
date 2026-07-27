/**
 * SWATCHES — the real colour of each garment, read from its photograph.
 *
 * Generated, not hand-picked: a script samples the centre band of every
 * catalogue image, discards backdrop, shadow and skin, and takes the MODE of
 * what remains (a mean turns a printed dupatta to mud). Values are nudged to
 * stay visible against the cream paper.
 *
 * WHY THIS EXISTS: रंगत means colour. A buyer asks for mustard, not for
 * RP-KURTI-055 — so the site should know what colour each style actually is
 * instead of relying on a word in the title.
 *
 * Regenerate when the catalogue photography changes; a missing entry simply
 * renders no swatch, so this can never break a row.
 */

const SWATCHES: Record<string, string> = {
  "/images/catalog/set-01.jpg": "#CCC0B3",
  "/images/catalog/set-02.jpg": "#CCC4B8",
  "/images/catalog/set-03.jpg": "#CCC1B4",
  "/images/catalog/set-04.jpg": "#CCC5B7",
  "/images/catalog/set-05.jpg": "#853824",
  "/images/catalog/set-06.jpg": "#12213A",
  "/images/catalog/set-07.jpg": "#CCC2B2",
  "/images/catalog/set-08.jpg": "#6C390B",
  "/images/catalog/set-09.jpg": "#B4C9CD",
  "/images/catalog/set-10.jpg": "#CCC4B8",
  "/images/catalog/set-11.jpg": "#CCC6B8",
  "/images/catalog/set-12.jpg": "#D4C3B3",
  "/images/catalog/set-13.jpg": "#D1C7B6",
  "/images/catalog/set-14.jpg": "#4F5525",
  "/images/catalog/set-15.jpg": "#9D3F55",
  "/images/catalog/set-16.jpg": "#B33D1F",
  "/images/catalog/set-17.jpg": "#7CA4A9",
};

/** The garment's colour, or null when the image has no sampled entry. */
export function swatchFor(image: string | undefined): string | null {
  if (!image) return null;
  return SWATCHES[image] ?? null;
}
