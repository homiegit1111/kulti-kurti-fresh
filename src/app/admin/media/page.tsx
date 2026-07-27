"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Check, Copy, Film, Search, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatBytes,
  uploadMedia,
  type MediaAsset,
  type MediaKind,
} from "../_components/media-picker";
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
  Select,
  StatusBanner,
  TextArea,
  TextInput,
  adminFetch,
  useAdminResource,
} from "../_components/ui";

type MediaResponse = { assets: MediaAsset[]; total: number };

type KindFilter = "all" | "image" | "video";

const KIND_TABS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All files" },
  { value: "image", label: "Photos" },
  { value: "video", label: "Videos" },
];

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime";

const FOLDER_PATTERN = /^[a-z0-9-]{1,40}$/;
const FOLDER_RULE =
  "A folder name can use small letters, numbers and dashes only — like home or line-book.";

type EditDraft = { id: string; title: string; altText: string; folder: string };

function duration(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export default function AdminMediaPage() {
  const [kind, setKind] = useState<KindFilter>("all");
  const [folder, setFolder] = useState("");
  const [query, setQuery] = useState("");

  const [uploadFolder, setUploadFolder] = useState("general");
  const [upload, setUpload] = useState<{ index: number; total: number; pct: number } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const [edit, setEdit] = useState<EditDraft | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<{ id: string; message: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  // `kind` is a server filter (it cuts the payload); folder and search stay on
  // the client so the folder list is drawn from everything that is loaded.
  const url = useMemo(() => {
    const params = new URLSearchParams({ limit: "100" });
    if (kind !== "all") params.set("kind", kind);
    return `/api/admin/media?${params.toString()}`;
  }, [kind]);

  const { data, setData, loading, error, setError, reload } =
    useAdminResource<MediaResponse>(url);

  const assets = useMemo(() => data?.assets ?? [], [data]);

  const folders = useMemo(
    () => [...new Set(assets.map((a) => a.folder).filter(Boolean))].sort(),
    [assets],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return assets.filter((asset) => {
      if (folder && asset.folder !== folder) return false;
      if (!needle) return true;
      return `${asset.title} ${asset.alt_text} ${asset.path} ${asset.folder}`
        .toLowerCase()
        .includes(needle);
    });
  }, [assets, folder, query]);

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;
    setError("");
    setNotice("");
    const target = uploadFolder.trim();
    if (!FOLDER_PATTERN.test(target)) {
      setError(FOLDER_RULE);
      return;
    }
    let added = 0;
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const fileKind: MediaKind = file.type.startsWith("video/") ? "video" : "image";
      setUpload({ index: i + 1, total: files.length, pct: 0 });
      try {
        const { asset } = await uploadMedia(file, {
          kind: fileKind,
          folder: target,
          onProgress: (pct) => setUpload({ index: i + 1, total: files.length, pct }),
        });
        setData((prev) =>
          prev ? { assets: [asset, ...prev.assets], total: prev.total + 1 } : prev,
        );
        added += 1;
      } catch (e) {
        setError(
          `${file.name}: ${e instanceof Error ? e.message : "Upload failed."}`,
        );
        break;
      }
    }
    setUpload(null);
    if (added > 0) {
      setNotice(`${added} ${added === 1 ? "file" : "files"} uploaded to ${target}.`);
    }
  }

  async function saveEdit() {
    if (!edit) return;
    const nextFolder = edit.folder.trim();
    if (!FOLDER_PATTERN.test(nextFolder)) {
      setError(FOLDER_RULE);
      return;
    }
    setSavingEdit(true);
    setError("");
    setNotice("");
    try {
      const response = await adminFetch<{ asset: MediaAsset }>(
        `/api/admin/media/${edit.id}`,
        {
          method: "PATCH",
          body: {
            title: edit.title.trim(),
            altText: edit.altText.trim(),
            folder: nextFolder,
          },
        },
      );
      setData((prev) =>
        prev
          ? {
              ...prev,
              assets: prev.assets.map((asset) =>
                asset.id === response.asset.id ? response.asset : asset,
              ),
            }
          : prev,
      );
      setEdit(null);
      setNotice("File details saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the file details.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function remove(asset: MediaAsset) {
    setBusyId(asset.id);
    setError("");
    setNotice("");
    setBlocked(null);
    try {
      await adminFetch<{ ok: true }>(`/api/admin/media/${asset.id}`, {
        method: "DELETE",
      });
      setData((prev) =>
        prev
          ? {
              assets: prev.assets.filter((a) => a.id !== asset.id),
              total: Math.max(0, prev.total - 1),
            }
          : prev,
      );
      setNotice("File deleted.");
    } catch (e) {
      // A 409 names the page still using the file — that sentence is the whole
      // point of the failure, so it goes at the top AND on the card.
      const message = e instanceof Error ? e.message : "Could not delete that file.";
      setBlocked({ id: asset.id, message });
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  async function copyUrl(asset: MediaAsset) {
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopied(asset.id);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setError("Your browser blocked the copy. Open the file and copy the address.");
    }
  }

  const hidden = assets.length < (data?.total ?? 0);

  return (
    <AdminPage
      eyebrow="Library"
      title="Media"
      description="Every photo and video on the site. Upload here once and use the file anywhere."
      actions={
        <>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              void handleFiles(files);
            }}
          />
          <ActionButton
            variant="outline"
            size="sm"
            onClick={() => void reload()}
            busy={loading}
          >
            Refresh
          </ActionButton>
          <ActionButton
            size="sm"
            onClick={() => fileRef.current?.click()}
            busy={upload !== null}
          >
            <Upload className="h-3.5 w-3.5" />
            {upload
              ? `Uploading ${upload.index}/${upload.total} — ${upload.pct}%`
              : "Upload files"}
          </ActionButton>
        </>
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

      {upload ? (
        <div className="mb-5 h-1 w-full bg-surface-hover" role="status" aria-label="Upload progress">
          <div
            className="h-full bg-accent-lime transition-all"
            style={{ width: `${upload.pct}%` }}
          />
        </div>
      ) : null}

      <SectionGrid>
        <Panel>
          <div className="flex flex-col gap-4">
            <div className="no-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto px-1">
              {KIND_TABS.map((tab) => {
                const active = kind === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setKind(tab.value)}
                    className={cn(
                      "shrink-0 border-b-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors",
                      active
                        ? "border-accent-red text-content"
                        : "border-transparent text-content/40 hover:text-content",
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-[1.6fr_1fr_1fr]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content/35" />
                <TextInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, folder or description"
                  aria-label="Search media"
                  className="pl-8"
                  spellCheck={false}
                />
              </div>
              <Field label="Folder" htmlFor="media-folder-filter">
                <Select
                  id="media-folder-filter"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                >
                  <option value="">Every folder</option>
                  {folders.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Upload into"
                help="New files land in this folder."
                htmlFor="media-upload-folder"
              >
                <TextInput
                  id="media-upload-folder"
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  placeholder="general"
                  spellCheck={false}
                />
              </Field>
            </div>
          </div>
        </Panel>

        <Panel
          title="Files"
          description={
            hidden
              ? `Showing the newest ${assets.length} of ${data?.total} files.`
              : `${visible.length} ${visible.length === 1 ? "file" : "files"}.`
          }
        >
          {loading && !data ? (
            <LoadingBlock label="Loading library" />
          ) : visible.length === 0 ? (
            <EmptyState
              title={assets.length === 0 ? "Nothing here yet" : "No matches"}
              action={
                <ActionButton size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" /> Upload files
                </ActionButton>
              }
            >
              {assets.length === 0
                ? "Upload a photo or video and it becomes available everywhere on the site."
                : "Try a different search or folder."}
            </EmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((asset) => {
                const editing = edit?.id === asset.id;
                const size = asset.width && asset.height ? `${asset.width}×${asset.height}` : null;
                const length = duration(asset.duration_seconds);
                return (
                  <article
                    key={asset.id}
                    className={cn(
                      "flex flex-col border border-line/15 bg-surface",
                      blocked?.id === asset.id && "border-accent-red/50",
                    )}
                  >
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-hover">
                      {asset.kind === "image" ? (
                        <Image
                          src={asset.url}
                          alt={asset.alt_text || asset.title}
                          fill
                          unoptimized
                          sizes="(min-width: 1280px) 20vw, (min-width: 640px) 30vw, 45vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-1.5 text-content/30">
                          <Film className="h-7 w-7" />
                          <span className="text-[9px] font-bold uppercase tracking-[0.16em]">
                            Video
                          </span>
                        </div>
                      )}
                      <span className="absolute left-1.5 top-1.5">
                        <Pill tone="neutral">{asset.folder || "general"}</Pill>
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col gap-2 px-3 py-3">
                      <p className="truncate text-[12px] font-medium text-content/85">
                        {asset.title || asset.path.split("/").pop()}
                      </p>
                      <p className="text-[10px] leading-relaxed text-content/45">
                        {[size, length, formatBytes(asset.bytes)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {asset.alt_text ? (
                        <p className="line-clamp-2 text-[10px] leading-relaxed text-content/40">
                          {asset.alt_text}
                        </p>
                      ) : asset.kind === "image" ? (
                        <p className="text-[10px] font-medium text-accent-lime">
                          No description yet
                        </p>
                      ) : null}

                      {blocked?.id === asset.id ? (
                        <p className="border border-accent-red/35 bg-accent-red/8 px-2 py-1.5 text-[10px] leading-relaxed text-accent-red">
                          {blocked.message}
                        </p>
                      ) : null}

                      {editing && edit ? (
                        <div className="flex flex-col gap-3 border-t border-line/10 pt-3">
                          <Field
                            label="Name"
                            htmlFor={`title-${asset.id}`}
                            hint={<CharCount value={edit.title} max={120} />}
                          >
                            <TextInput
                              id={`title-${asset.id}`}
                              value={edit.title}
                              onChange={(e) =>
                                setEdit((prev) =>
                                  prev ? { ...prev, title: e.target.value } : prev,
                                )
                              }
                            />
                          </Field>
                          <Field
                            label="Description"
                            help="Read aloud to buyers using a screen reader, and shown if the photo fails to load."
                            htmlFor={`alt-${asset.id}`}
                          >
                            <TextArea
                              id={`alt-${asset.id}`}
                              rows={2}
                              value={edit.altText}
                              onChange={(e) =>
                                setEdit((prev) =>
                                  prev ? { ...prev, altText: e.target.value } : prev,
                                )
                              }
                            />
                          </Field>
                          <Field label="Folder" htmlFor={`folder-${asset.id}`} help={FOLDER_RULE}>
                            <TextInput
                              id={`folder-${asset.id}`}
                              value={edit.folder}
                              onChange={(e) =>
                                setEdit((prev) =>
                                  prev ? { ...prev, folder: e.target.value } : prev,
                                )
                              }
                              spellCheck={false}
                            />
                          </Field>
                          <div className="flex flex-wrap items-center gap-2">
                            <ActionButton
                              size="sm"
                              busy={savingEdit}
                              onClick={() => void saveEdit()}
                            >
                              Save
                            </ActionButton>
                            <ActionButton
                              size="sm"
                              variant="ghost"
                              onClick={() => setEdit(null)}
                              disabled={savingEdit}
                            >
                              Cancel
                            </ActionButton>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                          <ActionButton
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setEdit({
                                id: asset.id,
                                title: asset.title,
                                altText: asset.alt_text,
                                folder: asset.folder || "general",
                              })
                            }
                          >
                            Edit
                          </ActionButton>
                          <button
                            type="button"
                            onClick={() => void copyUrl(asset)}
                            aria-label={`Copy the web address of ${asset.title || asset.path}`}
                            className="inline-flex items-center gap-1 border border-line/20 px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-content/55 transition-colors hover:border-content/45 hover:text-content"
                          >
                            {copied === asset.id ? (
                              <>
                                <Check className="h-3 w-3" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> URL
                              </>
                            )}
                          </button>
                          <ConfirmButton
                            label="Delete"
                            confirmLabel="Tap to delete"
                            busy={busyId === asset.id}
                            onConfirm={() => void remove(asset)}
                          />
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Panel>
      </SectionGrid>
    </AdminPage>
  );
}
