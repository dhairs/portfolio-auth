"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from "firebase/auth";
import { getClientAuth, getGoogleProvider } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Lock,
  User,
  CheckCircle,
} from "lucide-react";

// Safe redirect domains
const ALLOWED_DOMAINS = [
  "guptadhairya.com",
  "localhost",
  "photography-portfolio",
];

function getSafeRedirect(url: string | null): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // Check if hostname is allowed or is a subdomain of guptadhairya.com or vercel.app
    const isAllowed =
      ALLOWED_DOMAINS.includes(hostname) ||
      hostname.endsWith(".guptadhairya.com") ||
      hostname.endsWith(".vercel.app") ||
      hostname === "localhost" ||
      // Cover typical local development hosts
      /^127\.\d+\.\d+\.\d+$/.test(hostname) ||
      hostname === "[::1]";

    if (isAllowed) return url;
  } catch (e) {
    // If it's a relative path (e.g. /dashboard)
    if (url.startsWith("/")) {
      return url;
    }
  }
  return "";
}

interface UserState {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

function AuthContent() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirectUrl = getSafeRedirect(rawRedirect);
  const action = searchParams.get("action");

  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionUser, setSessionUser] = useState<UserState | null>(null);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigError, setIsConfigError] = useState(false);

  // Check if Firebase Client config is populated
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      setIsConfigError(true);
    }
  }, []);

  // Fetch session status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/auth/status");
        if (res.ok) {
          const data = await res.json();
          if (data.isAuthenticated && data.user) {
            setSessionUser(data.user);
          }
        }
      } catch (err) {
        console.error("Error checking auth status:", err);
      } finally {
        setCheckingSession(false);
      }
    }
    checkStatus();
  }, []);

  // Auto-redirect if already authenticated and redirect URL is provided
  useEffect(() => {
    if (sessionUser && redirectUrl && action !== "logout") {
      const timer = setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [sessionUser, redirectUrl, action]);

  // Handle auto-logout on mount if action=logout is specified
  useEffect(() => {
    if (action === "logout") {
      handleSignOut();
    }
  }, [action]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setAuthenticating(true);
    try {
      const authInstance = getClientAuth();
      const providerInstance = getGoogleProvider();

      // 1. Sign in with Firebase Client
      const result = await signInWithPopup(authInstance, providerInstance);
      const idToken = await result.user.getIdToken();

      // 2. Set the HttpOnly session cookie on our server
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        throw new Error("Failed to establish secure session on server");
      }

      // 3. Get user details for UI transition
      setSessionUser({
        uid: result.user.uid,
        email: result.user.email,
        name: result.user.displayName,
        picture: result.user.photoURL,
      });

      // 4. Redirect if URL is specified
      if (redirectUrl) {
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1200);
      }
    } catch (err: any) {
      console.error("Sign-in failure:", err);
      setError(err.message || "An error occurred during authentication.");
      // Ensure we clean up Firebase state
      try {
        const authInstance = getClientAuth();
        await firebaseSignOut(authInstance);
      } catch (signOutErr) {}
    } finally {
      setAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    setCheckingSession(true);
    try {
      const authInstance = getClientAuth();
      // 1. Call Firebase Client Sign Out
      await firebaseSignOut(authInstance);

      // 2. Delete Server session cookie
      await fetch("/api/auth/session", {
        method: "DELETE",
      });

      setSessionUser(null);

      // If this is a global logout redirect from another app, bounce back
      if (action === "logout" && redirectUrl) {
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1000);
      }
    } catch (err: any) {
      console.error("Sign-out failure:", err);
      setError("Failed to clear session securely.");
    } finally {
      if (action !== "logout" || !redirectUrl) {
        setCheckingSession(false);
      }
    }
  };

  const handleContinue = () => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  return (
    <div className="relative z-10 w-full max-w-md p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="glass-card rounded-2xl p-8 text-center flex flex-col items-center transition-all duration-500"
      >


        {/* Warning banner for missing configuration */}
        {isConfigError && (
          <div className="mb-6 w-full p-4 rounded-lg bg-red-950/40 border border-red-500/20 text-left flex gap-3 text-sm text-red-200">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-400" />
            <div>
              <p className="font-semibold mb-1">Configuration Required</p>
              <p className="text-xs text-red-300/80 leading-relaxed">
                Please set up your Firebase environment variables in <code className="bg-black/30 px-1 rounded">.env.local</code> to enable Google Sign-In.
              </p>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {checkingSession ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center gap-4"
            >
              <Loader2 className="w-10 h-10 animate-spin text-[#f3ddb6]" />
              <p className="text-sm text-gray-400 font-light">
                Securing connection...
              </p>
            </motion.div>
          ) : sessionUser ? (
            /* Logged In Dashboard State */
            <motion.div
              key="auth-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full flex flex-col items-center"
            >
              {/* User Avatar */}
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-full border-2 border-[#f3ddb6]/30 overflow-hidden bg-zinc-900 flex items-center justify-center">
                  {sessionUser.picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sessionUser.picture}
                      alt={sessionUser.name || "User Avatar"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1 border-2 border-[#030303]">
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                </div>
              </div>

              {/* User Identity Details */}
              <h2 className="text-xl font-medium text-[#f3ddb6] mb-1">
                {sessionUser.name || "Authenticated User"}
              </h2>
              <p className="text-sm text-gray-400 font-light mb-8">
                {sessionUser.email}
              </p>

              {/* Redirect Notice */}
              {redirectUrl && (
                <div className="mb-6 py-2 px-4 rounded-full bg-emerald-950/20 border border-emerald-500/15 text-emerald-200 text-xs flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Authenticated. Redirecting...
                </div>
              )}

              {/* Actions */}
              <div className="w-full flex flex-col gap-3">
                {redirectUrl ? (
                  <button
                    onClick={handleContinue}
                    className="w-full py-3 px-4 rounded-lg bg-[#f3ddb6] text-black font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#faeacf] transition-all duration-300 active:scale-[0.98]"
                  >
                    Continue to Application
                    <ExternalLink className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="text-xs text-gray-500 py-2 border border-dashed border-gray-800 rounded-lg w-full mb-2">
                    No active redirect request. You are logged into the domain.
                  </div>
                )}

                <button
                  onClick={handleSignOut}
                  className="w-full py-3 px-4 rounded-lg bg-zinc-950 border border-zinc-800 text-gray-400 font-medium text-sm flex items-center justify-center gap-2 hover:border-[#f3ddb6]/30 hover:text-[#f3ddb6] transition-all duration-300 active:scale-[0.98]"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          ) : (
            /* Logged Out / Sign In UI */
            <motion.div
              key="sign-in"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full flex flex-col items-center"
            >
              <p className="text-sm text-gray-400 leading-relaxed font-light mb-8">
                Sign in to access private resources and manage your session across all subdomains.
              </p>

              {/* Errors */}
              {error && (
                <div className="w-full p-3 mb-6 rounded-lg bg-red-950/30 border border-red-500/20 text-xs text-red-300 text-left">
                  {error}
                </div>
              )}

              {/* Generic Log-In Button */}
              <button
                disabled={authenticating || isConfigError}
                onClick={handleGoogleSignIn}
                className={`w-full py-3.5 px-5 rounded-xl border border-zinc-800 bg-black/40 text-gray-200 font-medium text-sm flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98] ${
                  authenticating || isConfigError
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:border-[#f3ddb6]/40 hover:bg-black/60 cursor-pointer"
                }`}
              >
                {authenticating ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#f3ddb6]" />
                ) : (
                  <User className="w-5 h-5 flex-shrink-0 text-[#f3ddb6]" />
                )}
                {authenticating ? "Authenticating session..." : "Log In"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security Footer Badge */}
        <div className="mt-8 pt-6 border-t border-zinc-900 w-full flex items-center justify-center gap-2 text-[10px] text-gray-600 uppercase tracking-widest">
          <Lock className="w-3.5 h-3.5 text-gray-700" />
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#030303] py-12 px-4">
      {/* Background Animated Glow Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#f3ddb6]/[0.02] filter blur-[100px] animate-float-one"></div>
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#c5a880]/[0.02] filter blur-[120px] animate-float-two"></div>
      </div>

      <Suspense
        fallback={
          <div className="glass-card rounded-2xl p-8 text-center flex flex-col items-center w-full max-w-md">
            <Loader2 className="w-10 h-10 animate-spin text-[#f3ddb6]" />
            <p className="mt-4 text-sm text-gray-400 font-light">
              Loading security keys...
            </p>
          </div>
        }
      >
        <AuthContent />
      </Suspense>
    </div>
  );
}
