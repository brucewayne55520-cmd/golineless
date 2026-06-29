import InfoPage from "@/components/InfoPage";
import { ExternalLink } from "lucide-react";

export default function About() {
  return (
    <InfoPage title="About Go LineLess">
      <h2 className="text-lg font-black text-gray-900 mb-3">About Go LineLess</h2>

      <div className="text-center mb-6">
        <p className="text-lg font-black text-gray-900">Go LineLess</p>
        <p className="text-sm text-gray-500 italic">Life Without Waiting</p>
      </div>

      <p>Go LineLess is a local support platform and community created to help people save time and reduce stress by connecting them with trusted local help for hospital lines, bank work, government office queues, medicine pickup, document work, senior care, daily errands and other local assistance services.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">Our Mission</h3>
      <p>To make everyday tasks easier by connecting people with reliable, trusted local helpers who can save them hours of waiting and hassle.</p>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">Services</h3>
      <ul className="list-disc pl-5 mt-2 space-y-1">
        <li>Hospital line assistance</li>
        <li>Bank work &amp; government office queues</li>
        <li>Medicine pickup</li>
        <li>Document work &amp; couriers</li>
        <li>Senior care support</li>
        <li>Daily errands &amp; more</li>
      </ul>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">Operating Entity</h3>
      <div className="p-3 bg-gray-50 rounded-xl text-sm">
        <p className="font-semibold">IBNAY IFTRIBE PRIVATE LIMITED</p>
        <p>1962, Gomtipur Bridge Est-End, Opp. Kamdar Maidan</p>
        <p>Ahmedabad, Gujarat, India - 380021</p>
      </div>

      <h3 className="font-bold text-gray-900 mt-4 mb-2">Connect With Us</h3>
      <div className="space-y-2">
        <a href="https://golineless.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600">
          🌐 golineless.com <ExternalLink size={12} />
        </a>
        <a href="https://ibnayiftribe.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600">
          🏢 ibnayiftribe.com <ExternalLink size={12} />
        </a>
        <a href="https://chat.whatsapp.com/HcMrJ74Nazd9DuU3vNatEB" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600">
          💬 WhatsApp Community <ExternalLink size={12} />
        </a>
        <p className="text-sm text-gray-600">📧 info@ibnayiftribe.com</p>
      </div>
    </InfoPage>
  );
}
