'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

const CONFETTI_COLORS = ['#6C5CE7', '#a78bfa', '#34d399', '#fbbf24', '#f97316', '#60a5fa', '#f472b6'];

function ConfettiPiece({ color, delay, x, size }: { color: string; delay: number; x: number; size: number }) {
  return (
    <motion.div
      className="absolute top-0 rounded-sm pointer-events-none"
      style={{ left: `${x}%`, width: size, height: size * 1.6, background: color, originX: '50%', originY: '0%' }}
      initial={{ y: -20, opacity: 1, rotate: 0, scaleX: 1 }}
      animate={{ y: ['0vh', '110vh'], opacity: [1, 1, 0], rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)], scaleX: [1, 0.4, 1, 0.3] }}
      transition={{ duration: 3 + Math.random() * 2, delay, ease: 'easeIn' }}
    />
  );
}

function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 1.5,
    x: Math.random() * 100,
    size: 6 + Math.floor(Math.random() * 8),
  }));
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-20">
      {pieces.map((p) => <ConfettiPiece key={p.id} {...p} />)}
    </div>
  );
}

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  starter:    { label: 'Starter',    color: '#fb923c', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)' },
  pro:        { label: 'Pro',        color: '#a78bfa', bg: 'rgba(108,92,231,0.12)',  border: 'rgba(108,92,231,0.35)' },
  enterprise: { label: 'Enterprise', color: '#34d399', bg: 'rgba(0,184,148,0.12)',   border: 'rgba(0,184,148,0.3)' },
};

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();

  const planId = searchParams.get('plan') ?? '';
  const provider = searchParams.get('provider') ?? 'stripe';
  const subscriptionId = searchParams.get('subscription_id') ?? '';

  const [activating, setActivating] = useState(provider === 'paypal' && !!subscriptionId);
  const [checkVisible, setCheckVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const planInfo = PLAN_LABELS[planId] ?? PLAN_LABELS.pro;

  // PayPal activation
  useEffect(() => {
    if (provider !== 'paypal' || !subscriptionId || !session?.access_token) return;
    fetch(`${apiUrl}/api/payments/paypal-success?subscription_id=${subscriptionId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .catch(() => null)
      .finally(() => setActivating(false));
  }, [provider, subscriptionId, session, apiUrl]);

  // Trigger check + confetti after mount
  useEffect(() => {
    const t1 = setTimeout(() => setCheckVisible(true), 300);
    const t2 = setTimeout(() => setShowConfetti(true), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#080812' }}>
      {/* Background */}
      <div className="pointer-events-none select-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div className="absolute rounded-full"
          style={{ top: '-10%', right: '-8%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(52,211,153,0.1) 0%, transparent 70%)' }}
          animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div className="absolute rounded-full"
          style={{ bottom: '-8%', left: '-4%', width: 420, height: 420, background: 'radial-gradient(circle, rgba(108,92,231,0.1) 0%, transparent 70%)' }}
          animate={{ x: [0, 35, 0], y: [0, -28, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Confetti */}
      {showConfetti && !activating && <Confetti />}

      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-8 text-center">

        {/* Animated checkmark */}
        <div className="relative">
          {/* Outer pulse ring */}
          <AnimatePresence>
            {checkVisible && (
              <motion.div
                key="ring"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.2, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                className="absolute rounded-full"
                style={{ inset: -16, border: '2px solid rgba(52,211,153,0.4)' }}
              />
            )}
          </AnimatePresence>

          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={checkVisible ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -30 }}
            transition={{ type: 'spring', stiffness: 280, damping: 20 }}
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(52,211,153,0.12)', border: '2px solid rgba(52,211,153,0.35)', boxShadow: '0 0 60px rgba(52,211,153,0.2)' }}
          >
            {activating ? (
              <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#34d399', borderTopColor: 'transparent' }} />
            ) : (
              <motion.svg
                width="48" height="48" viewBox="0 0 24 24" fill="none"
                initial={{ opacity: 0 }}
                animate={checkVisible ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.path
                  d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                  fill="#34d399"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
                />
              </motion.svg>
            )}
          </motion.div>
        </div>

        {/* Heading */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h1 className="text-3xl font-bold text-white mb-3">
            {activating ? 'Activation en cours…' : 'Votre abonnement est actif !'}
          </h1>
          <p className="text-gray-400 leading-relaxed">
            {activating
              ? 'Nous activons votre abonnement PayPal, quelques secondes…'
              : 'Bienvenue dans Velona ! Votre essai gratuit de 3 jours commence maintenant. Aucun débit pendant cette période.'}
          </p>
        </motion.div>

        {!activating && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="flex flex-col items-center gap-5 w-full">
            {/* Plan badge */}
            {planId && (
              <div className="flex items-center gap-2 px-5 py-2 rounded-full" style={{ background: planInfo.bg, border: `1px solid ${planInfo.border}` }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={planInfo.color}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span className="text-sm font-semibold" style={{ color: planInfo.color }}>
                  Plan {planInfo.label} activé
                </span>
              </div>
            )}

            {/* Free trial reminder */}
            <div className="w-full rounded-2xl px-5 py-4 flex items-start gap-3 text-left" style={{ background: 'rgba(15,12,36,0.82)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="text-xl shrink-0">📅</span>
              <div>
                <p className="text-sm font-semibold text-white mb-0.5">Rappel essai gratuit</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Votre carte ne sera <strong className="text-white">pas débitée</strong> pendant 3 jours.
                  Annulez à tout moment depuis votre compte, sans frais.
                </p>
              </div>
            </div>

            {/* CTA */}
            <motion.button
              onClick={() => router.replace('/dashboard')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative w-full py-4 rounded-xl text-base font-bold text-white overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #6C5CE7, #4834d4)', boxShadow: '0 8px 28px rgba(108,92,231,0.4)' }}
            >
              <span className="relative z-10">Accéder à mon dashboard →</span>
              <motion.span
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)' }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
              />
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
