import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, CheckCircle2, AlertCircle, Phone, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useGetTask } from "@workspace/api-client-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { StatusBadge } from "@/components/StatusBadge";
import { CATEGORY_NAMES, formatCurrency } from "@/lib/utils";
import { DARK, DARK_GRAD } from "@/lib/theme";

interface Props {
  id: string;
}

export default function PayRetry({ id }: Props) {
  const [, navigate] = useLocation();
  const taskId = Number(id);
  const { data: task, isLoading, isError } = useGetTask(taskId, { query: { queryKey: ["task", taskId], retry: 1 } });

  const t = task;
  const taskPrice = t?.price ?? 0;
  const isPaid = t?.paymentStatus === "paid";
  const isCompleted = t?.status === "completed";
  const isCancelled = t?.status === "cancelled";
  const totalDue = taskPrice + Number(t?.waitingChargeAmount || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <button onClick={() => navigate(`/app/tasks/${taskId}`)} className="text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900">Payment</h1>
          <p className="text-xs text-gray-400">Task #{taskId}</p>
        </div>
        {t && (
          <div style={{ color: DARK }}>
            <CategoryIcon category={t.category} size={22} />
          </div>
        )}
      </div>

      <div className="px-4 pt-6 pb-24">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: `${DARK}40`, borderTopColor: DARK }} />
              <p className="text-gray-400 text-sm">Loading task...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100 mt-8">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-red-400" />
            </div>
            <h2 className="text-lg font-black text-gray-900 mb-1">Task not found</h2>
            <p className="text-sm text-gray-500 mb-6">This task doesn't exist or you don't have access to it.</p>
            <button onClick={() => navigate("/app/tasks")} className="w-full py-3 rounded-2xl text-white font-bold" style={{ background: DARK_GRAD }}>
              Go to My Tasks
            </button>
          </div>
        )}

        {/* Already paid / completed */}
        {t && !isLoading && (isPaid || isCompleted) && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100 mt-8">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-green-500" />
            </div>
            <h2 className="text-lg font-black text-gray-900 mb-1">{isPaid ? "Already Paid" : "Task Completed"}</h2>
            <p className="text-sm text-gray-500 mb-6">
              {isPaid ? "This task has already been paid for. No further action needed." : "This task has been completed. Payment was handled during completion."}
            </p>
            <button onClick={() => navigate(`/app/tasks/${taskId}`)} className="w-full py-3 rounded-2xl text-white font-bold" style={{ background: DARK_GRAD }}>
              View Task Details
            </button>
          </div>
        )}

        {/* Cancelled tasks */}
        {t && !isLoading && isCancelled && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100 mt-8">
            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-gray-400" />
            </div>
            <h2 className="text-lg font-black text-gray-900 mb-1">Task Cancelled</h2>
            <p className="text-sm text-gray-500 mb-6">This task has been cancelled. Payment is not required.</p>
            <button onClick={() => navigate("/app/tasks")} className="w-full py-3 rounded-2xl text-white font-bold" style={{ background: DARK_GRAD }}>
              Go to My Tasks
            </button>
          </div>
        )}

        {/* Payment card — active (cash on completion) */}
        {t && !isLoading && !isPaid && !isCompleted && !isCancelled && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Task Summary */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#EEF2FA", color: DARK }}>
                  <CategoryIcon category={t.category} size={22} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900">{CATEGORY_NAMES[t.category] || t.category}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StatusBadge status={t.status} />
                    {t.locationArea && <span className="text-xs text-gray-400">· {t.locationArea}</span>}
                  </div>
                </div>
              </div>
              {t.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{t.description}</p>}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Task Price</span>
                  <span className="text-gray-700">{formatCurrency(taskPrice)}</span>
                </div>
                {(Number(t.waitingChargeAmount) || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Waiting Charges ({t.totalWaitingMinutes} min)</span>
                    <span className="text-amber-600">+{formatCurrency(t.waitingChargeAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="font-bold text-gray-900">Total Due</span>
                  <span className="font-black text-lg" style={{ color: DARK }}>{formatCurrency(totalDue)}</span>
                </div>
              </div>
            </div>

            {/* Cash payment info */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard size={18} /> Payment Method
              </h3>
              <div className="p-4 rounded-xl border-2 bg-green-50/50" style={{ borderColor: "#22C55E40" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}>
                    <CheckCircle2 size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: "#16A34A" }}>Pay Cash on Completion</p>
                    <p className="text-xs text-gray-400 mt-0.5">Your Comrade will collect payment when the task is done</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Info card */}
            <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-100">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-700">No online payment needed</p>
                  <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                    You'll pay <strong>{formatCurrency(totalDue)}</strong> directly to your Comrade in cash when the task is completed.
                    {t.runner && ` ${t.runner.name || "Your Comrade"} will collect the payment.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Comrade */}
            {t.runner && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 mb-3">Need to discuss payment with your Comrade?</p>
                <div className="flex gap-2">
                  {t.runner.phone && (
                    <a href={`tel:${t.runner.phone}`} className="flex-1 py-2.5 rounded-xl border border-green-200 bg-green-50 text-green-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-green-100 transition-colors">
                      <Phone size={14} /> Call
                    </a>
                  )}
                  {t.runner.phone && (
                    <a href={`https://wa.me/${t.runner.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex-1 py-2.5 rounded-xl border border-green-200 bg-green-50 text-green-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-green-100 transition-colors">
                      <MessageSquare size={14} /> WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* View task */}
            <button onClick={() => navigate(`/app/tasks/${taskId}`)} className="w-full py-3.5 rounded-2xl text-white font-bold shadow-md" style={{ background: DARK_GRAD }}>
              View Task Details →
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
