"use client";

/**
 * Content editor.
 *
 * Renders itself from the `groups` the API returns — the registry, verbatim. No
 * field, section or group is named in this file, so adding an editable field is
 * a registry edit and nothing else.
 *
 * Three value layers, in priority order: local unsaved edits → server drafts →
 * published. That is what lets the owner stage a batch of wording changes, see
 * exactly which fields are staged, and flip them live together.
 */

import { useCallback, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { isListField } from "@/lib/content/types";
import type {
  ContentField,
  ContentGroup,
  ContentValue,
  ListField,
  ScalarField,
} from "@/lib/content/types";
import { cn } from "@/lib/utils";
import { MediaField } from "../_components/media-picker";
import {
  ActionButton,
  AdminPage,
  CharCount,
  ConfirmButton,
  EmptyState,
  Field,
  LoadingBlock,
  Panel,
  Pill,
  SectionGrid,
  StatusBanner,
  TextArea,
  TextInput,
  Toggle,
  adminFetch,
  useAdminResource,
} from "../_components/ui";

type ContentPayload = {
  groups: ContentGroup[];
  published: Record<string, ContentValue>;
  drafts: Record<string, ContentValue>;
  overriddenKeys: string[];
  pendingCount: number;
  fromDatabase: boolean;
};

type Scalar = string | number | boolean;
type ListItem = Record<string, Scalar>;
type Busy = "" | "save" | "publish" | "discard" | "reset";

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const TOKEN = /\{[a-zA-Z][a-zA-Z0-9]*\}/g;

function message(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

/**
 * Key order is stable here (every list item is built by spreading the previous
 * one), and the API drops no-op drafts anyway, so a structural compare is enough
 * to keep the "not saved" count honest.
 */
function sameValue(a: ContentValue | undefined, b: ContentValue | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function asText(value: Scalar): string {
  return typeof value === "string" ? value : String(value);
}

function asBool(value: Scalar): boolean {
  return typeof value === "boolean" ? value : value === "true" || value === 1;
}

function asNumber(value: Scalar): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Falls back to the registry default if the stored shape ever drifts. */
function scalarOf(value: ContentValue | undefined, field: ScalarField): Scalar {
  if (value === undefined || Array.isArray(value)) return field.default;
  return value;
}

function listOf(value: ContentValue | undefined, field: ListField): ListItem[] {
  return Array.isArray(value) ? value : field.default;
}

function newItem(field: ListField): ListItem {
  return Object.fromEntries(field.itemFields.map((f) => [f.key, f.default]));
}

function tokensIn(help: string | undefined): string[] {
  if (!help) return [];
  return Array.from(new Set(help.match(TOKEN) ?? []));
}

export default function AdminContentPage() {
  const { data, loading, error, setError, reload } =
    useAdminResource<ContentPayload>("/api/admin/content");

  const [groupId, setGroupId] = useState("");
  const [edits, setEdits] = useState<Record<string, ContentValue>>({});
  const [busy, setBusy] = useState<Busy>("");
  const [notice, setNotice] = useState("");

  const groups = useMemo(() => data?.groups ?? [], [data]);
  const active = groups.find((g) => g.id === groupId) ?? groups[0];
  const overridden = useMemo(
    () => new Set(data?.overriddenKeys ?? []),
    [data],
  );

  const fieldByKey = useMemo(() => {
    const map = new Map<string, ContentField>();
    for (const group of groups) {
      for (const section of group.sections) {
        for (const field of section.fields) map.set(field.key, field);
      }
    }
    return map;
  }, [groups]);

  const baselineOf = useCallback(
    (key: string): ContentValue | undefined => {
      if (!data) return undefined;
      return key in data.drafts ? data.drafts[key] : data.published[key];
    },
    [data],
  );

  const valueOf = useCallback(
    (key: string): ContentValue | undefined =>
      key in edits ? edits[key] : baselineOf(key),
    [edits, baselineOf],
  );

  const setValue = useCallback(
    (key: string, next: ContentValue) => {
      setEdits((prev) => {
        const draft = { ...prev, [key]: next };
        // Typing a value back to where it started is not an edit.
        if (sameValue(next, baselineOf(key))) delete draft[key];
        return draft;
      });
    },
    [baselineOf],
  );

  const unsavedKeys = Object.keys(edits);
  const pending = data?.pendingCount ?? 0;

  /** Fields the API would reject on length, named so the owner can find them. */
  const tooLong = useMemo(() => {
    const bad: string[] = [];
    for (const [key, value] of Object.entries(edits)) {
      const field = fieldByKey.get(key);
      if (!field) continue;
      if (isListField(field)) {
        if (!Array.isArray(value)) continue;
        for (const item of value) {
          for (const sub of field.itemFields) {
            const raw = item[sub.key];
            if (sub.max && typeof raw === "string" && raw.length > sub.max) {
              bad.push(`${field.label} — ${sub.label}`);
            }
          }
        }
        continue;
      }
      if (field.max && typeof value === "string" && value.length > field.max) {
        bad.push(field.label);
      }
    }
    return Array.from(new Set(bad));
  }, [edits, fieldByKey]);

  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (Object.keys(edits).length === 0) return true;
    setBusy("save");
    setError("");
    setNotice("");
    try {
      await adminFetch<{ ok: true; saved: number; pendingCount: number }>(
        "/api/admin/content",
        { method: "PATCH", body: { values: edits } },
      );
      setEdits({});
      await reload();
      return true;
    } catch (e) {
      setError(message(e, "Could not save your changes."));
      return false;
    } finally {
      setBusy("");
    }
  }, [edits, reload, setError]);

  async function handleSave() {
    if (await saveDraft()) {
      setNotice("Saved as a draft. Nothing is on the site yet — press Publish when you are ready.");
    }
  }

  async function handlePublish() {
    // Publishing implies saving: the owner asked for this to go live, so a
    // pending local edit must go up with it rather than be left behind.
    if (Object.keys(edits).length > 0 && !(await saveDraft())) return;
    setBusy("publish");
    setError("");
    setNotice("");
    try {
      const res = await adminFetch<{ ok: true; published: number }>(
        "/api/admin/content",
        { method: "POST", body: { action: "publish" } },
      );
      await reload();
      setNotice(
        `${res.published} change${res.published === 1 ? "" : "s"} published. The site picks them up within about a minute — refresh the page after that to see them.`,
      );
    } catch (e) {
      setError(message(e, "Could not publish."));
    } finally {
      setBusy("");
    }
  }

  async function handleDiscard() {
    setBusy("discard");
    setError("");
    setNotice("");
    try {
      const res = await adminFetch<{ ok: true; discarded: number }>(
        "/api/admin/content",
        { method: "POST", body: { action: "discard" } },
      );
      setEdits({});
      await reload();
      setNotice(
        `${res.discarded} unpublished change${res.discarded === 1 ? "" : "s"} thrown away. The site is unchanged.`,
      );
    } catch (e) {
      setError(message(e, "Could not discard the changes."));
    } finally {
      setBusy("");
    }
  }

  async function handleReset(key: string) {
    setBusy("reset");
    setError("");
    setNotice("");
    try {
      await adminFetch<{ ok: true; reset: number }>("/api/admin/content", {
        method: "POST",
        body: { action: "reset", keys: [key] },
      });
      setEdits((prev) => {
        const draft = { ...prev };
        delete draft[key];
        return draft;
      });
      await reload();
      setNotice(
        "Put back to the original wording. The site updates within about a minute.",
      );
    } catch (e) {
      setError(message(e, "Could not reset that field."));
    } finally {
      setBusy("");
    }
  }

  const barVisible = pending > 0 || unsavedKeys.length > 0;
  const working = busy !== "";

  return (
    <AdminPage
      eyebrow="Site content"
      title="Words & pictures"
      description="Everything on the site you can change yourself. Edits are held as a draft first — nothing reaches the site until you press Publish."
    >
      {error ? (
        <StatusBanner tone="error" onDismiss={() => setError("")}>
          {error}
        </StatusBanner>
      ) : null}
      {notice ? (
        <StatusBanner tone="success" onDismiss={() => setNotice("")}>
          {notice}
        </StatusBanner>
      ) : null}

      {loading && !data ? (
        <LoadingBlock label="Loading content" />
      ) : !data ? (
        // Distinct from an empty registry — the advice for each is different.
        <EmptyState title="Content not available">
          The message above says why. Reload the page to try again.
        </EmptyState>
      ) : !active ? (
        <EmptyState title="Nothing to edit yet">
          No editable content is declared. Ask your developer to add fields to the
          content registry.
        </EmptyState>
      ) : (
        <div className={cn(barVisible && "pb-36")}>
          <div
            role="tablist"
            aria-label="Content areas"
            className="-mx-1 mb-6 flex flex-wrap gap-1 overflow-x-auto"
          >
            {groups.map((group) => {
              const selected = group.id === active.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  role="tab"
                  id={`content-tab-${group.id}`}
                  aria-selected={selected}
                  aria-controls={`content-panel-${group.id}`}
                  onClick={() => setGroupId(group.id)}
                  className={cn(
                    "border px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
                    selected
                      ? "border-content bg-content text-content-inverse"
                      : "border-line/20 text-content/55 hover:border-content/45 hover:text-content",
                  )}
                >
                  {group.title}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`content-panel-${active.id}`}
            aria-labelledby={`content-tab-${active.id}`}
          >
            <p className="mb-6 max-w-2xl text-sm leading-relaxed text-content/55">
              {active.description}
            </p>

            {active.sections.length > 1 ? (
              <nav
                aria-label="Jump to a block"
                className="mb-7 flex flex-wrap gap-1.5 border-y border-line/10 py-3"
              >
                {active.sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() =>
                      document
                        .getElementById(`section-${active.id}-${section.id}`)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    className="border border-line/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-content/50 transition-colors hover:border-content/40 hover:text-content"
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            ) : null}

            <SectionGrid>
              {active.sections.map((section) => (
                <div
                  key={section.id}
                  id={`section-${active.id}-${section.id}`}
                  className="scroll-mt-6"
                >
                  <Panel title={section.title} description={section.description}>
                    <div className="flex flex-col gap-7">
                      {section.fields.map((field) => (
                        <FieldBlock
                          key={field.key}
                          field={field}
                          value={valueOf(field.key)}
                          folder={active.id}
                          unsaved={field.key in edits}
                          drafted={Boolean(data && field.key in data.drafts)}
                          overridden={overridden.has(field.key)}
                          resetBusy={busy === "reset"}
                          onChange={(next) => setValue(field.key, next)}
                          onReset={() => void handleReset(field.key)}
                        />
                      ))}
                    </div>
                  </Panel>
                </div>
              ))}
            </SectionGrid>
          </div>

          {barVisible ? (
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line/15 bg-surface-2/95 backdrop-blur">
              <div
                role="status"
                className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-12"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold uppercase tracking-[0.1em]">
                    {pending} unpublished change{pending === 1 ? "" : "s"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-content/55">
                    {unsavedKeys.length > 0
                      ? `${unsavedKeys.length} edit${unsavedKeys.length === 1 ? "" : "s"} on this screen are not saved yet.`
                      : "Saved as a draft. The site still shows the old wording."}
                  </p>
                  {tooLong.length > 0 ? (
                    <p className="mt-1 text-xs font-medium leading-relaxed text-accent-red">
                      Too long to save: {tooLong.join(", ")}. Shorten to the limit
                      shown beside each box.
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {unsavedKeys.length > 0 ? (
                    <ActionButton
                      variant="outline"
                      size="sm"
                      onClick={() => void handleSave()}
                      busy={busy === "save"}
                      disabled={working || tooLong.length > 0}
                    >
                      Save draft
                    </ActionButton>
                  ) : null}
                  <ConfirmButton
                    label="Discard"
                    confirmLabel="Tap again to throw away"
                    onConfirm={() => void handleDiscard()}
                    busy={busy === "discard"}
                    disabled={working}
                  />
                  <ActionButton
                    size="sm"
                    onClick={() => void handlePublish()}
                    busy={busy === "publish" || busy === "save"}
                    disabled={working || tooLong.length > 0}
                  >
                    Publish
                  </ActionButton>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </AdminPage>
  );
}

// ---------------------------------------------------------------------------
// One registry field
// ---------------------------------------------------------------------------

function FieldBlock({
  field,
  value,
  folder,
  unsaved,
  drafted,
  overridden,
  resetBusy,
  onChange,
  onReset,
}: {
  field: ContentField;
  value: ContentValue | undefined;
  folder: string;
  unsaved: boolean;
  drafted: boolean;
  overridden: boolean;
  resetBusy: boolean;
  onChange: (next: ContentValue) => void;
  onReset: () => void;
}) {
  const tokens = tokensIn(field.help);

  return (
    <div className="flex flex-col gap-2 border-l border-line/10 pl-4">
      {isListField(field) ? (
        <ListControl
          field={field}
          items={listOf(value, field)}
          folder={folder}
          onChange={onChange}
        />
      ) : (
        <ScalarControl
          field={field}
          value={scalarOf(value, field)}
          folder={folder}
          onChange={onChange}
        />
      )}

      {tokens.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-content/35">
            Filled in for you
          </span>
          {tokens.map((token) => (
            <span
              key={token}
              className="border border-line/20 bg-surface-hover/40 px-1.5 py-0.5 text-[10px] font-medium text-content/50"
            >
              {token}
            </span>
          ))}
        </div>
      ) : null}

      {unsaved || drafted || overridden ? (
        <div className="flex flex-wrap items-center gap-2">
          {unsaved ? <Pill tone="warn">Not saved</Pill> : null}
          {drafted ? <Pill tone="accent">Modified</Pill> : null}
          {overridden ? <Pill tone="neutral">Edited</Pill> : null}
          {drafted || overridden ? (
            <ConfirmButton
              label="Reset to original"
              confirmLabel="Tap again to reset"
              onConfirm={onReset}
              busy={resetBusy}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ScalarControl({
  field,
  value,
  folder,
  onChange,
  idPrefix = "content",
}: {
  field: ScalarField;
  value: Scalar;
  folder: string;
  onChange: (next: Scalar) => void;
  idPrefix?: string;
}) {
  const id = `${idPrefix}-${field.key}`;

  switch (field.type) {
    case "image":
    case "video":
      return (
        <MediaField
          label={field.label}
          help={field.help}
          kind={field.type}
          value={asText(value)}
          onChange={onChange}
          folder={folder}
        />
      );

    case "boolean": {
      const on = asBool(value);
      return (
        <Field label={field.label} help={field.help}>
          <Toggle checked={on} onChange={onChange} label={on ? "Shown" : "Hidden"} />
        </Field>
      );
    }

    case "textarea": {
      const text = asText(value);
      return (
        <Field
          label={field.label}
          help={field.help}
          htmlFor={id}
          hint={<CharCount value={text} max={field.max} />}
        >
          <TextArea
            id={id}
            rows={field.rows ?? 3}
            value={text}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
    }

    case "number":
      return (
        <Field label={field.label} help={field.help} htmlFor={id}>
          <TextInput
            id={id}
            type="number"
            inputMode="numeric"
            min={field.min}
            max={field.maxValue}
            value={String(asNumber(value))}
            onChange={(e) => {
              // A half-typed or non-numeric box must not send NaN to the API.
              const parsed = Number(e.target.value);
              onChange(
                e.target.value.trim() === "" || !Number.isFinite(parsed)
                  ? (field.min ?? 0)
                  : parsed,
              );
            }}
          />
        </Field>
      );

    case "color": {
      const text = asText(value);
      return (
        <Field label={field.label} help={field.help} htmlFor={id}>
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="h-9 w-9 shrink-0 border border-line/25 bg-surface-hover"
              style={HEX.test(text) ? { backgroundColor: text } : undefined}
            />
            <TextInput
              id={id}
              value={text}
              spellCheck={false}
              placeholder={field.placeholder ?? "#1a1a1a"}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </Field>
      );
    }

    case "url": {
      const text = asText(value);
      return (
        <Field
          label={field.label}
          help={field.help ?? "A page on this site like /shop, or a full https:// address."}
          htmlFor={id}
        >
          <TextInput
            id={id}
            value={text}
            spellCheck={false}
            placeholder={field.placeholder ?? "/shop"}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
    }

    default: {
      const text = asText(value);
      return (
        <Field
          label={field.label}
          help={field.help}
          htmlFor={id}
          hint={<CharCount value={text} max={field.max} />}
        >
          <TextInput
            id={id}
            value={text}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
    }
  }
}

function ListControl({
  field,
  items,
  folder,
  onChange,
}: {
  field: ListField;
  items: ListItem[];
  folder: string;
  onChange: (next: ListItem[]) => void;
}) {
  const min = field.minItems ?? 0;
  const canAdd = items.length < field.maxItems;
  const canRemove = items.length > min;

  function patch(index: number, key: string, next: Scalar) {
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: next } : item)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-content/45">
            {field.label}
          </p>
          {field.help ? (
            <p className="mt-1 text-[11px] leading-relaxed text-content/40">
              {field.help}
            </p>
          ) : null}
        </div>
        <span className="text-[10px] font-medium tabular-nums text-content/30">
          {items.length}/{field.maxItems}
        </span>
      </div>

      {items.map((item, index) => (
        <div key={index} className="border border-line/15 bg-surface/40">
          <div className="flex items-center justify-between gap-2 border-b border-line/10 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-content/45">
              {field.itemNoun} {index + 1}
            </p>
            <div className="flex items-center gap-1">
              <IconButton
                label={`Move ${field.itemNoun} ${index + 1} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton
                label={`Move ${field.itemNoun} ${index + 1} down`}
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </IconButton>
              {canRemove ? (
                <ConfirmButton
                  label={
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">
                        Remove {field.itemNoun} {index + 1}
                      </span>
                    </>
                  }
                  confirmLabel="Tap again to remove"
                  onConfirm={() => onChange(items.filter((_, i) => i !== index))}
                />
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-5 px-3 py-4">
            {field.itemFields.map((sub) => (
              <ScalarControl
                key={sub.key}
                field={sub}
                value={scalarOf(item[sub.key], sub)}
                folder={folder}
                onChange={(next) => patch(index, sub.key, next)}
                idPrefix={`${field.key}-${index}`}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <ActionButton
          size="sm"
          variant="outline"
          disabled={!canAdd}
          onClick={() => onChange([...items, newItem(field)])}
        >
          <Plus className="h-3.5 w-3.5" /> Add {field.itemNoun}
        </ActionButton>
        {!canAdd ? (
          <span className="text-[11px] text-content/40">
            {field.maxItems} is the most this block can show.
          </span>
        ) : null}
        {!canRemove && min > 0 ? (
          <span className="text-[11px] text-content/40">
            At least {min} needed.
          </span>
        ) : null}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="border border-line/20 p-1.5 text-content/50 transition-colors hover:border-content/40 hover:text-content disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
