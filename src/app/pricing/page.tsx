'use client'

import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'

export default function Pricing() {
  const { isAuthenticated } = useAuth()

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying out multiple AI models',
      features: [
        '100 free runs to get started',
        'Query GPT-5, Claude Opus 4, Gemini 2.5 Pro',
        'Compare responses side-by-side',
        'Works with Cursor, Claude Code, Continue',
        'Basic project memory',
        'Community support'
      ],
      cta: 'Start Free',
      highlighted: false,
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      )
    },
    {
      name: 'Pro',
      price: '$20',
      period: '/month',
      description: 'For developers who want unlimited access',
      features: [
        'Unlimited runs',
        '340+ models from 37+ providers',
        'Advanced project memory with encryption',
        'Priority model access (GPT-5, Claude Opus 4)',
        'Cost optimization routing',
        'Usage analytics and insights',
        'Priority support',
        'Team collaboration features'
      ],
      cta: 'Upgrade to Pro',
      highlighted: true,
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-violet-500 flex items-center justify-center shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
      )
    }
  ]

  const features = [
    {
      category: 'Usage & Access',
      items: [
        { name: 'Monthly runs', free: '100 free runs', pro: 'Unlimited' },
        { name: 'Model access', free: 'Top 3 models', pro: '340+ models from 37 providers' },
        { name: 'Response comparison', free: true, pro: true },
        { name: 'Priority model access', free: false, pro: true }
      ]
    },
    {
      category: 'Integration & Memory',
      items: [
        { name: 'Editor integration', free: 'Basic', pro: 'Advanced' },
        { name: 'Project memory', free: 'Basic', pro: 'Encrypted + advanced' },
        { name: 'Cost optimization', free: false, pro: true },
        { name: 'Usage analytics', free: false, pro: true }
      ]
    },
    {
      category: 'Support & Collaboration',
      items: [
        { name: 'Support level', free: 'Community', pro: 'Priority' },
        { name: 'Team features', free: false, pro: true },
        { name: 'Custom configurations', free: false, pro: true }
      ]
    }
  ]

  const FeatureValue = ({ value }: { value: string | boolean }) => {
    if (typeof value === 'boolean') {
      return value ? (
        <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full text-sm font-bold">
          ✓
        </span>
      ) : (
        <span className="text-slate-400 text-lg">—</span>
      )
    }
    return <span className="text-slate-900 font-medium">{value}</span>
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-violet-50">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.02)_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-8">
              Simple pricing.<br />
              <span className="bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent">No surprises.</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed">
              Try for free with 100 runs, then upgrade to unlimited access for just $20/month.
              Get answers from 340+ AI models without the complexity of managing multiple APIs.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`bg-white rounded-3xl p-8 relative transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                  plan.highlighted
                    ? 'ring-2 ring-orange-500 shadow-xl shadow-orange-500/20 bg-gradient-to-br from-orange-50 to-violet-50'
                    : 'border-2 border-slate-200 hover:border-orange-200 shadow-lg'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-orange-500 to-violet-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div className="flex justify-center mb-6">{plan.icon}</div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-4">
                    {plan.name}
                  </h3>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-slate-900">
                      {plan.price}
                    </span>
                    <span className="text-xl text-slate-600 ml-2">
                      {plan.period}
                    </span>
                  </div>
                  <p className="text-slate-600 text-lg">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <svg className="w-5 h-5 text-emerald-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-slate-700 text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.highlighted ? "/dashboard/subscription" : (isAuthenticated ? "/dashboard" : "/auth")}
                  className={`block w-full py-4 px-6 rounded-xl font-semibold text-center transition-all duration-300 transform hover:scale-105 ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-orange-500 to-violet-500 text-white hover:from-orange-600 hover:to-violet-600 shadow-lg shadow-orange-500/25'
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 bg-gradient-to-br from-orange-50 to-violet-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              What's included in each plan
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Compare features to see which plan fits your needs
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-orange-500 to-violet-500">
              <h3 className="text-2xl font-bold text-white">
                Feature Comparison
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Feature
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">
                      Free
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">
                      Pro
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {features.map((category, categoryIndex) => (
                    <>
                      <tr key={`category-${categoryIndex}`}>
                        <td
                          colSpan={3}
                          className="px-6 py-4 bg-gradient-to-r from-orange-50 to-violet-50 text-sm font-bold text-slate-900"
                        >
                          {category.category}
                        </td>
                      </tr>
                      {category.items.map((item, itemIndex) => (
                        <tr key={`${categoryIndex}-${itemIndex}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">
                            {item.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-center">
                            <FeatureValue value={item.free} />
                          </td>
                          <td className="px-6 py-4 text-sm text-center">
                            <FeatureValue value={item.pro} />
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Everything you need to know about pricing and features
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                What happens after my 100 free runs?
              </h3>
              <p className="text-slate-600 leading-relaxed">
                You'll be prompted to upgrade to Pro for unlimited access. No credit card required to start,
                and you can upgrade anytime to continue getting answers from multiple AI models.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Can I cancel anytime?
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Yes, you can cancel your Pro subscription at any time. You'll continue to have access
                until the end of your billing period, then you'll return to the free plan.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Which AI models are included?
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Free plans include GPT-5, Claude Opus 4, and Gemini 2.5 Pro. Pro includes all 340+ models
                from 37 providers including Grok, Llama, DeepSeek, and many specialized models.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                How does the cost optimization work?
              </h3>
              <p className="text-slate-600 leading-relaxed">
                We automatically use your free CLI tools first (like Claude Code), then your encrypted API keys,
                then credits as a backup. This saves you money while ensuring you always get answers.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Is my code and data secure?
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Yes. We use zero-knowledge encryption for project memory, and only minimal context
                is shared when needed. Your code never leaves your machine without explicit permission.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Do you offer team discounts?
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Pro plans include team collaboration features. For larger teams (10+ developers),
                contact us for volume pricing and additional team management features.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-orange-500 to-violet-500">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to get unstuck faster?
          </h2>
          <p className="text-xl text-orange-100 max-w-3xl mx-auto mb-12">
            Start with 100 free runs and see how multiple AI models can help you
            debug better, design smarter, and code more efficiently.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link
              href={isAuthenticated ? "/dashboard" : "/auth"}
              className="bg-white text-orange-600 hover:bg-orange-50 font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Start Free Today →
            </Link>
            <Link
              href="/dashboard/subscription"
              className="border-2 border-white text-white hover:bg-white hover:text-orange-600 font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200"
            >
              Upgrade to Pro
            </Link>
          </div>

          <div className="text-orange-100 text-sm">
            ✓ 100 free runs  ✓ No credit card required  ✓ Cancel anytime
          </div>
        </div>
      </section>
    </div>
  )
}