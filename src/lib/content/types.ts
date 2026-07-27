/**
 * Editable-content field vocabulary.
 *
 * The registry (./registry.ts) declares every field the owner can edit. This
 * file defines what a field can BE. Adding an editable field is a registry
 * edit — never a migration and never a database change, because `site_content`
 * stores opaque JSON and the shape is enforced here in application code.
 *
 * Field types exist to drive three things at once:
 *   1. the editor control the admin UI renders,
 *   2. the validation/sanitisation applied on save (./validate.ts),
 *   3. the coercion applied on read (./server.ts).
 * Keeping all three keyed off one declaration is what stops the editor, the
 * validator and the storefront from disagreeing about a field.
 */

/** Field kinds that hold a single scalar value. */
export type ScalarFieldType =
  | "text" // single-line copy
  | "textarea" // multi-line copy
  | "image" // media URL, image kinds only
  | "video" // media URL, video kinds only
  | "url" // link target: site-relative path or https:// URL
  | "number"
  | "boolean"
  | "color"; // #rgb / #rrggbb only — never arbitrary CSS

export type FieldType = ScalarFieldType | "list";

type FieldBase = {
  /** Registry key. Dot-namespaced: "<group>.<block>.<name>". */
  key: string;
  label: string;
  /** Shown under the control in the editor. Say what the field does, in plain words. */
  help?: string;
};

export type ScalarField = FieldBase & {
  type: ScalarFieldType;
  default: string | number | boolean;
  placeholder?: string;
  /** Max characters for text-ish fields. Enforced on save, not just in the UI. */
  max?: number;
  /** Inclusive bounds for `number`. */
  min?: number;
  maxValue?: number;
  /** Render a longer editor box for textarea fields. */
  rows?: number;
};

/**
 * A repeatable group of scalar fields — the three homepage model shots, the
 * four how-to-order steps, the navigation links. `itemFields` keys are LOCAL
 * (no dots); the stored value is an array of flat objects.
 */
export type ListField = FieldBase & {
  type: "list";
  /** Singular noun for the "Add …" button, e.g. "step". */
  itemNoun: string;
  /** Hard cap on rows. Enforced on save — an unbounded list is a layout bug. */
  maxItems: number;
  minItems?: number;
  itemFields: ScalarField[];
  default: Record<string, string | number | boolean>[];
};

export type ContentField = ScalarField | ListField;

export type ContentGroup = {
  /** URL-safe id — becomes the editor tab, e.g. "home". */
  id: string;
  title: string;
  /** One line telling the owner what living here changes on the site. */
  description: string;
  sections: ContentSection[];
};

export type ContentSection = {
  id: string;
  title: string;
  description?: string;
  fields: ContentField[];
};

export function isListField(field: ContentField): field is ListField {
  return field.type === "list";
}

/** A stored content value. Deliberately narrow — no nested objects or arrays. */
export type ContentValue =
  | string
  | number
  | boolean
  | Record<string, string | number | boolean>[];
