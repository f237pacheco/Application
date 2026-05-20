'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { PLANS, toPlanKey, getPrice, type PlanId, type Billing } from '@/lib/plans';

type PaymentMethod = 'stripe' | 'paypal';

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['5 créations / mois', '2 services disponibles', 'Support email', 'Export PDF'],
  pro: ['30 créations / mois', 'Tous les services', 'Support prioritaire', 'Analytics avancés', 'API access'],
  enterprise: ['Créations illimitées', 'Tous les services', 'Support dédié 24/7', 'Onboarding personnalisé', 'SLA garanti', 'Facturation entreprise'],
};

const PLAN_COLORS: Record<string, { gradient: string; glow: string; badge: string }> = {
  starter:    { gradient: 'from-orange-500/20 to-orange-600/10', glow: 'rgba(249,115,22,0.25)', badge: '#fb923c' },
  pro:        { gradient: 'from-violet-500/20 to-violet-700/10', glow: 'rgba(108,92,231,0.3)',  badge: '#a78bfa' },
  enterprise: { gradient: 'from-emerald-500/20 to-emerald-700/10', glow: 'rgba(0,184,148,0.25)', badge: '#34d399' },
};

const TESTIMONIAL = {
  name: 'Sophie R.',
  role: 'Responsable marketing',
  text: 'Velona a divisé par 3 le temps passé sur la création de contenu. L\'essai gratuit m\'a convaincue en 24h.',
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
  const displayPrice = billing === 'annual'
    ? Math.round(monthlyPrice * 0.8)
    : monthlyPrice;
  const annualTotal = Math.round(monthlyPrice * 12 * 0.8);

  const [method, setMethod] = useState<PaymentMethod>('stripe');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'valid' | 'invalid' | 'loading'>('idle');
  const [promoReferrer, setPromoReferrer] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isMasterCode, setIsMasterCode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const planStyle = PLAN_COLORS[planId] ?? PLAN_COLORS.pro;
  const features = PLAN_FEATURES[planId] ?? PLAN_FEATURES.pro;

  const finalPrice = promoDiscount > 0
    ? Math.round(displayPrice * (1 - promoDiscount / 100))
    : displayPrice;

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

  const handlePay = async () => {
    try {
      setLoading(true);
      setError(null);

      if (method === 'stripe') {
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
      } else {
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
      }
    } catch {
      setError('Paiement impossible. Veuillez réessayer ou contacter le support.');
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
          style={{ top: '-15%', right: '-8%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(108,92,231,0.13) 0%, transparent 70%)' }}
          animate={{ x: [0, -50, 0], y: [0, 35, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div className="absolute rounded-full"
          style={{ bottom: '-10%', left: '-5%', width: 480, height: 480, background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)' }}
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div className="absolute rounded-full"
          style={{ top: '40%', left: '45%', width: 360, height: 360, background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)' }}
          animate={{ x: [0, -22, 0], y: [0, -18, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Header */}
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
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400" style={{ background: 'rgba(0,184,148,0.1)', border: '1px solid rgba(0,184,148,0.25)', padding: '4px 12px', borderRadius: 20 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
          SSL 256-bit
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">

          {/* ── LEFT COLUMN: Form ───────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="flex items-center gap-3 mb-2">
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

            {/* Free trial banner */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
              className="rounded-2xl px-5 py-4 flex items-start gap-4"
              style={{ background: 'linear-gradient(135deg, rgba(0,184,148,0.12), rgba(0,184,148,0.06))', border: '1px solid rgba(0,184,148,0.28)' }}
            >
              <span className="text-2xl shrink-0">🎁</span>
              <div>
                <p className="text-sm font-bold" style={{ color: '#34d399' }}>Vous ne serez pas débité pendant 3 jours</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">Annulez à tout moment pendant l&apos;essai gratuit, sans frais. Aucun engagement.</p>
              </div>
            </motion.div>

            {/* Plan selected */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl px-5 py-4"
              style={{ background: 'rgba(15,12,36,0.82)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Plan sélectionné</p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `rgba(${planId === 'enterprise' ? '0,184,148' : planId === 'pro' ? '108,92,231' : '249,115,22'},0.15)` }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={planStyle.badge}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-bold text-white capitalize">
                      {planId.charAt(0).toUpperCase() + planId.slice(1)}
                    </p>
                    <p className="text-xs text-gray-500">{billing === 'annual' ? 'Annuel · 20% de réduction' : 'Mensuel'}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-extrabold text-white">{displayPrice}€<span className="text-sm font-normal text-gray-500">/mois</span></p>
                  {billing === 'annual' && (
                    <p className="text-xs text-gray-600 mt-0.5">facturé {annualTotal}€/an</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Promo code */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
              className="rounded-2xl px-5 py-4"
              style={{
                background: isMasterCode ? 'rgba(0,184,148,0.06)' : 'rgba(15,12,36,0.82)',
                backdropFilter: 'blur(12px)',
                border: isMasterCode ? '1px solid rgba(0,184,148,0.3)' : '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Code promo (optionnel)</p>
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
                  className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 font-mono tracking-wider focus:outline-none focus:ring-1"
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
                  <motion.p key="master" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="mt-2 text-sm font-semibold" style={{ color: '#34d399' }}>
                    ✓ Accès Enterprise activé — aucune carte requise
                  </motion.p>
                )}
                {promoStatus === 'valid' && !isMasterCode && (
                  <motion.p key="valid" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="mt-2 text-xs" style={{ color: '#34d399' }}>
                    ✓ Code valide{promoReferrer ? ` — recommandé par ${promoReferrer}` : ''}{promoDiscount > 0 ? ` · -${promoDiscount}%` : ''}
                  </motion.p>
                )}
                {promoStatus === 'invalid' && (
                  <motion.p key="invalid" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="mt-2 text-xs text-red-400">
                    Code introuvable ou expiré
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Payment method */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-2xl px-5 py-5 flex flex-col gap-4"
              style={{ background: 'rgba(15,12,36,0.82)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Moyen de paiement</p>

              {error && (
                <div className="rounded-xl px-4 py-3 text-sm text-red-400 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}

              {isMasterCode ? (
                /* Free enterprise activation */
                <button
                  onClick={handleActivateFree}
                  disabled={loading}
                  className="w-full py-4 rounded-xl text-base font-bold text-white disabled:opacity-50 relative overflow-hidden group"
                  style={{ background: 'linear-gradient(135deg, #00b894, #00cec9)', boxShadow: '0 8px 28px rgba(0,184,148,0.35)' }}
                >
                  <span className="relative z-10">
                    {loading ? 'Activation…' : 'Activer mon accès Enterprise gratuitement →'}
                  </span>
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
                </button>
              ) : (
                <>
                  {/* Stripe radio */}
                  <button
                    onClick={() => setMethod('stripe')}
                    className="flex items-center gap-4 p-4 rounded-xl transition-all"
                    style={{
                      border: method === 'stripe' ? '1px solid rgba(108,92,231,0.6)' : '1px solid rgba(255,255,255,0.07)',
                      background: method === 'stripe' ? 'rgba(108,92,231,0.1)' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: method === 'stripe' ? '#6C5CE7' : 'rgba(255,255,255,0.2)' }}>
                      {method === 'stripe' && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#6C5CE7' }} />}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-white">Carte bancaire (Stripe)</p>
                      <div className="flex gap-2 mt-1.5">
                        {['VISA', 'MC', 'AMEX'].map((b) => (
                          <span key={b} className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}>{b}</span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <svg width="28" height="14" viewBox="0 0 60 28" fill="none">
                        <text x="0" y="20" fontSize="18" fontWeight="bold" fill="#635bff" fontFamily="sans-serif">stripe</text>
                      </svg>
                    </div>
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <span className="text-xs text-gray-600 font-medium">OU</span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  </div>

                  {/* PayPal radio */}
                  <button
                    onClick={() => setMethod('paypal')}
                    className="flex items-center gap-4 p-4 rounded-xl transition-all"
                    style={{
                      border: method === 'paypal' ? '1px solid rgba(0,156,222,0.4)' : '1px solid rgba(255,255,255,0.07)',
                      background: method === 'paypal' ? 'rgba(0,48,135,0.12)' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: method === 'paypal' ? '#009cde' : 'rgba(255,255,255,0.2)' }}>
                      {method === 'paypal' && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#009cde' }} />}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-white">PayPal</p>
                      <p className="text-xs text-gray-500 mt-0.5">Payer via votre compte PayPal</p>
                    </div>
                    <div className="shrink-0 font-extrabold text-sm">
                      <span style={{ color: '#003087' }}>Pay</span><span style={{ color: '#009cde' }}>Pal</span>
                    </div>
                  </button>

                  {/* CTA */}
                  <button
                    onClick={handlePay}
                    disabled={loading}
                    className="relative w-full py-4 rounded-xl text-base font-bold text-white disabled:opacity-50 overflow-hidden group"
                    style={{
                      background: method === 'paypal'
                        ? 'linear-gradient(135deg, #FFB800, #F5A800)'
                        : 'linear-gradient(135deg, #6C5CE7, #4834d4)',
                      boxShadow: method === 'paypal'
                        ? '0 8px 28px rgba(255,184,0,0.3)'
                        : '0 8px 28px rgba(108,92,231,0.4)',
                    }}
                  >
                    <span className="relative z-10" style={{ color: method === 'paypal' ? '#111' : '#fff' }}>
                      {loading ? 'Chargement…' : method === 'stripe' ? "Commencer l'essai gratuit →" : 'Payer avec PayPal →'}
                    </span>
                    {/* Shimmer */}
                    <motion.span
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)' }}
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
                    />
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />
                  </button>
                </>
              )}

              {/* Trust badges */}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-1">
                {[
                  { icon: '🔒', label: 'SSL sécurisé' },
                  { icon: '✓', label: 'Annulation facile' },
                  { icon: '⭐', label: '4.9/5' },
                  { icon: '↩', label: 'Remboursement 30j' },
                ].map(({ icon, label }) => (
                  <span key={label} className="text-xs text-gray-600 flex items-center gap-1">
                    <span>{icon}</span>{label}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── RIGHT COLUMN: Summary ───────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col gap-5 lg:sticky lg:top-8"
          >
            {/* Order summary card */}
            <div
              className="rounded-2xl p-6 flex flex-col gap-5"
              style={{ background: 'rgba(15,12,36,0.88)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: `0 0 60px ${planStyle.glow}` }}
            >
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Récapitulatif de commande</p>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-white capitalize">
                      Plan {planId.charAt(0).toUpperCase() + planId.slice(1)}
                    </p>
                    <p className="text-xs text-gray-500">{billing === 'annual' ? 'Facturation annuelle' : 'Facturation mensuelle'}</p>
                  </div>
                  <div className="text-right">
                    {promoDiscount > 0 && (
                      <p className="text-sm text-gray-600 line-through">{displayPrice}€/mois</p>
                    )}
                    <p className="text-2xl font-extrabold" style={{ color: planStyle.badge }}>{finalPrice}€<span className="text-sm font-normal text-gray-500">/mois</span></p>
                  </div>
                </div>
              </div>

              <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

              {/* Trial reminder */}
              <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(0,184,148,0.08)', border: '1px solid rgba(0,184,148,0.2)' }}>
                <span className="text-lg shrink-0">🎁</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: '#34d399' }}>3 jours d&apos;essai gratuit</p>
                  <p className="text-xs text-gray-500 mt-0.5">puis {finalPrice}€/mois après l&apos;essai</p>
                </div>
              </div>

              {/* Features */}
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Ce qui est inclus</p>
                <div className="flex flex-col gap-2.5">
                  {features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(52,211,153,0.15)' }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="#34d399">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      </div>
                      <p className="text-sm text-gray-300">{feature}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

              {/* Trust badges row */}
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
    </div>
  );
}
