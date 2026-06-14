'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

// ─── Data ──────────────────────────────────────────────────────────────────────

const SECTORS = [
  'Restauration & Food', 'Mode & Vêtements', 'Santé & Beauté',
  'Tech & SaaS', 'Immobilier', 'Finance & Assurance',
  'Éducation & Formation', 'Sport & Fitness', 'Artisanat & Créatif',
  'E-commerce', 'Consulting & Services', 'Autre',
]

const STYLES = [
  {
    id: 'modern',
    label: 'Moderne & Minimaliste',
    desc: 'Lignes épurées, beaucoup d\'espace, focus sur le contenu',
    preview: 'bg-gradient-to-br from-white to-gray-100',
    accent: '#3B82F6',
  },
  {
    id: 'bold',
    label: 'Audacieux & Coloré',
    desc: 'Couleurs vives, typographie forte, impact visuel immédiat',
    preview: 'bg-gradient-to-br from-violet-600 to-pink-500',
    accent: '#8B5CF6',
  },
  {
    id: 'elegant',
    label: 'Élégant & Premium',
    desc: 'Tons sombres ou neutres, détails dorés, feeling luxe',
    preview: 'bg-gradient-to-br from-zinc-900 to-zinc-700',
    accent: '#F59E0B',
  },
]

const COLOR_PALETTES = [
  { id: 'blue', colors: ['#3B82F6', '#1D4ED8', '#DBEAFE'], label: 'Océan' },
  { id: 'violet', colors: ['#8B5CF6', '#6D28D9', '#EDE9FE'], label: 'Violet' },
  { id: 'emerald', colors: ['#10B981', '#047857', '#D1FAE5'], label: 'Nature' },
  { id: 'rose', colors: ['#F43F5E', '#BE123C', '#FFE4E6'], label: 'Rose' },
  { id: 'amber', colors: ['#F59E0B', '#B45309', '#FEF3C7'], label: 'Or' },
  { id: 'slate', colors: ['#64748B', '#334155', '#F1F5F9'], label: 'Ardoise' },
]

const GENERATION_STEPS = [
  { label: 'Analyse de votre secteur', duration: 1200 },
  { label: 'Génération de la structure', duration: 1400 },
  { label: 'Création du design', duration: 1600 },
  { label: 'Optimisation du contenu', duration: 1200 },
  { label: 'Finalisation et tests', duration: 1000 },
]

const EXAMPLES = [
  {
    id: 1,
    title: 'Restaurant Le Botaniste',
    sector: 'Restauration',
    url: 'le-botaniste.fr',
    accent: '#10B981',
    sections: ['Accueil', 'Menu', 'Réservation', 'Contact'],
    hero: 'Cuisine végétale\net créative',
    body: 'from-emerald-900',
  },
  {
    id: 2,
    title: 'Studio Pixel',
    sector: 'Tech & Design',
    url: 'studiopixel.io',
    accent: '#8B5CF6',
    sections: ['Home', 'Work', 'Services', 'Blog'],
    hero: 'We craft digital\nexperiences',
    body: 'from-violet-900',
  },
  {
    id: 3,
    title: 'Maison Lumière',
    sector: 'Immobilier',
    url: 'maison-lumiere.fr',
    accent: '#F59E0B',
    sections: ['Accueil', 'Biens', 'Services', 'Équipe'],
    hero: 'Votre propriété\nde rêve',
    body: 'from-amber-900',
  },
  {
    id: 4,
    title: 'FitPulse Coach',
    sector: 'Sport & Fitness',
    url: 'fitpulse.app',
    accent: '#EF4444',
    sections: ['Accueil', 'Programmes', 'Tarifs', 'Contact'],
    hero: 'Transformez\nvotre corps',
    body: 'from-red-900',
  },
  {
    id: 5,
    title: 'Atelier Soie',
    sector: 'Mode',
    url: 'atelier-soie.com',
    accent: '#EC4899',
    sections: ['Boutique', 'Collections', 'À propos', 'Contact'],
    hero: 'L\'élégance\nà la française',
    body: 'from-pink-900',
  },
]

