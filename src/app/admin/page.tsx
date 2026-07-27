"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Boxes,
  Check,
  FileText,
  Images,
  IndianRupee,
  Layers,
  Megaphone,
  ShoppingCart,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ActionButton,
  AdminPage,
  EmptyState,
  LoadingBlock,
  Panel,
  Pill,
  SectionGrid,
  StatusBanner,
  useAdminResource,
} from "./_components/ui";

type AuditEntry = {
  id: string;
  actor_clerk_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

type Overview = {
  catalog: { published: number; draft: number; collections: number };
  stock: { low: number; out: number; tracked: number };
  orders: {
    pendingPayment: number;
    paid: number;
    fulfilled: number;
    paymentReview: number;
  };
  content: { pendingDrafts: number; lastPublishedAt: string | null };
  offers: { live: number; scheduled: number };
  media: { images: number; videos: number };
  revenue: { paidTotalInr: number; last30dInr: number };
  recentAudit: AuditEntry[];
  health: {
    serviceRole: boolean;
    razorpay: boolean;
    resend: boolean;
    pricingConfigured: boolean;
  };
};

const num = (n: number) => n.toLocaleString("en-IN");
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Audit actions are machine names; the owner reads sentences. */
const ACTION_WORDS: Record<string, string> = {
  "stock.adjust": "Stock counts changed",
  "stock.settings": "Stock tracking changed",
  "content.publish": "Website text published",
  "content.discard": "Draft text discarded",
  "content.reset": "Text reset to default",
  "content.revert": "Text reverted",
  "media.create": "File uploaded",
  "media.update": "File details changed",
  "media.delete": "File deleted",
  "product.create": "Style added",
  "product.update": "Style edited",
  "product.delete": "Style removed",
  "collection.create": "Collection added",
  "collection.update": "Collection edited",
  "collection.delete": "Collection removed",
  "pricing.update": "Wholesale pricing changed",
  "promotion.create": "Offer created",
  "promotion.update": "Offer edited",
  "promotion.delete": "Offer removed",
  "order.update": "Order updated",
  "admin_user.upsert": "Team member added",
  "admin_user.update": "Team member changed",
  "admin_user.remove": "Team member removed",
};

function actionWords(action: string): string {
  const known = ACTION_WORDS[action];
  if (known) return known;
  const words = action.replace(/[._]/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// ---------------------------------------------------------------------------

function Tile({
  label,
  value,
  sub,
  href,
  icon,
  loud,
  cta,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  href?: string;
  icon: ReactNode;
  loud?: boolean;
  cta?: string;
}) {
  const body = (
    <Panel
      className={cn(
        "h-full transition-colors",
        loud
          ? "border-accent-red/45 bg-accent-red/6"
          : href
            ? "hover:border-content/30"
            : undefined,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-content/45">
          {label}
        </p>
        <span className={cn("shrink-0", loud ? "text-accent-red" : "text-content/25")}>
          {icon}
        </span>
      </div>
      <p
        className={cn(
          "mt-3 text-[2.1rem] font-black leading-[0.9] tracking-[-0.05em] tabular-nums",
          loud && "text-accent-red",
        )}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-2 text-[11px] leading-relaxed text-content/50">{sub}</p>
      ) : null}
      {href && cta ? (
        <p
          className={cn(
            "mt-3 text-[10px] font-bold uppercase tracking-[0.16em]",
            loud ? "text-accent-red" : "text-content/45",
          )}
        >
          {cta} →
        </p>
      ) : null}
    </Panel>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

const HEALTH_ROWS: {
  key: keyof Overview["health"];
  ok: string;
  bad: string;
  href?: string;
}[] = [
  {
    key: "serviceRole",
    ok: "Database — connected",
    bad: "Database — service key not set, so nothing can be saved",
  },
  {
    key: "razorpay",
    ok: "Payments — Razorpay connected",
    bad: "Payments — Razorpay keys not set, so buyers cannot pay online",
  },
  {
    key: "resend",
    ok: "Email — Resend connected",
    bad: "Email — Resend key not set, so order emails will not send",
  },
  {
    key: "pricingConfigured",
    ok: "Wholesale pricing — set up",
    bad: "Wholesale pricing — not set up yet",
    href: "/admin/pricing",
  },
];

export default function AdminOverviewPage() {
  const { data, loading, error, setError, reload } =
    useAdminResource<Overview>("/api/admin/overview");

  return (
    <AdminPage
      eyebrow="Studio"
      title="Overview"
      description="Everything that needs your attention today, in one place."
      actions={
        <ActionButton variant="outline" size="sm" onClick={() => void reload()} busy={loading}>
          Refresh
        </ActionButton>
      }
    >
      {error ? (
        <StatusBanner tone="error" onDismiss={() => setError("")}>
          {error}
        </StatusBanner>
      ) : null}

      {loading && !data ? (
        <LoadingBlock label="Loading overview" />
      ) : !data ? (
        <EmptyState
          title="Nothing to show"
          action={
            <ActionButton size="sm" onClick={() => void reload()}>
              Try again
            </ActionButton>
          }
        >
          The overview could not be loaded.
        </EmptyState>
      ) : (
        <SectionGrid>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile
              label="Low stock"
              value={num(data.stock.low)}
              icon={<Boxes className="h-4 w-4" />}
              loud={data.stock.low > 0}
              href="/admin/stock?filter=low"
              cta={data.stock.low > 0 ? "Restock these" : "Open stock"}
              sub={
                data.stock.low > 0
                  ? "Sizes running down. Top them up before they sell out."
                  : "Nothing running low."
              }
            />
            <Tile
              label="Out of stock"
              value={num(data.stock.out)}
              icon={<TriangleAlert className="h-4 w-4" />}
              loud={data.stock.out > 0}
              href="/admin/stock?filter=out"
              cta={data.stock.out > 0 ? "Fix now" : "Open stock"}
              sub={
                data.stock.out > 0
                  ? "Buyers cannot order these sizes."
                  : `${num(data.stock.tracked)} sizes tracked.`
              }
            />
            <Tile
              label="Orders to handle"
              value={num(data.orders.pendingPayment + data.orders.paymentReview)}
              icon={<ShoppingCart className="h-4 w-4" />}
              loud={data.orders.pendingPayment + data.orders.paymentReview > 0}
              href="/admin/orders"
              cta="Open orders"
              sub={`${num(data.orders.pendingPayment)} awaiting payment · ${num(
                data.orders.paymentReview,
              )} in review · ${num(data.orders.paid)} paid`}
            />
            <Tile
              label="Unpublished text"
              value={num(data.content.pendingDrafts)}
              icon={<FileText className="h-4 w-4" />}
              loud={data.content.pendingDrafts > 0}
              href="/admin/content"
              cta={data.content.pendingDrafts > 0 ? "Publish changes" : "Edit website text"}
              sub={
                data.content.pendingDrafts > 0
                  ? "Edits saved but not live on the website yet."
                  : data.content.lastPublishedAt
                    ? `Last published ${shortDate(data.content.lastPublishedAt)}.`
                    : "Nothing waiting."
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile
              label="Catalog"
              value={num(data.catalog.published)}
              icon={<Layers className="h-4 w-4" />}
              href="/admin/products"
              cta="Open products"
              sub={`${num(data.catalog.published)} live · ${num(
                data.catalog.draft,
              )} draft · ${num(data.catalog.collections)} collections`}
            />
            <Tile
              label="Live offers"
              value={num(data.offers.live)}
              icon={<Megaphone className="h-4 w-4" />}
              href="/admin/offers"
              cta="Open offers"
              sub={`${num(data.offers.scheduled)} scheduled to start later.`}
            />
            <Tile
              label="Media files"
              value={num(data.media.images + data.media.videos)}
              icon={<Images className="h-4 w-4" />}
              href="/admin/media"
              cta="Open media"
              sub={`${num(data.media.images)} photos · ${num(data.media.videos)} videos`}
            />
            <Tile
              label="Paid revenue"
              value={inr(data.revenue.paidTotalInr)}
              icon={<IndianRupee className="h-4 w-4" />}
              sub={`${inr(data.revenue.last30dInr)} in the last 30 days.`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Panel
              title="Recent activity"
              description="The last few changes made in the studio."
              actions={
                <Link
                  href="/admin/audit"
                  className="text-[10px] font-bold uppercase tracking-[0.16em] text-content/45 transition-colors hover:text-content"
                >
                  See all →
                </Link>
              }
            >
              {data.recentAudit.length === 0 ? (
                <p className="py-4 text-sm text-content/45">No changes recorded yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-line/8">
                  {data.recentAudit.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-content/85">
                          {actionWords(entry.action)}
                        </p>
                        <p className="truncate text-[11px] text-content/40">
                          {entry.entity_type}
                          {entry.entity_id && entry.entity_id !== "batch"
                            ? ` · ${entry.entity_id}`
                            : ""}
                        </p>
                      </div>
                      <p className="shrink-0 text-[11px] tabular-nums text-content/40">
                        {stamp(entry.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Setup"
              description="What is connected. Anything marked missing needs an environment key."
            >
              <ul className="flex flex-col divide-y divide-line/8">
                {HEALTH_ROWS.map((row) => {
                  const ok = data.health[row.key];
                  return (
                    <li
                      key={row.key}
                      className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        {ok ? (
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-red" />
                        )}
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-sm leading-snug",
                              ok ? "text-content/75" : "font-medium text-content",
                            )}
                          >
                            {ok ? row.ok : row.bad}
                          </p>
                          {!ok && row.href ? (
                            <Link
                              href={row.href}
                              className="mt-1 inline-block text-[10px] font-bold uppercase tracking-[0.16em] text-accent-red"
                            >
                              Set it up →
                            </Link>
                          ) : null}
                        </div>
                      </div>
                      <Pill tone={ok ? "good" : "bad"}>{ok ? "Ready" : "Missing"}</Pill>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </div>
        </SectionGrid>
      )}
    </AdminPage>
  );
}
