import { useLocation } from "wouter";
import { ArrowLeft, ExternalLink, Phone, MessageSquare, BookOpen, Shield, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { RunnerBottomNav } from "@/components/BottomNav";
import { BLUE } from "@/lib/theme";

const BG = "#080E1E";

export default function RunnerHelpSupport() {
  const [, navigate] = useLocation();

  const faqs = [
    { q: "How do I accept a task?", a: "Go to the Tasks tab. Available tasks appear in your feed. Tap 'Accept Task' on any task you want to take. You can only have one active task at a time." },
    { q: "How do I complete a task?", a: "Follow the step-by-step workflow: Start Travel → Arrive at Location → Upload Proof Photos → Enter the OTP from the client → Task Complete!" },
    { q: "What if the client doesn't give me the OTP?", a: "Ask the client for the 6-digit OTP shown on their task details screen. If they can't find it, they can copy it from the task page. The OTP is required to complete the task." },
    { q: "How do waiting charges work?", a: "If you're waiting at a location (e.g., in a queue), start the waiting timer. Charges are calculated per minute and added to your earnings. Pause or end the timer as needed." },
    { q: "How do I get paid?", a: "For cash tasks, confirm the cash received from the client. For payout requests, go to Earnings → Request Payout. Admin processes payouts weekly via bank transfer." },
    { q: "What happens if I cancel a task?", a: "Cancellations may affect your trust score. Only cancel if absolutely necessary. If a task isn't suitable, it's better to not accept it in the first place." },
    { q: "How is my trust score calculated?", a: "Your trust score is based on: task completion rate, on-time arrivals, client ratings, and repeat clients. Higher scores unlock more task opportunities." },
    { q: "What if I have an emergency during a task?", a: "Use the Emergency button in the Active Task screen to call 112 or 108. You can also escalate the task to admin support from the same screen." },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: BG }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/runner/profile")} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
            <ArrowLeft size={18} className="text-white/60" />
          </button>
          <div>
            <h1 className="font-black text-white text-lg">Help & Support</h1>
            <p className="text-white/40 text-xs">FAQs and contact information</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <a href="tel:+919876543210" className="bg-white/8 border border-white/10 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/12 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Phone size={18} className="text-green-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Call Support</p>
              <p className="text-white/40 text-[10px]">Mon-Sat 9am-6pm</p>
            </div>
          </a>
          <a href="https://chat.whatsapp.com/HcMrJ74Nazd9DuU3vNatEB" target="_blank" rel="noopener noreferrer" className="bg-white/8 border border-white/10 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/12 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <MessageSquare size={18} className="text-green-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">WhatsApp</p>
              <p className="text-white/40 text-[10px]">Join community</p>
            </div>
          </a>
        </div>

        {/* FAQ Section */}
        <div>
          <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <BookOpen size={14} /> Frequently Asked Questions
          </h3>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <details key={i} className="bg-white/8 border border-white/10 rounded-xl overflow-hidden group">
                <summary className="px-4 py-3 text-white text-sm font-semibold cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between">
                  {faq.q}
                  <span className="text-white/30 text-xs group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-4 pb-3 text-white/60 text-xs leading-relaxed border-t border-white/5 pt-2">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Important Info */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Shield size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-bold text-sm mb-1">Runner Safety</p>
              <p className="text-white/50 text-xs leading-relaxed">
                Always prioritize your safety. If you feel uncomfortable during a task, you can cancel and escalate to admin support. Never share personal financial details with clients.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Clock size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-bold text-sm mb-1">Support Hours</p>
              <p className="text-white/50 text-xs leading-relaxed">
                Monday - Saturday: 9:00 AM - 6:00 PM<br />
                Sunday: Emergency support only<br />
                Email: support@golineless.in
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs pb-4">Go LineLess · Life Without Waiting</p>
      </div>

      <RunnerBottomNav />
    </div>
  );
}
