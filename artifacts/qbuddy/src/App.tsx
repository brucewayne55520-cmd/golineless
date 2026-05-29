import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import Landing from "@/pages/landing/Landing";
import UserLogin from "@/pages/auth/UserLogin";
import RunnerLogin from "@/pages/auth/RunnerLogin";
import UserHome from "@/pages/app/UserHome";
import BookTask from "@/pages/app/BookTask";
import MyTasks from "@/pages/app/MyTasks";
import TaskDetail from "@/pages/app/TaskDetail";
import SeniorCare from "@/pages/app/SeniorCare";
import UserProfile from "@/pages/app/UserProfile";
import RunnerFeed from "@/pages/runner/RunnerFeed";
import ActiveTask from "@/pages/runner/ActiveTask";
import RunnerEarnings from "@/pages/runner/RunnerEarnings";
import RunnerProfile from "@/pages/runner/RunnerProfile";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminMap from "@/pages/admin/AdminMap";
import AdminTasks from "@/pages/admin/AdminTasks";
import AdminRunners from "@/pages/admin/AdminRunners";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminSubscriptions from "@/pages/admin/AdminSubscriptions";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminSettings from "@/pages/admin/AdminSettings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, role } = useAuth();
  const [, navigate] = useLocation();
  if (!token || role !== "user") {
    navigate("/login");
    return null;
  }
  return <>{children}</>;
}

function RunnerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, role } = useAuth();
  const [, navigate] = useLocation();
  if (!token || role !== "runner") {
    navigate("/runner/login");
    return null;
  }
  return <>{children}</>;
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const adminToken = localStorage.getItem("qbuddy_admin_token");
  const [, navigate] = useLocation();
  if (!adminToken) {
    navigate("/admin/login");
    return null;
  }
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={UserLogin} />
      <Route path="/runner/login" component={RunnerLogin} />

      <Route path="/app/home">
        <ProtectedRoute><UserHome /></ProtectedRoute>
      </Route>
      <Route path="/app/book">
        <ProtectedRoute><BookTask /></ProtectedRoute>
      </Route>
      <Route path="/app/tasks">
        <ProtectedRoute><MyTasks /></ProtectedRoute>
      </Route>
      <Route path="/app/tasks/:id">
        {(params) => <ProtectedRoute><TaskDetail id={params.id} /></ProtectedRoute>}
      </Route>
      <Route path="/app/senior">
        <ProtectedRoute><SeniorCare /></ProtectedRoute>
      </Route>
      <Route path="/app/profile">
        <ProtectedRoute><UserProfile /></ProtectedRoute>
      </Route>

      <Route path="/runner/feed">
        <RunnerProtectedRoute><RunnerFeed /></RunnerProtectedRoute>
      </Route>
      <Route path="/runner/active">
        <RunnerProtectedRoute><ActiveTask /></RunnerProtectedRoute>
      </Route>
      <Route path="/runner/earnings">
        <RunnerProtectedRoute><RunnerEarnings /></RunnerProtectedRoute>
      </Route>
      <Route path="/runner/profile">
        <RunnerProtectedRoute><RunnerProfile /></RunnerProtectedRoute>
      </Route>

      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin">
        <AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>
      </Route>
      <Route path="/admin/map">
        <AdminProtectedRoute><AdminMap /></AdminProtectedRoute>
      </Route>
      <Route path="/admin/tasks">
        <AdminProtectedRoute><AdminTasks /></AdminProtectedRoute>
      </Route>
      <Route path="/admin/runners">
        <AdminProtectedRoute><AdminRunners /></AdminProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>
      </Route>
      <Route path="/admin/subscriptions">
        <AdminProtectedRoute><AdminSubscriptions /></AdminProtectedRoute>
      </Route>
      <Route path="/admin/analytics">
        <AdminProtectedRoute><AdminAnalytics /></AdminProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

import { useState } from "react";
import { useAdminLogin } from "@workspace/api-client-react";
import { toast } from "sonner";

function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [, navigate] = useLocation();
  const mutation = useAdminLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ body: { password } }, {
      onSuccess: (data) => {
        localStorage.setItem("qbuddy_admin_token", data.token);
        navigate("/admin");
      },
      onError: () => toast.error("Invalid password"),
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#6C3FD4] to-[#9B6FF7]">
      <div className="bg-white rounded-2xl p-8 shadow-2xl w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#6C3FD4] rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-2xl">Q</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">QBuddy Command Center</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6C3FD4] text-gray-800"
          />
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-3 rounded-xl font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}
          >
            {mutation.isPending ? "Verifying..." : "Enter Admin Panel"}
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
