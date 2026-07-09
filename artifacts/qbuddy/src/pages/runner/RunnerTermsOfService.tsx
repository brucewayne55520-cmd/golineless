import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { RunnerBottomNav } from "@/components/BottomNav";

const BG = "#080E1E";

export default function RunnerTermsOfService() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen pb-24" style={{ background: BG }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/runner/profile")} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
            <ArrowLeft size={18} className="text-white/60" />
          </button>
          <div>
            <h1 className="font-black text-white text-lg">Runner Terms of Service</h1>
            <p className="text-white/40 text-xs">Effective Date: 25 June 2026</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5 text-white/70 text-sm leading-relaxed">
        <section>
          <h3 className="text-white font-bold mb-2">1. Acceptance of Terms</h3>
          <p>By registering as a Comrade/Runner on Go LineLess, you agree to these Runner Terms of Service. These terms form a binding agreement between you and Go LineLess (operated by IBNAY IFTRIBE PRIVATE LIMITED).</p>
        </section>

        <section>
          <h3 className="text-white font-bold mb-2">2. Runner Responsibilities</h3>
          <ul className="list-disc pl-5 space-y-1 text-white/60">
            <li>Provide accurate personal and identity information during registration</li>
            <li>Maintain the security of your account credentials</li>
            <li>Accept tasks only when you can fulfill them professionally</li>
            <li>Arrive at task locations on time and communicate delays promptly</li>
            <li>Upload proof photos as required for each task</li>
            <li>Treat clients and their property with respect</li>
            <li>Complete KYC verification before accepting tasks</li>
            <li>Maintain a professional appearance and demeanor</li>
          </ul>
        </section>

        <section>
          <h3 className="text-white font-bold mb-2">3. Task Acceptance & Completion</h3>
          <p>You are free to accept or decline any task offered to you. Once you accept a task, you are expected to complete it professionally. Unjustified cancellations or poor performance may affect your trust score and ability to receive future tasks.</p>
        </section>

        <section>
          <h3 className="text-white font-bold mb-2">4. Payment & Earnings</h3>
          <ul className="list-disc pl-5 space-y-1 text-white/60">
            <li>Earnings are calculated based on task type, distance, waiting time, and priority</li>
            <li>Platform fee is deducted from each task earning as displayed at acceptance</li>
            <li>Payouts are processed weekly via bank transfer to your registered account</li>
            <li>You must have a valid bank account linked to receive payouts</li>
            <li>Cash payments from clients must be confirmed through the app</li>
          </ul>
        </section>

        <section>
          <h3 className="text-white font-bold mb-2">5. Trust Score & Performance</h3>
          <p>Your trust score is calculated based on task completion rate, on-time arrivals, client ratings, and repeat clients. A higher trust score gives you priority in task dispatch. Scores below 50 may result in reduced task availability.</p>
        </section>

        <section>
          <h3 className="text-white font-bold mb-2">6. Cancellation Policy</h3>
          <p>Frequent or unjustified task cancellations will negatively impact your trust score. Cancellations due to genuine emergencies are understood but should be minimized. Repeated cancellations may lead to temporary or permanent suspension.</p>
        </section>

        <section>
          <h3 className="text-white font-bold mb-2">7. Safety & Emergency</h3>
          <p>Your safety is our priority. If you feel unsafe during any task, you should immediately disengage and contact emergency services (112/108). Escalate any safety concerns to admin support through the app.</p>
        </section>

        <section>
          <h3 className="text-white font-bold mb-2">8. Account Termination</h3>
          <p>Go LineLess reserves the right to suspend or terminate your account for violations of these terms, including but not limited to: fraud, harassment, repeated cancellations, or failure to maintain KYC verification.</p>
        </section>

        <section>
          <h3 className="text-white font-bold mb-2">9. Data & Privacy</h3>
          <p>Your personal data is handled according to our Privacy Policy. By using Go LineLess, you consent to the collection and use of your location data for task coordination and your identity documents for KYC verification.</p>
        </section>

        <section>
          <h3 className="text-white font-bold mb-2">10. Contact</h3>
          <div className="bg-white/5 rounded-xl p-3 mt-2">
            <p className="font-semibold text-white text-sm">IBNAY IFTRIBE PRIVATE LIMITED</p>
            <p className="mt-1">Email: support@golineless.in</p>
            <p>Website: golineless.com</p>
          </div>
        </section>

        <p className="text-center text-white/30 text-xs pb-4">Go LineLess · Life Without Waiting</p>
      </div>

      <RunnerBottomNav />
    </div>
  );
}
