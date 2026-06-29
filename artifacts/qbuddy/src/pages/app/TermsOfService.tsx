import InfoPage from "@/components/InfoPage";

export default function TermsOfService() {
  return (
    <InfoPage title="Terms of Service">
      <h2 className="text-lg font-black text-gray-900 mb-3">Terms of Service</h2>
      <p className="text-xs text-gray-400 mb-4">Effective Date: 25 June 2026</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">1. Acceptance of Terms</h3>
      <p>By using Go LineLess, visiting our website, downloading our mobile app, submitting a request, registering as a Comrade/Runner, or using any related service, you agree to these Terms of Service.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">2. Description of Service</h3>
      <p>Go LineLess is a local support platform that connects users with trusted local helpers (Comrades/Runners) for hospital line assistance, bank work, government office queues, medicine pickup, document work, senior care, daily errands and other local assistance services.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">3. User Responsibilities</h3>
      <ul className="list-disc pl-5 mt-2 space-y-1">
        <li>Provide accurate and complete information</li>
        <li>Maintain the security of your account and OTP</li>
        <li>Do not share your OTP with unauthorized persons</li>
        <li>Treat Comrades/Runners with respect</li>
        <li>Pay for services as agreed</li>
        <li>Report any issues or disputes promptly</li>
      </ul>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">4. Payments</h3>
      <p>Service charges are displayed before booking. Payments can be made via cash or online payment methods where available. All payments are subject to the pricing and payment terms displayed at the time of booking.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">5. Cancellation Policy</h3>
      <p>Cancellations may be subject to fees as displayed at the time of booking. Cancellation rules and fees are shown before you confirm a booking.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">6. Limitation of Liability</h3>
      <p>Go LineLess acts as a platform connecting users with service providers. We are not directly responsible for the quality of services provided by Comrades/Runners. However, we take safety and quality seriously and will investigate any reported issues.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">7. Contact Us</h3>
      <p>For questions about these Terms:</p>
      <div className="mt-2 p-3 bg-gray-50 rounded-xl text-sm">
        <p className="font-semibold">IBNAY IFTRIBE PRIVATE LIMITED</p>
        <p>Email: info@ibnayiftribe.com</p>
        <p>Website: https://golineless.com</p>
      </div>

      <p className="mt-4 text-xs text-gray-400">Go LineLess — Life Without Waiting</p>
    </InfoPage>
  );
}
