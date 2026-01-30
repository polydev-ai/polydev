'use client'

import React from 'react'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { Check, Zap, Star } from 'lucide-react'

export default function Pricing() {
  const { isAuthenticated } = useAuth()

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '',
      description: 'Get started',
      credits: 'First 500 credits',
      features: [
        'First 500 credits (one-time)',
        'All AI models access',
        'MCP integration',
        'Community support'
      ],
      cta: 'Get Started',
      highlighted: false,
      icon: <Zap className="w-8 h-8 text-slate-900" />
    },
    {
      name: 'Premium',
      price: '$10',
      period: '/month',
      description: 'For serious developers',
      credits: '10,000 credits/month',
      features: [
        '10,000 credits/month',
        'Unlimited messages',
        'Credits rollover (while subscribed)',
        'All AI models access',
        'Use your CLI subscriptions',
        'Priority support'
      ],
      cta: 'Upgrade to Premium',
      highlighted: true,
      icon: <Star className="w-8 h-8 text-white" />
    }
  ]

  const features = [
    {
      category: 'Credits & Usage',
      items: [
        { name: 'Credits', free: '500 (one-time)', premium: '10,000/month' },
        { name: 'Unlimited messages', free: false, premium: true },
        { name: 'Credits rollover', free: false, premium: true },
        { name: 'Premium models (20 credits)', free: true, premium: true },
        { name: 'Normal models (4 credits)', free: true, premium: true },
        { name: 'Eco models (1 credit)', free: true, premium: true }
      ]
    },
    {
      category: 'Features',
      items: [
        { name: 'All 340+ AI models', free: true, premium: true },
        { name: 'MCP integration', free: true, premium: true },
        { name: 'Use your CLI subscriptions', free: true, premium: true },
        { name: 'Usage analytics', free: false, premium: true }
      ]
    },
    {
      category: 'Support',
      items: [
        { name: 'Community support', free: true, premium: true },
        { name: 'Priority support', free: false, premium: true }
      ]
    }
  ]

  const FeatureValue = ({ value }: { value: string | boolean }) => {
    if (typeof value === 'boolean') {
      return value ? (
        <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-900 text-white rounded-full">
          <Check className="w-4 h-4" />
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
              <span className="text-slate-600">Pay for what you use.</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed">
              Start free with 500 credits. Upgrade to Premium for just $10/month
              with unlimited messages and 10,000 credits.
            </p>

            {/* Credit costs explanation */}
            <div className="inline-flex items-center gap-6 bg-slate-100 rounded-full px-6 py-3 text-sm">
              <span className="text-slate-700"><strong>Premium</strong> = 20 credits</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-700"><strong>Normal</strong> = 4 credits</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-700"><strong>Eco</strong> = 1 credit</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards - 2 tiers */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-6 mb-16">
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
                    <span className="bg-emerald-500 text-white px-6 py-1 rounded-full text-sm font-semibold">
                      Best Value
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div className={`w-16 h-16 rounded-lg mx-auto mb-6 flex items-center justify-center ${
                    plan.highlighted ? 'bg-white/10' : 'bg-slate-100'
                  }`}>
                    {plan.icon}
                  </div>
                  <h3 className={`text-3xl font-bold mb-4 ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className={`text-5xl font-bold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                      {plan.price}
                    </span>
                    <span className={`text-xl ml-2 ${plan.highlighted ? 'text-slate-400' : 'text-slate-600'}`}>
                      {plan.period}
                    </span>
                  </div>
                  <p className={`text-lg mb-2 ${plan.highlighted ? 'text-slate-400' : 'text-slate-600'}`}>
                    {plan.description}
                  </p>
                  <p className={`text-sm font-semibold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                    {plan.credits}
                  </p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-emerald-400' : 'text-slate-900'}`} />
                      <span className={`text-sm leading-relaxed ${plan.highlighted ? 'text-slate-300' : 'text-slate-700'}`}>
                        {feature}
                      </span>
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

      {/* Feature Comparison Table - 2 columns */}
      <section className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Compare plans
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              See what's included in each plan
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Feature
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">
                      Free
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {features.map((category, categoryIndex) => (
                    <React.Fragment key={`category-group-${categoryIndex}`}>
                      <tr key={`category-${categoryIndex}`}>
                        <td
                          colSpan={3}
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
                            <FeatureValue value={item.premium} />
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
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-6">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                How do credits work?
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Credits are used when you query AI models. Premium models (like GPT-5.2, Claude Opus 4.5)
                cost 20 credits. Normal models cost 4 credits. Eco models cost 1 credit.
                Use your credits however you want across all models.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Do unused credits expire?
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                <strong>Free tier:</strong> Your 500 credits don't expire but don't refill.
                <br /><br />
                <strong>Premium:</strong> Credits rollover indefinitely as long as you maintain
                your subscription. If you cancel, unused credits expire at the end of your billing period.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Can I use my CLI subscriptions?
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Yes! If you have ChatGPT Plus, Claude Pro, or Gemini Advanced, you can use those
                subscriptions directly through your CLI tools. Login with your subscription account,
                and Polydev routes queries through your authenticated CLI session — no API keys needed.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Can I cancel anytime?
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Yes, cancel anytime. You'll keep access until the end of your billing period.
                Your rolled-over credits will be available if you resubscribe within 30 days.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Which AI models are included?
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                All plans include access to 340+ AI models from 37+ providers: GPT-5.2,
                Claude Opus 4.5, Gemini 3 Pro, Grok 4.1, DeepSeek, Llama, and many more.
                The full list is available in your dashboard.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Need more credits?
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                If you consistently need more than 10,000 credits/month, contact us for
                custom enterprise pricing. We also offer team plans with shared credit pools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
            Start with 500 free credits. No credit card required.
          </p>

          <Link
            href={isAuthenticated ? "/dashboard" : "/auth"}
            className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 font-bold py-4 px-8 rounded-lg text-lg transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  )
}
