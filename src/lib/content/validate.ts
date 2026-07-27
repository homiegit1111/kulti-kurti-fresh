/**
 * Content validation + sanitisation.
 *
 * This is the security boundary for everything the owner types into Admin
 * Studio. Values saved here are rendered into the storefront, so a permissive
 * validator is an XSS and layout-corruption vector. Rules:
 *
 *   • Text is stored as PLAIN TEXT and rendered as React children (escaped).
 *     Angle brackets are not stripped — they are simply never interpreted,
 *     because nothing renders content through dangerouslySetInnerHTML.
 *     Control characters ARE stripped: they are invisible in the editor and
 *     corrupt JSON-LD and print output.
 *
 *   • Links and media are the dangerous fields, because a URL becomes an
 *     `href`/`src` attribute. Only two shapes are accepted: a site-relative
 *     path starting with a single "/", or an absolute https:// URL. That
 *     rejects `javascript:`, `data:`, `vbscript:`, protocol-relative `//evil`,
 *     and anything with embedded credentials or control characters.
 *
 *   • Colours must match #rgb / #rrggbb. Free-form CSS in a style attribute is
 *     how you get `background: url(javascript:…)` and layout takeovers.
 *
 * Every rule is enforced on SAVE, server-side. The editor mirrors some of them
 * for feedback, but the browser is never the check.
 */

import {
  isListField,
  type ContentField,
  type ContentValue,
  type ScalarField,
} from "./types";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/**
 * Characters that are invisible, direction-flipping, or JSON-LD hazards: C0/C1
 * controls (tab and newline deliberately excepted), zero-width and bidi-override
 * marks, the separators that are legal in JSON but terminate a JavaScript line,
 * and the BOM.
 *
 * Written as \u escapes rather than literal characters so the rule survives a
 * copy/paste or an encoding change in this file: a literal U+202E in source is
 * both invisible to review and liable to be mangled in transit.
 */
const CONTROL_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069\uFEFF]/g;

const DEFAULT_TEXT_MAX = 300;
const DEFAULT_TEXTAREA_MAX = 2000;
const URL_MAX = 500;

function stripControls(value: string): string {
  return value.replace(CONTROL_CHARS, "");
}

/** Collapse the runs of whitespace a paste from Word/WhatsApp leaves behind. */
function normalizeSingleLine(value: string): string {
  return stripControls(value).replace(/\s+/g, " ").trim();
}