const FEATURES = [
  {
    icon: '⚡',
    title: 'Génération en 30 secondes',
    desc: 'Notre IA crée votre site complet en moins d\'une minute, avec toutes les sections essentielles.',
    tooltip: 'Analyse le secteur, génère la structure, optimise le contenu — tout en parallèle.',
  },
  {
    icon: '🎨',
    title: 'Design 100% personnalisé',
    desc: 'Chaque site est unique : couleurs, typographies et mise en page adaptées à votre marque.',
    tooltip: 'Basé sur 10 000+ références visuelles de sites performants dans votre secteur.',
  },
  {
    icon: '📱',
    title: 'Responsive par défaut',
    desc: 'Parfaitement optimisé pour mobile, tablette et desktop sans effort supplémentaire.',
    tooltip: 'Grid CSS intelligent qui s\'adapte automatiquement à toutes les tailles d\'écran.',
  },
  {
    icon: '🔍',
    title: 'SEO intégré',
    desc: 'Balises méta, schémas structurés et optimisation des performances inclus dès la génération.',
    tooltip: 'Lighthouse score > 90 garanti. Titres H1-H3 structurés, alt-text, sitemap XML.',
  },
  {
    icon: '✏️',
    title: 'Édition facile',
    desc: 'Interface glisser-déposer pour modifier textes, images et couleurs sans coder.',
    tooltip: 'Éditeur visuel no-code intégré. Export en HTML/CSS ou déploiement one-click.',
  },
  {
    icon: '🚀',
    title: 'Déploiement one-click',
    desc: 'Publiez votre site en un clic sur votre domaine avec HTTPS automatique.',
    tooltip: 'Hébergement CDN mondial inclus. Latence < 50ms partout dans le monde.',
  },
]

const FAQS = [
  {
    q: 'Le site généré est-il vraiment prêt à publier ?',
    a: 'Oui. Le site généré est une base complète et fonctionnelle avec toutes les sections essentielles. Vous pouvez le publier tel quel ou l\'affiner avec notre éditeur visuel avant de le mettre en ligne.',
  },
  {
    q: 'Puis-je modifier le site après la génération ?',
    a: 'Absolument. Chaque site est entièrement éditable via notre interface glisser-déposer. Textes, images, couleurs, sections — tout est modifiable sans toucher au code.',
  },
  {
    q: 'Comment l\'IA adapte-t-elle le contenu à mon secteur ?',
    a: 'Notre IA a été entraînée sur des milliers de sites performants par secteur. Elle connaît les meilleures pratiques de conversion, les sections incontournables et le ton adapté à votre activité.',
  },
  {
    q: 'Est-ce que je peux utiliser mon propre domaine ?',
    a: 'Oui. Vous pouvez connecter votre domaine existant ou en acheter un directement depuis la plateforme. La configuration DNS est automatique et le HTTPS est inclus gratuitement.',
  },
  {
    q: 'Combien de générations ai-je par mois ?',
    a: 'Cela dépend de votre plan. Le plan Starter inclut 5 générations/mois, Pro 30 générations, et Enterprise des générations illimitées. Chaque génération peut créer un site complet.',
  },
]

// ─── Sub-components ────────────────────────────────────────────────────────────

function BrowserMockup({ example }: { example: typeof EXAMPLES[0] }) {
  return (
    <div
      className="rounded-xl overflow-hidden shrink-0 w-[280px] sm:w-[320px]"
      style={{ border: '1px solid #27272A', background: '#18181B' }}
    >
      {/* Browser chrome */}
      <div className="px-3 py-2.5 flex items-center gap-2" style={{ background: '#27272A', borderBottom: '1px solid #3F3F46' }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        </div>
        <div className="flex-1 mx-2 px-3 py-1 rounded-md text-[10px] text-gray-500" style={{ background: '#18181B' }}>
          {example.url}
        </div>
      </div>

      {/* Page content */}
      <div className={`bg-gradient-to-b ${example.body} to-zinc-900 p-4`}>
        {/* Nav */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-xs font-bold text-white">{example.title.split(' ')[0]}</div>
          <div className="flex gap-3">
            {example.sections.slice(0, 3).map((s) => (
              <div key={s} className="text-[9px] text-gray-400">{s}</div>
            ))}
          </div>
        </div>

        {/* Hero */}
        <div className="mb-5">
          <div className="text-sm font-extrabold text-white leading-tight mb-2 whitespace-pre-line">{example.hero}</div>
          <div className="h-1.5 w-16 rounded-full mb-3" style={{ background: example.accent }} />
          <div className="flex gap-2">
            <div className="px-3 py-1 rounded-lg text-[9px] font-semibold text-white" style={{ background: example.accent }}>
              Découvrir
            </div>
            <div className="px-3 py-1 rounded-lg text-[9px] font-semibold text-gray-300" style={{ border: '1px solid #3F3F46' }}>
              En savoir +
            </div>
          </div>
        </div>

        {/* Cards preview */}
        <div className="grid grid-cols-3 gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-5 h-5 rounded-md mb-1.5" style={{ background: `${example.accent}33` }} />
              <div className="h-1.5 rounded w-full mb-1" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <div className="h-1 rounded w-3/4" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>
          ))}
        </div>

        {/* Sector badge */}
        <div className="mt-3 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: example.accent }} />
          <span className="text-[9px] text-gray-500">{example.sector}</span>
        </div>
      </div>
    </div>
  )
}

