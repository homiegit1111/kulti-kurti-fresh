"use client";

import * as React from "react";
import { useSignIn, useSignUp, useAuth, useClerk } from "@clerk/nextjs";
import { isAuthEnabled } from "@/lib/auth/config";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, Loader2, MoveRight, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* -------------------------------------------------------------------------- */
/*  Clerk error helpers                                                        */
/*  The Future/signals API returns `{ error }`. That error can be a single     */
/*  ClerkError ({ code, message, longMessage }) OR a ClerkAPIResponseError     */
/*  ({ errors: [...] }). We read both shapes so the user always sees a real    */
/*  reason instead of a generic fallback.                                      */
/* -------------------------------------------------------------------------- */
type ClerkLikeError = {
  code?: string;
  message?: string;
  longMessage?: string;
  errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
};

function errorCodes(error: unknown): string[] {
  const e = error as ClerkLikeError | null | undefined;
  if (!e || typeof e !== "object") return [];
  const codes: string[] = [];
  if (Array.isArray(e.errors)) {
    for (const x of e.errors) if (x?.code) codes.push(x.code);
  }
  if (e.code) codes.push(e.code);
  return codes;
}

// Friendly copy for the codes a passwordless email-code flow actually hits.
const FRIENDLY: Record<string, string> = {
  form_code_incorrect: "That code isn't right. Double-check and try again.",
  verification_expired: "This code has expired — request a fresh one below.",
  verification_failed: "Too many attempts. Please request a new code.",
  form_identifier_exists: "An account already exists for this email. Signing you in instead…",
  form_param_format_invalid: "Please enter a valid email address.",
  client_state_invalid: "Your session reset. Please start again.",
};

function errorMessage(error: unknown, fallback: string): string {
  const e = error as ClerkLikeError | null | undefined;
  if (!e || typeof e !== "object") return fallback;
  for (const code of errorCodes(error)) {
    if (FRIENDLY[code]) return FRIENDLY[code];
  }
  if (Array.isArray(e.errors) && e.errors.length) {
    const f = e.errors[0];
    return f.longMessage || f.message || fallback;
  }
  return e.longMessage || e.message || fallback;
}

type Step = "email" | "name" | "otp";
type AuthFlow = "signin" | "signup" | null;

const RESEND_SECONDS = 30;

const QUOTES = [
  "The Art of Rangat — colour, woven into every thread.",
  "Heritage craft, reimagined for the modern wardrobe.",
  "Tailored elegance. Unapologetically authentic.",
  "Where tradition meets contemporary luxury.",
];

