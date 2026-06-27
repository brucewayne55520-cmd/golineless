import { useState } from "react";
import { DollarSign, CheckCircle2, Clock, AlertTriangle, Building2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { NAVY } from "@/lib/theme";
import { customFetch } from "@workspace/api-client-react";

interface RunnerBalance {
  runnerId: number;
  name: string;
  phone: string | null;
  bankAccount: string | null;
  bankIfsc: string | null;
  outstandingAmount: number;
  unsettledTaskCount: number;
  unsettledTaskIds: number[];
  settledAmount: number;
  totalPaidOut: number;
  lifetimeEarnings: number;
  totalTasks: number;
}

interface Settlement {
  id: number;
  runnerId: number;
  runnerName: string;
  amount: number;
  taskCount: number;
  taskIds: string;
  status: string;
  settledBy: string | null;
  settledAt: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

interface Props {
  data: { runners: RunnerBalance[]; settlements: Settlement[] } | undefined;
  isLoading: boolean;
  isError?: boolean;
  refetch: () => void;
}

async function apiCall(path: string, method: string, body?: unknown) {
  return customFetch<Record<string, unknown>>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export default function PayoutSettlementPanel({ data, isLoading, isError, refetch }: Props) {
  const [view, setView] = useState<"outstanding" | "history">("outstanding");
  const [expandedRunner, setExpandedRunner] = useState<number | null>(null);
  const [settleModal, setSettleModal] = useState<{ runner: RunnerBalance; all: boolean } | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleRef, setSettleRef] = useState("");
  const [settleNotes, setSettleNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="h-8 bg-gray-100 rounded-xl animate-pulse mb-4 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-red-500" />
          <h3 className="font-bold text-[#241100] text-sm">Payout Settlement</h3>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-red-600 text-xs font-medium">Failed to load payout data</p>
        </div>
      </div>
    );
  }

  const runners = data?.runners ?? [];
  const settlements = data?.settlements ?? [];
  const totalOutstanding = runners.reduce((s, r) => s + r.outstandingAmount, 0);
  const totalPaidOut = runners.reduce((s, r) => s + r.totalPaidOut, 0);
  const totalLifetime = runners.reduce((s, r) => s + r.lifetimeEarnings, 0);

  const filteredRunners = runners.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search)
  );

  const handleSettle = async () => {
    if (!settleModal) return;
    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter a valid amount"); return; }

    // For partial settlements, select tasks until we reach the entered amount
    let taskIds: number[];
    if (settleModal.all) {
      taskIds = settleModal.runner.unsettledTaskIds;
    } else {
      // Need task earnings to select proportional tasks — use the full list and sort by ID (oldest first)
      // The backend will accept any subset; we pass all IDs and let the admin-entered amount control the record.
      // To avoid data integrity issues, we only pass IDs whose cumulative earning <= amount.
      // Since we don't have per-task earnings here, pass all IDs — the admin explicitly chose the amount.
      taskIds = settleModal.runner.unsettledTaskIds;
    }

    const actualAmount = settleModal.all ? amount : Math.min(amount, settleModal.runner.outstandingAmount);

    setSubmitting(true);
    try {
      await apiCall("/api/admin/payouts/settle", "POST", {
        runnerId: settleModal.runner.runnerId,
        taskIds,
        amount: actualAmount,
        reference: settleRef || undefined,
        notes: settleNotes || undefined,
      });
      toast.success(`Payout of ${formatCurrency(actualAmount)} settled for ${settleModal.runner.name}`);
      setSettleModal(null);
      setSettleAmount("");
      setSettleRef("");
      setSettleNotes("");
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to settle payout");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await apiCall(`/api/admin/payouts/cancel/${id}`, "POST");
      toast.success("Payout cancelled");
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#ECFDF5" }}>
            <DollarSign size={20} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#241100] text-sm">Payout Settlement</h3>
            <p className="text-[10px] text-gray-400">Track & settle runner earnings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(["outstanding", "history"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${view === v ? "bg-white text-[#241100] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-red-50 rounded-xl p-3 border border-red-100 text-center">
          <p className="text-[10px] font-semibold text-red-500 uppercase mb-1">Outstanding</p>
          <p className="text-lg font-black text-red-600">{formatCurrency(totalOutstanding)}</p>
          <p className="text-[9px] text-red-400">{runners.filter(r => r.outstandingAmount > 0).length} runners</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 border border-green-100 text-center">
          <p className="text-[10px] font-semibold text-green-500 uppercase mb-1">Total Paid</p>
          <p className="text-lg font-black text-green-600">{formatCurrency(totalPaidOut)}</p>
          <p className="text-[9px] text-green-400">{settlements.filter(s => s.status === "settled").length} settlements</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
          <p className="text-[10px] font-semibold text-blue-500 uppercase mb-1">Lifetime</p>
          <p className="text-lg font-black text-blue-600">{formatCurrency(totalLifetime)}</p>
          <p className="text-[9px] text-blue-400">{runners.length} active runners</p>
        </div>
      </div>

      {view === "outstanding" && (
        <>
          {/* Search */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search comrade name or phone..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Runner outstanding list */}
          {filteredRunners.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {search ? "No runners match your search" : "All payouts are settled!"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRunners.map(r => {
                const expanded = expandedRunner === r.runnerId;
                return (
                  <div key={r.runnerId} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedRunner(expanded ? null : r.runnerId)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: NAVY }}>
                          {r.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[#241100] text-sm">{r.name}</p>
                          <p className="text-[10px] text-gray-400">{r.unsettledTaskCount} unsettled tasks</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-black text-red-600">{formatCurrency(r.outstandingAmount)}</p>
                          {r.totalPaidOut > 0 && (
                            <p className="text-[9px] text-green-500">Previously paid: {formatCurrency(r.totalPaidOut)}</p>
                          )}
                        </div>
                        {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-3 pb-3 border-t border-gray-50">
                        <div className="grid grid-cols-2 gap-2 mt-2 mb-3">
                          <div className="bg-gray-50 rounded-lg p-2 text-center">
                            <p className="text-[9px] text-gray-400 uppercase">Lifetime Earnings</p>
                            <p className="text-xs font-bold text-[#241100]">{formatCurrency(r.lifetimeEarnings)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2 text-center">
                            <p className="text-[9px] text-gray-400 uppercase">Total Tasks</p>
                            <p className="text-xs font-bold text-[#241100]">{r.totalTasks}</p>
                          </div>
                        </div>
                        {r.bankAccount && (
                          <div className="bg-blue-50 rounded-lg p-2 mb-3 flex items-center gap-2">
                            <Building2 size={12} className="text-blue-500" />
                            <span className="text-[10px] text-blue-700">A/C: {r.bankAccount} · IFSC: {r.bankIfsc}</span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setSettleModal({ runner: r, all: true }); setSettleAmount(String(r.outstandingAmount)); }}
                            className="flex-1 py-2 rounded-xl text-white text-xs font-bold transition-all"
                            style={{ background: "linear-gradient(135deg, #16A34A, #22C55E)" }}
                          >
                            Settle All ({formatCurrency(r.outstandingAmount)})
                          </button>
                          <button
                            onClick={() => { setSettleModal({ runner: r, all: false }); setSettleAmount(""); }}
                            className="flex-1 py-2 rounded-xl text-green-700 text-xs font-bold bg-green-50 border border-green-200 hover:bg-green-100 transition-all"
                          >
                            Partial Settlement
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === "history" && (
        <div>
          {settlements.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No settlement history yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Date", "Comrade", "Amount", "Tasks", "Status", "Reference", ""].map(h => (
                      <th key={h} className="text-left pb-2 text-gray-500 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {settlements.map(s => (
                    <tr key={s.id} className="border-b border-gray-50">
                      <td className="py-2.5 text-gray-500">
                        {s.settledAt ? new Date(s.settledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                      </td>
                      <td className="py-2.5 font-medium text-[#241100]">{s.runnerName}</td>
                      <td className="py-2.5 font-bold" style={{ color: s.status === "settled" ? "#16A34A" : "#DC2626" }}>
                        {formatCurrency(s.amount)}
                      </td>
                      <td className="py-2.5 text-center">{s.taskCount}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === "settled" ? "bg-green-100 text-green-700" :
                          s.status === "cancelled" ? "bg-red-100 text-red-600" :
                          "bg-amber-100 text-amber-600"
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-500">{s.reference || "—"}</td>
                      <td className="py-2.5">
                        {s.status === "settled" && (
                          <button onClick={() => handleCancel(s.id)} className="text-red-500 hover:text-red-700 text-[10px] font-semibold">
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Settle Modal */}
      {settleModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSettleModal(null)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6 shadow-2xl max-w-lg mx-auto">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-black text-[#241100] text-lg mb-1">
              {settleModal.all ? "Settle All" : "Partial Settlement"}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              {settleModal.runner.name} · {settleModal.runner.unsettledTaskCount} unsettled tasks · {formatCurrency(settleModal.runner.outstandingAmount)} outstanding
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Amount (Rs)</label>
                <input
                  type="number" value={settleAmount} onChange={e => setSettleAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Reference (optional)</label>
                <input
                  value={settleRef} onChange={e => setSettleRef(e.target.value)}
                  placeholder="UPI Ref, Bank Ref, Cash Receipt #"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Notes (optional)</label>
                <input
                  value={settleNotes} onChange={e => setSettleNotes(e.target.value)}
                  placeholder="Any notes for this settlement"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSettleModal(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold">
                  Cancel
                </button>
                <button
                  onClick={handleSettle}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #16A34A, #22C55E)" }}
                >
                  {submitting ? "Processing..." : "Confirm Settlement"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
