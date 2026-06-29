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

import { isGoogleAuthConfigured } from "./lib/google-auth";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const root = createRoot(document.getElementById("root")!);
const content = <App />;

root.render(
  isGoogleAuthConfigured
    ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{content}</GoogleOAuthProvider>
    : content
);
