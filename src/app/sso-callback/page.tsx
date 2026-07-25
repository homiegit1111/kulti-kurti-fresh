"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { isAuthEnabled } from "@/lib/auth/config";

export default function SSOCallback() {
  // This page handles the OAuth callback from providers like Google.
  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-white">
      <div className="w-8 h-8 border-2 border-accent-red border-t-transparent rounded-full animate-spin" />
      {isAuthEnabled && (
        <AuthenticateWithRedirectCallback signUpUrl="/sign-up" />
      )}
    </div>
  );
}
