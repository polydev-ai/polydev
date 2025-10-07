import Link from 'next/link'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <Link href="/" className="text-slate-600 hover:text-slate-900 transition-colors mb-6 inline-block">
            ← Back to Home
          </Link>

          <h1 className="text-4xl font-bold text-slate-900 mb-4">Terms of Service</h1>
          <p className="text-slate-600 mb-8">Last updated: January 2025</p>

          <div className="prose prose-slate max-w-none">
            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-700 mb-4">
              By accessing and using Polydev AI ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the Service.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Description of Service</h2>
            <p className="text-slate-700 mb-4">
              Polydev AI provides access to multiple AI models through a unified API and Model Context Protocol (MCP) interface. The Service allows users to query various AI models and receive responses for software development assistance.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. User Accounts</h2>
            <p className="text-slate-700 mb-4">
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Acceptable Use</h2>
            <p className="text-slate-700 mb-4">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit harmful or malicious code</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Generate content that is harmful, abusive, or violates the rights of others</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">5. API Keys and Credits</h2>
            <p className="text-slate-700 mb-4">
              Users may provide their own API keys for third-party AI services or use Polydev credits. You are responsible for any costs incurred when using your own API keys. Credits are non-refundable and expire according to your subscription plan.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">6. Subscription and Billing</h2>
            <p className="text-slate-700 mb-4">
              Subscriptions are billed on a recurring basis. You may cancel your subscription at any time. Cancellation will take effect at the end of the current billing period. No refunds are provided for partial billing periods.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">7. Intellectual Property</h2>
            <p className="text-slate-700 mb-4">
              The Service and its original content, features, and functionality are owned by Polydev AI and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">8. User Content</h2>
            <p className="text-slate-700 mb-4">
              You retain ownership of any code, prompts, or other content you submit to the Service. By using the Service, you grant us a license to process and transmit your content to third-party AI providers as necessary to provide the Service.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-slate-700 mb-4">
              The Service is provided "as is" without any warranties, expressed or implied. We do not warrant that the Service will be uninterrupted, timely, secure, or error-free. AI-generated responses may contain errors or inaccuracies.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">10. Limitation of Liability</h2>
            <p className="text-slate-700 mb-4">
              In no event shall Polydev AI be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Service. Our total liability shall not exceed the amount you paid for the Service in the past 12 months.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">11. Termination</h2>
            <p className="text-slate-700 mb-4">
              We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the Service will immediately cease.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">12. Changes to Terms</h2>
            <p className="text-slate-700 mb-4">
              We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the Service. Your continued use of the Service after changes constitutes acceptance of the new terms.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">13. Governing Law</h2>
            <p className="text-slate-700 mb-4">
              These Terms shall be governed by the laws of the jurisdiction in which Polydev AI operates, without regard to its conflict of law provisions.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">14. Contact Information</h2>
            <p className="text-slate-700 mb-4">
              For questions about these Terms of Service, please contact us through our support channels or visit our{' '}
              <Link href="/dashboard" className="text-slate-900 underline hover:text-slate-700">
                dashboard
              </Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
