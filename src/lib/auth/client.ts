"use client";

/**
 * Auth hooks with graceful degradation.
 *
 * Always import `useAuth` / `useUser` / `useClerk` from here (never directly
 * from `@clerk/nextjs`) in components that are mounted on every page
 * (navbar, providers, contexts). When Clerk is not configured the stubs
 * return a stable signed-out state so the storefront renders instantly
 * instead of waiting on clerk-js.
 *
 * Pages that are 100% auth-only (login, account, sso-callback) may keep
 * direct Clerk imports, but must early-return a fallback UI via
 * `isAuthEnabled` BEFORE rendering any component that calls Clerk hooks.
 */
import {
  useAuth as clerkUseAuth,
  useUser as clerkUseUser,
  useClerk as clerkUseClerk,
} from "@clerk/nextjs";
import { isAuthEnabled } from "./config";

export { isAuthEnabled };

/* ── Signed-out stubs (stable references, never re-render) ── */

const noopAsync = async () => null;

const stubAuth = {
  isLoaded: true as const,
  isSignedIn: false as const,
  userId: null,
  sessionId: null,
  sessionClaims: null,
  actor: null,
  orgId: null,
  orgRole: null,
  orgSlug: null,
  has: () => false,
  signOut: noopAsync,
  getToken: noopAsync,
};

const stubUser = {
  isLoaded: true as const,
  isSignedIn: false as const,
  user: null,
};

const stubClerk = {
  loaded: true,
  setActive: noopAsync,
  signOut: noopAsync,
  openSignIn: () => {},
  redirectToSignIn: noopAsync,
};

const stubUseAuth = () => stubAuth;
const stubUseUser = () => stubUser;
const stubUseClerk = () => stubClerk;

/* ── Public exports — resolved once at module load ── */

export const useAuth: typeof clerkUseAuth = isAuthEnabled
  ? clerkUseAuth
  : (stubUseAuth as unknown as typeof clerkUseAuth);

export const useUser: typeof clerkUseUser = isAuthEnabled
  ? clerkUseUser
  : (stubUseUser as unknown as typeof clerkUseUser);

export const useClerk: typeof clerkUseClerk = isAuthEnabled
  ? clerkUseClerk
  : (stubUseClerk as unknown as typeof clerkUseClerk);
