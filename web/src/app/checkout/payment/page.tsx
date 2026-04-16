'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { PLANS, getPrice, toPlanKey, type PlanId, type Billing } from '@/lib/plans';
import { clsx } from 'clsx';

type PaymentMethod = 'stripe' | 'paypal';

export default function PaymentPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();

  const planId = (searchParams.get('plan') ?? 'starter') as PlanId;
  const billing = (searchParams.get('billing') ?? 'monthly') as Billing;
  const service = searchParams.get('service') ?? '';
  const accountType = 'individual'; // from profile in real app

  const plan = PLANS.find((p) => p.id === planId);
  const price = plan ? getPrice(plan, accountType, billing) : 0;
  const planKey = toPlanKey(planId, accountType);

  const [method, setMethod] = useState<PaymentMethod>('stripe');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [promoReferrer, setPromoReferrer] = useState('');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  const handlePromoCheck = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    try {
      const res = await fetch(`${apiUrl}/api/partner/validate-promo?code=${code}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.valid) {
        setPromoStatus('valid');
        setPromoReferrer(data.referrerName ?? '');
      } else {
        setPromoStatus('invalid');
      }
    } catch {
      setPromoStatus('invalid');
    }
  };

  const handlePay = async () => {
    try {
      setLoading(true);
      setError(null);

      if (method === 'stripe') {
        const res = await fetch(`${apiUrl}/api/payments/create-checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            planKey,
            billing,
            successUrl: `${appUrl}/checkout/success?plan=${planId}`,
            cancelUrl: `${appUrl}/checkout/cancel`,
            promoCode: promoStatus === 'valid' ? promoCode.trim().toUpperCase() : undefined,
          }),
        });

        if (!res.ok) throw new Error('Checkout creation failed');
        const { url } = await res.json();
        window.location.href = url;
      } else {
        // PayPal
        const res = await fetch(`${apiUrl}/api/payments/create-paypal-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            planKey,
            billing,
            successUrl: `${appUrl}/checkout/success?plan=${planId}&provider=paypal`,
            cancelUrl: `${appUrl}/checkout/cancel`,
          }),
        });

        if (!res.ok) throw new Error('PayPal subscription creation failed');
        const { approveUrl } = await res.json();
        window.location.href = approveUrl;
      }
    } catch {
      setError(t('payment.errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  const backHref = service ? `/plans?service=${service}` : '/plans';

  if (!plan) {
    router.replace('/plans');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-900 px-6 py-4">
        <BackButton href={backHref} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md flex flex-col gap-5">

          <h1 className="text-2xl font-bold text-white text-center">
            {t('payment.title')}
          </h1>

          {/* Free trial notice */}
          <div className="bg-success-DEFAULT/10 border border-success-DEFAULT/30 rounded-2xl px-5 py-4 flex items-center gap-3">
            <span className="text-2xl">🎁</span>
            <div>
              <p className="text-sm font-bold text-success-DEFAULT">
                {t('payment.freeTrialNotice')}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Annulez à tout moment pendant l'essai, sans frais.
              </p>
            </div>
          </div>

          {/* Plan summary */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Plan sélectionné</p>
              <p className="text-white font-semibold">
                {t(`plans.${planId}.name`)} · {billing === 'monthly' ? t('plans.monthly') : t('plans.annual')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-white">{price}€</p>
              <p className="text-xs text-gray-500">{t('plans.perMonth')}</p>
            </div>
          </div>

          {/* Promo code */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Code promo (optionnel)</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoStatus('idle'); }}
                placeholder="EX : VELONA123"
                maxLength={20}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm
                  placeholder-gray-600 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary-500
                  focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={handlePromoCheck}
                disabled={!promoCode.trim()}
                className="px-4 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-400
                  hover:border-primary-500 hover:text-primary-300 disabled:opacity-40 transition-all"
              >
                Valider
              </button>
            </div>
            {promoStatus === 'valid' && (
              <p className="text-xs text-success-DEFAULT">✓ Code valide — recommandé par {promoReferrer}</p>
            )}
            {promoStatus === 'invalid' && (
              <p className="text-xs text-red-400">Code introuvable ou invalide</p>
            )}
          </div>

          {/* Payment method selection */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 flex flex-col gap-4">
            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Stripe option */}
            <button
              onClick={() => setMethod('stripe')}
              className={clsx(
                'flex items-center gap-4 p-4 rounded-xl border transition-all duration-200',
                method === 'stripe'
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              )}
            >
              {/* Radio */}
              <div className={clsx(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                method === 'stripe' ? 'border-primary-500' : 'border-gray-600'
              )}>
                {method === 'stripe' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                )}
              </div>

              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-white">{t('payment.payWithCard')}</p>
                <div className="flex gap-2 mt-1.5">
                  {/* Card brand icons */}
                  {['VISA', 'MC', 'AMEX'].map((b) => (
                    <span
                      key={b}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-700 text-gray-300"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stripe logo */}
              <div className="text-sm font-bold text-gray-400 shrink-0">stripe</div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-600 font-medium">OU</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* PayPal option */}
            <button
              onClick={() => setMethod('paypal')}
              className={clsx(
                'flex items-center gap-4 p-4 rounded-xl border transition-all duration-200',
                method === 'paypal'
                  ? 'border-[#003087]/50 bg-[#003087]/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              )}
            >
              {/* Radio */}
              <div className={clsx(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                method === 'paypal' ? 'border-[#009cde]' : 'border-gray-600'
              )}>
                {method === 'paypal' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#009cde]" />
                )}
              </div>

              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-white">{t('payment.payWithPaypal')}</p>
                <p className="text-xs text-gray-500 mt-0.5">Payer via votre compte PayPal</p>
              </div>

              {/* PayPal logo */}
              <div className="shrink-0 font-extrabold text-sm">
                <span style={{ color: '#003087' }}>Pay</span>
                <span style={{ color: '#009cde' }}>Pal</span>
              </div>
            </button>

            {/* Pay CTA */}
            <Button
              onClick={handlePay}
              loading={loading}
              fullWidth
              size="lg"
              className={method === 'paypal' ? 'bg-[#FFB800] hover:bg-[#F5B000] text-gray-900' : ''}
            >
              {method === 'stripe' ? t('payment.payWithCard') : t('payment.payWithPaypal')}
            </Button>
          </div>

          {/* Security badge */}
          <p className="text-center text-xs text-gray-600 flex items-center justify-center gap-1.5">
            <span>🔒</span>
            {t('payment.secure')}
          </p>
        </div>
      </div>
    </div>
  );
}
