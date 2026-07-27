import Image from "next/image";
import Link from "next/link";
import {
  PortableText as BasePortableText,
  type PortableTextComponents,
  type PortableTextBlock,
} from "@portabletext/react";
import { sanityImageUrl } from "@/lib/sanity/client";

// Line-book serializers for editorial Portable Text — bold, italics, links,
// headings, blockquotes, lists and embedded images, all on the semantic
// surface/content tokens (never hardcoded ink — dark mode depends on it).
// Renders inside an RSC (no client JS needed).

type ImageValue = {
  asset?: { _ref?: string };
  alt?: string;
  caption?: string;
};

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="mb-6 text-base leading-[1.85] text-content/75 md:text-[1.0625rem]">
        {children}
      </p>
    ),
    h2: ({ children }) => (
      <h2 className="mt-14 mb-5 text-2xl font-black uppercase leading-[1.02] tracking-[-0.03em] text-content md:text-3xl">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-10 mb-4 text-xl font-black uppercase leading-[1.08] tracking-[-0.02em] text-content md:text-2xl">
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      // Lookbook pull quote — one of the three licensed Playfair placements
      // (§1.3: serif accent, italic 500, lowercase).
      <blockquote className="my-10 border-l border-line/25 pl-6">
        <p className="max-w-[40ch] font-serif text-[17px] lowercase italic leading-7 text-content/80">
          {children}
        </p>
      </blockquote>
    ),
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-bold text-content">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    underline: ({ children }) => (
      <span className="underline decoration-accent-lime decoration-2 underline-offset-4">
        {children}
      </span>
    ),
    link: ({ children, value }) => {
      const href: string = value?.href ?? "#";
      const external = /^https?:\/\//.test(href);
      const cls =
        "text-content underline decoration-accent-lime decoration-2 underline-offset-4 transition-colors hover:decoration-accent-red";
      return external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
          {children}
        </a>
      ) : (
        <Link href={href} className={cls}>
          {children}
        </Link>
      );
    },
  },
  list: {
    bullet: ({ children }) => (
      <ul className="my-6 space-y-2.5 pl-1">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="my-6 space-y-2.5 pl-1 list-none [counter-reset:item]">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => (
      <li className="relative pl-6 text-base leading-relaxed text-content/75 md:text-[1.0625rem] before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-2 before:bg-accent-red before:content-['']">
        {children}
      </li>
    ),
    number: ({ children }) => (
      <li className="relative pl-7 text-base leading-relaxed text-content/75 md:text-[1.0625rem] [counter-increment:item] before:absolute before:left-0 before:top-0 before:text-sm before:font-bold before:text-accent-red before:content-[counter(item)'.']">
        {children}
      </li>
    ),
  },
  types: {
    image: ({ value }: { value: ImageValue }) => {
      const src = sanityImageUrl(value?.asset?._ref, 1400);
      if (!src) return null;
      return (
        <figure className="my-10">
          <div className="relative aspect-[3/2] overflow-hidden border border-line/20 bg-surface-hover">
            <Image
              src={src}
              alt={value.alt ?? ""}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
          {value.caption && (
            <figcaption className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-content/45">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
  },
};

export function LookbookPortableText({ value }: { value: PortableTextBlock[] }) {
  if (!Array.isArray(value) || value.length === 0) return null;
  return <BasePortableText value={value} components={components} />;
}
