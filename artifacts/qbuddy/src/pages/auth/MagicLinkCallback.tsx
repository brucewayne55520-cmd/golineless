import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { exchangeNeonToken } from "@/lib/neon-auth";

/**
 * Magic Link Callback
 *
 * Neon Auth redirects here after the user clicks the magic link.
 * The URL looks like:  /auth/magic-link/callback?token=<neonJwt>&role=user
 *
 * We exchange the Neon Auth JWT for a GoLineLess session token,
 * then redirect to the appropriate home page.
 */
export default function MagicLinkCallback() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Better Auth passes the token as "neon_auth_session_verifier"
    // Fall back to "token" for backwards compatibility
    const neonToken = params.get("neon_auth_session_verifier") || params.get("token");
    const storedRole = sessionStorage.getItem("golineless_magic_link_role");
    if (storedRole) sessionStorage.removeItem("golineless_magic_link_role");
    const role = (storedRole || params.get("role") || "user") as "user" | "runner";

    if (!neonToken) {
      setStatus("error");
      toast.error("Invalid magic link — no token found");
      return;
    }

    window.history.replaceState({}, document.title, window.location.pathname);

    exchangeNeonToken(neonToken, role)
      .then((result) => {
        if (result.error) {
          setStatus("error");
          toast.error(result.error);
          return;
        }

        if (role === "runner" && result.runner) {
          login(result.token, "runner", undefined, result.runner as never);
          toast.success("Welcome, Runner!");
          navigate("/runner/feed");
        } else {
          login(result.token, "user", result.user as never);
          toast.success("Welcome to Go LineLess!");
          navigate("/app/home");
        }
      })
      .catch(() => {
        setStatus("error");
        toast.error("Authentication failed. Please try again.");
      });
  }, [navigate, login]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link expired or invalid</h1>
          <p className="text-gray-500 text-sm mb-2">Magic links expire after a short time for security.</p>
          <p className="text-gray-400 text-xs mb-4">Please request a new magic link from the login page.</p>
          <div className="space-y-2">
            <button
              onClick={() => navigate("/login")}
              className="w-full px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-md"
            >
              Back to login
            </button>
            <button
              onClick={() => navigate("/runner/login")}
              className="w-full px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-50 transition-colors"
            >
              Runner login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center max-w-sm">
        <div className="inline-block animate-spin w-8 h-8 rounded-full mb-4 border-3 border-blue-600 border-t-transparent" style={{ borderWidth: 3 }} />
        <h1 className="text-lg font-bold text-gray-900">Signing you in...</h1>
        <p className="text-gray-500 text-sm mt-1">Please wait a moment.</p>
      </div>
    </div>
  );
}
