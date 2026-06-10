'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import NumberFlow from '@number-flow/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useProfile } from '@/hooks/useProfile'
import { VerticalCutReveal } from './vertical-cut-reveal'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 35,
    annualPrice: 28,
    description: 'Pour démarrer et tester Velona',
    badge: null,
    highlighted: false,
    planKeys: ['starter_individual', 'starter_professional'],
    stars: '4.7',
    userCount: '1 240 utilisateurs',
    features: [
      '5 générations par mois',
      '2 services IA disponibles',
      'Tableau de bord basique',
      'Rapport mensuel',
      'Support par email',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 89.99,
    annualPrice: 70,
    description: 'L\'essentiel pour les professionnels',
    badge: 'Meilleur rapport qualité/prix',
    highlighted: true,
    planKeys: ['pro_individual', 'pro_professional'],
    stars: '4.9',
    userCount: '3 820 utilisateurs',
    features: [
      '30 générations par mois',
      'Tous les services IA',
      'Statistiques avancées',
      'Contenu personnalisé IA',
      'Support prioritaire',
      'Rapport détaillé',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 299.99,
    annualPrice: 239,
    description: 'Puissance illimitée pour votre équipe',
    badge: null,
    highlighted: false,
    planKeys: ['enterprise'],
    stars: '5.0',
    userCount: '420 équipes',
    features: [
      'Générations illimitées',
      'Tous les services IA',
      'Tableau de bord manager',
      'Accès API',
      'Intégrations sur mesure',
      'Rapports personnalisés',
      'Support dédié 24/7',
    ],
  },
]

