/**
 * Auth feature flag — single source of truth.
 *
 * The storefront must NEVER hard-depend on Clerk being configured. Browsing,
 * cart and checkout are guest-friendly flows; auth only unlocks account
 * features (order history, synced wishlist). When the publishable key is
 * absent (local dev, preview deploys, early prod) the app renders fully and
 * auth-gated surfaces degrade gracefully instead of blanking the whole tree.
 *
 * NEXT_PUBLIC_* vars are inlined at build time, so this is a true constant in
 * both server and client bundles.
 */
export const isAuthEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);
