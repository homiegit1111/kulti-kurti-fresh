import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { isAdminConfigured } from "@/lib/server/admin-auth";
import { AdminNav } from "./admin-nav";

export const dynamic = "force-dynamic";

/**
 * Admin shell. Server-side gate: only allowlisted Clerk users (ADMIN_CLERK_USER_IDS)
 * see the dashboard; everyone else gets a clean "not authorised" screen. The
 * API routes enforce the same gate independently, so this is defence-in-depth,
 * not the sole guard.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const configured = isAdminConfigured();
  const { userId } = configured ? await auth() : { userId: null };
  const allow = new Set(
    (process.env.ADMIN_CLERK_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
  const isAdmin = Boolean(userId && allow.has(userId));

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-white px-6 text-charcoal">
        <div className="panel-luxe max-w-md p-10 text-center">
          <p className="eyebrow mb-3">Restricted</p>
          <h1 className="text-[clamp(1.75rem,6vw,2.25rem)] font-black uppercase leading-[0.9] tracking-[-0.055em]">
            Admin access only
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-charcoal/55">
            {configured
              ? "Your account is not authorised to manage the catalog. If this is unexpected, ask the store owner to add your Clerk user id to the admin allowlist."
              : "The admin allowlist is not configured yet. Set ADMIN_CLERK_USER_IDS to enable the dashboard."}
          </p>
          <Link href="/" className="btn-luxe-outline mt-8 inline-flex">
            Back to store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-warm-white text-charcoal font-sans">
      {/* Not sticky — it scrolls away — so no blur is needed; paper-alt reads as
          an honestly opaque band against the page's paper background. */}
      <header className="border-b border-charcoal/10 bg-surface-2">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-5 sm:px-6 lg:px-12">
          <div>
            <p className="eyebrow">Rangat Pehnawa</p>
            <h1 className="text-2xl font-black uppercase leading-[0.9] tracking-[-0.055em]">
              Admin <span className="text-content/45">Studio</span>
            </h1>
          </div>
          <AdminNav />
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-12">
          {children}
        </div>
      </main>
    </div>
  );
}