function GenerationModal({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let stepIndex = 0
    let elapsed = 0
    const totalDuration = GENERATION_STEPS.reduce((acc, s) => acc + s.duration, 0)

    const tick = setInterval(() => {
      elapsed += 50
      const pct = Math.min(Math.round((elapsed / totalDuration) * 100), 100)
      setProgress(pct)

      let cumulative = 0
      for (let i = 0; i < GENERATION_STEPS.length; i++) {
        cumulative += GENERATION_STEPS[i].duration
        if (elapsed < cumulative) { stepIndex = i; break }
        stepIndex = i
      }
      setCurrentStep(stepIndex)

      if (elapsed >= totalDuration) {
        clearInterval(tick)
        setTimeout(() => setDone(true), 300)
      }
    }, 50)

    return () => clearInterval(tick)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-md rounded-2xl p-8"
        style={{ background: '#18181B', border: '1px solid #27272A' }}
      >
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div key="loading" exit={{ opacity: 0 }}>
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="text-xl"
                  >
                    ⚙️
                  </motion.span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Génération en cours</h3>
                  <p className="text-gray-400 text-sm">Notre IA crée votre site...</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>Progression</span>
                  <span className="font-mono font-semibold text-blue-400">{progress}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#27272A' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>

              {/* Steps */}
              <div className="flex flex-col gap-3">
                {GENERATION_STEPS.map((step, i) => {
                  const isDone = i < currentStep || (i === currentStep && progress === 100)
                  const isActive = i === currentStep && progress < 100
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                        {isDone ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: '#16A34A' }}
                          >
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </motion.div>
                        ) : isActive ? (
                          <motion.div
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="w-5 h-5 rounded-full border-2"
                            style={{ borderColor: '#3B82F6' }}
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: '#3F3F46' }} />
                        )}
                      </div>
                      <span
                        className="text-sm transition-colors duration-200"
                        style={{ color: isDone ? '#D1FAE5' : isActive ? '#93C5FD' : '#52525B' }}
                      >
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)' }}
              >
                <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
                  <path d="M2 11l7 7L26 2" stroke="#4ADE80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
              <h3 className="text-white font-extrabold text-2xl mb-2">✓ Votre site est prêt !</h3>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                Votre site a été créé avec succès. Vous pouvez maintenant le personnaliser et le publier en un clic.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-150 hover:opacity-90"
                  style={{ background: '#3B82F6', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' }}
                  onClick={onClose}
                >
                  Voir et éditer mon site →
                </button>
                <button
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-150"
                  style={{ background: '#27272A', color: '#A1A1AA', border: '1px solid #3F3F46' }}
                  onClick={onClose}
                >
                  Générer une variante
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function FAQItem({ faq, index }: { faq: typeof FAQS[0]; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className="rounded-xl overflow-hidden cursor-pointer"
      style={{
        border: open ? '1px solid rgba(59,130,246,0.35)' : '1px solid #27272A',
        background: open ? 'rgba(59,130,246,0.06)' : '#18181B',
        transition: 'border-color 0.2s, background 0.2s',
      }}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-sm font-semibold text-white pr-4">{faq.q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-gray-400 text-lg leading-none"
        >
          +
        </motion.span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-sm text-gray-400 leading-relaxed">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function FeatureCard({ feature }: { feature: typeof FEATURES[0] }) {
  const [showTooltip, setShowTooltip] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="relative rounded-xl p-5 cursor-default group"
      style={{ background: '#18181B', border: '1px solid #27272A', transition: 'border-color 0.15s' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="text-2xl mb-3">{feature.icon}</div>
      <h4 className="text-sm font-bold text-white mb-1.5">{feature.title}</h4>
      <p className="text-xs text-gray-500 leading-relaxed">{feature.desc}</p>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 right-0 mb-2 p-3 rounded-xl text-xs text-gray-300 z-20 leading-relaxed"
            style={{ background: '#09090B', border: '1px solid #3B82F6', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
          >
            {feature.tooltip}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function WebsiteServicePage() {
  const [companyName, setCompanyName] = useState('')
  const [sector, setSector] = useState('')
  const [description, setDescription] = useState('')
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hoveredGenBtn, setHoveredGenBtn] = useState(false)
  const [carouselPaused, setCarouselPaused] = useState(false)

  const trackRef = useRef<HTMLDivElement>(null)

  const canGenerate = companyName.trim().length > 0 && sector && description.trim().length > 10 && selectedStyle && selectedPalette

  return (
    <div className="relative min-h-screen" style={{ background: '#09090B' }}>
      {/* Cyan beam */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10"
        style={{ background: 'linear-gradient(90deg, transparent 5%, #3B82F6 35%, #06B6D4 65%, transparent 95%)' }}
      />

      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-150"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour aux services
          </Link>
        </motion.div>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <span
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{ background: 'rgba(59,130,246,0.12)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.25)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Service IA · Création de site web
          </span>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
            Votre site web en{' '}
            <span style={{ color: '#3B82F6' }}>30 secondes</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
            Décrivez votre entreprise, choisissez votre style. Notre IA génère un site web complet, professionnel et prêt à publier.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-8">
            {[
              { value: '12 400+', label: 'sites générés' },
              { value: '98%', label: 'satisfaction client' },
              { value: '< 30s', label: 'temps de génération' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-extrabold" style={{ color: '#3B82F6' }}>{stat.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Carousel ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-14 overflow-hidden relative"
          onMouseEnter={() => setCarouselPaused(true)}
          onMouseLeave={() => setCarouselPaused(false)}
        >
          <div className="text-center mb-4">
            <span className="text-xs text-gray-600 uppercase tracking-widest font-semibold">Exemples générés par notre IA</span>
          </div>

          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, #09090B, transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none" style={{ background: 'linear-gradient(270deg, #09090B, transparent)' }} />

          <div className="overflow-hidden">
            <div
              ref={trackRef}
              className="flex gap-4 pb-2"
              style={{
                animation: carouselPaused ? 'none' : 'scroll-left 40s linear infinite',
                width: 'max-content',
              }}
            >
              {[...EXAMPLES, ...EXAMPLES].map((ex, i) => (
                <BrowserMockup key={`${ex.id}-${i}`} example={ex} />
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Generation Form ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 rounded-2xl p-6 sm:p-8"
          style={{ background: '#18181B', border: '1px solid #27272A' }}
        >
          <h2 className="text-xl font-bold text-white mb-1">Créer mon site</h2>
          <p className="text-gray-500 text-sm mb-6">Remplissez les informations ci-dessous pour lancer la génération.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            {/* Company name */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Nom de l&apos;entreprise *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex : Studio Pixel"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all duration-150"
                style={{
                  background: '#09090B',
                  border: companyName ? '1px solid #3B82F6' : '1px solid #27272A',
                }}
              />
            </div>

            {/* Sector */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Secteur d&apos;activité *</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-150 appearance-none cursor-pointer"
                style={{
                  background: '#09090B',
                  border: sector ? '1px solid #3B82F6' : '1px solid #27272A',
                  color: sector ? '#FAFAFA' : '#52525B',
                }}
              >
                <option value="">Choisir un secteur…</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s} style={{ background: '#18181B', color: '#FAFAFA' }}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-400 mb-2">Décrivez votre activité *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex : Studio de design graphique spécialisé en identité de marque pour startups tech. Nous créons des logos, chartes graphiques et sites web depuis 2018…"
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none resize-none transition-all duration-150 leading-relaxed"
              style={{
                background: '#09090B',
                border: description.length > 10 ? '1px solid #3B82F6' : '1px solid #27272A',
              }}
            />
            <div className="flex justify-end mt-1">
              <span className="text-[10px]" style={{ color: description.length > 10 ? '#6B7280' : '#3F3F46' }}>
                {description.length} / 500 caractères
              </span>
            </div>
          </div>

          {/* Style selection */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-400 mb-3">Style visuel *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {STYLES.map((style) => (
                <div
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className="relative cursor-pointer rounded-xl p-4 transition-all duration-150"
                  style={{
                    background: selectedStyle === style.id ? 'rgba(59,130,246,0.08)' : '#09090B',
                    border: selectedStyle === style.id ? '1px solid #3B82F6' : '1px solid #27272A',
                  }}
                >
                  {/* Preview swatch */}
                  <div className={`w-full h-10 rounded-lg mb-3 ${style.preview}`} />
                  <div className="text-xs font-bold text-white mb-0.5">{style.label}</div>
                  <div className="text-[10px] text-gray-500 leading-snug">{style.desc}</div>

                  {selectedStyle === style.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: '#3B82F6' }}
                    >
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Color palettes */}
          <div className="mb-8">
            <label className="block text-xs font-semibold text-gray-400 mb-3">Palette de couleurs *</label>
            <div className="flex flex-wrap gap-3">
              {COLOR_PALETTES.map((palette) => (
                <button
                  key={palette.id}
                  onClick={() => setSelectedPalette(palette.id)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150"
                  style={{
                    background: selectedPalette === palette.id ? 'rgba(59,130,246,0.08)' : '#09090B',
                    border: selectedPalette === palette.id ? '1px solid #3B82F6' : '1px solid #27272A',
                  }}
                >
                  <div className="flex gap-1">
                    {palette.colors.map((c, i) => (
                      <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-xs font-medium" style={{ color: selectedPalette === palette.id ? '#93C5FD' : '#71717A' }}>
                    {palette.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <div className="relative overflow-hidden rounded-xl">
            <button
              disabled={!canGenerate}
              onClick={() => canGenerate && setIsGenerating(true)}
              onMouseEnter={() => setHoveredGenBtn(true)}
              onMouseLeave={() => setHoveredGenBtn(false)}
              className="w-full py-4 rounded-xl text-sm font-bold transition-all duration-200"
              style={{
                background: canGenerate ? '#3B82F6' : '#1C1C1F',
                color: canGenerate ? '#fff' : '#52525B',
                boxShadow: canGenerate && hoveredGenBtn ? '0 8px 30px rgba(59,130,246,0.4)' : canGenerate ? '0 4px 20px rgba(59,130,246,0.25)' : 'none',
                cursor: canGenerate ? 'pointer' : 'not-allowed',
                transform: canGenerate && hoveredGenBtn ? 'translateY(-1px)' : 'translateY(0)',
                border: canGenerate ? 'none' : '1px solid #27272A',
              }}
            >
              {canGenerate ? '⚡ Générer mon site maintenant' : 'Complétez les champs pour générer'}
            </button>
            {canGenerate && (
              <span
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                  transform: hoveredGenBtn ? 'translateX(100%)' : 'translateX(-100%)',
                  transition: 'transform 0.6s ease-in-out',
                }}
              />
            )}
          </div>
        </motion.div>

        {/* ── How it works ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Comment ça marche</h2>
            <p className="text-gray-500 text-sm">Trois étapes simples pour obtenir votre site professionnel</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: '📝',
                title: 'Décrivez votre activité',
                desc: 'Renseignez le nom, le secteur et une courte description de votre entreprise. Plus c\'est précis, meilleur sera le résultat.',
              },
              {
                step: '02',
                icon: '🎨',
                title: 'Choisissez votre style',
                desc: 'Sélectionnez parmi nos styles visuels et palettes de couleurs pour que votre site reflète parfaitement votre marque.',
              },
              {
                step: '03',
                icon: '🚀',
                title: 'Publiez en un clic',
                desc: 'Notre IA génère votre site en 30 secondes. Affinez les détails, connectez votre domaine et lancez-vous.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.4 }}
                className="relative rounded-xl p-6"
                style={{ background: '#18181B', border: '1px solid #27272A' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl">{item.icon}</span>
                  <span className="text-4xl font-black tabular-nums" style={{ color: 'rgba(59,130,246,0.15)', lineHeight: 1 }}>
                    {item.step}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                {i < 2 && (
                  <div className="hidden sm:block absolute top-1/2 -right-3 -translate-y-1/2 text-gray-600 z-10">→</div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Features grid ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Tout ce dont vous avez besoin</h2>
            <p className="text-gray-500 text-sm">Survolez une fonctionnalité pour en savoir plus</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <FeatureCard key={i} feature={feature} />
            ))}
          </div>
        </motion.div>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Questions fréquentes</h2>
          </div>

          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            {FAQS.map((faq, i) => (
              <FAQItem key={i} faq={faq} index={i} />
            ))}
          </div>
        </motion.div>

        {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center rounded-2xl p-10 mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.06) 100%)',
            border: '1px solid rgba(59,130,246,0.2)',
          }}
        >
          <h2 className="text-2xl font-extrabold text-white mb-2">Prêt à créer votre site ?</h2>
          <p className="text-gray-400 text-sm mb-6">Rejoignez 12 400+ entreprises qui ont déjà généré leur site avec Velona.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-150 hover:opacity-90"
            style={{ background: '#3B82F6', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' }}
          >
            ⚡ Commencer gratuitement
          </button>
          <p className="text-gray-600 text-xs mt-4">Essai 3 jours · Aucune carte bancaire requise</p>
        </motion.div>

      </div>

      {/* Generation modal */}
      <AnimatePresence>
        {isGenerating && (
          <GenerationModal onClose={() => setIsGenerating(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
