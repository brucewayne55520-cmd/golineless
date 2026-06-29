import InfoPage from "@/components/InfoPage";

export default function PrivacyPolicy() {
  return (
    <InfoPage title="Privacy Policy">
      <h2 className="text-lg font-black text-gray-900 mb-3">Privacy Policy</h2>
      <p className="text-xs text-gray-400 mb-4">Effective Date: 25 June 2026</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">1. Introduction</h3>
      <p>Welcome to Go LineLess. Go LineLess is a local support platform and community created to help people save time and reduce stress by connecting them with trusted local help for hospital lines, bank work, government office queues, medicine pickup, document work, senior care, daily errands and other local assistance services.</p>
      <p className="mt-2">This Privacy Policy explains how Go LineLess collects, uses, stores, shares, protects and manages personal information when you use our website, mobile apps, WhatsApp communities, booking services, customer support, runner/comrade services, admin systems and related features.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">2. Information We Collect</h3>
      <p>We collect only the information required to provide, manage, improve, secure and operate our services. This includes:</p>
      <ul className="list-disc pl-5 mt-2 space-y-1">
        <li>Full name, mobile number, email address</li>
        <li>Address, pickup/delivery location, area, city</li>
        <li>Service request details and task descriptions</li>
        <li>Payment status and transaction details</li>
        <li>OTP verification details</li>
        <li>Feedback, ratings and reviews</li>
        <li>Photos and documents voluntarily uploaded</li>
        <li>Location information for task coordination</li>
        <li>Device and technical information</li>
      </ul>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">3. How We Use Your Information</h3>
      <p>We use your information to create and manage accounts, verify identities, process service requests, assign tasks, track status, process payments, provide customer support, prevent fraud, and improve our services.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">4. Sharing of Information</h3>
      <p>We do not sell your personal information. We may share limited information only when required for service delivery, safety, legal compliance or platform operations. This includes sharing between users and assigned comrades, and with trusted service providers who help us operate the platform.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">5. Data Security</h3>
      <p>We use reasonable technical, administrative and operational measures to protect personal information, including secure servers, access controls, authentication systems, OTP verification, and encrypted connections where applicable.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">6. Your Rights</h3>
      <p>Depending on applicable law, you may have the right to access your personal data, correct inaccurate data, request deletion, withdraw consent, and opt out of non-essential communication.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">7. Contact Us</h3>
      <p>For privacy questions, account deletion, or grievance support:</p>
      <div className="mt-2 p-3 bg-gray-50 rounded-xl text-sm">
        <p className="font-semibold">IBNAY IFTRIBE PRIVATE LIMITED</p>
        <p>1962, Gomtipur Bridge Est-End, Opp. Kamdar Maidan, Ahmedabad, Gujarat, India - 380021</p>
        <p className="mt-1">Email: info@ibnayiftribe.com</p>
        <p>Website: https://golineless.com</p>
      </div>

      <p className="mt-4 text-xs text-gray-400">Go LineLess — Life Without Waiting</p>
    </InfoPage>
  );
}
