import InfoPage from "@/components/InfoPage";
import { ExternalLink } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <InfoPage title="Privacy Policy">
      <h2 className="text-lg font-black text-gray-900 mb-3">Privacy Policy</h2>
      <p className="text-xs text-gray-400 mb-4">Effective Date: 25 June 2026</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">1. Introduction</h3>
      <p>Welcome to Go LineLess. Go LineLess is a local support platform and community created to help people save time and reduce stress by connecting them with trusted local help for hospital lines, bank work, government office queues, medicine pickup, document work, senior care, daily errands and other local assistance services.</p>
      <p className="mt-2">This Privacy Policy explains how Go LineLess collects, uses, stores, shares, protects and manages personal information when you use our website, mobile apps, WhatsApp communities, booking services, customer support, runner/comrade services, admin systems and related features.</p>
      <p className="mt-2">This Privacy Policy is designed to cover both:</p>
      <ul className="list-disc pl-5 mt-1 space-y-1">
        <li>Users / Clients / Customers who request or book services.</li>
        <li>Comrades / Runners / Helpers / Service Partners who perform or support tasks through Go LineLess.</li>
      </ul>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">2. Platform Ownership</h3>
      <p>Go LineLess is operated as a product, platform and service initiative under the IBNAY IFTRIBE group of companies.</p>
      <div className="mt-2 p-3 bg-gray-50 rounded-xl text-sm space-y-2">
        <p><span className="font-semibold">India Entity</span><br/>IBNAY IFTRIBE PRIVATE LIMITED<br/>1962, Gomtipur Bridge Est-End, Opp. Kamdar Maidan, Ahmedabad, Gujarat, India - 380021</p>
        <p><span className="font-semibold">Estonia / International Entity</span><br/>IBNAY IFTRIBE OÜ</p>
      </div>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">3. Information We Collect</h3>
      <p className="mb-2">We collect only the information required to provide, manage, improve, secure and operate our services.</p>
      <p className="font-semibold text-sm">From Users/Clients:</p>
      <ul className="list-disc pl-5 mt-1 space-y-1 text-sm">
        <li>Full name, mobile number, email address</li>
        <li>Address, pickup/delivery location, area, city</li>
        <li>Service request details, task description, urgency status</li>
        <li>Payment status, transaction details, OTP verification</li>
        <li>Feedback, ratings, reviews, photos uploaded for task support</li>
      </ul>
      <p className="font-semibold text-sm mt-2">From Comrades/Runners:</p>
      <ul className="list-disc pl-5 mt-1 space-y-1 text-sm">
        <li>Full name, mobile number, email, residential address, profile photo</li>
        <li>Identity verification documents, KYC details, bank/payment details</li>
        <li>Work availability, preferred service area, task history</li>
        <li>Active task location, proof photos, ratings and performance data</li>
      </ul>
      <p className="font-semibold text-sm mt-2">Location, Photos, Payment, OTP, Device and Technical Information:</p>
      <p className="text-sm">We may collect location data for task coordination, photos for verification, payment transaction details, OTP authentication data, and device/technical information for security and performance.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">4. How We Use Your Information</h3>
      <ul className="list-disc pl-5 mt-1 space-y-1 text-sm">
        <li>Create and manage user and Comrade/Runner accounts</li>
        <li>Verify mobile numbers through OTP</li>
        <li>Process service requests and assign tasks</li>
        <li>Track task status and enable communication</li>
        <li>Process payments, refunds and payouts</li>
        <li>Provide customer support and resolve disputes</li>
        <li>Prevent fraud, misuse and unauthorized access</li>
        <li>Improve user experience and platform reliability</li>
      </ul>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">5. Sharing of Information</h3>
      <p className="mb-2"><strong>We do not sell your personal information.</strong></p>
      <p className="text-sm">We may share limited information only when required for service delivery, safety, legal compliance or platform operations. This includes:</p>
      <ul className="list-disc pl-5 mt-1 space-y-1 text-sm">
        <li><strong>Between Users and Comrades:</strong> Task-related information (name, contact, location, instructions)</li>
        <li><strong>Service Providers:</strong> Payment gateways, SMS/OTP providers, cloud storage, analytics tools</li>
        <li><strong>Legal Authorities:</strong> When required by law, court order, or safety investigation</li>
      </ul>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">6. Data Retention</h3>
      <p className="text-sm">We retain personal information only as long as necessary for providing services, maintaining task history, resolving disputes, processing payments, fraud prevention, and legal compliance. When no longer required, we may delete, anonymize or securely archive it.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">7. Data Security</h3>
      <p className="text-sm">We use reasonable technical, administrative and operational measures including secure servers, access controls, authentication systems, OTP verification, restricted admin access, encrypted connections, and monitoring for misuse. However, no online system is 100% secure.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">8. OTP and Account Security</h3>
      <p className="text-sm">You are responsible for keeping your OTP and account access secure. Go LineLess will never ask for your UPI PIN, Card CVV, ATM PIN, Banking password, Email password, or OTP outside the official verification flow.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">9. Payments and Refunds</h3>
      <p className="text-sm">Payments may be processed through third-party providers such as Razorpay. We do not store full card numbers, UPI PINs, CVV or complete banking credentials. Refunds and payout rules are governed by separate payment terms.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">10. Safety and Fraud Prevention</h3>
      <p className="text-sm">We use personal information and task records to detect and prevent fake bookings, payment fraud, identity misuse, harassment, unsafe conduct, and unauthorized access. We may suspend users who violate platform rules.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">11. Children's Privacy</h3>
      <p className="text-sm">Go LineLess is not intended for children below the legally permitted age. If a minor needs support, the request should be made by a parent or guardian.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">12. Your Rights</h3>
      <p className="text-sm">Depending on applicable law, you may have the right to access, correct, update, or request deletion of your personal data, withdraw consent, and opt out of non-essential communication.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">13. Account Deletion</h3>
      <p className="text-sm">You may request account deletion by contacting us at <span className="font-semibold">info@ibnayiftribe.com</span>. Certain information may be retained for legal, security, accounting, and fraud prevention purposes.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">14. Changes to This Policy</h3>
      <p className="text-sm">We may update this Privacy Policy from time to time. Important changes will be communicated through website/app notices, email, or SMS.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">15. Contact Us</h3>
      <div className="p-3 bg-gray-50 rounded-xl text-sm">
        <p className="font-semibold">IBNAY IFTRIBE PRIVATE LIMITED</p>
        <p>1962, Gomtipur Bridge Est-End, Opp. Kamdar Maidan, Ahmedabad, Gujarat, India - 380021</p>
        <p className="mt-1">Email: info@ibnayiftribe.com</p>
        <p>Website: <a href="https://golineless.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 inline-flex items-center gap-1">golineless.com <ExternalLink size={10} /></a></p>
        <p>WhatsApp: <a href="https://chat.whatsapp.com/HcMrJ74Nazd9DuU3vNatEB" target="_blank" rel="noopener noreferrer" className="text-blue-600 inline-flex items-center gap-1">Join Community <ExternalLink size={10} /></a></p>
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center">Go LineLess — Life Without Waiting</p>
    </InfoPage>
  );
}
