import { useListAdminUsers } from "@workspace/api-client-react";
import AdminSidebar from "@/components/AdminSidebar";
import { getInitials } from "@/lib/utils";

export default function AdminUsers() {
  const { data: users, isLoading } = useListAdminUsers();
  const list = (users as any[]) ?? [];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-[#1A1A2E]">Users</h1>
          <p className="text-gray-500 text-sm">{list.length} registered users</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["User", "Phone", "City", "Joined"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 4 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : list.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-gray-400">No users yet</td></tr>
              ) : (
                list.map((user: any) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#6C3FD4] rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {getInitials(user.name)}
                        </div>
                        <span className="font-medium text-[#1A1A2E]">{user.name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{user.phone}</td>
                    <td className="px-4 py-3 text-gray-500">{user.city ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(user.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