const PLAN_KEYWORDS: Record<string, string[]> = {
  starter: ['IA', 'Site web', 'Rapide'],
  pro: ['Illimité', 'Analytics', 'Prioritaire'],
  enterprise: ['API', 'Équipe', 'Sur mesure'],
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

function formatOfferCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export function PricingSection() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useProfile()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [offerSeconds, setOfferSeconds] = useState(23 * 3600 + 47 * 60 + 12)
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => {
      setOfferSeconds((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const serviceId = searchParams.get('service')
  const prompt = searchParams.get('prompt')

  const activePlanKey = profile?.plan_key ?? null

  const handleSelect = (planId: string) => {
    const params = new URLSearchParams({
      plan: planId,
      billing,
      ...(serviceId ? { service: serviceId } : {}),
      ...(prompt ? { prompt } : {}),
    })
    router.push(`/checkout/payment?${params}`)
  }

  const annualSaving = (plan: typeof PLANS[0]) =>
    Math.round(100 - (plan.annualPrice / plan.monthlyPrice) * 100)

  return (
    <div
      className="relative overflow-hidden min-h-screen flex flex-col items-center px-4 py-16 sm:py-24"
      style={{ background: '#09090B' }}
    >
      <div className="page-beam" />

      {/* Heading */}
      <div className="text-center mb-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white overflow-hidden">
          <VerticalCutReveal
            staggerDuration={0.08}
            staggerFrom="first"
            transition={{ type: 'spring', stiffness: 180, damping: 20 }}
          >
            Choisissez votre plan
          </VerticalCutReveal>
        </h1>
        <motion.p
          className="mt-4 text-gray-400 text-lg"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          Essai gratuit 3 jours — sans carte bancaire requise
        </motion.p>
        <motion.div
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: 'rgba(15,15,20,0.7)', border: '1px solid rgba(245,158,11,0.3)' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4 }}
        >
          <span className="text-sm font-medium" style={{ color: '#F59E0B' }}>
            Offre d&apos;essai disponible encore{' '}
            <span className="font-mono font-bold">{formatOfferCountdown(offerSeconds)}</span>
          </span>
        </motion.div>
      </div>

      {/* Billing toggle */}
      <motion.div
        className="flex flex-col items-center gap-3 mb-14"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <div className="flex items-center gap-4 rounded-full px-2 py-1.5" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={() => setBilling('monthly')}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150',
              billing === 'monthly'
                ? 'bg-[#6366F1] text-white shadow-md shadow-[#6366F1]/30'
                : 'text-gray-400 hover:text-white'
            )}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150',
              billing === 'annual'
                ? 'bg-[#6366F1] text-white shadow-md shadow-[#6366F1]/30'
                : 'text-gray-400 hover:text-white'
            )}
          >
            Annuel
          </button>
        </div>
        <div style={{ height: 22 }}>
          {billing === 'annual' && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.22)' }}
            >
              Économisez jusqu&apos;à 22%
            </motion.span>
          )}
        </div>
      </motion.div>

      {/* Gradient separator */}
      <div className="w-full max-w-5xl mb-2" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.25) 30%, rgba(99,102,241,0.35) 50%, rgba(99,102,241,0.25) 70%, transparent)' }} />

      {/* Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {PLANS.map((plan) => {
          const price = billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice
          const isActive = activePlanKey !== null && plan.planKeys.includes(activePlanKey)
          const saving = annualSaving(plan)
          const keywords = PLAN_KEYWORDS[plan.id] ?? []
          const isHovered = hoveredPlan === plan.id

          const cardContent = (
            <>
              {/* Top glow for highlighted */}
              {plan.highlighted && (
                <div
                  className="pointer-events-none absolute -top-px left-1/2 -translate-x-1/2 h-px w-3/4"
                  style={{ background: 'linear-gradient(90deg, transparent, #6366F1, transparent)' }}
                />
              )}

              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-lg" style={{ background: '#F59E0B', color: '#000', boxShadow: '0 4px 16px rgba(245,158,11,0.3)' }}>
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Floating keywords on hover */}
              <div className="absolute top-3 right-3 flex flex-col gap-1 items-end overflow-hidden">
                {keywords.map((kw, ki) => (
                  <motion.span
                    key={kw}
                    initial={{ opacity: 0, x: 12 }}
                    animate={isHovered ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
                    transition={{ delay: ki * 0.06, duration: 0.2, ease: 'easeOut' }}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    {kw}
                  </motion.span>
                ))}
              </div>

              {/* Plan name + star ratings */}
              <div className="mb-5">
                <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                <p className="text-sm text-gray-400 mt-1">{plan.description}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs">⭐⭐⭐⭐⭐</span>
                  <span className="text-xs text-gray-400 font-medium">
                    {plan.stars} · {plan.userCount}
                  </span>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-end gap-1.5">
                  <span className="text-5xl font-extrabold text-white tabular-nums">
                    <NumberFlow
                      value={price}
                      format={{ style: 'decimal', minimumFractionDigits: price % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 }}
                      transformTiming={{ duration: 500, easing: 'ease-out' }}
                    />
                  </span>
                  <span className="text-gray-500 text-sm mb-1.5">€/mois</span>
                </div>
                <div style={{ height: 20 }}>
                  {billing === 'annual' && (
                    <p className="text-xs text-[#a5b4fc]">
                      soit {(price * 12).toFixed(0)}€/an · {saving}% d&apos;économie
                    </p>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="flex flex-col gap-3 flex-1 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <span
                      className="mt-0.5 shrink-0 flex items-center justify-center w-4 h-4 rounded-full"
                      style={{ background: plan.highlighted ? '#6366F1' : '#374151' }}
                    >
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isActive ? (
                <div className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-semibold border border-green-500/30 bg-green-500/10 text-green-400">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Plan actif
                </div>
              ) : (
                <button
                  onClick={() => handleSelect(plan.id)}
                  className="w-full rounded-xl py-3 text-sm font-semibold transition-all duration-150"
                  style={plan.highlighted
                    ? { background: '#6366F1', color: '#fff', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }
                    : { background: '#F59E0B', color: '#000', boxShadow: '0 4px 16px rgba(245,158,11,0.25)' }
                  }
                >
                  Essayer 3 jours gratuits
                </button>
              )}
            </>
          )

          if (plan.highlighted) {
            return (
              <motion.div
                key={plan.id}
                variants={cardVariants}
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
                className="relative flex flex-col rounded-2xl border p-7 transition-all duration-200 border-[#6366F1] bg-[#18181B]"
                style={{ boxShadow: '0 0 30px rgba(99,102,241,0.15)' }}
              >
                {cardContent}
              </motion.div>
            )
          }

          return (
            <motion.div
              key={plan.id}
              variants={cardVariants}
              onMouseEnter={() => setHoveredPlan(plan.id)}
              onMouseLeave={() => setHoveredPlan(null)}
              className="relative flex flex-col rounded-2xl border p-7 transition-colors duration-200"
              style={{ borderColor: '#27272A', background: '#18181B' }}
              whileHover={{
                borderColor: '#3F3F46',
                y: -2,
              }}
            >
              {cardContent}
            </motion.div>
          )
        })}
      </motion.div>

      <motion.p
        className="mt-12 text-center text-xs text-gray-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        Aucune carte bancaire requise pour l&apos;essai · Annulation à tout moment · Paiement 100% sécurisé
      </motion.p>
    </div>
  )
}
