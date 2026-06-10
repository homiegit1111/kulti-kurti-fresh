import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallback() {
  // This page handles the OAuth callback from providers like Google.
  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-white">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      <AuthenticateWithRedirectCallback signUpUrl="/sign-up" />
    </div>
  );
}
