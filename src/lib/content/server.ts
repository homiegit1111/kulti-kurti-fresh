import "server-only";

/**
 * Server-side content reader.
 *
 * CACHING — read this before changing it.
 *
 * This uses a short in-process memo, NOT Next's data cache with
 * `revalidateTag`. That is a deliberate choice for this deployment:
 * @opennextjs/cloudflare only implements on-demand tag revalidation when a tag
 * cache override is configured, and open-next.config.ts configures only the R2
 * incremental cache. So `revalidateTag()` would silently no-op in production and
 * the owner's edits would never appear — the worst possible failure mode for a
 * CMS, because it looks like it worked.
 *
 * A 30-second memo instead means: one small query per isolate per 30s, and every
 * edit is live within 30 seconds everywhere, with no bindings to provision. The
 * admin API also calls revalidatePath() as a best-effort bonus — that works on
 * Node hosts and is harmless where it doesn't.
 *
 * NOTE: a page that is fully prerendered at build time will not re-render on its
 * own. Any route that reads content needs `export const revalidate = <seconds>`
 * (or to be dynamic) for edits to reach visitors. See docs/ADMIN_STUDIO.md.
 *
 * FAILURE BEHAVIOUR
 * Every failure path returns registry defaults. A missing Supabase config, a
 * network blip, or a malformed row can never blank out the storefront — the
 * worst case is that the site shows the values it shipped with.
 */

import { createPublicClient } from "@/lib/supabase/public";
import { CONTENT_FIELDS, getContentDefault, getContentField } from "./registry";
import { isListField, type ContentValue } from "./types";
import { renderItemTokens, renderTokens, type ContentTokens } from "./tokens";

const TTL_MS = 30_000;

type Snapshot = {
  values: Map<string, ContentValue>;
  loadedAt: number;
  /** False when the DB was unreachable — surfaced so admin UIs can warn. */
  fromDatabase: boolean;
};

let cached: Snapshot | null = null;
/** In-flight load, shared so a burst of requests issues one query, not N. */
let inflight: Promise<Snapshot> | null = null;

function defaultsSnapshot(fromDatabase: boolean): Snapshot {
  return { values: new Map(), loadedAt: Date.now(), fromDatabase };
}

async function loadSnapshot(): Promise<Snapshot> {
  const supabase = createPublicClient();
  if (!supabase) return defaultsSnapshot(false);

  try {
    const { data, error } = await supabase
      .from("site_content")
      .select("key, value");

    if (error) {
      console.error("[content] read failed:", error.message);
      return defaultsSnapshot(false);
    }

    const values = new Map<string, ContentValue>();
    for (const row of data ?? []) {
      const key = typeof row.key === "string" ? row.key : "";
      if (!key) continue;
      // Ignore rows whose key is no longer in the registry (a removed field) and
      // rows whose stored shape no longer matches the field type (a field that
      // changed type). Either way the default is the safe answer.
      const field = getContentField(key);
      if (!field) continue;
      const value = row.value as unknown;
      if (isListField(field)) {
        if (Array.isArray(value)) values.set(key, value as ContentValue);
        continue;
      }
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        values.set(key, value);
      }
    }
    return { values, loadedAt: Date.now(), fromDatabase: true };
  } catch (e) {
    console.error(
      "[content] read threw:",
      e instanceof Error ? e.message : String(e),
    );
    return defaultsSnapshot(false);
  }
}

async function getSnapshot(): Promise<Snapshot> {
  const now = Date.now();
  if (cached && now - cached.loadedAt < TTL_MS) return cached;
  if (inflight) return inflight;

  inflight = loadSnapshot()
    .then((snapshot) => {
      // Only replace a good snapshot with another good one. If the database
      // blipped, keep serving the last known-good values rather than falling
      // back to build-time defaults and visibly "reverting" the site.
      if (snapshot.fromDatabase || !cached?.fromDatabase) {
        cached = snapshot;
      } else {
        cached = { ...cached, loadedAt: Date.now() };
      }
      return cached;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Drop the memo so the next read hits the database. Called after a publish. */
export function invalidateSiteContentCache(): void {
  cached = null;
}

export type SiteContent = {
  /** Text with {tokens} resolved. Falls back to the registry default. */
  text(key: string): string;
  /** Text with tokens left as typed — for editors and diffing. */
  rawText(key: string): string;
  num(key: string): number;
  bool(key: string): boolean;
  /** An image or video URL. Empty string means "nothing set". */
  media(key: string): string;
  /** A list field, with tokens resolved in every string cell. */
  list<T extends Record<string, string | number | boolean>>(key: string): T[];
  /** True when an override exists (i.e. the owner has edited this field). */
  isOverridden(key: string): boolean;
  /** False when the values came from registry defaults because the DB was unreachable. */
  fromDatabase: boolean;
};

function coerceString(value: ContentValue | undefined, fallback: string): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

/**
 * Read site content. `tokens` supplies live values for {placeholders}; pass what
 * the page knows (style counts, season) and omit the rest.
 *
 * Call this once per render and pass the result down — it is a plain object, so
 * it costs nothing to hand to child components.
 */
export async function getSiteContent(
  tokens: ContentTokens = {},
): Promise<SiteContent> {
  const snapshot = await getSnapshot();

  const resolve = (key: string): ContentValue | undefined => {
    const stored = snapshot.values.get(key);
    return stored !== undefined ? stored : getContentDefault(key);
  };

  return {
    fromDatabase: snapshot.fromDatabase,

    text(key) {
      return renderTokens(coerceString(resolve(key), ""), tokens);
    },

    rawText(key) {
      return coerceString(resolve(key), "");
    },

    num(key) {
      const value = resolve(key);
      if (typeof value === "number") return value;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    },

    bool(key) {
      const value = resolve(key);
      return value === true || value === "true";
    },

    media(key) {
      const value = resolve(key);
      return typeof value === "string" ? value : "";
    },

    list<T extends Record<string, string | number | boolean>>(key: string): T[] {
      const value = resolve(key);
      if (!Array.isArray(value)) return [];
      return value.map((item) => renderItemTokens(item as T, tokens));
    },

    isOverridden(key) {
      return snapshot.values.has(key);
    },
  };
}

/**
 * Every stored override plus every default, for the admin editor. Unlike
 * getSiteContent this returns raw values with tokens unresolved — the editor
 * must show what is stored, not what it renders to.
 */
export async function getContentForEditor(): Promise<{
  values: Record<string, ContentValue>;
  overriddenKeys: string[];
  fromDatabase: boolean;
}> {
  const snapshot = await getSnapshot();
  const values: Record<string, ContentValue> = {};
  for (const field of CONTENT_FIELDS) {
    const stored = snapshot.values.get(field.key);
    values[field.key] =
      stored !== undefined
        ? stored
        : (getContentDefault(field.key) as ContentValue);
  }
  return {
    values,
    overriddenKeys: [...snapshot.values.keys()],
    fromDatabase: snapshot.fromDatabase,
  };
}
