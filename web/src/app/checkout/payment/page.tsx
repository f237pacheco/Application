'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { PLANS, toPlanKey, type PlanId, type Billing } from '@/lib/plans';
import { clsx } from 'clsx';

type PaymentMethod = 'stripe' | 'paypal';

const PLAN_PRICES = {
  starter: { monthly: 35, annualMonthly: 28, annualTotal: 336 },
  pro: { monthly: 89.99, annualMonthly: 70, annualTotal: 840 },
  enterprise: { monthly: 299.99, annualMonthly: 239, annualTotal: 2868 },
} as const;

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
  const planKey = toPlanKey(planId, accountType);

  const pricing = PLAN_PRICES[planId as keyof typeof PLAN_PRICES] ?? PLAN_PRICES.starter;
  const price = billing === 'annual' ? pricing.annualMonthly : pricing.monthly;
  const annualTotal = pricing.annualTotal;

  const [method, setMethod] = useState<PaymentMethod>('stripe');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [promoReferrer, setPromoReferrer] = useState('');
  const [isMasterCode, setIsMasterCode] = useState(false);

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
        setIsMasterCode(data.isMasterCode === true);
        setPromoReferrer(data.referrerName ?? '');
      } else {
        setPromoStatus('invalid');
        setIsMasterCode(false);
      }
    } catch {
      setPromoStatus('invalid');
      setIsMasterCode(false);
    }
  };

  const handleActivateFree = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiUrl}/api/payments/activate-free-enterprise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ promoCode: promoCode.trim().toUpperCase() }),
      });
      if (!res.ok) throw new Error();
      router.replace('/checkout/success?plan=enterprise');
    } catch {
      setError('Activation impossible. Vérifiez le code et réessayez.');
    } finally {
      setLoading(false);
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

          {/* Trust banner */}
          <div className="rounded-2xl px-5 py-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, rgba(0,214,143,0.12), rgba(0,184,148,0.08))', border: '1px solid rgba(0,214,143,0.3)' }}>
            <span className="text-2xl flex-shrink-0">🎁</span>
            <div>
              <p className="text-base font-bold" style={{ color: '#00D68F' }}>Vous ne serez pas débité pendant 3 jours</p>
              <p className="text-sm text-gray-400 mt-0.5">Annulez à tout moment pendant l'essai gratuit, sans frais.</p>
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
              <p className="text-2xl font-extrabold text-white">{price}€<span className="text-sm font-normal text-gray-400">/mois</span></p>
              {billing === 'annual' && (
                <p className="text-xs text-gray-500 mt-0.5">facturé {annualTotal}€/an</p>
              )}
            </div>
          </div>

          {/* Promo code */}
          <div className={clsx(
            'rounded-2xl border p-5 flex flex-col gap-3 transition-colors',
            isMasterCode
              ? 'bg-success-DEFAULT/5 border-success-DEFAULT/30'
              : 'bg-gray-900 border-gray-800'
          )}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Code promo (optionnel)</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  setPromoStatus('idle');
                  setIsMasterCode(false);
                }}
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
            {promoStatus === 'valid' && isMasterCode && (
              <div className="flex items-center gap-2">
                <span className="text-success-DEFAULT text-sm">✓</span>
                <p className="text-sm font-semibold text-success-DEFAULT">
                  Accès Enterprise activé — aucune carte bancaire requise
                </p>
              </div>
            )}
            {promoStatus === 'valid' && !isMasterCode && (
              <p className="text-xs text-success-DEFAULT">✓ Code valide — recommandé par {promoReferrer}</p>
            )}
            {promoStatus === 'invalid' && (
              <p className="text-xs text-red-400">Code introuvable ou invalide</p>
            )}
          </div>

          {/* Free activation CTA — shown when master promo code is validated */}
          {isMasterCode ? (
            <div className="bg-gray-900 rounded-2xl border border-success-DEFAULT/30 p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-center">
                <p className="text-white font-bold text-lg">Plan Enterprise</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['Accès complet', 'Illimité', 'Sans engagement', 'Sans carte bancaire'].map((tag) => (
                    <span key={tag} className="text-xs bg-success-DEFAULT/10 text-success-DEFAULT border border-success-DEFAULT/20 px-2.5 py-0.5 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
                  {error}
                </div>
              )}

              <Button
                onClick={handleActivateFree}
                loading={loading}
                fullWidth
                size="lg"
              >
                Activer mon accès Enterprise gratuitement
              </Button>
            </div>
          ) : (
            /* Normal payment method selection */
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 flex flex-col gap-4">
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
                <div className={clsx(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                  method === 'stripe' ? 'border-primary-500' : 'border-gray-600'
                )}>
                  {method === 'stripe' && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">{t('payment.payWithCard')}</p>
                  <div className="flex gap-2 mt-1.5">
                    {['VISA', 'MC', 'AMEX'].map((b) => (
                      <span key={b} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">{b}</span>
                    ))}
                  </div>
                </div>
                <div className="text-sm font-bold text-gray-400 shrink-0">stripe</div>
              </button>

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
                <div className={clsx(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                  method === 'paypal' ? 'border-[#009cde]' : 'border-gray-600'
                )}>
                  {method === 'paypal' && <div className="w-2.5 h-2.5 rounded-full bg-[#009cde]" />}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">{t('payment.payWithPaypal')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Payer via votre compte PayPal</p>
                </div>
                <div className="shrink-0 font-extrabold text-sm">
                  <span style={{ color: '#003087' }}>Pay</span>
                  <span style={{ color: '#009cde' }}>Pal</span>
                </div>
              </button>

              <div className="relative overflow-hidden rounded-xl">
                <Button
                  onClick={handlePay}
                  loading={loading}
                  fullWidth
                  size="lg"
                  className={method === 'paypal' ? 'bg-[#FFB800] hover:bg-[#F5B000] text-gray-900' : ''}
                >
                  {method === 'stripe' ? "Commencer l'essai gratuit ➜" : t('payment.payWithPaypal')}
                </Button>
                <div className="shimmer absolute inset-0 pointer-events-none rounded-xl" />
              </div>
            </div>
          )}

          {/* Security badges — hidden when master code active */}
          {!isMasterCode && (
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">🔒 SSL sécurisé</span>
              <span className="text-gray-700">·</span>
              <span className="flex items-center gap-1">✓ Annulation facile</span>
              <span className="text-gray-700">·</span>
              <span className="flex items-center gap-1">⭐ 4.9/5 satisfaction</span>
              <span className="text-gray-700">·</span>
              <span className="flex items-center gap-1">↩ Remboursement 30j</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
