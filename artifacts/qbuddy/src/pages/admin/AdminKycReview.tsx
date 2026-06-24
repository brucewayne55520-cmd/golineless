import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Shield, User, PersonStanding, CheckCircle2, XCircle, X, Eye, Clock, BadgeCheck, AlertTriangle, AlertOctagon, Search } from "lucide-react";
import { useListAdminUsers, useListAdminRunners, useReviewRunnerKyc } from "@workspace/api-client-react";
import type { Runner, User as UserType } from "@workspace/api-client-react";

type UserWithKyc = UserType & { kycStatus?: string; uniqueId?: string; aadhaarFront?: string; aadhaarBack?: string; emergencyContact?: string; idDocumentUrl?: string; updatedAt?: string };
type RunnerWithKyc = Runner & { kycStatus?: string; uniqueId?: string; bankAccount?: string; bankIfsc?: string; bankAccountHolder?: string; aadhaarFront?: string; aadhaarBack?: string; selfie?: string; fullName?: string; updatedAt?: string };
import AdminSidebar from "@/components/AdminSidebar";
import { getInitials } from "@/lib/utils";
import { customFetch } from "@workspace/api-client-react";

type Tab = "users" | "runners";
type KycFilter = "pending" | "verified" | "rejected" | "none" | "stale";

const KYC_TABS: { key: Tab; label: string; icon: typeof User }[] = [
  { key: "users", label: "Users (KYC)", icon: User },
  { key: "runners", label: "Comrades (KYC)", icon: PersonStanding },
];

const STATUS_TABS: { key: KycFilter; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "none", label: "Not Started" },
  { key: "stale", label: "Stale (>7d)" },
];

