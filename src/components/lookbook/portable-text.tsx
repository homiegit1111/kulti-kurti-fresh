import Image from "next/image";
import Link from "next/link";
import {
  PortableText as BasePortableText,
  type PortableTextComponents,
  type PortableTextBlock,
} from "@portabletext/react";
import { sanityImageUrl } from "@/lib/sanity/client";

// Premium serializers for editorial Portable Text — bold, italics, links,
// headings, blockquotes, lists and embedded images, all in the Rangat house
// style. Renders inside an RSC (no client JS needed).

type ImageValue = {
  asset?: { _ref?: string };
  alt?: string;
  caption?: string;
};

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="font-serif text-[1.0625rem] md:text-lg leading-[1.85] text-charcoal/80 mb-6">
        {children}
      </p>
    ),
    h2: ({ children }) => (
      <h2 className="font-serif text-2xl md:text-3xl text-charcoal tracking-tight leading-snug mt-14 mb-5">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="font-serif text-xl md:text-2xl text-charcoal tracking-tight leading-snug mt-10 mb-4">
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-10 pl-6 border-l-2 border-gold/60">
        <p className="font-serif italic text-xl md:text-2xl text-charcoal/70 leading-relaxed">
          {children}
        </p>
      </blockquote>
    ),
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold text-charcoal">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    underline: ({ children }) => (
      <span className="underline decoration-gold/50 underline-offset-4">
        {children}
      </span>
    ),
    link: ({ children, value }) => {
      const href: string = value?.href ?? "#";
      const external = /^https?:\/\//.test(href);
      const cls =
        "text-charcoal underline decoration-gold/60 underline-offset-4 hover:decoration-gold transition-colors";
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
      <li className="font-serif text-[1.0625rem] leading-relaxed text-charcoal/80 pl-6 relative before:content-[''] before:absolute before:left-0 before:top-[0.7em] before:w-2 before:h-px before:bg-gold">
        {children}
      </li>
    ),
    number: ({ children }) => (
      <li className="font-serif text-[1.0625rem] leading-relaxed text-charcoal/80 pl-7 relative [counter-increment:item] before:content-[counter(item)'.'] before:absolute before:left-0 before:top-0 before:text-gold before:font-medium before:text-sm">
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
          <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-charcoal/5">
            <Image
              src={src}
              alt={value.alt ?? ""}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
          {value.caption && (
            <figcaption className="mt-3 text-center text-xs uppercase tracking-[0.18em] text-charcoal/45">
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
