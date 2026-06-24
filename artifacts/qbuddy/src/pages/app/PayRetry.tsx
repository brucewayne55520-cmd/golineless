import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { useGetTask } from "@workspace/api-client-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { StatusBadge } from "@/components/StatusBadge";
import { CATEGORY_NAMES, formatCurrency } from "@/lib/utils";
import { NAVY, NAVY_GRAD } from "@/lib/theme";



interface Props {
  id: string;
}

export default function PayRetry({ id }: Props) {
  const [, navigate] = useLocation();


  const taskId = Number(id);

  const { data: task, isLoading, isError } = useGetTask(taskId, {
    query: { queryKey: ["task", taskId], retry: 1 },
  });



  // Determine if payment is applicable
  const t = task;
  const taskPrice = t?.price ?? 0;
  const isPaid = t?.paymentStatus === "paid";
  const isCompleted = t?.status === "completed";
  const isCancelled = t?.status === "cancelled";


  // [OFFLINE MODE] Cash tasks don't need online payment — user pays Comrade directly
  // handlePay is only used for online payment re-enablement below

  // [OFFLINE MODE] Original Razorpay payment handler — uncomment to re-enable
  // const handlePayOnline = async () => {
  //   setPaymentStatus("creating_order");
  //   setLastError("");
  //   createPaymentOrder.mutate(
  //     { data: { taskId } },
  //     {
  //       onSuccess: async (paymentOrder: PaymentOrderResponse) => {
  //         if (paymentOrder?.mock) {
  //           setPaymentStatus("success");
  //           setResultModal("success");
  //           confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: [NAVY, GOLD, "#1D3D7C"] });
  //           return;
  //         }
  //         if (!paymentOrder?.orderId || !paymentOrder?.keyId) {
  //           setPaymentStatus("failed");
  //           setLastError("Failed to create payment order. Please try again.");
  //           setResultModal("failed");
  //           return;
  //         }
  //         setPaymentStatus("checkout_open");
  //         const result = await openRazorpayCheckout({
  //           orderId: paymentOrder.orderId,
  //           amount: paymentOrder.amount ?? 0,
  //           currency: paymentOrder.currency || "INR",
  //           keyId: paymentOrder.keyId,
  //           description: `${t?.category || "Task"} payment`,
  //           phone: localStorage.getItem("golineless_user_phone") || undefined,
  //         });
  //         if (result.status === "success") {
  //           setPaymentStatus("success");
  //           setResultModal("success");
  //           confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: [NAVY, GOLD, "#1D3D7C"] });
  //         } else if (result.status === "failed") {
  //           setPaymentStatus("failed");
  //           setLastError(result.error.description);
  //           setResultModal("failed");
  //         } else {
  //           setPaymentStatus("dismissed");
  //         }
  //       },
  //       onError: (err) => {
  //         setPaymentStatus("failed");
  //         const msg = err?.data?.detail || err?.data?.error || err?.message || "Failed to create payment order";
  //         setLastError(msg);
  //         setResultModal("failed");
  //       },
  //     },
  //   );
  // };



  return (
    <div className="min-h-screen" style={{ background: "#F8F9FC" }}>
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <button onClick={() => navigate(`/app/tasks/${taskId}`)} className="text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-[#0A1628]">Payment</h1>
          <p className="text-xs text-gray-400">Task #{taskId}</p>
        </div>
        {t && (
          <div style={{ color: NAVY }}>
            <CategoryIcon category={t.category} size={22} />
          </div>
        )}
      </div>

      <div className="px-4 pt-6 pb-24">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: `${NAVY}40`, borderTopColor: NAVY }} />
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
            <h2 className="text-lg font-black text-[#0A1628] mb-1">Task not found</h2>
            <p className="text-sm text-gray-500 mb-6">This task doesn't exist or you don't have access to it.</p>
            <button
              onClick={() => navigate("/app/tasks")}
              className="w-full py-3 rounded-2xl text-white font-bold"
              style={{ background: NAVY_GRAD }}
            >
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
            <h2 className="text-lg font-black text-[#0A1628] mb-1">
              {isPaid ? "Already Paid" : "Task Completed"}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {isPaid
                ? "This task has already been paid for. No further action needed."
                : "This task has been completed. Payment was handled during completion."}
            </p>
            <button
              onClick={() => navigate(`/app/tasks/${taskId}`)}
              className="w-full py-3 rounded-2xl text-white font-bold"
              style={{ background: NAVY_GRAD }}
            >
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
            <h2 className="text-lg font-black text-[#0A1628] mb-1">Task Cancelled</h2>
            <p className="text-sm text-gray-500 mb-6">This task has been cancelled. Payment is not required.</p>
            <button
              onClick={() => navigate("/app/tasks")}
              className="w-full py-3 rounded-2xl text-white font-bold"
              style={{ background: NAVY_GRAD }}
            >
              Go to My Tasks
            </button>
          </div>
        )}

        {/* Payment card — active */}
        {t && !isLoading && !isPaid && !isCompleted && !isCancelled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Task Summary */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#EEF2FA", color: NAVY }}>
                  <CategoryIcon category={t.category} size={22} />
                </div>
                <div>
                  <h3 className="font-black text-[#0A1628]">{CATEGORY_NAMES[t.category] || t.category}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StatusBadge status={t.status} />
                    {t.locationArea && <span className="text-xs text-gray-400">· {t.locationArea}</span>}
                  </div>
                </div>
              </div>

              {t.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{t.description}</p>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-gray-500 text-sm">Task Price</span>
                <span className="font-bold text-lg" style={{ color: NAVY }}>{formatCurrency(taskPrice)}</span>
              </div>
            </div>

            {/* [OFFLINE MODE] Cash payment — no online payment needed */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-[#0A1628] mb-4 flex items-center gap-2">
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

            {/* Info card for cash tasks */}
            <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-100">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-700">No online payment needed</p>
                  <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                    You'll pay <strong>{formatCurrency(taskPrice)}</strong> directly to your Comrade in cash when the task is completed. No online payment is required.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* [OFFLINE MODE] No result modal needed — cash tasks don't have online payment flow */}
    </div>
  );
}
