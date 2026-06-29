import InfoPage from "@/components/InfoPage";
import { ExternalLink } from "lucide-react";

export default function HelpSupport() {
  return (
    <InfoPage title="Help & Support">
      <h2 className="text-lg font-black text-gray-900 mb-3">Help & Support</h2>

      {/* FAQ Section */}
      <h3 className="font-bold text-gray-900 mt-4 mb-2">Frequently Asked Questions</h3>

      <div className="space-y-3">
        <div className="p-3 bg-gray-50 rounded-xl">
          <p className="font-semibold text-sm text-gray-900">How do I book a task?</p>
          <p className="text-sm text-gray-600 mt-1">Go to Home → select a category → fill in details → confirm booking. Your task will be dispatched to nearby Comrades.</p>
        </div>

        <div className="p-3 bg-gray-50 rounded-xl">
          <p className="font-semibold text-sm text-gray-900">How do I share the OTP?</p>
          <p className="text-sm text-gray-600 mt-1">Share the OTP only when your task is complete and you're satisfied with the service. The Comrade will enter it to verify completion.</p>
        </div>

        <div className="p-3 bg-gray-50 rounded-xl">
          <p className="font-semibold text-sm text-gray-900">How do I cancel a task?</p>
          <p className="text-sm text-gray-600 mt-1">Open the task → tap Cancel. Cancellation fees may apply if the Comrade has already been assigned.</p>
        </div>

        <div className="p-3 bg-gray-50 rounded-xl">
          <p className="font-semibold text-sm text-gray-900">How do I get a refund?</p>
          <p className="text-sm text-gray-600 mt-1">Contact support within 24 hours of task completion. If the service was not delivered as expected, we'll review your case.</p>
        </div>

        <div className="p-3 bg-gray-50 rounded-xl">
          <p className="font-semibold text-sm text-gray-900">How do I track my Comrade?</p>
          <p className="text-sm text-gray-600 mt-1">Once a Comrade accepts your task, you can track their location in real-time from the task details page.</p>
        </div>

        <div className="p-3 bg-gray-50 rounded-xl">
          <p className="font-semibold text-sm text-gray-900">Is my data safe?</p>
          <p className="text-sm text-gray-600 mt-1">Yes. We use secure servers, encryption, and strict access controls. We never sell your personal information. Read our Privacy Policy for details.</p>
        </div>
      </div>

      {/* Contact Section */}
      <h3 className="font-bold text-gray-900 mt-6 mb-2">Contact Support</h3>
      <div className="p-3 bg-gray-50 rounded-xl text-sm space-y-2">
        <p><span className="font-semibold">Email:</span> info@ibnayiftribe.com</p>
        <p><span className="font-semibold">WhatsApp:</span>{" "}
          <a href="https://chat.whatsapp.com/HcMrJ74Nazd9DuU3vNatEB" target="_blank" rel="noopener noreferrer" className="text-blue-600 inline-flex items-center gap-1">
            Join Community <ExternalLink size={12} />
          </a>
        </p>
        <p><span className="font-semibold">Website:</span>{" "}
          <a href="https://golineless.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 inline-flex items-center gap-1">
            golineless.com <ExternalLink size={12} />
          </a>
        </p>
      </div>

      <p className="mt-4 text-xs text-gray-400">We typically respond within 24 hours.</p>
    </InfoPage>
  );
}
