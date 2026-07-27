import "server-only";

/**
 * Resolve editable content into the plain shapes the home and collections pages
 * render from.
 *
 * This is the only place that knows both the registry keys and the page's prop
 * shape, so a key rename is a one-file change. Pages call
 * `getHomeContent(tokens)` once and thread the result down as props — see
 * src/lib/content/home-types.ts for why the data is flattened rather than
 * passing the reader itself.
 */

import { getSiteContent } from "./server";
import type { ContentTokens } from "./tokens";
import type {
  CollectionsIndexContent,
  HomeContent,
  HomeSetItem,
  HomeShot,
} from "./home-types";

export async function getHomeContent(
  tokens: ContentTokens = {},
): Promise<HomeContent> {
  const c = await getSiteContent(tokens);

  return {
    cover: {
      eyebrow: c.text("home.cover.eyebrow"),
      headline: c.text("home.cover.headline"),
      headlineAccent: c.text("home.cover.headlineAccent"),
      body: c.text("home.cover.body"),
      modelImage: c.media("home.cover.modelImage"),
      clothImage: c.media("home.cover.clothImage"),
      primaryCtaLabel: c.text("home.cover.primaryCtaLabel"),
      primaryCtaHref: c.media("home.cover.primaryCtaHref") || "/shop",
      secondaryCtaLabel: c.text("home.cover.secondaryCtaLabel"),
    },
    film: {
      // The band is skipped entirely when no MP4 is set: MP4 is the universal
      // fallback, so without it there is nothing every browser can play, and an
      // empty <video> would render as a black hole in the page.
      enabled: c.bool("home.film.enabled") && Boolean(c.media("home.film.videoMp4")),
      videoWebm: c.media("home.film.videoWebm"),
      videoMp4: c.media("home.film.videoMp4"),
      poster: c.media("home.film.poster"),
      headline: c.text("home.film.headline"),
      headlineAccent: c.text("home.film.headlineAccent"),
      caption: c.text("home.film.caption"),
      ctaLabel: c.text("home.film.ctaLabel"),
      ctaHref: c.media("home.film.ctaHref") || "/shop",
    },
    season: {
      eyebrow: c.text("home.season.eyebrow"),
      headline: c.text("home.season.headline"),
      headlineAccent: c.text("home.season.headlineAccent"),
      ctaLabel: c.text("home.season.ctaLabel"),
      ctaHref: c.media("home.season.ctaHref") || "/shop",
      // Drop rows with no image: an empty figure is worse than a shorter row.
      shots: c
        .list<HomeShot>("home.season.shots")
        .filter((shot) => Boolean(shot.image)),
    },
    rates: {
      eyebrow: c.text("home.rates.eyebrow"),
      headline: c.text("home.rates.headline"),
      headlineAccent: c.text("home.rates.headlineAccent"),
      body: c.text("home.rates.body"),
      emptyState: c.text("home.rates.emptyState"),
    },
    collections: {
      eyebrow: c.text("home.collections.eyebrow"),
      headline: c.text("home.collections.headline"),
      headlineAccent: c.text("home.collections.headlineAccent"),
      ctaLabel: c.text("home.collections.ctaLabel"),
      ctaHref: c.media("home.collections.ctaHref") || "/collections",
    },
    sets: {
      eyebrow: c.text("home.sets.eyebrow"),
      headline: c.text("home.sets.headline"),
      headlineAccent: c.text("home.sets.headlineAccent"),
      body: c.text("home.sets.body"),
      wornImage: c.media("home.sets.wornImage"),
      wornImageAlt: c.text("home.sets.wornImageAlt"),
      items: c
        .list<HomeSetItem>("home.sets.items")
        .filter((item) => Boolean(item.src)),
    },
    howto: {
      eyebrow: c.text("home.howto.eyebrow"),
      headline: c.text("home.howto.headline"),
      headlineAccent: c.text("home.howto.headlineAccent"),
      ctaLabel: c.text("home.howto.ctaLabel"),
      steps: c.list("home.howto.steps"),
    },
    instagram: {
      eyebrow: c.text("home.instagram.eyebrow"),
      headline: c.text("home.instagram.headline"),
      headlineAccent: c.text("home.instagram.headlineAccent"),
      body: c.text("home.instagram.body"),
    },
  };
}

export async function getCollectionsIndexContent(
  tokens: ContentTokens = {},
): Promise<CollectionsIndexContent> {
  const c = await getSiteContent(tokens);
  return {
    eyebrow: c.text("collections.masthead.eyebrow"),
    headline: c.text("collections.masthead.headline"),
    washImage: c.media("collections.masthead.washImage"),
    drapeImage: c.media("collections.masthead.drapeImage"),
    intro: c.text("collections.index.intro"),
    ctaLabel: c.text("collections.index.ctaLabel"),
    emptyState: c.text("collections.index.emptyState"),
  };
}
