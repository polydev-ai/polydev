'use client'

import React from 'react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

interface PricingConfig {
  subscription_pricing: {
    free_tier: {
      name: string
      price_display: string
      message_limit: number
      features: string[]
      limitations: string[]
    }
    plus_tier: {
      name: string
      price_display_monthly: string
      price_display_annual: string
      features: string[]
    }
    pro_tier: {
      name: string
      price_display_monthly: string
      price_display_annual: string
      features: string[]
    }
    enterprise_tier: {
      name: string
      price_display_monthly: string
      price_display_annual: string
      features: string[]
    }
  }
}

export default function Pricing() {
  const { isAuthenticated } = useAuth()
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPricingConfig()
  }, [])

  const fetchPricingConfig = async () => {
    try {
      const response = await fetch('/api/pricing/config')
      if (response.ok) {
        const { config } = await response.json()
        setConfig(config)
      }
    } catch (error) {
      console.error('Failed to fetch pricing config:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading pricing...</div>
      </div>
    )
  }

  const plans = [
    {
      name: config?.subscription_pricing.free_tier.name || 'Free',
      price: config?.subscription_pricing.free_tier.price_display || '$0',
      period: 'forever',
      annualPrice: null,
      description: 'Perfect for trying out multiple AI models',
      features: config?.subscription_pricing.free_tier.features || [
        '200 messages/month',
        '10 Premium / 40 Normal / 150 Eco perspectives',
        'Query top AI models',
        'Compare responses side-by-side'
      ],
      limitations: config?.subscription_pricing.free_tier.limitations || ['Limited perspectives'],
      messageLimit: config?.subscription_pricing.free_tier.message_limit || 200,
      cta: 'Start Free',
      highlighted: false,
      icon: (
        <div className="w-16 h-16 rounded-lg border border-slate-200 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      )
    },
    {
      name: config?.subscription_pricing.plus_tier?.name || 'Plus',
      price: config?.subscription_pricing.plus_tier?.price_display_monthly || '$25',
      period: '/month',
      annualPrice: config?.subscription_pricing.plus_tier?.price_display_annual || '$20',
      description: 'Most popular for individual developers',
      features: config?.subscription_pricing.plus_tier?.features || [
        'Unlimited messages',
        '400 Premium / 1,600 Normal / 4,000 Eco perspectives',
        'All AI models access',
        'Advanced memory features'
      ],
      cta: 'Upgrade to Plus',
      highlighted: true,
      icon: (
        <div className="w-16 h-16 rounded-lg bg-slate-900 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      )
    },
    {
      name: config?.subscription_pricing.pro_tier.name || 'Pro',
      price: config?.subscription_pricing.pro_tier.price_display_monthly || '$35',
      period: '/month',
      annualPrice: config?.subscription_pricing.pro_tier.price_display_annual || '$30',
      description: 'For power users and teams',
      features: config?.subscription_pricing.pro_tier.features || [
        'Unlimited messages',
        '600 Premium / 2,500 Normal / 8,000 Eco perspectives',
        'All AI models access',
        'Advanced analytics',
        'Priority support'
      ],
      cta: 'Upgrade to Pro',
      highlighted: false,
      icon: (
        <div className="w-16 h-16 rounded-lg border border-slate-200 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
      )
    },
    {
      name: config?.subscription_pricing.enterprise_tier?.name || 'Enterprise',
      price: config?.subscription_pricing.enterprise_tier?.price_display_monthly || '$60',
      period: '/month',
      annualPrice: config?.subscription_pricing.enterprise_tier?.price_display_annual || '$50',
      description: 'For large teams and organizations',
      features: config?.subscription_pricing.enterprise_tier?.features || [
        'Unlimited messages',
        '1,200 Premium / 5,000 Normal / 20,000 Eco perspectives',
        'All AI models access',
        'Priority model access',
        'Team collaboration features',
        'Dedicated support',
        'Custom integrations'
      ],
      cta: 'Upgrade to Enterprise',
      highlighted: false,
      icon: (
        <div className="w-16 h-16 rounded-lg bg-slate-900 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      )
    }
  ]

  const features = [
    {
      category: 'Usage & Access',
      items: [
        { name: 'Monthly messages', free: '200 messages', plus: 'Unlimited', pro: 'Unlimited', enterprise: 'Unlimited' },
        { name: 'Premium perspectives', free: '10', plus: '400', pro: '600', enterprise: '1,200' },
        { name: 'Normal perspectives', free: '40', plus: '1,600', pro: '2,500', enterprise: '5,000' },
        { name: 'Eco perspectives', free: '150', plus: '4,000', pro: '8,000', enterprise: '20,000' },
        { name: 'Model access', free: 'Top models', plus: 'All 340+ models', pro: 'All 340+ models', enterprise: 'All 340+ models' },
        { name: 'Priority model access', free: false, plus: false, pro: false, enterprise: true }
      ]
    },
    {
      category: 'Integration & Memory',
      items: [
        { name: 'Editor integration', free: 'Basic', plus: 'Advanced', pro: 'Advanced', enterprise: 'Advanced' },
        { name: 'Project memory', free: 'Basic', plus: 'Advanced', pro: 'Encrypted + advanced', enterprise: 'Encrypted + advanced' },
        { name: 'Cost optimization', free: false, plus: true, pro: true, enterprise: true },
        { name: 'Usage analytics', free: false, plus: true, pro: true, enterprise: true }
      ]
    },
    {
      category: 'Privacy & Security',
      items: [
        { name: 'BYOK (Use your own API keys)', free: false, plus: true, pro: true, enterprise: true },
        { name: 'Ephemeral Mode (requires BYOK)', free: false, plus: 'Opt-in', pro: 'Default ON', enterprise: 'Forced ON' },
        { name: 'At-rest encryption (AES-256-GCM)', free: true, plus: true, pro: true, enterprise: true },
        { name: 'AI provider data retention transparency', free: true, plus: true, pro: true, enterprise: true },
        { name: 'Client-side conversation storage option', free: false, plus: true, pro: true, enterprise: true }
      ]
    },
    {
      category: 'Support & Collaboration',
      items: [
        { name: 'Support level', free: 'Community', plus: 'Standard', pro: 'Priority', enterprise: 'Dedicated' },
        { name: 'Team features', free: false, plus: false, pro: true, enterprise: true },
        { name: 'Custom configurations', free: false, plus: false, pro: true, enterprise: true }
      ]
    }
  ]

  const FeatureValue = ({ value }: { value: string | boolean }) => {
    if (typeof value === 'boolean') {
      return value ? (
        <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-900 text-white rounded-full text-sm font-bold">
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
      <section className="relative overflow-hidden bg-white border-b border-slate-200">
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-8">
              Simple pricing.<br />
              <span className="text-slate-900">No surprises.</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed">
              Try for free with 200 messages, then upgrade to Plus for $25/month, Pro for $35/month, or Enterprise for $60/month.
              Get annual pricing at $20/month (Plus), $30/month (Pro), or $50/month (Enterprise). Access 340+ AI models seamlessly.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`rounded-xl p-8 relative border ${
                  plan.highlighted
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-slate-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-white text-slate-900 px-6 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div className="flex justify-center mb-6">{plan.icon}</div>
                  <h3 className={`text-3xl font-bold mb-4 ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                    {plan.name}
                  </h3>
                  <div className="mb-6">
                    <span className={`text-5xl font-bold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                      {plan.price}
                    </span>
                    <span className={`text-xl ml-2 ${plan.highlighted ? 'text-slate-400' : 'text-slate-600'}`}>
                      {plan.period}
                    </span>
                    {plan.annualPrice && (
                      <div className={`text-sm font-medium mt-2 ${plan.highlighted ? 'text-slate-400' : 'text-slate-600'}`}>
                        or {plan.annualPrice}/month billed annually
                      </div>
                    )}
                  </div>
                  <p className={`text-lg ${plan.highlighted ? 'text-slate-400' : 'text-slate-600'}`}>
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <svg className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-white' : 'text-slate-900'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={`text-sm leading-relaxed ${plan.highlighted ? 'text-slate-300' : 'text-slate-700'}`}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.highlighted ? "/dashboard/subscription" : (isAuthenticated ? "/dashboard" : "/auth")}
                  className={`block w-full py-4 px-6 rounded-lg font-semibold text-center transition-colors ${
                    plan.highlighted
                      ? 'bg-white text-slate-900 hover:bg-slate-100'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
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
      <section className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              What's included in each plan
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Compare features to see which plan fits your needs
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 bg-slate-900">
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
                      Plus
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">
                      Pro
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {features.map((category, categoryIndex) => (
                    <React.Fragment key={`category-group-${categoryIndex}`}>
                      <tr key={`category-${categoryIndex}`}>
                        <td
                          colSpan={5}
                          className="px-6 py-4 bg-slate-50 text-sm font-bold text-slate-900"
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
                            <FeatureValue value={item.plus} />
                          </td>
                          <td className="px-6 py-4 text-sm text-center">
                            <FeatureValue value={item.pro} />
                          </td>
                          <td className="px-6 py-4 text-sm text-center">
                            <FeatureValue value={item.enterprise} />
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
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
                What happens after my 200 free messages?
              </h3>
              <p className="text-slate-600 leading-relaxed">
                You'll be prompted to upgrade to Plus ($25/month), Pro ($35/month), or Enterprise ($60/month) for unlimited access.
                No credit card required to start, and you can upgrade anytime to continue getting answers from multiple AI models.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Can I cancel anytime?
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Yes, you can cancel your Plus, Pro, or Enterprise subscription at any time. You'll continue to have access
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
                What's the difference between BYOK and Ephemeral Mode?
              </h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong>BYOK (Bring Your Own Keys):</strong> Use your own OpenAI/Anthropic/etc. API keys instead of Polydev's.
                You pay the AI provider directly and get unlimited usage (no message limits). Available on Plus, Pro, and Enterprise tiers.
              </p>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong>Ephemeral Mode:</strong> When enabled with BYOK, conversations are NOT saved to our database.
                Only usage metadata (tokens, costs) is tracked. Tier defaults: Plus (opt-in), Pro (default ON), Enterprise (forced ON).
              </p>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong>Client-Side Storage:</strong> Optional feature that saves conversations to your browser's localStorage
                when using Ephemeral Mode. Data never leaves your machine.
              </p>
              <p className="text-slate-600 leading-relaxed">
                <strong>Key point:</strong> Ephemeral Mode REQUIRES BYOK to work. When using Polydev's API keys,
                conversations are always saved for billing tracking (encrypted at rest with AES-256-GCM).
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                What privacy features do you offer?
              </h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong>At-Rest Encryption (All tiers):</strong> All data encrypted with AES-256-GCM. Protects against database breaches.
              </p>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong>AI Provider Transparency (All tiers):</strong> Clear information about data retention policies (OpenAI: 30 days, Anthropic: 7 days).
              </p>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong>BYOK (Plus+):</strong> Use your own API keys. You control provider relationships directly.
              </p>
              <p className="text-slate-600 leading-relaxed">
                <strong>Ephemeral Mode (requires BYOK):</strong> Conversations NOT saved to database. Only usage metadata tracked.
                Maximum privacy option available today.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Can the server see my conversations?
              </h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong>Yes, we're honest about this.</strong> The server must see plaintext to route requests to AI providers,
                handle billing, and execute MCP tool calls. This is NOT zero-knowledge encryption.
              </p>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong>What protects your data:</strong> At-rest encryption (AES-256-GCM), legal obligations, business reputation,
                and audit logs. Trust model similar to Gmail/Outlook/Slack.
              </p>
              <p className="text-slate-600 leading-relaxed">
                <strong>For maximum privacy:</strong> BYOK + Ephemeral Mode ensures conversations aren't saved to database.
                For zero server trust, use local solutions like Cline.
                <a href="/privacy" className="text-slate-900 font-semibold hover:underline ml-1">
                  See full trust model →
                </a>
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Do you offer zero-knowledge encryption?
              </h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong>No, not currently.</strong> Zero-knowledge encryption would mean the server cannot see your data at all,
                even while routing requests. This isn't possible with our current architecture where we route to multiple AI providers.
              </p>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong>What we DO offer:</strong> BYOK + Ephemeral Mode is the closest alternative. Your conversations aren't saved,
                and you control provider relationships directly. Data still passes through our server for routing.
              </p>
              <p className="text-slate-600 leading-relaxed">
                <strong>For true zero-knowledge:</strong> Use local-only tools like Cline where nothing goes through a server.
                We're exploring zero-knowledge options for future releases.
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
      <section className="py-24 bg-slate-900">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to get unstuck faster?
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-12">
            Start with 200 free messages and see how multiple AI models can help you
            debug better, design smarter, and code more efficiently.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link
              href={isAuthenticated ? "/dashboard" : "/auth"}
              className="bg-white text-slate-900 hover:bg-slate-100 font-bold py-4 px-8 rounded-lg text-lg transition-colors"
            >
              Start Free Today →
            </Link>
            <Link
              href="/dashboard/subscription"
              className="border border-white text-white hover:bg-white hover:text-slate-900 font-bold py-4 px-8 rounded-lg text-lg transition-colors"
            >
              Upgrade to Pro
            </Link>
          </div>

          <div className="text-slate-400 text-sm">
            ✓ 200 free messages  ✓ No credit card required  ✓ Cancel anytime
          </div>
        </div>
      </section>
    </div>
  )
}