/* -------------------------------------------------------------------------- */
/*  Segmented OTP input — premium, paste-aware, auto-advancing                 */
/* -------------------------------------------------------------------------- */
function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete: (v: string) => void;
  disabled?: boolean;
  error?: boolean;
}) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);
  const cells = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const focusIndex = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(5, i))];
    el?.focus();
    el?.select();
  };

  const setChar = (i: number, char: string) => {
    const next = (value.slice(0, i) + char + value.slice(i + 1)).slice(0, 6);
    onChange(next);
    return next;
  };

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, "");
    if (!digit) return;
    // Support fast typing / multiple chars landing in one cell.
    let next = value;
    let idx = i;
    for (const d of digit.split("")) {
      next = (next.slice(0, idx) + d + next.slice(idx + 1)).slice(0, 6);
      idx++;
    }
    onChange(next);
    focusIndex(idx);
    if (next.length === 6) onComplete(next);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[i]) {
        setChar(i, "");
      } else if (i > 0) {
        setChar(i - 1, "");
        focusIndex(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      focusIndex(i - 1);
    } else if (e.key === "ArrowRight") {
      focusIndex(i + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    onChange(pasted);
    focusIndex(pasted.length - 1);
    if (pasted.length === 6) onComplete(pasted);
  };

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3" role="group" aria-label="One-time code">
      {cells.map((char, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          value={char}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`h-14 w-full min-w-0 border bg-surface-2 text-center text-2xl font-black text-content outline-none transition-all disabled:opacity-50 ${
            error
              ? "border-accent-red bg-accent-red/10"
              : char
                ? "border-line bg-white"
                : "border-line/20 focus:border-line focus:bg-white focus:text-on-accent focus:shadow-[0_0_0_2px_var(--accent-lime)]"
          }`}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */
function UnifiedAuthInner() {
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/account";

  const [step, setStep] = React.useState<Step>("email");
  const [authFlow, setAuthFlow] = React.useState<AuthFlow>(null);
  const [localError, setLocalError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [quoteIndex, setQuoteIndex] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [oauthLoading, setOauthLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(0);

  // Form fields
  const [emailAddress, setEmailAddress] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [codeError, setCodeError] = React.useState(false);

  const fetching =
    signInFetchStatus === "fetching" || signUpFetchStatus === "fetching";
  const busy = isSubmitting || fetching;

  // Redirect already-authenticated users away from the auth screen.
  React.useEffect(() => {
    if (isLoaded && isSignedIn) router.replace(redirectTo);
  }, [isLoaded, isSignedIn, router, redirectTo]);

  // Rotate the editorial quote on the email step only.
  React.useEffect(() => {
    if (step !== "email") return;
    const id = setInterval(() => setQuoteIndex((p) => (p + 1) % QUOTES.length), 5000);
    return () => clearInterval(id);
  }, [step]);

  // Resend cooldown ticker.
  React.useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const startCooldown = () => setResendIn(RESEND_SECONDS);

  const goToOtp = () => {
    setCode("");
    setCodeError(false);
    setStep("otp");
    startCooldown();
  };

  /* ------------------------------ handlers ------------------------------ */
  const handleOAuth = async () => {
    if (!isLoaded || !signIn || oauthLoading) return;
    setLocalError("");
    setOauthLoading(true);
    try {
      const { error } = await signIn.sso({
        strategy: "oauth_google",
        // Final destination once the OAuth round-trip completes.
        redirectUrl: redirectTo,
        // Intermediate page that mounts <AuthenticateWithRedirectCallback />.
        redirectCallbackUrl: "/sso-callback",
      });
      if (error) {
        setLocalError(errorMessage(error, "Couldn't start Google sign-in. Please try again."));
        setOauthLoading(false);
      }
      // On success the browser redirects away — keep the spinner.
    } catch (err) {
      setLocalError(errorMessage(err, "Couldn't start Google sign-in. Please try again."));
      setOauthLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn || busy) return;
    setLocalError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      const { error } = await signIn.emailCode.sendCode({ emailAddress });
      if (error) {
        if (errorCodes(error).includes("form_identifier_not_found")) {
          // No existing account → seamlessly continue into sign-up.
          setAuthFlow("signup");
          setStep("name");
        } else {
          setLocalError(errorMessage(error, "We couldn't send a code. Please try again."));
        }
        return;
      }
      setAuthFlow("signin");
      setNotice(`We sent a 6-digit code to ${emailAddress}.`);
      goToOtp();
    } catch (err) {
      setLocalError(errorMessage(err, "We couldn't send a code. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp || busy) return;
    setLocalError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      const { error: createError } = await signUp.create({
        emailAddress,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      if (createError) {
        setLocalError(errorMessage(createError, "Sign up failed. Please try again."));
        return;
      }
      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) {
        setLocalError(errorMessage(sendError, "We couldn't send a code. Please try again."));
        return;
      }
      setNotice(`We sent a 6-digit code to ${emailAddress}.`);
      goToOtp();
    } catch (err) {
      setLocalError(errorMessage(err, "Sign up failed. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeAndRedirect = async (flow: "signin" | "signup") => {
    // After a successful code verification the attempt is `complete` and carries
    // a `createdSessionId`. We activate it with the stable `clerk.setActive(...)`
    // (passing a plain `redirectUrl` string) rather than the experimental
    // `finalize({ navigate })` path, which throws an internal error in this SDK.
    const resource = flow === "signin" ? signIn : signUp;
    const sessionId = resource?.createdSessionId;
    if (!sessionId) {
      setLocalError(
        "We verified your code but couldn't finish signing you in. Please try again."
      );
      return;
    }
    setSuccess(true);
    try {
      await clerk.setActive({ session: sessionId, redirectUrl: redirectTo });
    } catch (err) {
      setSuccess(false);
      setLocalError(
        errorMessage(err, "Couldn't finish signing you in. Please refresh and try again.")
      );
    }
  };

  const handleOtpVerify = async (submitted?: string) => {
    const value = submitted ?? code;
    if (!isLoaded || !signIn || !signUp || busy) return;
    if (value.length !== 6) return;
    setLocalError("");
    setCodeError(false);
    setIsSubmitting(true);
    try {
      if (authFlow === "signin") {
        const { error } = await signIn.emailCode.verifyCode({ code: value });
        if (error) {
          setCodeError(true);
          setCode("");
          setLocalError(errorMessage(error, "That code isn't right. Please try again."));
          return;
        }
        await completeAndRedirect("signin");
      } else {
        const { error } = await signUp.verifications.verifyEmailCode({ code: value });
        if (error) {
          setCodeError(true);
          setCode("");
          setLocalError(errorMessage(error, "That code isn't right. Please try again."));
          return;
        }
        await completeAndRedirect("signup");
      }
    } catch (err) {
      setCodeError(true);
      setLocalError(errorMessage(err, "Verification failed. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || busy || !isLoaded) return;
    setLocalError("");
    setCodeError(false);
    setCode("");
    setIsSubmitting(true);
    try {
      const { error } =
        authFlow === "signin"
          ? await signIn!.emailCode.sendCode({ emailAddress })
          : await signUp!.verifications.sendEmailCode();
      if (error) {
        setLocalError(errorMessage(error, "Couldn't resend the code. Please try again."));
        return;
      }
      setNotice(`A new code is on its way to ${emailAddress}.`);
      startCooldown();
    } catch (err) {
      setLocalError(errorMessage(err, "Couldn't resend the code. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetToEmail = () => {
    setStep("email");
    setAuthFlow(null);
    setCode("");
    setCodeError(false);
    setLocalError("");
    setNotice("");
    signIn?.reset?.();
    signUp?.reset?.();
  };

  /* ------------------------------ render -------------------------------- */
  // Initial SDK boot — keep it minimal and on-brand (no heavy animation).
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-surface">
        <Loader2 className="h-5 w-5 animate-spin text-content/40" />
      </div>
    );
  }

  const subtitle =
    step === "email"
      ? QUOTES[quoteIndex]
      : step === "name"
        ? "A few details to personalise your wardrobe."
        : `Enter the code we sent to ${emailAddress}`;

  return (
    <div className="min-h-screen w-full bg-surface text-content lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* ───────────────────────── Editorial image panel ───────────────────────── */}
      <aside className="relative hidden overflow-hidden bg-surface-inverse lg:block">
        <Image
          src="/images/hero.png"
          alt="Rangat Pehnawa"
          fill
          priority
          sizes="55vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,19,16,0.45)_0%,rgba(18,19,16,0.15)_40%,rgba(18,19,16,0.85)_100%)]" />
        <div className="absolute inset-0 flex flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-accent-lime" />
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-content-inverse/80">
              Rangat Pehnawa
            </span>
          </div>
          <div className="max-w-md">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-accent-lime">
              The Art of Rangat
            </p>
            <h2 className="mt-5 text-[clamp(2.5rem,4vw,4rem)] font-black uppercase leading-[0.85] tracking-[-0.06em] text-content-inverse">
              Heritage craft, woven for the modern wardrobe.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-content-inverse/65">
              Sign in to track orders, save your favourites, and unlock members-only edits.
            </p>
          </div>
        </div>
      </aside>

      {/* ───────────────────────────── Auth panel ──────────────────────────────── */}
      <main className="relative flex min-h-screen items-center justify-center bg-surface px-6 py-12 sm:px-10">
        <Link
          href="/"
          className="absolute left-6 top-6 z-20 inline-flex items-center gap-2 border border-line/20 bg-surface-2 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-content/60 transition-colors hover:border-line hover:text-content"
        >
          <ArrowLeft className="h-3 w-3" /> Store
        </Link>

        <div className="relative z-10 w-full max-w-[400px]">
          {/* Wordmark / logo */}
          <div className="mb-9 flex flex-col items-center text-center">
            <div className="relative mb-6 h-16 w-52">
              <Image
                src="/images/RangatPehnawa.png"
                alt="Rangat Pehnawa"
                fill
                sizes="(max-width: 768px) 208px, 208px"
                className="object-contain"
                priority
              />
            </div>
            <AnimatePresence mode="wait">
              <motion.h1
                key={step}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="text-4xl font-black uppercase leading-[0.9] tracking-[-0.05em] text-content"
              >
                {step === "email" && "Welcome"}
                {step === "name" && "Create profile"}
                {step === "otp" && "Verify email"}
              </motion.h1>
            </AnimatePresence>
            <div className="mt-3 flex items-center gap-3">
              <span className="h-px w-6 bg-accent-red" />
              <div className="relative flex h-8 items-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={subtitle}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="text-center text-[10px] font-semibold uppercase leading-relaxed tracking-[0.18em] text-content/55"
                  >
                    {subtitle}
                  </motion.p>
                </AnimatePresence>
              </div>
              <span className="h-px w-6 bg-accent-red" />
            </div>
          </div>

          {/* Alerts */}
          <AnimatePresence mode="wait">
            {localError ? (
              <motion.div
                key="err"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                role="alert"
                className="mb-5 border border-accent-red/40 bg-accent-red/10 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-accent-red"
              >
                {localError}
              </motion.div>
            ) : notice ? (
              <motion.div
                key="notice"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-5 border border-line/20 bg-surface-2 px-4 py-3 text-center text-xs font-medium text-content/70"
              >
                {notice}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Success overlay */}
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 border border-line/20 bg-surface-2 px-8 py-12 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center bg-surface-inverse text-accent-lime">
                <Check className="h-6 w-6" />
              </span>
              <p className="text-2xl font-black uppercase tracking-[-0.03em] text-content">You&apos;re in</p>
              <p className="flex items-center gap-2 text-xs text-content/50">
                <Loader2 className="h-3 w-3 animate-spin" /> Taking you to your account…
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              {/* ---------------------------- EMAIL ---------------------------- */}
              {step === "email" && (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                    <label htmlFor="email" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      disabled={busy}
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      className="h-14 w-full border border-line/20 bg-surface-2 px-5 text-sm font-medium text-content outline-none transition-all placeholder:text-content/35 focus:border-line focus:bg-white focus:text-on-accent focus:shadow-[0_0_0_2px_var(--accent-lime)] disabled:opacity-60"
                      placeholder="name@example.com"
                    />
                    <PrimaryButton busy={busy} label="Continue" loadingLabel="Sending code…" />
                  </form>

                  <div className="my-7 flex items-center gap-4">
                    <span className="h-px flex-1 bg-line/15" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-content/40">
                      or
                    </span>
                    <span className="h-px flex-1 bg-line/15" />
                  </div>

                  <button
                    type="button"
                    onClick={handleOAuth}
                    disabled={oauthLoading || busy}
                    className="flex h-14 w-full items-center justify-center gap-3 border border-line/20 bg-surface-2 text-[11px] font-bold uppercase tracking-[0.14em] text-content transition-all hover:border-line hover:bg-white hover:text-on-accent disabled:opacity-60"
                  >
                    {oauthLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <GoogleIcon />
                        Continue with Google
                      </>
                    )}
                  </button>

                  <p className="mt-7 text-center text-[10px] font-medium uppercase tracking-[0.14em] leading-relaxed text-content/40">
                    No password needed — we&apos;ll email you a secure 6-digit code.
                  </p>
                </motion.div>
              )}

              {/* ----------------------------- NAME ---------------------------- */}
              {step === "name" && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        autoComplete="given-name"
                        required
                        disabled={busy}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="h-14 w-full border border-line/20 bg-surface-2 px-5 text-sm font-medium text-content outline-none transition-all placeholder:text-content/35 focus:border-line focus:bg-white focus:text-on-accent focus:shadow-[0_0_0_2px_var(--accent-lime)] disabled:opacity-60"
                        placeholder="First name"
                      />
                      <input
                        type="text"
                        autoComplete="family-name"
                        required
                        disabled={busy}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="h-14 w-full border border-line/20 bg-surface-2 px-5 text-sm font-medium text-content outline-none transition-all placeholder:text-content/35 focus:border-line focus:bg-white focus:text-on-accent focus:shadow-[0_0_0_2px_var(--accent-lime)] disabled:opacity-60"
                        placeholder="Last name"
                      />
                    </div>
                    <PrimaryButton busy={busy} label="Continue" loadingLabel="Creating account…" />
                    <button
                      type="button"
                      onClick={resetToEmail}
                      disabled={busy}
                      className="mt-1 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-content/40 transition-colors hover:text-content disabled:opacity-50"
                    >
                      Use a different email
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ----------------------------- OTP ----------------------------- */}
              {step === "otp" && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleOtpVerify();
                    }}
                    className="flex flex-col gap-5"
                  >
                    <OtpInput
                      value={code}
                      onChange={(v) => {
                        setCode(v);
                        if (codeError) setCodeError(false);
                      }}
                      onComplete={(v) => handleOtpVerify(v)}
                      disabled={busy}
                      error={codeError}
                    />
                    <PrimaryButton
                      busy={busy}
                      disabled={code.length !== 6}
                      label="Verify & continue"
                      loadingLabel="Verifying…"
                    />
                  </form>

                  <div className="mt-6 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendIn > 0 || busy}
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-content/50 transition-colors hover:text-content disabled:cursor-not-allowed disabled:text-content/30"
                    >
                      <RefreshCw className="h-3 w-3" />
                      {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                    </button>
                    <button
                      type="button"
                      onClick={resetToEmail}
                      disabled={busy}
                      className="text-[10px] font-bold uppercase tracking-[0.16em] text-content/40 transition-colors hover:text-content disabled:opacity-50"
                    >
                      Wrong email?
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Clerk Smart CAPTCHA mount point (bot protection) */}
          <div id="clerk-captcha" className="mt-6 empty:mt-0 flex justify-center" />

          <p className="mt-8 text-center text-[10px] leading-relaxed text-content/40">
            By continuing you agree to our{" "}
            <Link href="/terms" className="underline decoration-accent-red decoration-2 underline-offset-2 hover:text-content">
              Terms
            </Link>{" "}
            &amp;{" "}
            <Link href="/privacy" className="underline decoration-accent-red decoration-2 underline-offset-2 hover:text-content">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small presentational helpers                                               */
/* -------------------------------------------------------------------------- */
function PrimaryButton({
  busy,
  disabled,
  label,
  loadingLabel,
}: {
  busy: boolean;
  disabled?: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      aria-busy={busy}
      className="group relative flex h-14 w-full items-center justify-center overflow-hidden bg-surface-inverse text-[11px] font-bold uppercase tracking-[0.18em] text-content-inverse transition-all hover:bg-accent-lime hover:text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingLabel}
        </span>
      ) : (
        <span className="flex items-center gap-2">
          {label}
          <MoveRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      )}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.8 15.7 17.58V20.34H19.27C21.36 18.42 22.56 15.6 22.56 12.25Z"
        fill="#4285F4"
      />
      <path
        d="M12 23C14.97 23 17.46 22.02 19.27 20.34L15.7 17.58C14.72 18.24 13.46 18.64 12 18.64C9.18 18.64 6.78 16.73 5.92 14.18H2.23V17.04C4.04 20.64 7.72 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.92 14.18C5.7 13.52 5.57 12.78 5.57 12C5.57 11.22 5.7 10.48 5.92 9.82V6.96H2.23C1.49 8.44 1.05 10.15 1.05 12C1.05 13.85 1.49 15.56 2.23 17.04L5.92 14.18Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.36C13.62 5.36 15.07 5.92 16.22 7.02L19.34 3.9C17.45 2.14 14.97 1 12 1C7.72 1 4.04 3.36 2.23 6.96L5.92 9.82C6.78 7.27 9.18 5.36 12 5.36Z"
        fill="#EA4335"
      />
    </svg>
  );
}

/* ── Graceful fallback when auth isn't configured ────────────────────────── */

export default function UnifiedAuthPage() {
  if (!isAuthEnabled) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface px-6 text-center font-sans text-content">
        <div className="relative panel-luxe frame-luxe w-full max-w-lg px-10 py-16">
          <p className="mb-5 text-[9px] font-bold uppercase tracking-[0.3em] text-accent-red">Sign in</p>
          <h1 className="mb-5 text-[clamp(2.8rem,6vw,4.5rem)] font-black uppercase leading-[0.85] tracking-[-0.06em]">
            Coming very soon
          </h1>
          <p className="mx-auto mb-10 max-w-md text-sm leading-6 text-content/60">
            Sign-in isn&apos;t enabled on this storefront yet. You can still browse
            the full collection and check out as a guest.
          </p>
          <Link href="/shop" className="btn-luxe">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }
  return <UnifiedAuthInner />;
}
