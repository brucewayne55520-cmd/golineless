import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useGetAdminSettings, useUpdateAdminSettings } from "@workspace/api-client-react";
import type { AdminSettings } from "@workspace/api-client-react";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminSettings() {
  const { data: settings, isLoading, refetch } = useGetAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const [form, setForm] = useState<AdminSettings | null>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleSave = () => {
    if (!form) return;
    updateSettings.mutate({ data: form as import("@workspace/api-client-react").AdminSettingsUpdate }, {
      onSuccess: () => { toast.success("Settings saved!"); refetch(); },
      onError: () => toast.error("Failed to save"),
    });
  };

  const set = <K extends keyof AdminSettings>(key: K, val: AdminSettings[K]) => setForm((prev: AdminSettings | null) => ({ ...prev, [key]: val }));

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-[#1A1A2E]">Settings</h1>
        </div>

        {isLoading || !form ? (
          <div className="max-w-2xl space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="max-w-2xl space-y-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-bold text-[#1A1A2E] mb-4">App Info</h2>
              <div className="space-y-3">
                {[
                  { key: "appName" as const, label: "App Name" },
                  { key: "companyName" as const, label: "Company Name" },
                  { key: "supportPhone" as const, label: "Support Phone" },
                  { key: "supportEmail" as const, label: "Support Email" },
                  { key: "whatsappNumber" as const, label: "WhatsApp Number" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">{f.label}</label>
                    <input
                      value={form[f.key] ?? ""}
                      onChange={e => set(f.key, e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-bold text-[#1A1A2E] mb-4">Platform Settings</h2>
              <div className="space-y-3">
                {[
                  { key: "runnerPayoutPercent" as const, label: "Runner Payout %", type: "number" },
                  { key: "urgencySurcharge" as const, label: "Urgency Surcharge (Rs)", type: "number" },
                  { key: "cancellationFee" as const, label: "Cancellation Fee (Rs)", type: "number" },
                  { key: "maxTasksPerRunnerPerDay" as const, label: "Max Tasks/Runner/Day", type: "number" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">{f.label}</label>
                    <input
                      type={f.type}
                      value={form[f.key] ?? ""}
                      onChange={e => set(f.key, Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-bold text-[#1A1A2E] mb-4">Phase 6: Revenue Settings</h2>
              <div className="space-y-3">
                {[
                  { key: "freeWaitingMinutes" as const, label: "Free Waiting Minutes", type: "number" },
                  { key: "waitingChargePerMinute" as const, label: "Waiting Charge (Rs/min)", type: "number" },
                  { key: "priorityFeeAmount" as const, label: "Priority Fee (Rs)", type: "number" },
                  { key: "emergencyFeeAmount" as const, label: "Emergency Fee (Rs)", type: "number" },
                  { key: "urgencyNormalMultiplier" as const, label: "Urgency Normal Multiplier", type: "number", step: "0.01" },
                  { key: "urgencyUrgentMultiplier" as const, label: "Urgency Urgent Multiplier", type: "number", step: "0.01" },
                  { key: "urgencyEmergencyMultiplier" as const, label: "Urgency Emergency Multiplier", type: "number", step: "0.01" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">{f.label}</label>
                    <input
                      type={f.type}
                      step={f.step}
                      value={form[f.key] ?? ""}
                      onChange={e => set(f.key, Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-100">
              <h2 className="font-bold text-red-500 mb-4">Danger Zone</h2>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => set("maintenanceMode", !form.maintenanceMode)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${form.maintenanceMode ? "bg-red-500" : "bg-gray-200"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.maintenanceMode ? "translate-x-6" : "translate-x-0.5"}`} />
                </div>
                <div>
                  <span className="font-medium text-gray-700">Maintenance Mode</span>
                  {form.maintenanceMode && <p className="text-xs text-red-500">App is in maintenance mode. Users cannot book tasks.</p>}
                </div>
              </label>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
              <h2 className="font-bold text-blue-700 mb-4">UPI Configuration</h2>
              <p className="text-xs text-gray-500 mb-4">Configure the UPI ID shown to users for cash payments. Users will see this when paying via UPI QR code.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">UPI ID</label>
                  <input
                    value={form.upiId ?? "golineless@upi"}
                    onChange={e => set("upiId", e.target.value)}
                    placeholder="e.g. golineless@upi"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">This is your Google Pay / PhonePe / Paytm UPI ID</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Payee Name</label>
                  <input
                    value={form.upiPayeeName ?? "Go LineLess"}
                    onChange={e => set("upiPayeeName", e.target.value)}
                    placeholder="e.g. Go LineLess"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Name shown in UPI payment confirmation</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={updateSettings.isPending}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg"
              style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}
            >
              {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
