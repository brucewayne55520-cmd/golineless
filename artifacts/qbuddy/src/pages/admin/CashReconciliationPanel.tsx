import { useState } from "react";
import { Banknote, TrendingUp, TrendingDown, CheckCircle2, Clock, AlertTriangle, Download, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from "recharts";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { NAVY, GOLD } from "@/lib/theme";

interface DailyBreakdown {
  date: string;
  cashCollected: number;
  cashPending: number;
  onlineCollected: number;
  runnerPayouts: number;
  platformFees: number;
  cashTasks: number;
  onlineTasks: number;
  totalTasks: number;
}

interface RunnerReconciliation {
  runnerId: number;
  name: string;
  cashTasksCollected: number;
  cashCollected: number;
  runnerPayout: number;
  totalTasks: number;
  totalEarnings: number;
}

interface ReconciliationSummary {
  totalCashCollected: number;
  totalCashPending: number;
  totalOnlineCollected: number;
  totalOnlinePending: number;
  cashRunnerPayouts: number;
  onlineRunnerPayouts: number;
  pendingRunnerPayouts: number;
  cashPlatformFees: number;
  onlinePlatformFees: number;
  totalCashTasks: number;
  totalOnlineTasks: number;
  cashConfirmedCount: number;
  cashPendingCount: number;
}

interface Props {
  data: {
    summary: ReconciliationSummary;
    dailyBreakdown: DailyBreakdown[];
    runnerReconciliation: RunnerReconciliation[];
  } | undefined;
  isLoading: boolean;
  isError?: boolean;
}

// --- Export Helpers ---

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportCsv(data: NonNullable<Props["data"]>) {
  const { summary: s, dailyBreakdown, runnerReconciliation } = data;
  const rows: string[][] = [];

  rows.push(["Go LineLess — Cash Reconciliation Report"]);
  rows.push(["Generated", new Date().toLocaleString("en-IN")]);
  rows.push([]);
  rows.push(["Category", "Amount (Rs)", "Count"]);
  rows.push(["Total Cash Collected", String(s.totalCashCollected), String(s.cashConfirmedCount)]);
  rows.push(["Cash Pending", String(s.totalCashPending), String(s.cashPendingCount)]);
  rows.push(["Online Collected", String(s.totalOnlineCollected), String(s.totalOnlineTasks)]);
  rows.push(["Cash Runner Payouts", String(s.cashRunnerPayouts), ""]);
  rows.push(["Online Runner Payouts", String(s.onlineRunnerPayouts), ""]);
  rows.push(["Pending Runner Payouts", String(s.pendingRunnerPayouts), ""]);
  rows.push(["Cash Platform Fees", String(s.cashPlatformFees), ""]);
  rows.push(["Online Platform Fees", String(s.onlinePlatformFees), ""]);
  rows.push(["Net Cash Balance", String(s.totalCashCollected - s.cashRunnerPayouts - s.cashPlatformFees), ""]);
  rows.push([]);
  rows.push(["Daily Breakdown"]);
  rows.push(["Date", "Cash Collected", "Cash Pending", "Online Collected", "Runner Payouts", "Platform Fees", "Cash Tasks", "Online Tasks", "Total Tasks"]);
  for (const d of dailyBreakdown) {
    rows.push([d.date, String(d.cashCollected), String(d.cashPending), String(d.onlineCollected), String(d.runnerPayouts), String(d.platformFees), String(d.cashTasks), String(d.onlineTasks), String(d.totalTasks)]);
  }
  rows.push([]);
  rows.push(["Per-Runner Reconciliation"]);
  rows.push(["Comrade", "Runner ID", "Cash Tasks", "Cash Collected", "Runner Payout", "All Tasks", "Total Earnings"]);
  for (const r of runnerReconciliation) {
    rows.push([r.name, String(r.runnerId), String(r.cashTasksCollected), String(r.cashCollected), String(r.runnerPayout), String(r.totalTasks), String(r.totalEarnings)]);
  }

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(csv, `reconciliation-${date}.csv`, "text/csv;charset=utf-8;");
  toast.success("CSV report downloaded");
}

async function exportPdf(data: NonNullable<Props["data"]>) {
  const { default: jsPDFModule } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable") as unknown as { default: (doc: InstanceType<typeof jsPDFModule>, options: Record<string, unknown>) => { finalY?: number } };
  const autoTable = autoTableModule.default;

  const doc = new jsPDFModule();
  const s = data.summary;
  const date = new Date().toLocaleString("en-IN");
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Go LineLess — Cash Reconciliation Report", 14, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${date}`, 14, 28);

  // Summary table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 14, 40);

  const summaryResult = autoTable(doc, {
    startY: 44,
    head: [["Category", "Amount (Rs)", "Count"]],
    body: [
      ["Total Cash Collected", `Rs ${s.totalCashCollected}`, String(s.cashConfirmedCount)],
      ["Cash Pending", `Rs ${s.totalCashPending}`, String(s.cashPendingCount)],
      ["Online Collected", `Rs ${s.totalOnlineCollected}`, String(s.totalOnlineTasks)],
      ["Cash Runner Payouts", `Rs ${s.cashRunnerPayouts}`, ""],
      ["Online Runner Payouts", `Rs ${s.onlineRunnerPayouts}`, ""],
      ["Pending Runner Payouts", `Rs ${s.pendingRunnerPayouts}`, ""],
      ["Cash Platform Fees", `Rs ${s.cashPlatformFees}`, ""],
      ["Online Platform Fees", `Rs ${s.onlinePlatformFees}`, ""],
      ["Net Cash Balance", `Rs ${s.totalCashCollected - s.cashRunnerPayouts - s.cashPlatformFees}`, ""],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [15, 37, 87] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });
  let yPos = summaryResult?.finalY ?? 120;

  // Daily breakdown
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Daily Breakdown", 14, yPos);
  yPos += 4;

  if (data.dailyBreakdown.length > 0) {
    const dailyResult = autoTable(doc, {
      startY: yPos,
      head: [["Date", "Cash Collected", "Cash Pending", "Online", "Runner Payouts", "Platform Fees", "Tasks"]],
      body: data.dailyBreakdown.map(d => [
        d.date, `Rs ${d.cashCollected}`, `Rs ${d.cashPending}`, `Rs ${d.onlineCollected}`,
        `Rs ${d.runnerPayouts}`, `Rs ${d.platformFees}`, String(d.totalTasks),
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [15, 37, 87] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 },
    });
    yPos = dailyResult?.finalY ?? yPos;
  }

  // Runner reconciliation
  yPos += 10;
  if (yPos > 240) { doc.addPage(); yPos = 20; }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Per-Runner Reconciliation", 14, yPos);
  yPos += 4;

  if (data.runnerReconciliation.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [["Comrade", "Cash Tasks", "Cash Collected", "Runner Payout", "All Tasks", "Total Earnings"]],
      body: data.runnerReconciliation.map(r => [
        r.name, String(r.cashTasksCollected), `Rs ${r.cashCollected}`,
        `Rs ${r.runnerPayout}`, String(r.totalTasks), `Rs ${r.totalEarnings}`,
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [15, 37, 87] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text(
      `Go LineLess · Reconciliation Report · Page ${i} of ${totalPages}`,
      pageWidth / 2, doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  doc.save(`reconciliation-${new Date().toISOString().slice(0, 10)}.pdf`);
  toast.success("PDF report downloaded");
}

// --- Component ---

export default function CashReconciliationPanel({ data, isLoading, isError }: Props) {
  const [view, setView] = useState<"overview" | "daily" | "runners">("overview");
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const s = data?.summary;
  const daily = data?.dailyBreakdown ?? [];
  const runners = data?.runnerReconciliation ?? [];

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="h-8 bg-gray-100 rounded-xl animate-pulse mb-4 w-48" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-red-500" />
          <h3 className="font-bold text-[#241100] text-sm">Cash Reconciliation</h3>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-red-600 text-xs font-medium">Failed to load reconciliation data</p>
          <p className="text-red-400 text-[10px] mt-1">Please try again later</p>
        </div>
      </div>
    );
  }

  if (!s) return null;

  const totalTasks = (s.totalCashTasks ?? 0) + (s.totalOnlineTasks ?? 0);
  if (totalTasks === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FEF3C7" }}>
            <Banknote size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#241100] text-sm">Cash Reconciliation</h3>
            <p className="text-[10px] text-gray-400">Offline payment tracking & payouts</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <Banknote size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm font-medium">No transactions yet</p>
          <p className="text-gray-400 text-[10px] mt-1">Cash payments will appear here once tasks are completed</p>
        </div>
      </div>
    );
  }

  const netCashBalance = s.totalCashCollected - s.cashRunnerPayouts - s.cashPlatformFees;
  const collectionRate = s.totalCashTasks > 0 ? Math.round((s.cashConfirmedCount / s.totalCashTasks) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FEF3C7" }}>
            <Banknote size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#241100] text-sm">Cash Reconciliation</h3>
            <p className="text-[10px] text-gray-400">Offline payment tracking & payouts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(["overview", "daily", "runners"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${view === v ? "bg-white text-[#241100] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {v}
              </button>
            ))}
          </div>
          {data && (
            <div className="flex gap-1">
              <button
                onClick={() => { setExporting("csv"); try { exportCsv(data); } finally { setExporting(null); } }}
                disabled={exporting !== null}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-[#241100] transition-all disabled:opacity-50"
                title="Download CSV"
              >
                <Download size={12} /> CSV
              </button>
              <button
                onClick={() => { setExporting("pdf"); exportPdf(data).finally(() => setExporting(null)); }}
                disabled={exporting !== null}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-[#241100] transition-all disabled:opacity-50"
                title="Download PDF"
              >
                <FileText size={12} /> PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-green-50 rounded-xl p-3 border border-green-100">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 size={12} className="text-green-600" />
            <span className="text-[10px] font-semibold text-green-600">Cash Collected</span>
          </div>
          <p className="text-lg font-black text-green-700">{formatCurrency(s.totalCashCollected)}</p>
          <p className="text-[10px] text-green-600 mt-0.5">{s.cashConfirmedCount} tasks confirmed</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={12} className="text-amber-600" />
            <span className="text-[10px] font-semibold text-amber-600">Cash Pending</span>
          </div>
          <p className="text-lg font-black text-amber-700">{formatCurrency(s.totalCashPending)}</p>
          <p className="text-[10px] text-amber-600 mt-0.5">{s.cashPendingCount} awaiting confirmation</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-blue-600" />
            <span className="text-[10px] font-semibold text-blue-600">Online Collected</span>
          </div>
          <p className="text-lg font-black text-blue-700">{formatCurrency(s.totalOnlineCollected)}</p>
          <p className="text-[10px] text-blue-600 mt-0.5">{s.totalOnlineTasks} tasks via gateway</p>
        </div>
        <div className="rounded-xl p-3 border" style={{ background: "#F3F0FF", borderColor: "#E0D4FC" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={12} className="text-purple-600" />
            <span className="text-[10px] font-semibold text-purple-600">Net Cash Balance</span>
          </div>
          <p className="text-lg font-black" style={{ color: netCashBalance >= 0 ? "#16A34A" : "#DC2626" }}>
            {formatCurrency(netCashBalance)}
          </p>
          <p className="text-[10px] text-purple-600 mt-0.5">After payouts & fees</p>
        </div>
      </div>

      {/* Collection rate bar */}
      <div className="mb-4 bg-gray-50 rounded-xl p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-gray-500">Cash Collection Rate</span>
          <span className="text-xs font-bold" style={{ color: collectionRate >= 80 ? "#16A34A" : collectionRate >= 50 ? "#D97706" : "#DC2626" }}>
            {collectionRate}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${collectionRate}%`, background: collectionRate >= 80 ? "linear-gradient(90deg, #22C55E, #16A34A)" : collectionRate >= 50 ? "linear-gradient(90deg, #F59E0B, #D97706)" : "linear-gradient(90deg, #EF4444, #DC2626)" }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-gray-400">{s.cashConfirmedCount} confirmed / {s.totalCashTasks} total cash</span>
          <span className="text-[9px] text-gray-400">{s.cashPendingCount} pending</span>
        </div>
      </div>

      {/* Payout Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white border border-gray-100 rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Cash Runner Payouts</p>
          <p className="text-sm font-black text-[#241100]">{formatCurrency(s.cashRunnerPayouts)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Online Runner Payouts</p>
          <p className="text-sm font-black text-[#241100]">{formatCurrency(s.onlineRunnerPayouts)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Platform Fees (Cash)</p>
          <p className="text-sm font-black" style={{ color: GOLD }}>{formatCurrency(s.cashPlatformFees)}</p>
        </div>
      </div>

      {/* Views */}
      {view === "daily" && daily.length > 0 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-[#241100] mb-3">Daily Cash vs Online Collections</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11 }} formatter={(val: number) => formatCurrency(val)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="cashCollected" fill="#16A34A" radius={[4, 4, 0, 0]} name="Cash Collected" />
                <Bar dataKey="cashPending" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Cash Pending" />
                <Bar dataKey="onlineCollected" fill="#6C3FD4" radius={[4, 4, 0, 0]} name="Online" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#241100] mb-3">Runner Payouts vs Platform Fees</h4>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11 }} formatter={(val: number) => formatCurrency(val)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="runnerPayouts" stroke="#DC2626" strokeWidth={2} dot={false} name="Runner Payouts" />
                <Line type="monotone" dataKey="platformFees" stroke={GOLD} strokeWidth={2} dot={false} name="Platform Fees" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {view === "runners" && (
        <div>
          <h4 className="text-xs font-bold text-[#241100] mb-3">Per-Runner Cash Reconciliation</h4>
          {runners.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No cash payments confirmed yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Comrade", "Cash Tasks", "Cash Collected", "Runner Payout", "All Tasks", "Total Earnings"].map(h => (
                      <th key={h} className="text-left pb-2 text-gray-500 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {runners.map(r => (
                    <tr key={r.runnerId} className="border-b border-gray-50">
                      <td className="py-2.5 font-medium text-[#241100]">{r.name}</td>
                      <td className="py-2.5 text-center">
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">{r.cashTasksCollected}</span>
                      </td>
                      <td className="py-2.5 font-bold text-green-700">{formatCurrency(r.cashCollected)}</td>
                      <td className="py-2.5 font-bold text-red-600">{formatCurrency(r.runnerPayout)}</td>
                      <td className="py-2.5">{r.totalTasks}</td>
                      <td className="py-2.5 font-bold" style={{ color: NAVY }}>{formatCurrency(r.totalEarnings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {view === "overview" && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-700">Offline Payment Reconciliation</p>
            <p className="text-[10px] text-amber-600 mt-0.5">
              {s.cashPendingCount > 0
                ? `${s.cashPendingCount} cash task(s) totaling ${formatCurrency(s.totalCashPending)} awaiting runner confirmation. Runners confirm cash receipt from the Active Task screen.`
                : "All cash payments have been confirmed by runners. Great job!"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
