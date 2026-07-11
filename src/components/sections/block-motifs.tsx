/**
 * Block-print maker's mark — a four-fold buti stamped from a carved block.
 * Shared wayfinding motif reused as a section marker so the page reads as
 * one hand, not many. Inherits currentColor; size via className (h-* w-*).
 */
export function BlockMotif({
  className,
  strokeOnly = false,
}: {
  className?: string;
  strokeOnly?: boolean;
}) {
  const petal = "M24,20 C28,15 28,9 24,6 C20,9 20,15 24,20 Z";
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 48"
      className={className}
      fill={strokeOnly ? "none" : "currentColor"}
      stroke={strokeOnly ? "currentColor" : "none"}
      strokeWidth={strokeOnly ? 1.4 : 0}
    >
      <path d={petal} />
      <path d={petal} transform="rotate(90 24 24)" />
      <path d={petal} transform="rotate(180 24 24)" />
      <path d={petal} transform="rotate(270 24 24)" />
      <circle cx="24" cy="24" r="2.4" />
      <circle cx="33" cy="15" r="1.2" />
      <circle cx="33" cy="33" r="1.2" />
      <circle cx="15" cy="33" r="1.2" />
      <circle cx="15" cy="15" r="1.2" />
    </svg>
  );
}
