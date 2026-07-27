"use client";

/**
 * Media picker + uploader.
 *
 * UPLOAD PATH — why it looks like this.
 * The obvious implementation POSTs the file to a route handler, which forwards it
 * to storage. That breaks for video: a hero film is tens of megabytes, and the
 * Worker would have to buffer the whole thing in isolate memory, inside the
 * platform's request-body limit, for no benefit.
 *
 * So the bytes never touch our server:
 *   1. POST /api/admin/media/upload-url — the server validates the declared type
 *      and size, generates the storage path itself, inserts a 'pending' row, and
 *      returns a short-lived signed upload token.
 *   2. The browser PUTs the file straight to Supabase Storage with that token,
 *      using the ANON client. The token is the authorisation; no key is exposed.
 *   3. POST /api/admin/media/confirm — the server checks the object really
 *      landed, at a plausible size, then flips the row to 'ready'.
 *
 * Step 3 is what stops a client from registering an asset it never uploaded.
 *
 * Dimensions and duration are probed in the browser before confirm, because the
 * server would otherwise need to download and decode the file to learn them.
 * They are metadata for the library UI only — nothing security-relevant depends
 * on them.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Film, ImageIcon, Search, Upload, X } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { cn } from "@/lib/utils";
import {
  ActionButton,
  EmptyState,
  Field,
  LoadingBlock,
  Pill,
  StatusBanner,
  TextInput,
  adminFetch,
} from "./ui";

export type MediaKind = "image" | "video";

export type MediaAsset = {
  id: string;
  bucket: string;
  path: string;
  url: string;
  kind: MediaKind;
  mime_type: string;
  bytes: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  alt_text: string;
  title: string;
  folder: string;
  tags: string[];
  created_at: string;
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Read width/height (images) or duration (video) without uploading anything. */
async function probeFile(
  file: File,
  kind: MediaKind,
): Promise<{ width?: number; height?: number; durationSeconds?: number }> {
  const url = URL.createObjectURL(file);
  try {
    if (kind === "image") {
      return await new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () =>
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({});
        img.src = url;
      });
    }
    return await new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () =>
        resolve({
          width: video.videoWidth || undefined,
          height: video.videoHeight || undefined,
          durationSeconds: Number.isFinite(video.duration)
            ? Math.round(video.duration * 100) / 100
            : undefined,
        });
      video.onerror = () => resolve({});
      video.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type UploadOutcome = { asset: MediaAsset };

/**
 * Run the three-step upload. Exported so pages can upload without the dialog.
 * `onProgress` receives 0–100; the signed PUT is reported as a single step
 * because Supabase's upload helper does not stream progress.
 */
export async function uploadMedia(
  file: File,
  opts: { kind: MediaKind; folder?: string; altText?: string; onProgress?: (pct: number) => void },
): Promise<UploadOutcome> {
  const { kind, folder = "general", onProgress } = opts;
  const allowed = kind === "image" ? IMAGE_TYPES : VIDEO_TYPES;
  const maxBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;

  if (!allowed.includes(file.type)) {
    throw new Error(
      kind === "image"
        ? "Images must be JPG, PNG, WebP or AVIF."
        : "Videos must be MP4, WebM or MOV.",
    );
  }
  if (file.size <= 0) throw new Error("That file is empty.");
  if (file.size > maxBytes) {
    throw new Error(
      `That file is ${formatBytes(file.size)} — the limit is ${formatBytes(maxBytes)}.`,
    );
  }

  onProgress?.(5);
  const ticket = await adminFetch<{
    assetId: string;
    bucket: string;
    path: string;
    token: string;
    url: string;
  }>("/api/admin/media/upload-url", {
    method: "POST",
    body: {
      filename: file.name,
      contentType: file.type,
      bytes: file.size,
      kind,
      folder,
    },
  });

  onProgress?.(15);
  const supabase = createPublicClient();
  if (!supabase) {
    throw new Error("Storage is not configured. Check the Supabase environment variables.");
  }

  const { error: uploadError } = await supabase.storage
    .from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, file, {
      contentType: file.type,
    });
  if (uploadError) {
    throw new Error(
      `Upload failed: ${uploadError.message}. Large files need a stable connection — try again.`,
    );
  }

  onProgress?.(85);
  const probed = await probeFile(file, kind);
  const confirmed = await adminFetch<{ asset: MediaAsset }>(
    "/api/admin/media/confirm",
    {
      method: "POST",
      body: {
        assetId: ticket.assetId,
        width: probed.width,
        height: probed.height,
        durationSeconds: probed.durationSeconds,
        altText: opts.altText ?? "",
        title: file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 120),
      },
    },
  );
  onProgress?.(100);
  return confirmed;
}

// ---------------------------------------------------------------------------
// Picker dialog
// ---------------------------------------------------------------------------

