"use client";

/**
 * Collections — the racks the shop is grouped into.
 *
 * A collection cannot be deleted while styles still point at its web address;
 * the API answers 409 with the count, and that sentence is shown as-is.
 */

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { ImageIcon, Pencil, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MediaField } from "../_components/media-picker";
import {
  ActionButton,
  AdminPage,
  CharCount,
  ConfirmButton,
  DataTable,
  EmptyState,
  Field,
  LoadingBlock,
  Panel,
  Pill,
  StatusBanner,
  Td,
  TextArea,
  TextInput,
  Th,
  Toggle,
  Tr,
  adminFetch,
  useAdminResource,
} from "../_components/ui";

type CollectionStatus = "draft" | "published";

type Collection = {
  id: string;
  handle: string;
  title: string;
  subtitle: string;
  description: string;
  body: string;
  image: string | null;
  rank: number;
  status: CollectionStatus;
  productCount: number;
};

type CollectionForm = {
  id?: string;
  title: string;
  handle: string;
  subtitle: string;
  description: string;
  body: string;
  image: string;
  rank: string;
  status: CollectionStatus;
};

function emptyForm(): CollectionForm {
  return {
    title: "",
    handle: "",
    subtitle: "",
    description: "",
    body: "",
    image: "",
    rank: "0",
    status: "draft",
  };
}

function formOf(row: Collection): CollectionForm {
  return {
    id: row.id,
    title: row.title,
    handle: row.handle,
    subtitle: row.subtitle ?? "",
    description: row.description ?? "",
    body: row.body ?? "",
    image: row.image ?? "",
    rank: String(row.rank ?? 0),
    status: row.status,
  };
}

