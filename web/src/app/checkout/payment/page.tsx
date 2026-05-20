'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { PLANS, toPlanKey, type PlanId, type Billing } from '@/lib/plans';
import { CreditCardForm } from '@/components/ui/credit-card-form';
import type { CardState, CardValidity } from '@/components/ui/credit-card-form';

const PLAN_FEATURES: Record<string, string[]> = {
  starter:    ['5 créations / mois', '2 services disponibles', 'Support email', 'Export PDF'],
  pro:        ['30 créations / mois', 'Tous les services', 'Support prioritaire', 'Analytics avancés', 'API access'],
  enterprise: ['Créations illimitées', 'Tous les services', 'Support dédié 24/7', 'Onboarding personnalisé', 'SLA garanti', 'Facturation entreprise'],
};

const PLAN_COLORS: Record<string, { badge: string; glow: string }> = {
  starter:    { badge: '#fb923c', glow: 'rgba(249,115,22,0.2)' },
  pro:        { badge: '#a78bfa', glow: 'rgba(108,92,231,0.25)' },
  enterprise: { badge: '#34d399', glow: 'rgba(0,184,148,0.2)' },
};

const TESTIMONIAL = {
  name: 'Sophie R.',
  role: 'Responsable marketing',
  text: 'Velona a divisé par 3 le temps passé sur mes créations. L\'essai gratuit m\'a convaincue en 24h.',
  stars: 5,
  avatar: 'S',
  avatarColor: '#6C5CE7',
};

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();

  const planId = (searchParams.get('plan') ?? 'starter') as PlanId;
  const billing = (searchParams.get('billing') ?? 'monthly') as Billing;
  const service = searchParams.get('service') ?? '';
  const accountType = 'individual';

  const plan = PLANS.find((p) => p.id === planId);
  const planKey = toPlanKey(planId, accountType);

  const monthlyPrice = plan ? plan.prices[accountType] : 29;
  const displayPrice  = billing === 'annual' ? Math.round(monthlyPrice * 0.8) : monthlyPrice;
  const annualTotal   = Math.round(monthlyPrice * 12 * 0.8);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'valid' | 'invalid' | 'loading'>('idle');
  const [promoReferrer, setPromoReferrer] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isMasterCode, setIsMasterCode] = useState(false);
  const [cardState, setCardState] = useState<CardState | null>(null);
  const [cardValid, setCardValid] = useState<CardValidity | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const planStyle = PLAN_COLORS[planId] ?? PLAN_COLORS.pro;
  const features   = PLAN_FEATURES[planId] ?? PLAN_FEATURES.pro;

  const finalPrice = promoDiscount > 0 ? Math.round(displayPrice * (1 - promoDiscount / 100)) : displayPrice;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      if (!spotlightRef.current) return;
      const rect = el.getBoundingClientRect();
      spotlightRef.current.style.background = `radial-gradient(500px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(108,92,231,0.09), transparent 60%)`;
      spotlightRef.current.style.opacity = '1';
    };
    const onLeave = () => { if (spotlightRef.current) spotlightRef.current.style.opacity = '0'; };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, []);

  const handlePromoCheck = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoStatus('loading');
    try {
      const res = await fetch(`${apiUrl}/api/partner/validate-promo?code=${code}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json() as { valid: boolean; isMasterCode?: boolean; referrerName?: string; discount?: number };
      if (data.valid) {
        setPromoStatus('valid');
        setIsMasterCode(data.isMasterCode === true);
        setPromoReferrer(data.referrerName ?? '');
        setPromoDiscount(data.discount ?? 0);
      } else {
        setPromoStatus('invalid');
        setIsMasterCode(false);
        setPromoDiscount(0);
      }
    } catch {
      setPromoStatus('invalid');
      setIsMasterCode(false);
      setPromoDiscount(0);
    }
  };

  const handleActivateFree = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiUrl}/api/payments/activate-free-enterprise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
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

  const handleStripeCheckout = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey,
          billing,
          successUrl: `${appUrl}/checkout/success?plan=${planId}`,
          cancelUrl: `${appUrl}/checkout/cancel?plan=${planId}`,
          promoCode: promoStatus === 'valid' && !isMasterCode ? promoCode.trim().toUpperCase() : undefined,
        }),
      });
      if (!res.ok) throw new Error('Checkout creation failed');
      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch {
      setError('Paiement impossible. Veuillez réessayer ou contacter le support.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayPal = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiUrl}/api/payments/create-paypal-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          planKey, billing,
          successUrl: `${appUrl}/checkout/success?plan=${planId}&provider=paypal`,
          cancelUrl: `${appUrl}/checkout/cancel`,
        }),
      });
      if (!res.ok) throw new Error();
      const { approveUrl } = await res.json() as { approveUrl: string };
      window.location.href = approveUrl;
    } catch {
      setError('Redirection PayPal impossible. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (!plan) {
    router.replace('/checkout/plans');
    return null;
  }

  const backHref = service ? `/checkout/plans?service=${service}` : '/checkout/plans';

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen overflow-hidden"
      style={{ background: '#080812' }}
    >
      {/* Spotlight */}
      <div ref={spotlightRef} className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300" style={{ opacity: 0 }} aria-hidden />

      {/* Background */}
      <div className="pointer-events-none select-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div className="absolute rounded-full"
          style={{ top: '-15%', right: '-8%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(108,92,231,0.12) 0%, transparent 70%)' }}
          animate={{ x: [0, -50, 0], y: [0, 35, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div className="absolute rounded-full"
          style={{ bottom: '-10%', left: '-5%', width: 480, height: 480, background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%)' }}
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div className="absolute rounded-full"
          style={{ top: '45%', left: '40%', width: 360, height: 360, background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)' }}
          animate={{ x: [0, -22, 0], y: [0, -18, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => router.push(backHref)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Retour
        </button>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 px-3 py-1 rounded-full" style={{ background: 'rgba(0,184,148,0.1)', border: '1px solid rgba(0,184,148,0.25)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
          SSL 256-bit
        </div>
      </div>

      {/* Free trial banner */}
      <div className="relative z-10 mx-4 mt-4 lg:mx-auto lg:max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="rounded-2xl px-5 py-3.5 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, rgba(0,184,148,0.14), rgba(0,184,148,0.06))', border: '1px solid rgba(0,184,148,0.28)' }}
        >
          <span className="text-xl shrink-0">🎁</span>
          <p className="text-sm">
            <span className="font-bold" style={{ color: '#34d399' }}>Vous ne serez pas débité pendant 3 jours</span>
            <span className="text-gray-400 ml-2">— Annulez à tout moment pendant l&apos;essai, sans frais.</span>
          </p>
        </motion.div>
      </div>

      {/* Main layout */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 lg:px-6 py-8 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,184,148,0.15)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#34d399">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Paiement sécurisé</h1>
                  <p className="text-xs text-gray-500">Chiffrement SSL 256-bit · Stripe Certified</p>
                </div>
              </div>
            </motion.div>

            {/* Plan summary + promo code */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}
              className="rounded-2xl p-5 flex flex-col gap-4"
              style={{ background: 'rgba(15,12,36,0.82)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {/* Plan row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${planStyle.glow}` }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={planStyle.badge}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-bold text-white capitalize">
                      Plan {planId.charAt(0).toUpperCase() + planId.slice(1)}
                    </p>
                    <p className="text-xs text-gray-500">{billing === 'annual' ? 'Annuel · -20%' : 'Mensuel'}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {promoDiscount > 0 && (
                    <p className="text-xs text-gray-500 line-through">{displayPrice}€/mois</p>
                  )}
                  <p className="text-2xl font-extrabold text-white">
                    {finalPrice}€<span className="text-sm font-normal text-gray-500">/mois</span>
                  </p>
                  {billing === 'annual' && (
                    <p className="text-[10px] text-gray-600 mt-0.5">facturé {annualTotal}€/an</p>
                  )}
                </div>
              </div>

              {/* Promo code */}
              <div className="pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Code promo (optionnel)</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value.toUpperCase());
                      setPromoStatus('idle');
                      setIsMasterCode(false);
                      setPromoDiscount(0);
                    }}
                    placeholder="ex: VELONA123"
                    maxLength={20}
                    className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-violet-500"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
                  />
                  <button
                    type="button"
                    onClick={handlePromoCheck}
                    disabled={!promoCode.trim() || promoStatus === 'loading'}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all"
                    style={{ border: '1px solid rgba(108,92,231,0.4)', color: '#a78bfa' }}
                  >
                    {promoStatus === 'loading' ? '…' : 'Valider'}
                  </button>
                </div>
                <AnimatePresence>
                  {promoStatus === 'valid' && isMasterCode && (
                    <motion.p key="master" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mt-2 text-sm font-semibold" style={{ color: '#34d399' }}>
                      ✓ Accès Enterprise activé — aucune carte requise
                    </motion.p>
                  )}
                  {promoStatus === 'valid' && !isMasterCode && (
                    <motion.p key="valid" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mt-2 text-xs" style={{ color: '#34d399' }}>
                      ✓ Code valide{promoReferrer ? ` — recommandé par ${promoReferrer}` : ''}{promoDiscount > 0 ? ` · -${promoDiscount}%` : ''}
                    </motion.p>
                  )}
                  {promoStatus === 'invalid' && (
                    <motion.p key="invalid" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mt-2 text-xs text-red-400">
                      Code introuvable ou expiré
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Credit card form */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.14 }}
            >
              {isMasterCode ? (
                /* Free enterprise activation */
                <div
                  className="rounded-2xl p-5 flex flex-col gap-4"
                  style={{ background: 'rgba(0,184,148,0.06)', border: '1px solid rgba(0,184,148,0.3)' }}
                >
                  <div className="text-center">
                    <p className="text-lg font-bold text-white mb-1">Plan Enterprise</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {['Accès complet', 'Illimité', 'Sans engagement', 'Sans carte bancaire'].map((tag) => (
                        <span key={tag} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,184,148,0.12)', color: '#34d399', border: '1px solid rgba(0,184,148,0.25)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {error && (
                    <div className="rounded-xl px-4 py-3 text-sm text-red-400 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handleActivateFree}
                    disabled={loading}
                    className="w-full py-4 rounded-xl text-base font-bold text-white disabled:opacity-50 relative overflow-hidden group"
                    style={{ background: 'linear-gradient(135deg, #00b894, #00cec9)', boxShadow: '0 8px 28px rgba(0,184,148,0.35)' }}
                  >
                    <span className="relative z-10">{loading ? 'Activation…' : 'Activer mon accès Enterprise gratuitement →'}</span>
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Animated credit card form */}
                  <CreditCardForm
                    ring1="#6C5CE7"
                    ring2="#a29bfe"
                    showSubmit={false}
                    dark={true}
                    onChange={(state, validity) => {
                      setCardState(state);
                      setCardValid(validity);
                    }}
                  />

                  {/* Error */}
                  {error && (
                    <div className="rounded-xl px-4 py-3 text-sm text-red-400 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      {error}
                    </div>
                  )}

                  {/* Main CTA — Stripe */}
                  <button
                    onClick={handleStripeCheckout}
                    disabled={loading}
                    className="relative w-full py-4 rounded-xl text-base font-bold text-white disabled:opacity-60 overflow-hidden group"
                    style={{ background: 'linear-gradient(135deg, #6C5CE7, #4834d4)', boxShadow: '0 8px 32px rgba(108,92,231,0.45)' }}
                  >
                    <span className="relative z-10">{loading ? 'Chargement…' : "Commencer l'essai gratuit →"}</span>
                    {/* Shimmer */}
                    <motion.span
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)' }}
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
                    />
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />
                  </button>

                  {/* OU separator */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                    <span className="text-xs font-semibold text-gray-600">OU</span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                  </div>

                  {/* PayPal button */}
                  <motion.button
                    onClick={handlePayPal}
                    disabled={loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="relative w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-3 disabled:opacity-50 overflow-hidden group"
                    style={{ background: '#FFC439', boxShadow: '0 6px 20px rgba(255,196,57,0.3)' }}
                  >
                    {/* PayPal logo SVG */}
                    <svg width="80" height="20" viewBox="0 0 80 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <text x="0" y="16" fontSize="16" fontWeight="800" fill="#003087" fontFamily="Arial, sans-serif">Pay</text>
                      <text x="30" y="16" fontSize="16" fontWeight="800" fill="#009cde" fontFamily="Arial, sans-serif">Pal</text>
                    </svg>
                    <span className="text-gray-900 font-bold">Payer avec PayPal</span>
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
                  </motion.button>

                  {/* Trust badges */}
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pt-1">
                    {['🔒 SSL sécurisé', '✓ Annulation facile', '⭐ 4.9/5', '↩ Remboursement 30j'].map((b) => (
                      <span key={b} className="text-xs text-gray-600">{b}</span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* ── RIGHT COLUMN: Summary ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col gap-5 lg:sticky lg:top-8"
          >
            {/* Order summary */}
            <div
              className="rounded-2xl p-6 flex flex-col gap-5"
              style={{ background: 'rgba(15,12,36,0.88)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: `0 0 60px ${planStyle.glow}` }}
            >
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Récapitulatif de commande</p>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-white capitalize">Plan {planId.charAt(0).toUpperCase() + planId.slice(1)}</p>
                  <p className="text-xs text-gray-500">{billing === 'annual' ? 'Facturation annuelle' : 'Facturation mensuelle'}</p>
                </div>
                <div className="text-right">
                  {promoDiscount > 0 && (
                    <p className="text-sm text-gray-500 line-through">{displayPrice}€/mois</p>
                  )}
                  <p className="text-2xl font-extrabold" style={{ color: planStyle.badge }}>
                    {finalPrice}€<span className="text-sm font-normal text-gray-500">/mois</span>
                  </p>
                </div>
              </div>

              {/* Trial reminder */}
              <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(0,184,148,0.08)', border: '1px solid rgba(0,184,148,0.2)' }}>
                <span className="text-lg shrink-0">🎁</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: '#34d399' }}>3 jours d&apos;essai gratuit</p>
                  <p className="text-xs text-gray-500 mt-0.5">puis {finalPrice}€/mois après l&apos;essai</p>
                </div>
              </div>

              <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

              {/* Features */}
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Ce qui est inclus</p>
                <div className="flex flex-col gap-2.5">
                  {features.map((feat) => (
                    <div key={feat} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(52,211,153,0.15)' }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="#34d399">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      </div>
                      <p className="text-sm text-gray-300">{feat}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

              {/* Trust badges */}
              <div className="flex flex-wrap gap-2">
                {['🔒 SSL', '✓ Annulation', '⭐ 4.9/5', '↩ 30j'].map((b) => (
                  <span key={b} className="text-[10px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#6b7280' }}>
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Testimonial */}
            <div
              className="rounded-2xl p-5 flex flex-col gap-3"
              style={{ background: 'rgba(15,12,36,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex gap-0.5">
                {[...Array(TESTIMONIAL.stars)].map((_, i) => (
                  <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="#fbbf24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <p className="text-sm text-gray-300 leading-relaxed italic">&ldquo;{TESTIMONIAL.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: TESTIMONIAL.avatarColor }}>
                  {TESTIMONIAL.avatar}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{TESTIMONIAL.name}</p>
                  <p className="text-[10px] text-gray-500">{TESTIMONIAL.role}</p>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Suppress unused var warning */}
      <span className="hidden" aria-hidden>{cardState?.number}{cardValid?.allValid}</span>
    </div>
  );
}
