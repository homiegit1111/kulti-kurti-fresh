function stableNumber(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  }
  return hash + 1;
}

function codeCategory(value?: string): string {
  const normalized = (value || "kurti").toLowerCase();
  if (normalized.includes("rayon")) return "RAYON";
  if (normalized.includes("cotton")) return "COTTON";
  if (normalized.includes("festive")) return "FEST";
  if (normalized.includes("office")) return "OFFICE";
  if (normalized.includes("coord") || normalized.includes("co-ord")) return "COORD";
  if (normalized.includes("lehenga")) return "LEH";
  if (normalized.includes("saree")) return "SAR";
  return "KURTI";
}

export function getStyleCode(
  product: { id: string; handle: string; category?: string },
): string {
  const number = stableNumber(product.handle || product.id);
  return `RP-${codeCategory(product.category)}-${String(number).padStart(3, "0")}`;
}
