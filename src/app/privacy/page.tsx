import Link from 'next/link'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <Link href="/" className="text-slate-600 hover:text-slate-900 transition-colors mb-6 inline-block">
            ← Back to Home
          </Link>

          <h1 className="text-4xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
          <p className="text-slate-600 mb-8">Last updated: January 2025</p>

          <div className="prose prose-slate max-w-none">
            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Introduction</h2>
            <p className="text-slate-700 mb-4">
              Polydev AI ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">2.1 Account Information</h3>
            <p className="text-slate-700 mb-4">
              When you create an account, we collect:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700">
              <li>Email address</li>
              <li>Password (encrypted)</li>
              <li>Display name (optional)</li>
              <li>Company information (optional)</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">2.2 Usage Data</h3>
            <p className="text-slate-700 mb-4">
              We automatically collect information about your use of the Service, including:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700">
              <li>API requests and responses</li>
              <li>Model selections and usage patterns</li>
              <li>Credit usage and billing information</li>
              <li>IP addresses and device information</li>
              <li>Browser type and operating system</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">2.3 API Keys</h3>
            <p className="text-slate-700 mb-4">
              If you provide your own API keys for third-party services (OpenAI, Anthropic, Google, etc.), we store them securely using industry-standard encryption. We only use these keys to process your requests to the respective services.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">2.4 Code and Prompts</h3>
            <p className="text-slate-700 mb-4">
              We may temporarily store your code snippets and prompts to process your requests and improve our Service. We do not use your code or prompts to train AI models unless you explicitly opt in.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. How We Use Your Information</h2>
            <p className="text-slate-700 mb-4">
              We use the collected information to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process your requests to third-party AI providers</li>
              <li>Manage your account and subscriptions</li>
              <li>Send service-related communications</li>
              <li>Monitor usage and prevent abuse</li>
              <li>Comply with legal obligations</li>
              <li>Analyze usage patterns to improve performance</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Information Sharing</h2>
            <p className="text-slate-700 mb-4">
              We share your information in the following circumstances:
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.1 Third-Party AI Providers</h3>
            <p className="text-slate-700 mb-4">
              Your prompts and code are transmitted to third-party AI providers (OpenAI, Anthropic, Google, etc.) to generate responses. Each provider has its own privacy policy governing how they handle your data.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.2 Service Providers</h3>
            <p className="text-slate-700 mb-4">
              We work with service providers for hosting, analytics, payment processing, and customer support. These providers have access only to information necessary to perform their functions.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.3 Legal Requirements</h3>
            <p className="text-slate-700 mb-4">
              We may disclose your information if required by law, court order, or government regulation, or to protect our rights, property, or safety.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">5. Data Security</h2>
            <p className="text-slate-700 mb-4">
              We implement appropriate technical and organizational measures to protect your data, including:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication</li>
              <li>Secure API key storage</li>
              <li>Regular backups</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">6. Data Retention</h2>
            <p className="text-slate-700 mb-4">
              We retain your information for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time. Some information may be retained for legal or business purposes.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">7. Your Rights</h2>
            <p className="text-slate-700 mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing</li>
              <li>Data portability</li>
              <li>Withdraw consent</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">8. Cookies and Tracking</h2>
            <p className="text-slate-700 mb-4">
              We use cookies and similar tracking technologies to maintain session state, analyze usage, and improve the Service. You can control cookies through your browser settings, but some features may not function properly if cookies are disabled.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">9. Third-Party Links</h2>
            <p className="text-slate-700 mb-4">
              The Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">10. Children's Privacy</h2>
            <p className="text-slate-700 mb-4">
              The Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">11. International Data Transfers</h2>
            <p className="text-slate-700 mb-4">
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for such transfers.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">12. Changes to This Policy</h2>
            <p className="text-slate-700 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of material changes via email or through the Service. Your continued use after changes constitutes acceptance of the updated policy.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">13. Contact Us</h2>
            <p className="text-slate-700 mb-4">
              For questions about this Privacy Policy or to exercise your rights, please contact us through our support channels or visit our{' '}
              <Link href="/dashboard" className="text-slate-900 underline hover:text-slate-700">
                dashboard
              </Link>.
            </p>

            <div className="bg-slate-50 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Data Protection Summary</h3>
              <p className="text-slate-700">
                We encrypt your data, never sell it to third parties, and only share it with AI providers to process your requests. You can delete your account and data at any time. We comply with GDPR, CCPA, and other privacy regulations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