function normalizeMultiLine(value: string): string {
  return stripControls(value.replace(/\r\n?/g, "\n"))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Accept only a site-relative path or an absolute https:// URL.
 *
 * `new URL()` is deliberately NOT used as the first gate: it happily parses
 * `javascript:alert(1)` and `data:text/html,…`, so the protocol allowlist has
 * to come first and be exhaustive.
 */
export function sanitizeUrl(
  raw: string,
  opts: { allowMailto?: boolean; allowTel?: boolean } = {},
): ValidationResult<string> {
  const value = stripControls(raw).trim();
  if (value === "") return { ok: true, value: "" };
  if (value.length > URL_MAX) {
    return { ok: false, error: `Link is longer than ${URL_MAX} characters.` };
  }
  // Reject anything with whitespace: a browser may still resolve it, and it is
  // the classic way to smuggle "java\nscript:".
  if (/\s/.test(value)) {
    return { ok: false, error: "Link cannot contain spaces or line breaks." };
  }

  // Site-relative path. A leading "//" is protocol-relative — an off-site link
  // in disguise — so it is rejected.
  if (value.startsWith("/")) {
    if (value.startsWith("//")) {
      return { ok: false, error: "Link cannot start with “//”. Use a path like /shop." };
    }
    return { ok: true, value };
  }

  // Anchors and query-only links are fine and stay on the page.
  if (value.startsWith("#") || value.startsWith("?")) {
    return { ok: true, value };
  }

  const lower = value.toLowerCase();
  if (opts.allowMailto && lower.startsWith("mailto:")) {
    return { ok: true, value };
  }
  if (opts.allowTel && lower.startsWith("tel:")) {
    return { ok: true, value };
  }
  if (!lower.startsWith("https://")) {
    return {
      ok: false,
      error: "Links must be a site path like /shop or a full https:// address.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: "That is not a valid web address." };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Only https:// addresses are allowed." };
  }
  // Embedded credentials (https://user:pass@host) are a phishing shape and have
  // no legitimate use in site content.
  if (parsed.username || parsed.password) {
    return { ok: false, error: "Links cannot contain a username or password." };
  }
  if (!parsed.hostname || !parsed.hostname.includes(".")) {
    return { ok: false, error: "That web address has no valid domain." };
  }
  return { ok: true, value: parsed.toString() };
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function sanitizeColor(raw: string): ValidationResult<string> {
  const value = stripControls(raw).trim();
  if (value === "") return { ok: true, value: "" };
  if (!HEX_COLOR.test(value)) {
    return { ok: false, error: "Use a hex colour like #1A1512." };
  }
  return { ok: true, value: value.toLowerCase() };
}

/** Validate one scalar field value against its declaration. */
export function validateScalar(
  field: ScalarField,
  raw: unknown,
): ValidationResult<string | number | boolean> {
  switch (field.type) {
    case "boolean": {
      if (typeof raw === "boolean") return { ok: true, value: raw };
      if (raw === "true") return { ok: true, value: true };
      if (raw === "false") return { ok: true, value: false };
      return { ok: false, error: `${field.label} must be on or off.` };
    }

    case "number": {
      const n =
        typeof raw === "number"
          ? raw
          : typeof raw === "string" && raw.trim() !== ""
            ? Number(raw)
            : NaN;
      if (!Number.isFinite(n)) {
        return { ok: false, error: `${field.label} must be a number.` };
      }
      if (field.min !== undefined && n < field.min) {
        return { ok: false, error: `${field.label} cannot be below ${field.min}.` };
      }
      if (field.maxValue !== undefined && n > field.maxValue) {
        return { ok: false, error: `${field.label} cannot be above ${field.maxValue}.` };
      }
      return { ok: true, value: n };
    }

    case "color": {
      if (typeof raw !== "string") {
        return { ok: false, error: `${field.label} must be a hex colour.` };
      }
      const result = sanitizeColor(raw);
      return result.ok
        ? result
        : { ok: false, error: `${field.label}: ${result.error}` };
    }

    case "url":
    case "image":
    case "video": {
      if (typeof raw !== "string") {
        return { ok: false, error: `${field.label} must be a link.` };
      }
      const result = sanitizeUrl(raw, {
        allowMailto: field.type === "url",
        allowTel: field.type === "url",
      });
      return result.ok
        ? result
        : { ok: false, error: `${field.label}: ${result.error}` };
    }

    case "textarea": {
      if (typeof raw !== "string") {
        return { ok: false, error: `${field.label} must be text.` };
      }
      const value = normalizeMultiLine(raw);
      const max = field.max ?? DEFAULT_TEXTAREA_MAX;
      if (value.length > max) {
        return {
          ok: false,
          error: `${field.label} is ${value.length} characters — the limit is ${max}.`,
        };
      }
      return { ok: true, value };
    }

    case "text":
    default: {
      if (typeof raw !== "string") {
        return { ok: false, error: `${field.label} must be text.` };
      }
      const value = normalizeSingleLine(raw);
      const max = field.max ?? DEFAULT_TEXT_MAX;
      if (value.length > max) {
        return {
          ok: false,
          error: `${field.label} is ${value.length} characters — the limit is ${max}.`,
        };
      }
      return { ok: true, value };
    }
  }
}

/**
 * Validate a whole field value (scalar or list). Returns the CLEANED value to
 * store — callers must persist this, never the raw input.
 */
export function validateContentValue(
  field: ContentField,
  raw: unknown,
): ValidationResult<ContentValue> {
  if (!isListField(field)) {
    return validateScalar(field, raw);
  }

  if (!Array.isArray(raw)) {
    return { ok: false, error: `${field.label} must be a list.` };
  }
  if (raw.length > field.maxItems) {
    return {
      ok: false,
      error: `${field.label} allows at most ${field.maxItems} ${field.itemNoun}s.`,
    };
  }
  if (field.minItems !== undefined && raw.length < field.minItems) {
    return {
      ok: false,
      error: `${field.label} needs at least ${field.minItems} ${field.itemNoun}s.`,
    };
  }

  const items: Record<string, string | number | boolean>[] = [];
  for (let i = 0; i < raw.length; i++) {
    const rawItem = raw[i];
    if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
      return {
        ok: false,
        error: `${field.label}: ${field.itemNoun} ${i + 1} is malformed.`,
      };
    }
    const source = rawItem as Record<string, unknown>;
    const item: Record<string, string | number | boolean> = {};
    for (const sub of field.itemFields) {
      // A missing key falls back to the sub-field default rather than failing:
      // the editor may legitimately omit an untouched optional field.
      const value = sub.key in source ? source[sub.key] : sub.default;
      const result = validateScalar(sub, value);
      if (!result.ok) {
        return {
          ok: false,
          error: `${field.label} · ${field.itemNoun} ${i + 1}: ${result.error}`,
        };
      }
      item[sub.key] = result.value;
    }
    items.push(item);
  }
  return { ok: true, value: items };
}
