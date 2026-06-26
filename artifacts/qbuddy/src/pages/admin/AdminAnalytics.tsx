import { useState } from "react";
import { Star } from "lucide-react";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useGetAnalytics } from "@workspace/api-client-react";
import AdminSidebar from "@/components/AdminSidebar";
import { CATEGORY_NAMES, formatCurrency } from "@/lib/utils";

export default function AdminAnalytics() {
  const [days, setDays] = useState("30");
  const { data, isLoading } = useGetAnalytics({ days: Number(days) });
  const d = data as Exclude<typeof data, undefined>;

  return (
    <div className="flex min-h-screen gl-surface dark:bg-[#0A0E1A]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#0A1628] dark:text-[#F5F0E8]">Analytics</h1>
          </div>
          <select value={days} onChange={e => setDays(e.target.value)} className="border border-[#E5E0D8] dark:border-[#374151] rounded-xl px-3 py-2 text-sm focus:outline-none bg-white dark:bg-[#1F2937] dark:text-[#F5F0E8] gl-transition">
            {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>Last {d} days</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-[#E5E0D8] rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 gl-shadow-md border border-[#E5E0D8] dark:border-[#1F2937] md:col-span-2">
              <h3 className="font-bold text-[#0A1628] dark:text-[#F5F0E8] mb-4">Daily Tasks & GMV</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={d?.dailyStats ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="left" type="monotone" dataKey="tasks" stroke="#0A1628" strokeWidth={2} dot={false} name="Tasks" />
                  <Line yAxisId="right" type="monotone" dataKey="gmv" stroke="#D4A843" strokeWidth={2} dot={false} name="GMV (Rs)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 gl-shadow-md border border-[#E5E0D8] dark:border-[#1F2937]">
              <h3 className="font-bold text-[#0A1628] dark:text-[#F5F0E8] mb-4">Tasks by Category</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(d?.categoryBreakdown ?? []).map((c: import("@workspace/api-client-react").CategoryStat) => ({ ...c, name: CATEGORY_NAMES[c.category] ?? c.category }))} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="tasks" fill="#0A1628" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 gl-shadow-md border border-[#E5E0D8] dark:border-[#1F2937]">
              <h3 className="font-bold text-[#0A1628] dark:text-[#F5F0E8] mb-4">Hourly Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={d?.hourlyDistribution ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9 }} tickFormatter={v => `${v}h`} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="tasks" fill="#0A1628" fillOpacity={0.15} stroke="#0A1628" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 gl-shadow-md border border-[#E5E0D8] dark:border-[#1F2937]">
              <h3 className="font-bold text-[#0A1628] dark:text-[#F5F0E8] mb-4">User Growth</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={d?.userGrowth ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="total" fill="#D4A843" fillOpacity={0.2} stroke="#D4A843" strokeWidth={2} name="Users" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {d?.runnerPerformance?.length > 0 && (
              <>
              {/* M5: Runner Earnings Chart */}
              <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 gl-shadow-md border border-[#E5E0D8] dark:border-[#1F2937] md:col-span-2">
                <h3 className="font-bold text-[#0A1628] dark:text-[#F5F0E8] mb-4">Runner Earnings Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={d.runnerPerformance.map((r: import("@workspace/api-client-react").RunnerPerformance) => ({ name: r.name?.slice(0, 12) ?? `#${r.runnerId}`, earnings: Number(r.earnings) || 0, tasks: r.tasks || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D8" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 9 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: number, n: string) => n === "earnings" ? `Rs ${v.toLocaleString()}` : v} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="earnings" fill="#0A1628" radius={[4, 4, 0, 0]} name="Earnings (Rs)" />
                    <Bar yAxisId="right" dataKey="tasks" fill="#D4A843" radius={[4, 4, 0, 0]} name="Tasks" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 gl-shadow-md border border-[#E5E0D8] dark:border-[#1F2937]">
                <h3 className="font-bold text-[#0A1628] dark:text-[#F5F0E8] mb-4">Runner Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-[#E5E0D8] dark:border-[#1F2937]">{["Runner", "Tasks", "Earnings", "Rating"].map(h => <th key={h} className="text-left pb-2 text-[#6B7280]">{h}</th>)}</tr></thead>
                    <tbody>{d.runnerPerformance.map((r: import("@workspace/api-client-react").RunnerPerformance) => (
                      <tr key={r.runnerId} className="border-b border-[#F3F4F6] dark:border-[#1F2937]">
                        <td className="py-2 font-medium">{r.name}</td>
                        <td className="py-2">{r.tasks}</td>
                        <td className="py-2">{formatCurrency(r.earnings)}</td>
                        <td className="py-2">
                          {r.rating ? (
                            <span className="flex items-center gap-1">
                              <Star size={10} className="text-yellow-400" /> {Number(r.rating).toFixed(1)}
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
