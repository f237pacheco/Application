'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { PLANS, getMonthlyEquivalent, type PlanId, type Billing } from '@/lib/plans';
import { clsx } from 'clsx';

type AccountType = 'individual' | 'professional';

export default function PlansPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  useAuth();

  const serviceId = searchParams.get('service');
  const prompt = searchParams.get('prompt');

  const [billing, setBilling] = useState<Billing>('monthly');
  const [accountType] = useState<AccountType>('individual');
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPlan = (planId: PlanId) => {
    try {
      setLoadingPlan(planId);
      const plan = PLANS.find((p) => p.id === planId)!;
      const params = new URLSearchParams({
        plan: planId,
        billing,
        ...(serviceId ? { service: serviceId } : {}),
        ...(prompt ? { prompt } : {}),
      });
      if (plan.requiresBusinessInfo || (planId === 'pro' && accountType === 'professional')) {
        router.push(`/checkout/business-info?${params}`);
        return;
      }
      router.push(`/checkout/payment?${params}`);
    } finally {
      setLoadingPlan(null);
    }
  };

  const planFeatures: Record<PlanId, string[]> = {
    starter: t('plans.starter.features', { returnObjects: true }) as string[],
    pro: t('plans.pro.features', { returnObjects: true }) as string[],
    enterprise: t('plans.enterprise.features', { returnObjects: true }) as string[],
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-900 px-6 py-4">
        <BackButton href={serviceId ? `/services/${serviceId}` : '/dashboard'} />
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">{t('plans.title')}</h1>
          <p className="text-gray-400 mt-2">{t('plans.subtitle')}</p>
        </div>

        {/* Billing toggle */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <span className={clsx('text-sm font-medium transition-colors', billing === 'monthly' ? 'text-white' : 'text-gray-500')}>
              {t('plans.monthly')}
            </span>

            {/* Toggle pill — overflow-hidden clips the knob, left-0 pins its origin */}
            <button
              onClick={() => setBilling((b) => b === 'monthly' ? 'annual' : 'monthly')}
              aria-label="Basculer mensuel / annuel"
              className={clsx(
                'relative flex-shrink-0 w-12 h-6 rounded-full overflow-hidden transition-colors duration-200',
                billing === 'annual' ? 'bg-primary-500' : 'bg-gray-700'
              )}
            >
              <span
                className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200"
                style={{ transform: billing === 'annual' ? 'translateX(28px)' : 'translateX(4px)' }}
              />
            </button>

            <span className={clsx('text-sm font-medium transition-colors', billing === 'annual' ? 'text-white' : 'text-gray-500')}>
              {t('plans.annual')}
            </span>
          </div>
          {/* Fixed-height slot — prevents row from shifting when badge appears */}
          <div style={{ height: 24, display: 'flex', alignItems: 'center' }}>
            {billing === 'annual' && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-success-DEFAULT/20 text-success-DEFAULT border border-success-DEFAULT/30">
                {t('plans.annualDiscount')}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => {
            const price = billing === 'monthly'
              ? plan.prices[accountType]
              : getMonthlyEquivalent(plan, accountType);
            const isLoading = loadingPlan === plan.id;
            const features = planFeatures[plan.id];

            return (
              <div
                key={plan.id}
                className={clsx(
                  'relative rounded-2xl border p-6 flex flex-col gap-5 transition-all duration-200',
                  plan.recommended
                    ? 'border-primary-500 bg-primary-500/5 shadow-lg shadow-primary-500/10'
                    : 'border-gray-800 bg-gray-900'
                )}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      {t('plans.recommended')}
                    </span>
                  </div>
                )}

                <div>
                  <h2 className="text-lg font-bold text-white">{t(`plans.${plan.id}.name`)}</h2>
                  <p className="text-gray-400 text-sm mt-0.5">{t(`plans.${plan.id}.tagline`)}</p>
                </div>

                <div>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-white">{price}€</span>
                    <span className="text-gray-500 text-sm mb-1">{t('plans.perMonth')}</span>
                  </div>
                  {billing === 'annual' && (
                    <p className="text-xs text-gray-600 mt-0.5">soit {price * 12}€/an</p>
                  )}
                </div>

                <ul className="flex flex-col gap-2.5 flex-1">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-success-DEFAULT mt-0.5 shrink-0">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  loading={isLoading}
                  fullWidth
                  variant={plan.recommended ? 'primary' : 'outline'}
                >
                  {t('plans.tryFree')}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-600">
          {t('payment.freeTrialNotice')} — {t('payment.secure')}
        </p>
      </div>
    </div>
  );
}
