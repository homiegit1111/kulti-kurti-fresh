type RangatVectorProps = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
};

/**
 * Fixed vector outlines for रंगत, extracted once from the approved proportions
 * and refined by the mask that consumes them. Keeping paths here removes font
 * rendering variability and makes the campaign mark a true SVG wordmark.
 */
export function RangatVectorPaths({
  fill = "currentColor",
  stroke = "none",
  strokeWidth = 0,
}: RangatVectorProps) {
  return (
    <g
      transform="translate(263 560) scale(0.7 -0.7)"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d="M322 -20L312 -20L114 223Q77 268 61.5 296.5Q46 325 46 342Q46 374 97 374Q112 374 138 372Q164 370 182 368Q187 393 188.5 425.5Q190 458 190 482Q190 503 189.5 518Q189 533 188 545L6 545L-28 610L-28 620L388 620L422 555L422 545L271 545Q272 526 273 503Q274 480 274 471Q274 389 262 341Q250 293 225.5 269Q201 245 165 237L373 22Z" />
      <circle cx="-131" cy="758" r="55" transform="translate(360 0)" />
      <path d="M611 545L494 545L496 -10L486 -10L407 41L411 545L225 545L227 195Q227 170 204 170Q188 170 162.5 186Q137 202 112 226.5Q87 251 70 277.5Q53 304 53 324Q53 333 59 340Q65 347 78 347L142 347L143 545L6 545L-28 610L-28 620L577 620L611 555Z" transform="translate(386 0)" />
      <path d="M223 -10L213 -10Q142 82 95 156Q48 230 48 294Q48 368 105.5 401.5Q163 435 258 435L399 435L400 545L6 545L-28 610L-28 620L567 620L601 555L601 545L484 545L486 -10L476 -10L396 42L398 360L269 360Q196 360 160.5 327.5Q125 295 125 248Q125 226 131.5 206Q138 186 153.5 162Q169 138 196.5 105.5Q224 73 266 25Z" transform="translate(961 0)" />
    </g>
  );
}
