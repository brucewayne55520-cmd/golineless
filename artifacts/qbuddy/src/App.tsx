import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import { lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Landing = lazy(() => import("@/pages/landing/Landing"));
const UserLogin = lazy(() => import("@/pages/auth/UserLogin"));
const RunnerLogin = lazy(() => import("@/pages/auth/RunnerLogin"));
const UserHome = lazy(() => import("@/pages/app/UserHome"));
const BookTask = lazy(() => import("@/pages/app/BookTask"));
const MyTasks = lazy(() => import("@/pages/app/MyTasks"));
const TaskDetail = lazy(() => import("@/pages/app/TaskDetail"));
const SeniorCare = lazy(() => import("@/pages/app/SeniorCare"));
const UserProfile = lazy(() => import("@/pages/app/UserProfile"));
const RunnerFeed = lazy(() => import("@/pages/runner/RunnerFeed"));
const ActiveTask = lazy(() => import("@/pages/runner/ActiveTask"));
const RunnerEarnings = lazy(() => import("@/pages/runner/RunnerEarnings"));
const RunnerProfile = lazy(() => import("@/pages/runner/RunnerProfile"));
const RunnerOnboarding = lazy(() => import("@/pages/runner/RunnerOnboarding"));
const RunnerPlaybook = lazy(() => import("@/pages/runner/RunnerPlaybook"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminMap = lazy(() => import("@/pages/admin/AdminMap"));
const AdminTasks = lazy(() => import("@/pages/admin/AdminTasks"));
const AdminRunners = lazy(() => import("@/pages/admin/AdminRunners"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminSubscriptions = lazy(() => import("@/pages/admin/AdminSubscriptions"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminRecruitment = lazy(() => import("@/pages/admin/AdminRecruitment"));
const AdminTraining = lazy(() => import("@/pages/admin/AdminTraining"));
const AdminQuality = lazy(() => import("@/pages/admin/AdminQuality"));
const AdminSupport = lazy(() => import("@/pages/admin/AdminSupport"));
const AdminIncidents = lazy(() => import("@/pages/admin/AdminIncidents"));
const AdminHeatmap = lazy(() => import("@/pages/admin/AdminHeatmap"));
const AdminPilot = lazy(() => import("@/pages/admin/AdminPilot"));
const AdminOperationsCenter = lazy(() => import("@/pages/admin/AdminOperationsCenter"));
const AdminLeaderboard = lazy(() => import("@/pages/admin/AdminLeaderboard"));
const AdminAreaPerformance = lazy(() => import("@/pages/admin/AdminAreaPerformance"));
const AdminFounder = lazy(() => import("@/pages/admin/AdminFounder"));
const AdminIncidentResponse = lazy(() => import("@/pages/admin/AdminIncidentResponse"));
const AdminKycReview = lazy(() => import("@/pages/admin/AdminKycReview"));
const AdminAuditLog = lazy(() => import("@/pages/admin/AdminAuditLog"));
const NotificationsPage = lazy(() => import("@/pages/app/NotificationsPage"));
const RunnerNotificationsPage = lazy(() => import("@/pages/runner/RunnerNotificationsPage"));
const RunnerReviewsPage = lazy(() => import("@/pages/runner/RunnerReviewsPage"));
const NotFound = lazy(() => import("@/pages/not-found"));
const FamilyTrack = lazy(() => import("@/pages/app/FamilyTrack"));
const PayRetry = lazy(() => import("@/pages/app/PayRetry"));
const Signup = lazy(() => import("@/pages/auth/Signup"));
const MagicLinkCallback = lazy(() => import("@/pages/auth/MagicLinkCallback"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, role, isLoading } = useAuth();
  const [, navigate] = useLocation();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center gl-surface"><div className="w-8 h-8 border-4 rounded-full animate-spin border-blue-600 border-t-transparent" /></div>;
  if (!token || role !== "user") { navigate("/login"); return null; }
  return <>{children}</>;
}

function RunnerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, role, isLoading } = useAuth();
  const [, navigate] = useLocation();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center gl-surface"><div className="w-8 h-8 border-4 rounded-full animate-spin border-blue-600 border-t-transparent" /></div>;
  if (!token || role !== "runner") { navigate("/runner/login"); return null; }
  return <>{children}</>;
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const adminToken = localStorage.getItem("golineless_admin_token");
  const [, navigate] = useLocation();
  if (!adminToken) { navigate("/admin/login"); return null; }
  return <>{children}</>;
}

function Router() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center gl-surface">
        <div className="text-center">
          <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-3 border-blue-600 border-t-transparent" />
          <p className="text-gray-500 text-sm font-medium">Loading...</p>
        </div>
      </div>
    }>
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={UserLogin} />
      <Route path="/signup" component={Signup} />
      <Route path="/runner/login" component={RunnerLogin} />
      <Route path="/auth/magic-link/callback" component={MagicLinkCallback} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      <Route path="/app/home"><ProtectedRoute><UserHome /></ProtectedRoute></Route>
      <Route path="/app/book"><ProtectedRoute><BookTask /></ProtectedRoute></Route>
      <Route path="/app/tasks"><ProtectedRoute><MyTasks /></ProtectedRoute></Route>
      <Route path="/app/tasks/:id">{(params) => <ProtectedRoute><TaskDetail id={params.id} /></ProtectedRoute>}</Route>
      <Route path="/app/tasks/:id/pay">{(params) => <ProtectedRoute><PayRetry id={params.id} /></ProtectedRoute>}</Route>
      <Route path="/app/senior"><ProtectedRoute><SeniorCare /></ProtectedRoute></Route>
      <Route path="/app/profile"><ProtectedRoute><UserProfile /></ProtectedRoute></Route>
      <Route path="/app/notifications"><ProtectedRoute><NotificationsPage /></ProtectedRoute></Route>

      <Route path="/runner/feed"><RunnerProtectedRoute><RunnerFeed /></RunnerProtectedRoute></Route>
      <Route path="/runner/active"><RunnerProtectedRoute><ActiveTask /></RunnerProtectedRoute></Route>
      <Route path="/runner/earnings"><RunnerProtectedRoute><RunnerEarnings /></RunnerProtectedRoute></Route>
      <Route path="/runner/profile"><RunnerProtectedRoute><RunnerProfile /></RunnerProtectedRoute></Route>
      <Route path="/runner/notifications"><RunnerProtectedRoute><RunnerNotificationsPage /></RunnerProtectedRoute></Route>
      <Route path="/runner/onboarding"><RunnerProtectedRoute><RunnerOnboarding /></RunnerProtectedRoute></Route>
      <Route path="/runner/playbook"><RunnerProtectedRoute><RunnerPlaybook /></RunnerProtectedRoute></Route>
      <Route path="/runner/reviews"><RunnerProtectedRoute><RunnerReviewsPage /></RunnerProtectedRoute></Route>

      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin"><AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute></Route>
      <Route path="/admin/map"><AdminProtectedRoute><AdminMap /></AdminProtectedRoute></Route>
      <Route path="/admin/tasks"><AdminProtectedRoute><AdminTasks /></AdminProtectedRoute></Route>
      <Route path="/admin/runners"><AdminProtectedRoute><AdminRunners /></AdminProtectedRoute></Route>
      <Route path="/admin/users"><AdminProtectedRoute><AdminUsers /></AdminProtectedRoute></Route>
      <Route path="/admin/subscriptions"><AdminProtectedRoute><AdminSubscriptions /></AdminProtectedRoute></Route>
      <Route path="/admin/analytics"><AdminProtectedRoute><AdminAnalytics /></AdminProtectedRoute></Route>
      <Route path="/admin/settings"><AdminProtectedRoute><AdminSettings /></AdminProtectedRoute></Route>
      <Route path="/admin/recruitment"><AdminProtectedRoute><AdminRecruitment /></AdminProtectedRoute></Route>
      <Route path="/admin/training"><AdminProtectedRoute><AdminTraining /></AdminProtectedRoute></Route>
      <Route path="/admin/quality"><AdminProtectedRoute><AdminQuality /></AdminProtectedRoute></Route>
      <Route path="/admin/support"><AdminProtectedRoute><AdminSupport /></AdminProtectedRoute></Route>
      <Route path="/admin/incidents"><AdminProtectedRoute><AdminIncidents /></AdminProtectedRoute></Route>
      <Route path="/admin/heatmap"><AdminProtectedRoute><AdminHeatmap /></AdminProtectedRoute></Route>
      <Route path="/admin/pilot"><AdminProtectedRoute><AdminPilot /></AdminProtectedRoute></Route>
      <Route path="/admin/operations"><AdminProtectedRoute><AdminOperationsCenter /></AdminProtectedRoute></Route>
      <Route path="/admin/leaderboard"><AdminProtectedRoute><AdminLeaderboard /></AdminProtectedRoute></Route>
      <Route path="/admin/areas"><AdminProtectedRoute><AdminAreaPerformance /></AdminProtectedRoute></Route>
      <Route path="/admin/founder"><AdminProtectedRoute><AdminFounder /></AdminProtectedRoute></Route>
      <Route path="/admin/incident-response"><AdminProtectedRoute><AdminIncidentResponse /></AdminProtectedRoute></Route>
      <Route path="/admin/kyc"><AdminProtectedRoute><AdminKycReview /></AdminProtectedRoute></Route>
      <Route path="/admin/audit-log"><AdminProtectedRoute><AdminAuditLog /></AdminProtectedRoute></Route>

      <Route path="/family/track/:token">{(params) => <FamilyTrack token={params.token} />}</Route>
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

import { useState, useEffect } from "react";
import { useAdminLogin } from "@workspace/api-client-react";
import { toast } from "sonner";
import { DARK_GRAD } from "@/lib/theme";

function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [, navigate] = useLocation();
  const mutation = useAdminLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ data: { password } }, {
      onSuccess: (data) => {
        localStorage.setItem("golineless_admin_token", data.token);
        navigate("/admin");
      },
      onError: () => toast.error("Invalid password"),
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: DARK_GRAD }}>
      <div className="bg-white rounded-2xl p-8 gl-shadow-xl w-full max-w-sm border border-gray-100">
        <div className="text-center mb-6">
          <div className="gl-navy rounded-xl p-3 inline-block mb-4">
            <img src="/logo.jpg" alt="Go LineLess" className="h-14 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Go LineLess Command Center</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-gray-900 bg-gray-50 gl-transition"
          />
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 gl-transition hover:bg-blue-700 hover:gl-shadow-lg active:scale-[0.98]"
          >
            {mutation.isPending ? "Verifying..." : "Enter Admin Panel"}
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  // L12: Version check — poll health endpoint every 5 minutes for new deployments
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let lastEtag: string | null = null;
    const checkVersion = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (res.ok) {
          const etag = res.headers.get("etag") || res.headers.get("x-deployment-id");
          if (lastEtag && etag && lastEtag !== etag) {
            setUpdateAvailable(true);
          }
          if (etag) lastEtag = etag;
          // Also check build timestamp in response body
          const data = await res.json().catch(() => null);
          if (data?.buildTime) {
            const stored = localStorage.getItem("golineless_buildTime");
            if (stored && stored !== data.buildTime) {
              setUpdateAvailable(true);
            }
            localStorage.setItem("golineless_buildTime", data.buildTime);
          }
        }
      } catch { /* ignore */ }
    };
    checkVersion();
    const interval = setInterval(checkVersion, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ErrorBoundary>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          {updateAvailable && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] gl-navy border border-blue-500/30 text-white px-5 py-3 rounded-2xl gl-shadow-xl flex items-center gap-3" style={{ maxWidth: "90vw" }}>
              <span className="text-sm font-semibold">New version available</span>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shrink-0 bg-blue-600 gl-transition hover:bg-blue-700 active:scale-[0.98]"
              >
                Update
              </button>
            </div>
          )}
        </ErrorBoundary>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
