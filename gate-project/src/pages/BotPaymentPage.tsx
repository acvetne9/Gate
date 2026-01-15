import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Lock, Zap, Building2, ArrowRight, Check, Shield } from 'lucide-react';
import { PageLayout } from '../components';
export default function BotPaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const page = searchParams.get('page') || '/';
  const siteName = searchParams.get('siteName') || 'this website';
  const plans = [{
    name: 'Keeper',
    planId: 'keeper',
    icon: Zap,
    price: 0,
    description: 'Free plan with automatic content payments',
    features: ['Automatic payment for content access', 'Bank account securely stored', 'No manual payment each time', 'Pay-per-page pricing'],
    highlighted: true
  }, {
    name: 'MAX',
    planId: 'max',
    icon: Building2,
    price: 99,
    description: 'Premium features + discounted access rates',
    features: ['Everything in Keeper, plus:', 'Advanced bot payment revenue share', 'Premium Admin Contact and Support'],
    highlighted: false
  }];

  const handlePlanClick = (planId: string) => {
    // Navigate to signup with the selected plan, then redirect to billing
    navigate(`/signup?plan=${planId}&redirect=/billing?plan=${planId}`);
  };
  return <PageLayout>
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/60 to-gray-50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_var(--tw-gradient-stops))] from-green-100/20 via-transparent to-transparent" />
      </div>


      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pt-20 sm:pt-24 pb-12 sm:pb-16 relative">
        {/* Explanation Section */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl p-8 sm:p-10 mb-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-green-800" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-900">
              Payment Method Required
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              This content is protected by <span className="font-semibold text-green-800">Gate</span> - add a payment method to access
            </p>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
              <Shield className="w-5 h-5 text-green-800 flex-shrink-0" />
              <p className="text-gray-700">
                <span className="font-semibold text-gray-900">What's Happening?</span> You're trying to access content on <span className="font-semibold">{siteName}</span> that is protected by Gate.
              </p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0" />
              <p className="text-gray-700">
                <span className="font-semibold text-gray-900">Site requires fee.</span> This page charges a small fee per access to protect content from unauthorized scraping.
              </p>
            </div>

            <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl">
              <h3 className="font-semibold mb-3 text-gray-900 text-lg">
                How to Access This Content
              </h3>
              <p className="text-gray-700 mb-4">
                To access Gate-protected content, you need a <span className="font-semibold text-green-800">Keeper</span> or <span className="font-semibold text-green-800">MAX</span> plan to store your payment method.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Connect your bank account once - payments are automatic</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Pay per page accessed (small fee per page)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Access content across all Gate-protected sites</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Keeper plan is FREE - only pay for what you use</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Plans Preview */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {plans.map(plan => {
          const Icon = plan.icon;
          return <button 
              key={plan.name} 
              onClick={() => handlePlanClick(plan.planId)}
              className={`bg-white rounded-2xl border-2 shadow-xl p-6 transition-all hover:scale-105 hover:shadow-2xl cursor-pointer text-left ${plan.highlighted ? 'border-green-600 ring-4 ring-green-100' : 'border-gray-200 hover:border-green-400'}`}
            >
                {plan.highlighted && <div className="bg-green-600 text-white text-center py-1 px-3 rounded-full text-xs font-semibold mb-4 inline-block">
                    RECOMMENDED
                  </div>}

                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-xl ${plan.highlighted ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Icon className={`w-5 h-5 ${plan.highlighted ? 'text-green-600' : 'text-gray-600'}`} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <p className="text-gray-600 text-sm mt-2">{plan.description}</p>
                </div>

                <div className="space-y-2">
                  {plan.features.slice(0, 3).map((feature, index) => <div key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>)}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className={`text-sm font-semibold ${plan.highlighted ? 'text-green-700' : 'text-gray-700'}`}>
                    Click to sign up →
                  </span>
                </div>
              </button>;
        })}
        </div>

        {/* Footer Links */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-6 text-sm">
            <button onClick={() => navigate('/')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
              About Gate
            </button>
            <button onClick={() => navigate('/demo')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
              See Demo
            </button>
            <button onClick={() => navigate('/pricing')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
              Full Pricing
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Protected by <button onClick={() => navigate('/')} className="font-semibold text-gray-900 hover:underline">Gate</button>
          </p>
        </div>
      </div>
    </div>
  </PageLayout>;
}