export default function AdminKycReview() {
  const [tab, setTab] = useState<Tab>("users");
  const [statusFilter, setStatusFilter] = useState<KycFilter>("pending");
  const [selectedUser, setSelectedUser] = useState<UserWithKyc | null>(null);
  const [selectedRunner, setSelectedRunner] = useState<RunnerWithKyc | null>(null);
  const [rejReason, setRejReason] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const PAGE_SIZE = 20;

  // A5: Fetch stale count on mount
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("golineless_admin_token") || "";
        const res = await customFetch("/api/admin/kyc/stale", { headers: { Authorization: `Bearer ${token}` } });
        if (res) setStaleSubmissions(res as { staleUsers: unknown[]; staleRunners: unknown[]; totalStale: number });
      } catch { /* ignore */ }
    })();
  }, []);

  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useListAdminUsers({ limit: 200 });
  const { data: runners, isLoading: runnersLoading, refetch: refetchRunners } = useListAdminRunners({
    kyc_status: statusFilter === "stale" || statusFilter === "none" ? undefined : (statusFilter as import("@workspace/api-client-react").ListAdminRunnersKycStatus),
    limit: 200,
  });
  const reviewKyc = useReviewRunnerKyc();

  // A5: Fetch stale KYC submissions (> 7 days pending)
  const [staleSubmissions, setStaleSubmissions] = useState<{ staleUsers: unknown[]; staleRunners: unknown[]; totalStale: number }>({ staleUsers: [], staleRunners: [], totalStale: 0 });
  const staleCount = staleSubmissions.totalStale;

  const userList = (users ?? []) as UserWithKyc[];
  const searchLower = searchQuery.toLowerCase();
  const matchesSearch = (name?: string, phone?: string, uniqueId?: string, city?: string) =>
    !searchQuery || [name, phone, uniqueId, city].some(f => f?.toLowerCase().includes(searchLower));

  const filteredUsers = statusFilter === "none"
    ? userList.filter(u => !u.kycStatus || u.kycStatus === "none")
    : statusFilter === "stale"
    ? userList.filter(u => u.kycStatus === "pending" && u.updatedAt && (Date.now() - new Date(u.updatedAt).getTime()) > 7 * 86400000)
    : userList.filter(u => u.kycStatus === (statusFilter as string));
  const searchedUsers = filteredUsers.filter(u => matchesSearch(u.name ?? undefined, u.phone ?? undefined, u.uniqueId ?? undefined, u.city ?? undefined));

  const runnerList = (runners ?? []) as RunnerWithKyc[];
  const filteredRunners = statusFilter === "stale"
    ? runnerList.filter(r => r.kycStatus === "pending" && r.updatedAt && (Date.now() - new Date(r.updatedAt).getTime()) > 7 * 86400000)
    : statusFilter === "none"
    ? runnerList.filter(r => !r.kycStatus || (r.kycStatus as string) === "none")
    : runnerList.filter(r => r.kycStatus === (statusFilter as string));
  const searchedRunners = filteredRunners.filter(r => matchesSearch(r.name ?? undefined, r.phone ?? undefined, r.uniqueId ?? undefined, r.city ?? undefined));

  const handleUserReview = async (userId: number, action: "approve" | "reject") => {
    try {
      await customFetch(`/api/admin/users/${userId}/kyc`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason: rejReason || undefined }),
      });
      toast.success(action === "approve" ? "User KYC approved!" : "User KYC rejected");
      setSelectedUser(null);
      setRejReason("");
      refetchUsers();
    } catch {
      toast.error("Action failed");
    }
  };

  const handleRunnerReview = (action: "approve" | "reject") => {
    if (!selectedRunner) return;
    reviewKyc.mutate({
      id: Number(selectedRunner.id),
      data: { action, rejectionReason: rejReason || undefined } as import("@workspace/api-client-react").KycReviewInput,
    }, {
      onSuccess: () => {
        toast.success(action === "approve" ? "Comrade KYC approved!" : "Comrade KYC rejected");
        setSelectedRunner(null);
        setRejReason("");
        refetchRunners();
      },
      onError: () => toast.error("Action failed"),
    });
  };

  const openUserDetail = async (user: UserType) => {
    setLoadingDetail(true);
    try {
      const data = await customFetch(`/api/admin/users/${user.id}/kyc`);
      setSelectedUser(data as UserWithKyc);
      setRejReason("");
    } catch {
      toast.error("Failed to load user details");
    }
    setLoadingDetail(false);
  };

  const getStatusBadge = (status?: string) => {
    if (status === "verified") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700"><BadgeCheck size={10} /> Verified</span>;
    if (status === "rejected") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700"><XCircle size={10} /> Rejected</span>;
    if (status === "pending") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700"><Clock size={10} /> Pending</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500"><AlertTriangle size={10} /> Not Started</span>;
  };

  // Pagination
  const pagedUsers = searchedUsers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pagedRunners = searchedRunners.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalItems = tab === "users" ? searchedUsers.length : searchedRunners.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const pendingCount = tab === "users"
    ? userList.filter(u => u.kycStatus === "pending").length
    : undefined;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-[#1A1A2E] flex items-center gap-2">
            <Shield size={24} /> KYC Review
          </h1>
          <p className="text-gray-500 text-sm mt-1">Review and approve identity verification for users and comrades</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-4">
          {KYC_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setStatusFilter("pending"); setPage(0); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t.key ? "bg-[#6C3FD4] text-white shadow-md" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
            >
              <t.icon size={15} />
              {t.label}
              {t.key === "users" && pendingCount != null && pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-white">{pendingCount}</span>
              )}
              {staleCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">{staleCount} overdue</span>
              )}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder="Search by name, phone, ID, or city..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4]/20 focus:border-[#6C3FD4] transition-all"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex gap-1.5 mb-5 bg-white p-1 rounded-xl border border-gray-200 w-fit">
          {STATUS_TABS.map(s => (
            <button
              key={s.key}
              onClick={() => { setStatusFilter(s.key); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s.key ? "bg-[#1A1A2E] text-white" : "text-gray-500 hover:bg-gray-100"}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "users" ? (
          <UserKycList
            users={pagedUsers}
            isLoading={usersLoading}
            statusFilter={statusFilter}
            onSelect={openUserDetail}
            getStatusBadge={getStatusBadge}
          />
        ) : (
          <RunnerKycList
            runners={pagedRunners}
            isLoading={runnersLoading}
            statusFilter={statusFilter}
            onSelect={(r) => { setSelectedRunner(r); setRejReason(""); }}
            getStatusBadge={getStatusBadge}
          />
        )}
        {/* A5: Stale KYC warning banner */}
        {statusFilter === "stale" && staleCount > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
            <AlertOctagon size={20} className="text-red-500 flex-shrink-0" />
            <div>
              <p className="text-red-700 text-sm font-bold">{staleCount} submission(s) pending for over 7 days</p>
              <p className="text-red-500 text-xs">These may need urgent admin attention to maintain trust scores.</p>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-500 font-semibold px-3">
              Page {page + 1} / {totalPages} · {totalItems} items
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next →
            </button>
          </div>
        )}

        {/* User KYC Detail Modal */}
        <AnimatePresence>
          {selectedUser && (
            <KycDetailModal
              type="user"
              user={selectedUser}
              rejReason={rejReason}
              setRejReason={setRejReason}
              loading={loadingDetail}
              onApprove={() => handleUserReview(selectedUser.id, "approve")}
              onReject={() => handleUserReview(selectedUser.id, "reject")}
              onClose={() => { setSelectedUser(null); setRejReason(""); }}
              isPending={false}
            />
          )}
        </AnimatePresence>

        {/* Runner KYC Detail Modal */}
        <AnimatePresence>
          {selectedRunner && (
            <KycDetailModal
              type="runner"
              runner={selectedRunner}
              rejReason={rejReason}
              setRejReason={setRejReason}
              onApprove={() => handleRunnerReview("approve")}
              onReject={() => handleRunnerReview("reject")}
              onClose={() => { setSelectedRunner(null); setRejReason(""); }}
              isPending={reviewKyc.isPending}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function UserKycList({ users, isLoading, statusFilter, onSelect, getStatusBadge }: {
  users: UserWithKyc[];
  isLoading: boolean;
  statusFilter: string;
  onSelect: (u: UserWithKyc) => void;
  getStatusBadge: (s?: string) => React.ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-48 bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <User size={40} className="mx-auto mb-3 opacity-40" />
        <p>No {statusFilter} user KYC submissions</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map(user => (
        <div key={user.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {getInitials(user.name ?? user.phone)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[#1A1A2E] truncate">{user.name ?? "Unnamed"}</h3>
              <p className="text-xs text-gray-500">{user.phone ?? ""}</p>
            </div>
            {getStatusBadge(user.kycStatus)}
          </div>
          <div className="space-y-1 text-xs text-gray-500 mb-4">
            {user.uniqueId && <p className="font-mono text-gray-400">ID: {user.uniqueId}</p>}
            {user.email && <p>{user.email}</p>}
            {user.city && <p>📍 {user.city}{user.area ? `, ${user.area}` : ""}</p>}
            {user.createdAt && <p>Joined: {new Date(user.createdAt).toLocaleDateString("en-IN")}</p>}
          </div>
          <button
            onClick={() => onSelect(user)}
            className="w-full py-2 rounded-xl bg-[#1A1A2E] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#2A2A4E] transition-colors"
          >
            <Eye size={14} /> Review KYC
          </button>
        </div>
      ))}
    </div>
  );
}

function RunnerKycList({ runners, isLoading, statusFilter, onSelect, getStatusBadge }: {
  runners: RunnerWithKyc[];
  isLoading: boolean;
  statusFilter: string;
  onSelect: (r: RunnerWithKyc) => void;
  getStatusBadge: (s?: string) => React.ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-48 bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (runners.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <PersonStanding size={40} className="mx-auto mb-3 opacity-40" />
        <p>No {statusFilter} comrade KYC submissions</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {runners.map(runner => (
        <div key={runner.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-[#6C3FD4] rounded-full flex items-center justify-center text-white font-bold text-lg">
              {getInitials(runner.name ?? runner.phone)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[#1A1A2E] truncate">{runner.name ?? runner.phone}</h3>
              <p className="text-xs text-gray-500">{runner.phone ?? ""}</p>
            </div>
            {getStatusBadge(runner.kycStatus)}
          </div>
          <div className="space-y-1 text-xs text-gray-500 mb-4">
            {runner.uniqueId && <p className="font-mono text-gray-400">ID: {runner.uniqueId}</p>}
            {runner.city && <p>📍 {runner.city}{runner.area ? `, ${runner.area}` : ""}</p>}
            {runner.rating != null && <p>⭐ {Number(runner.rating).toFixed(1)} · {runner.totalTasks} tasks</p>}
            {runner.createdAt && <p>Joined: {new Date(runner.createdAt).toLocaleDateString("en-IN")}</p>}
          </div>
          <button
            onClick={() => onSelect(runner)}
            className="w-full py-2 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}
          >
            <Eye size={14} /> Review KYC
          </button>
        </div>
      ))}
    </div>
  );
}

function KycDetailModal({ type, user, runner, rejReason, setRejReason, onApprove, onReject, onClose, isPending, loading }: {
  type: "user" | "runner";
  user?: UserWithKyc | null;
  runner?: RunnerWithKyc | null;
  rejReason: string;
  setRejReason: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
  isPending: boolean;
  loading?: boolean;
}) {
  const person = type === "user" ? user : runner;
  if (!person) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="fixed inset-4 md:inset-20 bg-white rounded-3xl z-50 overflow-y-auto shadow-2xl"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-black text-[#1A1A2E]">
              {type === "user" ? "User" : "Comrade"} KYC Review
            </h2>
            <p className="text-gray-500 text-sm">{person.name ?? person.phone}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="w-8 h-8 border-4 border-[#6C3FD4] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading documents...
          </div>
        ) : (
          <div className="p-6 grid md:grid-cols-2 gap-6">
            {/* Left: Personal Info */}
            <div>
              <h3 className="font-bold text-gray-700 mb-3">Personal Info</h3>
              <dl className="space-y-2 text-sm">
                {(type === "runner" ? [
                  ["Full Name", runner?.fullName ?? runner?.name ?? "—"],
                  ["Phone", runner?.phone ?? "—"],
                  ["Email", runner?.email ?? "—"],
                  ["City", runner?.city ?? "—"],
                  ["Area", runner?.area ?? "—"],
                  ["Trust Score", String(runner?.trustScore ?? "N/A")],
                ] : [
                  ["Full Name", user?.name ?? "—"],
                  ["Phone", user?.phone ?? "—"],
                  ["Email", user?.email ?? "—"],
                  ["City", user?.city ?? "—"],
                  ["Area", user?.area ?? "—"],
                ]).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="text-gray-400 w-28 flex-shrink-0">{k}:</dt>
                    <dd className="font-medium text-[#1A1A2E]">{v}</dd>
                  </div>
                ))}
              </dl>

              {/* Bank details (runners only) */}
              {type === "runner" && runner && (
                <>
                  <h3 className="font-bold text-gray-700 mt-5 mb-3">Bank Details</h3>
                  <dl className="space-y-2 text-sm">
                    {[
                      ["Account", runner.bankAccount ?? "—"],
                      ["IFSC", runner.bankIfsc ?? "—"],
                      ["Holder", runner.bankAccountHolder ?? "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="text-gray-400 w-28 flex-shrink-0">{k}:</dt>
                        <dd className="font-medium text-[#1A1A2E]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}

              {/* Emergency contact */}
              {type === "user" && user?.emergencyContact && (
                <>
                  <h3 className="font-bold text-gray-700 mt-5 mb-3">Emergency Contact</h3>
                  <p className="text-sm text-[#1A1A2E]">{user.emergencyContact}</p>
                </>
              )}
            </div>

            {/* Right: Documents */}
            <div>
              <h3 className="font-bold text-gray-700 mb-3">Documents</h3>
              <div className="space-y-3">
                {(type === "runner"
                  ? [
                      { label: "Aadhaar Front", src: runner?.aadhaarFront },
                      { label: "Aadhaar Back", src: runner?.aadhaarBack },
                      { label: "Selfie", src: (runner as Runner & { selfie?: string })?.selfie },
                    ]
                  : [
                      { label: "Aadhaar Front", src: user?.aadhaarFront },
                      { label: "Aadhaar Back", src: user?.aadhaarBack },
                      { label: "ID Document", src: user?.idDocumentUrl },
                    ]
                ).map((doc: { label: string; src?: string | null }) => (
                  <div key={doc.label}>
                    <p className="text-xs text-gray-500 mb-1">{doc.label}</p>
                    {doc.src ? (
                      <img src={doc.src} alt={doc.label} className="w-full max-h-40 object-cover rounded-xl border border-gray-200" />
                    ) : (
                      <div className="h-24 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                        Not uploaded
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-6 border-t border-gray-100 space-y-4 sticky bottom-0 bg-white">
          <input
            value={rejReason}
            onChange={e => setRejReason(e.target.value)}
            placeholder="Rejection reason (if rejecting)"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4]"
          />
          <div className="flex gap-3">
            <button
              onClick={onApprove}
              disabled={isPending || loading}
              className="flex-1 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}
            >
              <CheckCircle2 size={16} /> Approve KYC
            </button>
            <button
              onClick={onReject}
              disabled={isPending || loading}
              className="flex-1 py-3 rounded-xl text-white font-bold bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              <XCircle size={16} /> Reject
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
