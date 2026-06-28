import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Configure the generated API client with auth token and base URL.
// All pages use react-query hooks from @workspace/api-client-react which
// automatically attach auth headers via customFetch.

const API_BASE = import.meta.env.VITE_API_URL || "";
setBaseUrl(API_BASE);

setAuthTokenGetter(() => {
  return (
    localStorage.getItem("golineless_admin_token") ||
    localStorage.getItem("golineless_user_token") ||
    localStorage.getItem("golineless_runner_token")
  );
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Warn if the Google Client ID looks like a placeholder or is empty
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_ID.includes(".apps.googleusercontent.com")) {
  console.error(
    "[Google Auth] VITE_GOOGLE_CLIENT_ID is missing or invalid.\n" +
    "Current value:", GOOGLE_CLIENT_ID || "(empty)",
    "\nSet it in your Render environment variables."
  );
}

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
);
