"use client";

import * as React from "react";
import { useSignIn, useSignUp, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, MoveRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

type Step = "email" | "name" | "otp";
type AuthFlow = "signin" | "signup" | null;

// Clerk surfaces field-level errors on an `errors` array; this narrows the
// unknown error object so we can read messages without `any`.
type ClerkFieldError = { code?: string; longMessage?: string; message?: string };
function clerkFieldErrors(error: unknown): ClerkFieldError[] {
  if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    Array.isArray((error as { errors?: unknown }).errors)
  ) {
    return (error as { errors: ClerkFieldError[] }).errors;
  }
  return [];
}

const QUOTES = [
  "Welcome to Pehnawa — The Art of Rangat.",
  "Elegance woven into every thread.",
  "Tradition meets contemporary luxury.",
  "Welcome to Pehnawa — The Art of Rangat.",
  "Crafted for the modern connoisseur.",
  "Your heritage, redefined.",
  "Welcome to Pehnawa — The Art of Rangat.",
  "Unapologetically authentic.",
];

export default function UnifiedAuthPage() {
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [step, setStep] = React.useState<Step>("email");
  const [authFlow, setAuthFlow] = React.useState<AuthFlow>(null);
  const [localError, setLocalError] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const [quoteIndex, setQuoteIndex] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form Fields
  const [emailAddress, setEmailAddress] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [code, setCode] = React.useState("");

  React.useEffect(() => {
    if (isSignedIn) {
      router.push("/account");
    }
  }, [isSignedIn, router]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const isLoading = !isLoaded || isSubmitting;

  const handleOAuth = async (strategy: "oauth_google") => {
    if (!isLoaded || !signIn) return;
    try {
      await signIn.sso({
        strategy,
        redirectUrl: "/account",
        redirectCallbackUrl: "/sso-callback",
      });
    } catch {
      setLocalError("An error occurred during SSO.");
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setLocalError("");
    setIsSubmitting(true);

    try {
      const { error } = await signIn.emailCode.sendCode({ emailAddress });

      if (error) {
        const isNotFound = clerkFieldErrors(error).some((e) => e.code === "form_identifier_not_found");
        if (isNotFound) {
          setAuthFlow("signup");
          setStep("name");
        } else {
          setLocalError(clerkFieldErrors(error)[0]?.longMessage || "Something went wrong.");
        }
      } else {
        setAuthFlow("signin");
        setStep("otp");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setLocalError("");
    setIsSubmitting(true);

    try {
      const { error: createError } = await signUp.create({
        emailAddress,
        firstName,
        lastName,
      });

      if (createError) {
        setLocalError(clerkFieldErrors(createError)[0]?.longMessage || "Sign up failed. Please try again.");
        return;
      }

      const { error: sendError } = await signUp.verifications.sendEmailCode();

      if (sendError) {
        setLocalError(clerkFieldErrors(sendError)[0]?.longMessage || "Failed to send code.");
      } else {
        setStep("otp");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn || !signUp) return;
    setLocalError("");
    setIsSubmitting(true);

    try {
      if (authFlow === "signin") {
        const { error } = await signIn.emailCode.verifyCode({ code });
        
        if (error) {
          setLocalError(clerkFieldErrors(error)[0]?.longMessage || "Invalid verification code.");
          return;
        }

        if (signIn.status === "complete") {
          await signIn.finalize({
            navigate: ({ decorateUrl }) => router.push(decorateUrl("/account")),
          });
        } else {
          setLocalError("Additional verification needed.");
        }
      } else if (authFlow === "signup") {
        const { error } = await signUp.verifications.verifyEmailCode({ code });
        
        if (error) {
          setLocalError(clerkFieldErrors(error)[0]?.longMessage || "Invalid verification code.");
          return;
        }

        if (signUp.status === "complete") {
          await signUp.finalize({
            navigate: ({ decorateUrl }) => router.push(decorateUrl("/account")),
          });
        } else {
          setLocalError("Sign up verification incomplete.");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FAFAF9]">
        <motion.div 
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-4 h-4 bg-charcoal rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#FAFAF9] overflow-hidden selection:bg-charcoal/10">
      {/* ── Soothing Fluid Aura Background & Doodles ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[#FAFAF9] mix-blend-overlay z-10 opacity-50" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay z-20" />
        
        {/* Soft Aura Orbs using Brand Colors */}
        <motion.div 
          animate={{ 
            x: ["0%", "20%", "-10%", "0%"], 
            y: ["0%", "-20%", "10%", "0%"],
            scale: [1, 1.1, 0.9, 1] 
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-terracotta/15 rounded-full blur-[100px] opacity-80 z-0"
        />
        <motion.div 
          animate={{ 
            x: ["0%", "-20%", "20%", "0%"], 
            y: ["0%", "20%", "-10%", "0%"],
            scale: [0.9, 1.2, 0.8, 0.9] 
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-gold/15 rounded-full blur-[120px] opacity-80 z-0"
        />

        {/* Global Doodles matching homepage (Responsive) */}
        <div className="absolute inset-0 z-30 opacity-70">
          {/* Top-Right looping arrow */}
          <svg
            className="absolute right-[-10%] sm:right-[5%] top-[5%] sm:top-[12%] w-40 h-40 sm:w-64 sm:h-64 text-charcoal/20 sm:text-charcoal/30 -rotate-12"
            viewBox="0 0 200 200"
            fill="none"
          >
            <path d="M50 150 Q 150 180 180 50 T 50 150" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 5" fill="none" />
            <path d="M40 140 L 50 150 L 65 145" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <text x="120" y="80" fontFamily="cursive" fontSize="14" fill="currentColor" className="opacity-80 rotate-12">
              Exclusive
            </text>
          </svg>

          {/* Dotted spinning trail */}
          <svg
            className="absolute left-[-5%] sm:left-[10%] top-[60%] sm:top-[70%] w-32 h-32 sm:w-48 sm:h-48 text-charcoal/20 sm:text-charcoal/25 animate-[spin_60s_linear_infinite]"
            viewBox="0 0 100 100"
            fill="none"
          >
            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" />
            <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.5" />
          </svg>

          {/* Fun little starburst */}
          <svg
            className="absolute right-[5%] sm:right-[15%] bottom-[10%] sm:bottom-[15%] w-20 h-20 sm:w-32 sm:h-32 text-charcoal/20 sm:text-charcoal/30"
            viewBox="0 0 100 100"
            fill="none"
          >
            <path d="M50 10 L 50 90 M 10 50 L 90 50 M 20 20 L 80 80 M 20 80 L 80 20" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="1" fill="none" />
            <text x="50" y="85" fontFamily="cursive" fontSize="12" fill="currentColor" textAnchor="middle" className="opacity-80 rotate-6">
              Vibes
            </text>
          </svg>

          {/* Top-Left squiggly line */}
          <svg
            className="absolute left-[5%] sm:left-[10%] top-[10%] sm:top-[15%] w-24 h-24 sm:w-32 sm:h-32 text-charcoal/20 sm:text-charcoal/30"
            viewBox="0 0 100 100"
            fill="none"
          >
            <path d="M 10 50 Q 25 20 40 50 T 70 50 T 100 50" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
          </svg>
        </div>
      </div>

      <Link
        href="/"
        className="absolute top-6 left-6 sm:top-10 sm:left-10 z-50 inline-flex items-center gap-2 text-charcoal/50 hover:text-charcoal transition-colors text-xs font-semibold tracking-widest uppercase bg-white/50 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-charcoal/5"
      >
        <ArrowLeft className="w-3 h-3" /> Return
      </Link>

      {/* ── Compact Dynamic Capsule ── */}
      <motion.div 
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
        className="relative z-40 w-full max-w-[420px] mx-4"
      >
        <div className={`relative bg-white/70 backdrop-blur-[40px] border transition-colors duration-500 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden ${focused ? 'border-charcoal/20 shadow-[0_20px_60px_-15px_rgb(0,0,0,0.1)]' : 'border-white/50'}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
          
          <div className="relative p-8 sm:p-10">
            {/* Minimalist Header with Changing Quotes */}
            <motion.div layout="position" className="mb-10 flex flex-col items-center text-center">
              {/* Logo with Heartbeat Animation */}
              <motion.div 
                className="relative w-64 h-24 mb-4"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1, 1.05, 1, 1.05, 1] }}
                transition={{ 
                  delay: 2, // Starts 2 seconds after loading
                  duration: 1.5, 
                  ease: "easeInOut",
                  times: [0, 0.2, 0.4, 0.6, 0.8, 1], // Double thump timing
                  repeatDelay: 5,
                  repeat: Infinity // Repeats every 5 seconds
                }}
                whileHover={{ scale: [1, 1.05, 1, 1.05, 1], transition: { duration: 0.6, repeat: 0 } }}
                whileTap={{ scale: 0.95 }}
              >
                <Image
                  src="/images/RangatPehnawa.png"
                  alt="Rangat Pehnawa"
                  fill
                  className="object-contain object-center drop-shadow-sm"
                  priority
                />
              </motion.div>

              {/* Dynamic Title for inner steps only */}
              <AnimatePresence mode="wait">
                {step !== "email" && (
                  <motion.h1 
                    key="step-title"
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="font-serif text-2xl text-charcoal tracking-tight"
                  >
                    {step === "name" && "Create Profile"}
                    {step === "otp" && "Verify Email"}
                  </motion.h1>
                )}
              </AnimatePresence>
              
              {/* Elegant Quotes / Subtitle */}
              <div className="relative w-full flex flex-col items-center justify-center">
                <div className="w-8 h-[1px] bg-charcoal/30 mb-4" />
                <div className="h-12 relative w-full overflow-hidden flex items-center justify-center text-center px-4">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={step === "email" ? quoteIndex : step}
                      initial={{ opacity: 0, filter: "blur(4px)", y: 5 }}
                      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                      exit={{ opacity: 0, filter: "blur(4px)", y: -5 }}
                      transition={{ duration: 0.5 }}
                      className="text-[10px] sm:text-xs text-charcoal/80 font-sans tracking-[0.2em] uppercase font-semibold absolute leading-relaxed"
                    >
                      {step === "email" ? QUOTES[quoteIndex] : (
                        step === "name" ? "Just a few details to get started." : `Sent to ${emailAddress}`
                      )}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            <AnimatePresence mode="popLayout" initial={false}>
              {localError && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-red-50/80 text-red-600 text-xs font-medium p-3 rounded-xl mb-6 text-center border border-red-100"
                >
                  {localError}
                </motion.div>
              )}

              {step === "email" && (
                <motion.div
                  key="step-email"
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.3 }}
                >
                  <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                    <div className="relative">
                      <input
                        id="email"
                        type="email"
                        required
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        className="w-full bg-charcoal/5 hover:bg-charcoal/[0.07] focus:bg-white border border-transparent focus:border-charcoal/10 rounded-2xl px-5 py-4 text-sm font-medium text-charcoal transition-all outline-none placeholder:text-charcoal/40"
                        placeholder="name@example.com"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="group relative w-full h-14 bg-charcoal text-white rounded-2xl text-xs font-semibold tracking-wide transition-all hover:bg-black hover:shadow-lg hover:shadow-charcoal/20 disabled:opacity-50 flex items-center justify-center overflow-hidden"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>Continue</span>
                          <MoveRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      )}
                    </button>
                  </form>

                  <div className="flex items-center gap-4 my-8">
                    <div className="h-[1px] bg-charcoal/5 flex-1" />
                    <span className="text-[10px] uppercase tracking-widest text-charcoal/30 font-semibold">Or</span>
                    <div className="h-[1px] bg-charcoal/5 flex-1" />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOAuth("oauth_google")}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-charcoal/5 hover:border-charcoal/20 transition-all h-14 rounded-2xl shadow-sm text-xs font-semibold tracking-wide text-charcoal"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.8 15.7 17.58V20.34H19.27C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                      <path d="M12 23C14.97 23 17.46 22.02 19.27 20.34L15.7 17.58C14.72 18.24 13.46 18.64 12 18.64C9.18 18.64 6.78 16.73 5.92 14.18H2.23V17.04C4.04 20.64 7.72 23 12 23Z" fill="#34A853"/>
                      <path d="M5.92 14.18C5.7 13.52 5.57 12.78 5.57 12C5.57 11.22 5.7 10.48 5.92 9.82V6.96H2.23C1.49 8.44 1.05 10.15 1.05 12C1.05 13.85 1.49 15.56 2.23 17.04L5.92 14.18Z" fill="#FBBC05"/>
                      <path d="M12 5.36C13.62 5.36 15.07 5.92 16.22 7.02L19.34 3.9C17.45 2.14 14.97 1 12 1C7.72 1 4.04 3.36 2.23 6.96L5.92 9.82C6.78 7.27 9.18 5.36 12 5.36Z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </motion.div>
              )}

              {step === "name" && (
                <motion.div
                  key="step-name"
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.3 }}
                >
                  <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        id="firstName"
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        className="w-full bg-charcoal/5 hover:bg-charcoal/[0.07] focus:bg-white border border-transparent focus:border-charcoal/10 rounded-2xl px-5 py-4 text-sm font-medium text-charcoal transition-all outline-none placeholder:text-charcoal/40"
                        placeholder="First name"
                      />
                      <input
                        id="lastName"
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        className="w-full bg-charcoal/5 hover:bg-charcoal/[0.07] focus:bg-white border border-transparent focus:border-charcoal/10 rounded-2xl px-5 py-4 text-sm font-medium text-charcoal transition-all outline-none placeholder:text-charcoal/40"
                        placeholder="Last name"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="group relative w-full h-14 bg-charcoal text-white rounded-2xl text-xs font-semibold tracking-wide transition-all hover:bg-black hover:shadow-lg hover:shadow-charcoal/20 disabled:opacity-50 flex items-center justify-center"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>Complete Profile</span>
                          <MoveRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      )}
                    </button>

                    <button 
                      type="button" 
                      onClick={() => setStep("email")}
                      className="text-xs text-charcoal/40 hover:text-charcoal font-medium transition-colors py-2 mt-2"
                    >
                      Go Back
                    </button>
                  </form>
                </motion.div>
              )}

              {step === "otp" && (
                <motion.div
                  key="step-otp"
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.3 }}
                >
                  <form onSubmit={handleOtpVerify} className="flex flex-col gap-4">
                    <div className="relative">
                      <input
                        id="code"
                        type="text"
                        required
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        className="w-full bg-charcoal/5 hover:bg-charcoal/[0.07] focus:bg-white border border-transparent focus:border-charcoal/10 rounded-2xl px-5 py-5 text-2xl font-mono text-center tracking-[0.5em] text-charcoal transition-all outline-none placeholder:text-charcoal/20"
                        placeholder="------"
                        maxLength={6}
                        autoComplete="one-time-code"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || code.length !== 6}
                      className="group relative w-full h-14 bg-charcoal text-white rounded-2xl text-xs font-semibold tracking-wide transition-all hover:bg-black hover:shadow-lg hover:shadow-charcoal/20 disabled:opacity-50 flex items-center justify-center"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>Verify Access</span>
                          <MoveRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      )}
                    </button>

                    <button 
                      type="button" 
                      onClick={() => {
                        setStep("email");
                        setCode("");
                      }}
                      className="text-xs text-charcoal/40 hover:text-charcoal font-medium transition-colors py-2 mt-2"
                    >
                      Wrong email address?
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Required by Clerk for Bot Protection */}
        <div id="clerk-captcha" className="hidden" />
      </motion.div>
    </div>
  );
}
