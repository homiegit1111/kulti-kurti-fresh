import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  /** Applied to both light + dark images */
  imageClassName?: string;
  /** Sizes attr for next/image */
  sizes?: string;
  priority?: boolean;
};

/**
 * Brand mark: light = original brown script; dark = white Pehnawa/ART OF,
 * rainbow RANGAT unchanged. Transparent PNGs — no background treatment.
 */
export function BrandLogo({
  className,
  imageClassName,
  sizes = "200px",
  priority = false,
}: BrandLogoProps) {
  return (
    <span className={cn("relative block h-full w-full", className)}>
      <Image
        src="/images/RangatPehnawa.png"
        alt="Rangat Pehnawa"
        fill
        sizes={sizes}
        priority={priority}
        className={cn(
          "object-contain object-left drop-shadow-sm dark:hidden",
          imageClassName,
        )}
      />
      <Image
        src="/images/RangatPehnawa-dark.png"
        alt="Rangat Pehnawa"
        fill
        sizes={sizes}
        priority={priority}
        className={cn(
          "hidden object-contain object-left drop-shadow-sm dark:block",
          imageClassName,
        )}
      />
    </span>
  );
}
