"use client";

/**
 * Admin Studio UI kit.
 *
 * Every admin page composes from these primitives so the studio reads as one
 * tool rather than eight screens that grew separately. They use the site's own
 * tokens (surface / content / line / accent-*), so the studio inherits the shop's
 * paper-and-ink palette and its dark mode for free.
 *
 * Design rules encoded here:
 *   • Hairline borders, square corners, uppercase micro-labels — the studio is
 *     the same document language as the storefront's line book.
 *   • Every destructive action requires a deliberate second step (ConfirmButton).
 *   • Every async action reports its outcome in words (StatusBanner), because a
 *     shop owner should never have to guess whether a save landed.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertCircle, Check, Info, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Page scaffolding
// ---------------------------------------------------------------------------

export function AdminPage({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line/10 pb-6">
        <div className="min-w-0">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-content/45">
            {eyebrow}
          </p>
          <h2 className="text-[clamp(1.9rem,5vw,2.75rem)] font-black uppercase leading-[0.85] tracking-[-0.06em]">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-content/55">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border border-line/12 bg-surface-2/60 backdrop-blur-[1px]",
        className,
      )}
    >
      {title ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line/10 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-sm font-bold uppercase tracking-[0.12em]">{title}</h3>
            {description ? (
              <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-content/55">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export function SectionGrid({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>;
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type StatusTone = "error" | "success" | "info";

export function StatusBanner({
  tone,
  children,
  onDismiss,
}: {
  tone: StatusTone;
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const Icon = tone === "error" ? AlertCircle : tone === "success" ? Check : Info;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-5 flex items-start gap-3 border px-4 py-3 text-sm",
        tone === "error" && "border-accent-red/35 bg-accent-red/8 text-accent-red",
        tone === "success" && "border-emerald-600/35 bg-emerald-600/8 text-emerald-700 dark:text-emerald-400",
        tone === "info" && "border-line/20 bg-surface-hover/50 text-content/75",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}

export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[34vh] flex-col items-center justify-center gap-3 text-content/45">
      <Spinner className="h-5 w-5 text-accent-lime" />
      <p className="text-[11px] font-bold uppercase tracking-[0.18em]">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-line/20 px-6 py-14 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-content/70">
        {title}
      </p>
      {children ? (
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-content/50">
          {children}
        </p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export type PillTone = "neutral" | "good" | "warn" | "bad" | "accent";

export function Pill({ tone = "neutral", children }: { tone?: PillTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
        tone === "neutral" && "border-line/20 text-content/50",
        tone === "good" && "border-emerald-600/40 text-emerald-700 dark:text-emerald-400",
        tone === "warn" && "border-accent-lime/50 text-accent-lime",
        tone === "bad" && "border-accent-red/40 text-accent-red",
        tone === "accent" && "border-accent-lime/60 bg-accent-lime/10 text-accent-lime",
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

export function Field({
  label,
  help,
  error,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  help?: string;
  error?: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="text-[10px] font-bold uppercase tracking-[0.15em] text-content/45"
        >
          {label}
        </label>
        {hint}
      </div>
      {children}
      {help ? <p className="text-[11px] leading-relaxed text-content/40">{help}</p> : null}
      {error ? <p className="text-[11px] font-medium text-accent-red">{error}</p> : null}
    </div>
  );
}

const controlClass =
  "w-full border border-line/20 bg-surface px-3 py-2 text-sm text-content outline-none transition-colors placeholder:text-content/30 focus-visible:border-accent-lime focus-visible:ring-2 focus-visible:ring-accent-lime/25 disabled:opacity-50";

export function TextInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return <input {...props} className={cn(controlClass, className)} />;
}

export function TextArea({
  className,
  rows = 3,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      rows={rows}
      className={cn(controlClass, "resize-y leading-relaxed", className)}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select {...props} className={cn(controlClass, "appearance-none", className)}>
      {children}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-2.5 text-sm text-content/75 disabled:opacity-50",
      )}
    >
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 border transition-colors",
          checked ? "border-accent-lime bg-accent-lime/25" : "border-line/25 bg-surface",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3.5 w-3.5 transition-all",
            checked ? "left-[1.15rem] bg-accent-lime" : "left-0.5 bg-content/35",
          )}
        />
      </span>
      <span>{label}</span>
    </button>
  );
}

/** Character counter shown as a Field `hint`. Turns red past the limit. */
export function CharCount({ value, max }: { value: string; max?: number }) {
  if (!max) return null;
  const over = value.length > max;
  return (
    <span
      className={cn(
        "text-[10px] font-medium tabular-nums",
        over ? "text-accent-red" : "text-content/30",
      )}
    >
      {value.length}/{max}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export function DataTable({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="border-y border-line/10 bg-surface-hover/40 text-[10px] uppercase tracking-[0.16em] text-content/45">
          {head}
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("px-4 py-2.5 font-bold", className)}>{children}</th>;
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <tr className={cn("border-b border-line/6 last:border-0 hover:bg-surface-hover/25", className)}>
      {children}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Destructive confirmation
// ---------------------------------------------------------------------------

/**
 * Two-step destructive action. The second step is a real decision — the button
 * changes label and tone — rather than a native confirm() the owner will learn
 * to dismiss reflexively. Auto-resets after 4 seconds so a stray first click
 * cannot leave a live delete button on screen.
 */
export function ConfirmButton({
  onConfirm,
  label,
  confirmLabel,
  busy,
  disabled,
  className,
}: {
  onConfirm: () => void;
  label: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handle = useCallback(() => {
    if (armed) {
      clearTimeout(timer.current);
      setArmed(false);
      onConfirm();
      return;
    }
    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), 4000);
  }, [armed, onConfirm]);

  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled || busy}
      className={cn(
        "inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors disabled:opacity-40",
        armed
          ? "border-accent-red bg-accent-red text-white"
          : "border-line/20 text-content/55 hover:border-accent-red/50 hover:text-accent-red",
        className,
      )}
    >
      {busy ? <Spinner className="h-3 w-3" /> : null}
      {armed ? (confirmLabel ?? "Tap again to confirm") : label}
    </button>
  );
}