export default function AdminCollectionsPage() {
  const { data, loading, error, setError, reload } =
    useAdminResource<{ collections: Collection[] }>("/api/admin/collections");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<CollectionForm>(emptyForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const [notice, setNotice] = useState("");

  const collections = useMemo(() => data?.collections ?? [], [data]);

  const patch = useCallback((next: Partial<CollectionForm>) => {
    setForm((prev) => ({ ...prev, ...next }));
  }, []);

  function openCreate() {
    setForm(emptyForm());
    setFormError("");
    setSheetOpen(true);
  }

  function openEdit(row: Collection) {
    setForm(formOf(row));
    setFormError("");
    setSheetOpen(true);
  }

  async function save() {
    const title = form.title.trim();
    if (!title) {
      setFormError("Give the collection a name.");
      return;
    }
    if (title.length > 120) {
      setFormError("The name is longer than 120 characters.");
      return;
    }
    const handle = form.handle.trim().toLowerCase();
    if (handle && !/^[a-z0-9-]{1,120}$/.test(handle)) {
      setFormError(
        "The web address can only use small letters, numbers and dashes — no spaces.",
      );
      return;
    }
    const rank = Number(form.rank.trim() || "0");
    if (!Number.isInteger(rank) || rank < 0 || rank > 9999) {
      setFormError("Position has to be a whole number between 0 and 9999.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await adminFetch<{ collection: Collection }>(
        form.id ? `/api/admin/collections/${form.id}` : "/api/admin/collections",
        {
          method: form.id ? "PATCH" : "POST",
          body: {
            title,
            handle: handle || undefined,
            subtitle: form.subtitle.trim(),
            description: form.description.trim(),
            body: form.body,
            image: form.image.trim(),
            rank,
            status: form.status,
          },
        },
      );
      setSheetOpen(false);
      await reload();
      setNotice(
        form.status === "published"
          ? `"${title}" saved and live. The shop updates within about a minute.`
          : `"${title}" saved as a draft — buyers cannot see it yet.`,
      );
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save the collection.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Collection) {
    setRemovingId(row.id);
    setError("");
    setNotice("");
    try {
      await adminFetch<{ ok: true }>(`/api/admin/collections/${row.id}`, {
        method: "DELETE",
      });
      await reload();
      setNotice(`"${row.title}" was deleted.`);
    } catch (e) {
      // The 409 body carries the product count in plain words — pass it through.
      setError(e instanceof Error ? e.message : "Could not delete the collection.");
    } finally {
      setRemovingId("");
    }
  }

  return (
    <AdminPage
      eyebrow="Catalog"
      title="Collections"
      description="The racks your styles are grouped into. Position sets the order they appear in — lower numbers come first."
      actions={
        <ActionButton onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> New collection
        </ActionButton>
      }
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
        <LoadingBlock label="Loading collections" />
      ) : collections.length === 0 ? (
        <EmptyState
          title="No collections yet"
          action={
            <ActionButton onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Create the first collection
            </ActionButton>
          }
        >
          A collection is a themed rack — Chikankari, Festive, Cotton dailies. Styles
          join one by its web address.
        </EmptyState>
      ) : (
        <Panel>
          <DataTable
            head={
              <Tr>
                <Th className="w-16">Image</Th>
                <Th>Collection</Th>
                <Th>Note</Th>
                <Th className="text-right">Styles</Th>
                <Th className="text-right">Position</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            }
          >
            {collections.map((row) => (
              <Tr key={row.id}>
                <Td>
                  <div className="relative h-14 w-11 overflow-hidden border border-line/15 bg-surface-hover">
                    {row.image ? (
                      <Image
                        src={row.image}
                        alt=""
                        fill
                        unoptimized
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-content/25">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </Td>
                <Td>
                  <p className="font-medium text-content">{row.title}</p>
                  <p className="mt-0.5 text-[11px] text-content/45">/{row.handle}</p>
                </Td>
                <Td className="max-w-[18rem] text-[12px] leading-relaxed text-content/55">
                  {row.subtitle || "—"}
                </Td>
                <Td className="text-right tabular-nums text-content/70">
                  {row.productCount}
                </Td>
                <Td className="text-right tabular-nums text-content/70">{row.rank}</Td>
                <Td>
                  <Pill tone={row.status === "published" ? "good" : "neutral"}>
                    {row.status === "published" ? "Live" : "Draft"}
                  </Pill>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      aria-label={`Edit ${row.title}`}
                      onClick={() => openEdit(row)}
                      className="border border-line/20 p-1.5 text-content/50 transition-colors hover:border-content/40 hover:text-content"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <ConfirmButton
                      label="Delete"
                      confirmLabel="Tap again to delete"
                      onConfirm={() => void remove(row)}
                      busy={removingId === row.id}
                    />
                  </div>
                </Td>
              </Tr>
            ))}
          </DataTable>
        </Panel>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="text-2xl font-black uppercase leading-[0.9] tracking-[-0.055em]">
              {form.id ? "Edit collection" : "New collection"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 pb-10">
            {formError ? (
              <StatusBanner tone="error" onDismiss={() => setFormError("")}>
                {formError}
              </StatusBanner>
            ) : null}

            <Field
              label="Name"
              htmlFor="collection-title"
              hint={<CharCount value={form.title} max={120} />}
            >
              <TextInput
                id="collection-title"
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Festive Chikankari"
              />
            </Field>

            <Field
              label="Web address"
              help="Leave blank and it is made from the name. Small letters, numbers and dashes only."
              htmlFor="collection-handle"
            >
              <TextInput
                id="collection-handle"
                value={form.handle}
                spellCheck={false}
                onChange={(e) => patch({ handle: e.target.value })}
                placeholder="festive-chikankari"
              />
            </Field>

            <Field
              label="One-line note"
              help="Sits under the name on the collections page."
              htmlFor="collection-subtitle"
              hint={<CharCount value={form.subtitle} max={200} />}
            >
              <TextInput
                id="collection-subtitle"
                value={form.subtitle}
                onChange={(e) => patch({ subtitle: e.target.value })}
                placeholder="Hand-worked cotton, festive weights"
              />
            </Field>

            <Field
              label="Short description"
              help="Used in search results and previews."
              htmlFor="collection-description"
              hint={<CharCount value={form.description} max={600} />}
            >
              <TextArea
                id="collection-description"
                rows={3}
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>

            <Field
              label="Full text"
              help="The longer write-up on the collection's own page. Plain text."
              htmlFor="collection-body"
              hint={<CharCount value={form.body} max={4000} />}
            >
              <TextArea
                id="collection-body"
                rows={8}
                value={form.body}
                onChange={(e) => patch({ body: e.target.value })}
              />
            </Field>

            <MediaField
              label="Cover image"
              help="Shown on the collections page and at the top of the collection."
              kind="image"
              value={form.image}
              onChange={(url) => patch({ image: url })}
              folder="collections"
            />

            <Field
              label="Position"
              help="Lower numbers appear first. 0–9999."
              htmlFor="collection-rank"
            >
              <TextInput
                id="collection-rank"
                type="number"
                inputMode="numeric"
                min={0}
                max={9999}
                value={form.rank}
                onChange={(e) => patch({ rank: e.target.value })}
              />
            </Field>

            <Toggle
              checked={form.status === "published"}
              onChange={(next) => patch({ status: next ? "published" : "draft" })}
              label={
                form.status === "published"
                  ? "Live — buyers can see it"
                  : "Draft — hidden from buyers"
              }
            />

            <div className="flex flex-wrap gap-2 pt-2">
              <ActionButton onClick={() => void save()} busy={saving} className="flex-1">
                {form.id ? "Save collection" : "Create collection"}
              </ActionButton>
              <ActionButton variant="outline" onClick={() => setSheetOpen(false)}>
                Cancel
              </ActionButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AdminPage>
  );
}
