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
    const neonToken = params.get("token");
    const role = (params.get("role") || "user") as "user" | "runner";

    if (!neonToken) {
      setStatus("error");
      toast.error("Invalid magic link — no token found");
      return;
    }

    // Clean token from URL bar immediately for security
    window.history.replaceState({}, document.title, window.location.pathname);

    exchangeNeonToken(neonToken, role)
      .then((result) => {
        if (result.error) {
          setStatus("error");
          toast.error(result.error);
          return;
        }

        // Store session
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
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #FFF9F2, #EEF2FA)" }}>
        <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <h1 className="text-xl font-bold text-[#241100] mb-2">Link expired or invalid</h1>
          <p className="text-gray-500 text-sm mb-4">Please request a new magic link.</p>
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-3 rounded-xl text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #331900, #1A3A7A)" }}
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #FFF9F2, #EEF2FA)" }}>
      <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-sm">
        <div className="inline-block animate-spin w-8 h-8 rounded-full mb-4" style={{ border: "3px solid #331900", borderTopColor: "transparent" }} />
        <h1 className="text-lg font-bold text-[#241100]">Signing you in...</h1>
        <p className="text-gray-500 text-sm mt-1">Please wait a moment.</p>
      </div>
    </div>
  );
}
