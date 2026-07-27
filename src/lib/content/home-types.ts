/**
 * The home page's editable content, as PLAIN DATA.
 *
 * The reader in ./server.ts returns an accessor object with methods, which
 * cannot cross the server/client boundary. Most home-page sections are client
 * components, so the server resolves everything once into this flat shape and
 * passes it down as props. One database read per render, no content fetching in
 * the browser, and no "use client" file ever imports the server reader.
 *
 * Every string here already has its {tokens} resolved.
 *
 * Client-safe: types only.
 */

export type HomeShot = { image: string; numeral: string; alt: string };
export type HomeSetItem = { src: string; label: string; code: string; rate: string };
export type HomeStep = { title: string; body: string };

export type HomeCoverContent = {
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  body: string;
  modelImage: string;
  clothImage: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
};

export type HomeFilmContent = {
  enabled: boolean;
  videoWebm: string;
  videoMp4: string;
  poster: string;
  headline: string;
  headlineAccent: string;
  caption: string;
  ctaLabel: string;
  ctaHref: string;
};

/** The repeated eyebrow / headline / accent / link shape most blocks share. */
export type HomeBlockContent = {
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  ctaLabel: string;
  ctaHref: string;
};

export type HomeContent = {
  cover: HomeCoverContent;
  film: HomeFilmContent;
  season: HomeBlockContent & { shots: HomeShot[] };
  rates: Omit<HomeBlockContent, "ctaLabel" | "ctaHref"> & {
    body: string;
    emptyState: string;
  };
  collections: HomeBlockContent;
  sets: Omit<HomeBlockContent, "ctaLabel" | "ctaHref"> & {
    body: string;
    wornImage: string;
    wornImageAlt: string;
    items: HomeSetItem[];
  };
  howto: Omit<HomeBlockContent, "ctaHref"> & { steps: HomeStep[] };
  instagram: Omit<HomeBlockContent, "ctaLabel" | "ctaHref"> & { body: string };
};

export type CollectionsIndexContent = {
  eyebrow: string;
  headline: string;
  washImage: string;
  drapeImage: string;
  intro: string;
  ctaLabel: string;
  emptyState: string;
};