export function MediaLibraryDialog({
  open,
  kind,
  folder,
  onClose,
  onSelect,
}: {
  open: boolean;
  kind: MediaKind;
  folder?: string;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch<{ assets: MediaAsset[] }>(
        `/api/admin/media?kind=${kind}&limit=100`,
      );
      setAssets(data.assets ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the media library.");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    setProgress(0);
    try {
      const { asset } = await uploadMedia(file, {
        kind,
        folder: folder ?? "general",
        onProgress: setProgress,
      });
      setAssets((prev) => [asset, ...prev]);
      onSelect(asset);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  if (!open) return null;

  const visible = query.trim()
    ? assets.filter((a) =>
        `${a.title} ${a.alt_text} ${a.path} ${a.folder}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : assets;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-content/45 p-4 backdrop-blur-sm sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={kind === "image" ? "Choose an image" : "Choose a video"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl border border-line/15 bg-surface shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-line/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-content/45">
              Media library
            </p>
            <h3 className="text-lg font-black uppercase leading-tight tracking-[-0.04em]">
              {kind === "image" ? "Choose an image" : "Choose a video"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-content/45 transition-colors hover:text-content"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-3 border-b border-line/10 px-5 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content/35" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or folder"
              className="pl-8"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={(kind === "image" ? IMAGE_TYPES : VIDEO_TYPES).join(",")}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleFile(file);
            }}
          />
          <ActionButton
            onClick={() => fileRef.current?.click()}
            busy={uploading}
            size="sm"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? `Uploading ${progress}%` : "Upload new"}
          </ActionButton>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-5">
          {error ? (
            <StatusBanner tone="error" onDismiss={() => setError("")}>
              {error}
            </StatusBanner>
          ) : null}

          {uploading ? (
            <div className="mb-5 h-1 w-full bg-surface-hover">
              <div
                className="h-full bg-accent-lime transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}

          {loading ? (
            <LoadingBlock label="Loading library" />
          ) : visible.length === 0 ? (
            <EmptyState
              title={assets.length === 0 ? "Nothing here yet" : "No matches"}
              action={
                <ActionButton onClick={() => fileRef.current?.click()} size="sm">
                  <Upload className="h-3.5 w-3.5" /> Upload a {kind}
                </ActionButton>
              }
            >
              {assets.length === 0
                ? `Upload your first ${kind} and it will be available everywhere on the site.`
                : "Try a different search."}
            </EmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visible.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    onSelect(asset);
                    onClose();
                  }}
                  className="group flex flex-col border border-line/15 text-left transition-colors hover:border-accent-lime"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-hover">
                    {asset.kind === "image" ? (
                      <Image
                        src={asset.url}
                        alt={asset.alt_text || asset.title}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="200px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-content/30">
                        <Film className="h-7 w-7" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 px-2 py-2">
                    <p className="truncate text-[11px] font-medium text-content/80">
                      {asset.title || asset.path.split("/").pop()}
                    </p>
                    <p className="text-[10px] text-content/40">
                      {asset.width && asset.height
                        ? `${asset.width}×${asset.height} · `
                        : ""}
                      {formatBytes(asset.bytes)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field control
// ---------------------------------------------------------------------------

/**
 * The control used wherever content declares an `image` or `video` field. Shows
 * the current value as a preview, opens the library to change it, and always
 * exposes the raw URL — an owner who already has a hosted asset can paste it
 * without going through the library.
 */
export function MediaField({
  label,
  help,
  kind,
  value,
  onChange,
  folder,
  error,
}: {
  label: string;
  help?: string;
  kind: MediaKind;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Field label={label} help={help} error={error}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "relative h-24 w-20 shrink-0 overflow-hidden border border-line/15 bg-surface-hover",
          )}
        >
          {value && kind === "image" ? (
            <Image
              src={value}
              alt=""
              fill
              unoptimized
              className="object-cover"
              sizes="80px"
            />
          ) : value && kind === "video" ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-content/35">
              <Film className="h-5 w-5" />
              <span className="text-[9px] uppercase tracking-wider">Video</span>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-content/25">
              {kind === "image" ? (
                <ImageIcon className="h-5 w-5" />
              ) : (
                <Film className="h-5 w-5" />
              )}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <TextInput
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={kind === "image" ? "/images/example.png" : "/video/example.mp4"}
            spellCheck={false}
          />
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton size="sm" variant="outline" onClick={() => setOpen(true)}>
              {value ? "Change" : "Choose"}
            </ActionButton>
            {value ? (
              <ActionButton size="sm" variant="ghost" onClick={() => onChange("")}>
                Clear
              </ActionButton>
            ) : null}
            {value.startsWith("/") ? <Pill tone="neutral">Site file</Pill> : null}
          </div>
        </div>
      </div>

      <MediaLibraryDialog
        open={open}
        kind={kind}
        folder={folder}
        onClose={() => setOpen(false)}
        onSelect={(asset) => onChange(asset.url)}
      />
    </Field>
  );
}