export function ActionButton({
  children,
  onClick,
  busy,
  disabled,
  variant = "default",
  size = "default",
  type = "button",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 border font-bold uppercase tracking-[0.12em] transition-colors disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "px-2.5 py-1.5 text-[11px]" : "px-4 py-2.5 text-xs",
        variant === "default" &&
          "border-content bg-content text-content-inverse hover:bg-content/85",
        variant === "outline" &&
          "border-line/25 bg-transparent text-content hover:border-content/50 hover:bg-surface-hover/40",
        variant === "ghost" &&
          "border-transparent bg-transparent text-content/55 hover:text-content",
        className,
      )}
    >
      {busy ? <Spinner className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

export type AdminRequest = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

/**
 * JSON fetch for the admin API. Always returns the server's `error` string when
 * there is one — the API writes those for the owner, so passing them straight
 * through is better than inventing a generic message.
 */
export async function adminFetch<T>(url: string, init: AdminRequest = {}): Promise<T> {
  const res = await fetch(url, {
    method: init.method ?? "GET",
    cache: "no-store",
    ...(init.body !== undefined
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(init.body),
        }
      : {}),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      data?.error ||
        (res.status === 403
          ? "Your account is not allowed to do that."
          : res.status === 429
            ? "Too many changes too quickly. Wait a moment and try again."
            : "That did not work. Please try again."),
    );
  }
  return data;
}

/** Small state machine for "load once, show errors, allow reload". */
export function useAdminResource<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await adminFetch<T>(url));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load.");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    // Load on mount. setState runs after the await, not synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  return { data, setData, loading, error, setError, reload };
}
