'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

export default function CheckoutCancelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') ?? '';
  const service = searchParams.get('service') ?? '';

  const retryHref = plan
    ? `/checkout/payment?plan=${plan}${service ? `&service=${service}` : ''}`
    : '/checkout/plans';

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#080812' }}>
      {/* Background */}
      <div className="pointer-events-none select-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div className="absolute rounded-full"
          style={{ top: '-12%', right: '-6%', width: 440, height: 440, background: 'radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)' }}
          animate={{ x: [0, -30, 0], y: [0, 22, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div className="absolute rounded-full"
          style={{ bottom: '-8%', left: '-4%', width: 380, height: 380, background: 'radial-gradient(circle, rgba(108,92,231,0.08) 0%, transparent 70%)' }}
          animate={{ x: [0, 28, 0], y: [0, -24, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-7 text-center">

        {/* Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.25)' }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="rgba(248,113,113,0.9)">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </motion.div>

        {/* Text */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h1 className="text-2xl font-bold text-white mb-2">Paiement annulé</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Votre paiement a été annulé. Aucun montant n&apos;a été débité.
            Vous pouvez réessayer à tout moment.
          </p>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="flex flex-col gap-3 w-full"
        >
          <button
            onClick={() => router.push(retryHref)}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white relative overflow-hidden group"
            style={{ background: 'linear-gradient(135deg, #6C5CE7, #4834d4)', boxShadow: '0 8px 24px rgba(108,92,231,0.35)' }}
          >
            <span className="relative z-10">Réessayer le paiement →</span>
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Retourner au dashboard
          </button>
        </motion.div>

        <p className="text-xs text-gray-700">
          Un problème ? Contactez-nous à{' '}
          <a href="mailto:support@velona.io" className="text-gray-500 hover:text-gray-300 transition-colors">
            support@velona.io
          </a>
        </p>
      </div>
    </div>
  );
}
