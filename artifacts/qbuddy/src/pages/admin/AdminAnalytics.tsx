import { useState } from "react";
import { Star } from "lucide-react";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useGetAnalytics } from "@workspace/api-client-react";
import AdminSidebar from "@/components/AdminSidebar";
import { CATEGORY_NAMES, formatCurrency } from "@/lib/utils";

export default function AdminAnalytics() {
  const [days, setDays] = useState("30");
  const { data, isLoading } = useGetAnalytics({ params: { days } } as any);
  const d = data as any;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black text-[#1A1A2E]">Analytics</h1>
          </div>
          <select value={days} onChange={e => setDays(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
            {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>Last {d} days</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 md:col-span-2">
              <h3 className="font-bold text-[#1A1A2E] mb-4">Daily Tasks & GMV</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={d?.dailyStats ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="left" type="monotone" dataKey="tasks" stroke="#6C3FD4" strokeWidth={2} dot={false} name="Tasks" />
                  <Line yAxisId="right" type="monotone" dataKey="gmv" stroke="#FF6B35" strokeWidth={2} dot={false} name="GMV (Rs)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-[#1A1A2E] mb-4">Tasks by Category</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(d?.categoryBreakdown ?? []).map((c: any) => ({ ...c, name: CATEGORY_NAMES[c.category] ?? c.category }))} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="tasks" fill="#6C3FD4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-[#1A1A2E] mb-4">Hourly Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={d?.hourlyDistribution ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9 }} tickFormatter={v => `${v}h`} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="tasks" fill="#6C3FD4" fillOpacity={0.2} stroke="#6C3FD4" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-[#1A1A2E] mb-4">User Growth</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={d?.userGrowth ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="total" fill="#FF6B35" fillOpacity={0.2} stroke="#FF6B35" strokeWidth={2} name="Users" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {d?.runnerPerformance?.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-[#1A1A2E] mb-4">Runner Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-gray-100">{["Runner", "Tasks", "Earnings", "Rating"].map(h => <th key={h} className="text-left pb-2 text-gray-500">{h}</th>)}</tr></thead>
                    <tbody>{d.runnerPerformance.map((r: any) => (
                      <tr key={r.runnerId} className="border-b border-gray-50">
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
            )}
          </div>
        )}
      </main>
    </div>
  );
}
