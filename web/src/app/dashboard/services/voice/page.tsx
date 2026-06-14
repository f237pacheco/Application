'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import Link from 'next/link'

// ─── Constants (no Math.random — deterministic for SSR) ───────────────────────

const BAR_SCALES: [number, number][] = [
  [0.15, 0.80], [0.40, 0.95], [0.10, 0.65], [0.30, 0.90],
  [0.20, 0.75], [0.45, 1.00], [0.12, 0.70], [0.35, 0.85],
  [0.18, 0.78], [0.28, 0.92], [0.10, 0.60], [0.38, 0.88],
  [0.22, 0.82], [0.14, 0.68], [0.32, 0.94], [0.20, 0.73],
]

const VOICES = [
  { id: 'sophie',  name: 'Sophie', gender: 'Femme',  lang: 'Français',  tone: 'Chaleureuse',     color: '#EC4899' },
  { id: 'alex',    name: 'Alex',   gender: 'Homme',   lang: 'Français',  tone: 'Professionnel',   color: '#8B5CF6' },
  { id: 'claire',  name: 'Claire', gender: 'Femme',  lang: 'Français',  tone: 'Dynamique',       color: '#3B82F6' },
  { id: 'marc',    name: 'Marc',   gender: 'Homme',   lang: 'Français',  tone: 'Rassurant',       color: '#10B981' },
  { id: 'elena',   name: 'Elena',  gender: 'Femme',  lang: 'Anglais',   tone: 'International',   color: '#F59E0B' },
]

const SCHEDULES = [
  '24h/24, 7j/7',
  'Lun–Ven 8h–20h',
  'Lun–Sam 9h–19h',
  'Horaires personnalisés',
]

const CREATION_STEPS = [
  { label: 'Configuration de la voix…',   duration: 1000 },
  { label: 'Entraînement de l\'agent…',   duration: 1400 },
  { label: 'Connexion téléphonique…',     duration: 1200 },
  { label: 'Test de qualité…',            duration: 900  },
]

const CONVERSATION: { from: 'agent' | 'client'; text: string; delay: number }[] = [
  { from: 'agent',  text: 'Bonjour, vous êtes bien chez Beauté & Zen. Comment puis-je vous aider ?',              delay: 600   },
  { from: 'client', text: 'Bonjour, je voudrais prendre rendez-vous pour une manucure.',                          delay: 2400  },
  { from: 'agent',  text: 'Bien sûr ! Quelle date vous conviendrait le mieux ?',                                  delay: 4200  },
  { from: 'client', text: 'Jeudi prochain si possible, vers 14h.',                                                delay: 5900  },
  { from: 'agent',  text: 'Parfait, j\'ai un créneau disponible jeudi à 14h15. Votre nom s\'il vous plaît ?',     delay: 7700  },
  { from: 'client', text: 'Dubois, Marie Dubois.',                                                                delay: 9500  },
  { from: 'agent',  text: 'RDV confirmé jeudi 14h15 pour une manucure, Madame Dubois. Un SMS de rappel vous sera envoyé. À bientôt !', delay: 11200 },
]

const USE_CASES = [
  { icon: '🍽️', title: 'Restaurant',       stat: '+40% de couverts',       desc: 'Réservations 24h/24, confirmation SMS, liste d\'attente automatique.' },
  { icon: '🏥', title: 'Cabinet médical',   stat: '−60% d\'appels manqués', desc: 'Prise de RDV, rappels, gestion des urgences et médecin de garde.' },
  { icon: '🔧', title: 'Garage auto',       stat: '3h économisées/jour',    desc: 'Devis, planning révisions, confirmation et suivi des réparations.' },
  { icon: '💅', title: 'Salon de beauté',   stat: '+35% de réservations',   desc: 'Bookings temps réel, gestion des annulations, upselling automatique.' },
  { icon: '🏠', title: 'Immobilier',        stat: '×2 de leads qualifiés',  desc: 'Qualification prospects, RDV visites, transfert vers conseiller.' },
]

const FEATURES = [
  { icon: '📝', title: 'Transcription',       desc: 'Chaque appel transcrit et archivé automatiquement.',         tooltip: 'Précision 97%. Export PDF/CSV. Recherche plein texte dans vos archives.' },
  { icon: '🧠', title: 'Détection d\'intention', desc: 'L\'agent distingue RDV, réclamation, urgence.',          tooltip: 'NLP avancé spécialisé à votre métier. Se perfectionne au fil des appels.' },
  { icon: '🌍', title: 'Multilingue',          desc: 'Répond en français, anglais, espagnol et plus.',            tooltip: '14 langues. Détection automatique de la langue de l\'appelant.' },
  { icon: '📅', title: 'Intégration agenda',   desc: 'Sync Google Calendar, Outlook, Doctolib et autres.',        tooltip: '20+ connecteurs. Créneaux mis à jour en temps réel avant confirmation.' },
  { icon: '📋', title: 'Résumés auto',         desc: 'Résumé structuré envoyé dans votre CRM après chaque appel.', tooltip: 'Objet de l\'appel, actions à suivre, client identifié — formaté pour votre outil.' },
  { icon: '📊', title: 'Statistiques d\'appels', desc: 'Volume, durée, motifs et satisfaction en un tableau.',    tooltip: 'Dashboard temps réel : taux de décrochage, motifs fréquents, NPS vocal.' },
]

const FAQS = [
  { q: 'Est-ce que la voix semble naturelle ou robotique ?',               a: 'Nos agents utilisent des synthèses vocales de dernière génération, quasi indiscernables d\'une vraie personne. La plupart des appelants ne réalisent pas qu\'ils parlent à une IA.' },
  { q: 'Que se passe-t-il si l\'agent ne comprend pas une demande ?',      a: 'L\'agent transfère automatiquement l\'appel vers un membre de votre équipe ou prend un message vocal. Vous configurez le comportement de repli selon vos préférences.' },
  { q: 'Puis-je garder mon numéro de téléphone existant ?',                a: 'Oui. Nous configurons un transfert d\'appels depuis votre numéro actuel vers notre système. Aucun changement visible pour vos clients.' },
  { q: 'L\'agent peut-il prendre des rendez-vous dans mon agenda ?',       a: 'Oui — connexion à Google Calendar, Outlook, Doctolib, Calendly et +20 outils. Les créneaux sont vérifiés en temps réel avant toute confirmation.' },
  { q: 'Y a-t-il une période d\'essai ?',                                  a: 'Oui, 3 jours d\'essai gratuit inclus dans votre plan Velona. L\'agent est opérationnel en moins de 5 minutes après la configuration.' },
]

// ─── Audio Visualizer ─────────────────────────────────────────────────────────

function AudioVisualizer({ bars = 16, color = '#EC4899', height = 40, paused = false }: {
  bars?: number; color?: string; height?: number; paused?: boolean
}) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {BAR_SCALES.slice(0, bars).map(([lo, hi], i) => (
        <motion.div
          key={i}
          style={{ width: 3, background: color, borderRadius: 2, originY: 1 }}
          animate={paused ? { scaleY: lo } : { scaleY: [lo, hi, lo * 1.3, hi * 0.85, lo] }}
          transition={paused ? { duration: 0.3 } : {
            duration: 0.7 + (i % 4) * 0.15,
            delay: i * 0.04,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          initial={{ height, scaleY: lo }}
        />
      ))}
    </div>
  )
}

// ─── Mini waveform (for voice cards) ─────────────────────────────────────────

function MiniWaveform({ playing, color }: { playing: boolean; color: string }) {
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 16 }}>
      {BAR_SCALES.slice(0, 8).map(([lo, hi], i) => (
        <motion.div
          key={i}
          style={{ width: 2, background: color, borderRadius: 1, originY: 1 }}
          animate={playing ? { scaleY: [lo, hi, lo] } : { scaleY: 0.2 }}
          transition={playing ? {
            duration: 0.5 + (i % 3) * 0.1,
            delay: i * 0.05,
            repeat: Infinity,
            ease: 'easeInOut',
          } : { duration: 0.2 }}
          initial={{ height: 16, scaleY: 0.2 }}
        />
      ))}
    </div>
  )
}

// ─── Phone Mockup ─────────────────────────────────────────────────────────────

function PhoneMockup() {
  return (
    <div
      className="relative mx-auto"
      style={{ width: 200, height: 360, background: '#18181B', border: '2px solid #3F3F46', borderRadius: 32, padding: 12, boxShadow: '0 0 60px rgba(236,72,153,0.15)' }}
    >
      {/* Notch */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full" style={{ background: '#27272A' }} />

      {/* Screen */}
      <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col" style={{ background: '#09090B', marginTop: 6 }}>
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-[9px] text-gray-500 font-mono">09:41</span>
          <div className="flex gap-1">
            <div className="w-3 h-1.5 rounded-sm" style={{ background: '#3F3F46' }} />
            <div className="w-2 h-1.5 rounded-sm" style={{ background: '#3F3F46' }} />
          </div>
        </div>

        {/* Calling screen */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-6">
          {/* Avatar */}
          <motion.div
            animate={{ boxShadow: ['0 0 0px rgba(236,72,153,0)', '0 0 24px rgba(236,72,153,0.4)', '0 0 0px rgba(236,72,153,0)'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
            style={{ background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.3)' }}
          >
            <span className="text-2xl">📞</span>
          </motion.div>

          <p className="text-white text-[11px] font-bold mb-0.5">Velona Agent</p>
          <p className="text-gray-500 text-[9px] mb-5">En communication…</p>

          {/* Visualizer */}
          <AudioVisualizer bars={12} color="#EC4899" height={36} />

          {/* Timer */}
          <p className="text-gray-500 text-[9px] mt-3 font-mono">00:42</p>
        </div>

        {/* Call button */}
        <div className="flex justify-center pb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#EF4444' }}>
            <span className="text-xs">📵</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Voice Card ───────────────────────────────────────────────────────────────

function VoiceCard({ voice, selected, onSelect, playing, onPlay }: {
  voice: typeof VOICES[0]
  selected: boolean
  onSelect: () => void
  playing: boolean
  onPlay: (e: React.MouseEvent) => void
}) {
  return (
    <motion.div
      whileHover={{ borderColor: '#EC4899' }}
      onClick={onSelect}
      className="relative flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-all duration-150"
      style={{
        background: selected ? 'rgba(236,72,153,0.08)' : '#09090B',
        border: selected ? '1px solid #EC4899' : '1px solid #27272A',
      }}
    >
      {/* Avatar bubble */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
        style={{ background: `${voice.color}22`, color: voice.color, border: `1px solid ${voice.color}44` }}
      >
        {voice.name[0]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{voice.name}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#27272A', color: '#71717A' }}>{voice.lang}</span>
        </div>
        <div className="text-[10px] text-gray-500">{voice.gender} · {voice.tone}</div>
      </div>

      {/* Play button */}
      <button
        onClick={onPlay}
        className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-150"
        style={{ background: playing ? `${voice.color}22` : '#27272A', border: `1px solid ${playing ? voice.color : '#3F3F46'}` }}
      >
        {playing ? (
          <MiniWaveform playing color={voice.color} />
        ) : (
          <span className="text-[10px]" style={{ color: '#71717A' }}>▶</span>
        )}
      </button>

      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full flex items-center justify-center"
          style={{ background: '#EC4899' }}
        >
          <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
            <path d="M1 2.5l1.5 1.5L6 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      )}
    </motion.div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ enabled, onToggle, label }: { enabled: boolean; onToggle: () => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-2.5 border-b" style={{ borderColor: '#1F1F23' }}>
      <span className="text-sm text-gray-300">{label}</span>
      <div
        onClick={onToggle}
        className="relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0"
        style={{ background: enabled ? '#EC4899' : '#3F3F46' }}
      >
        <motion.div
          animate={{ x: enabled ? 16 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-4 h-4 rounded-full"
          style={{ background: '#FAFAFA' }}
        />
      </div>
    </label>
  )
}

// ─── Creation Modal ───────────────────────────────────────────────────────────

function CreationModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let elapsed = 0
    const total = CREATION_STEPS.reduce((a, s) => a + s.duration, 0)

    const tick = setInterval(() => {
      elapsed += 50
      setProgress(Math.min(Math.round((elapsed / total) * 100), 100))

      let cum = 0
      for (let i = 0; i < CREATION_STEPS.length; i++) {
        cum += CREATION_STEPS[i].duration
        if (elapsed < cum) { setStep(i); break }
        setStep(i)
      }

      if (elapsed >= total) { clearInterval(tick); setTimeout(() => setDone(true), 300) }
    }, 50)

    return () => clearInterval(tick)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: '#18181B', border: '1px solid #27272A' }}
      >
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div key="loading" exit={{ opacity: 0 }} className="flex flex-col items-center">
              {/* Pulsing circles */}
              <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full border"
                    style={{ borderColor: 'rgba(236,72,153,0.3)', inset: i * -14 - 4 }}
                    animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
                    transition={{ duration: 1.6, delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ))}
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.4)' }}>
                  <AudioVisualizer bars={6} color="#EC4899" height={24} />
                </div>
              </div>

              <h3 className="text-white font-bold text-lg mb-1 text-center">Création en cours</h3>
              <p className="text-gray-500 text-sm mb-6 text-center">Votre agent vocal se configure…</p>

              {/* Progress */}
              <div className="w-full mb-5">
                <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                  <span>Progression</span>
                  <span className="font-mono font-semibold" style={{ color: '#EC4899' }}>{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#27272A' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #EC4899, #F472B6)' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.08 }}
                  />
                </div>
              </div>

              {/* Steps */}
              <div className="w-full flex flex-col gap-2.5">
                {CREATION_STEPS.map((s, i) => {
                  const isDone = i < step
                  const isActive = i === step
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                        {isDone ? (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#EC4899' }}>
                            <svg width="7" height="5" viewBox="0 0 7 5" fill="none"><path d="M1 2.5l1.5 1.5L6 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </motion.div>
                        ) : isActive ? (
                          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="w-4 h-4 rounded-full border-2" style={{ borderColor: '#EC4899' }} />
                        ) : (
                          <div className="w-4 h-4 rounded-full border" style={{ borderColor: '#3F3F46' }} />
                        )}
                      </div>
                      <span className="text-xs" style={{ color: isDone ? '#FBCFE8' : isActive ? '#F9A8D4' : '#52525B' }}>{s.label}</span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.35)' }}
              >
                <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
                  <path d="M2 10l6.5 6.5L24 2" stroke="#EC4899" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
              <h3 className="text-white font-extrabold text-xl mb-1.5">✓ Votre agent vocal est actif !</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">Votre numéro est prêt. Les appels sont maintenant gérés par votre agent IA.</p>
              <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-bold text-white mb-2.5 transition-all hover:opacity-90" style={{ background: '#EC4899', boxShadow: '0 4px 20px rgba(236,72,153,0.3)' }}>
                Accéder au tableau de bord →
              </button>
              <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#27272A', color: '#71717A', border: '1px solid #3F3F46' }}>
                Configurer davantage
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ─── Conversation Simulator ───────────────────────────────────────────────────

function ConversationSimulator() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const [revealed, setRevealed] = useState<number[]>([])
  const [typing, setTyping] = useState(false)
  const [started, setStarted] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!inView || started) return
    setStarted(true)

    CONVERSATION.forEach((msg, i) => {
      setTimeout(() => {
        if (msg.from === 'agent') setTyping(true)
        setTimeout(() => {
          setTyping(false)
          setRevealed((prev) => [...prev, i])
        }, msg.from === 'agent' ? 700 : 0)
      }, msg.delay)
    })
  }, [inView, started])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [revealed, typing])

  return (
    <div ref={ref}>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#18181B', border: '1px solid #27272A' }}
      >
        {/* Phone header */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#27272A', borderBottom: '1px solid #3F3F46' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.3)' }}>
            <span className="text-sm">📞</span>
          </div>
          <div>
            <p className="text-xs font-bold text-white">Velona — Agent Sophie</p>
            <div className="flex items-center gap-1.5">
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full" style={{ background: '#4ADE80' }} />
              <span className="text-[10px] text-gray-500">En ligne · 00:42</span>
            </div>
          </div>
          <div className="ml-auto">
            <AudioVisualizer bars={8} color="#EC4899" height={20} />
          </div>
        </div>

        {/* Chat */}
        <div className="p-4 flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: 320 }}>
          {CONVERSATION.map((msg, i) => (
            <AnimatePresence key={i}>
              {revealed.includes(i) && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className={`flex ${msg.from === 'client' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed"
                    style={msg.from === 'agent'
                      ? { background: 'rgba(236,72,153,0.12)', color: '#FAFAFA', borderBottomLeftRadius: 4, border: '1px solid rgba(236,72,153,0.2)' }
                      : { background: '#27272A', color: '#D4D4D8', borderBottomRightRadius: 4 }
                    }
                  >
                    {msg.text}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          ))}

          {/* Typing indicator */}
          <AnimatePresence>
            {typing && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="flex items-center gap-1 px-3.5 py-2.5 rounded-2xl" style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.15)', borderBottomLeftRadius: 4 }}>
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#EC4899' }} animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={endRef} />
        </div>

        {/* Result tag */}
        {revealed.length === CONVERSATION.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-4 mb-4 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)', color: '#4ADE80' }}
          >
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            RDV confirmé automatiquement · Durée de l&apos;appel : 0m 42s
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({ feature }: { feature: typeof FEATURES[0] }) {
  const [tooltip, setTooltip] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="relative rounded-xl p-4"
      style={{ background: '#18181B', border: '1px solid #27272A' }}
      onMouseEnter={() => setTooltip(true)}
      onMouseLeave={() => setTooltip(false)}
    >
      <div className="text-xl mb-2">{feature.icon}</div>
      <h4 className="text-sm font-bold text-white mb-1">{feature.title}</h4>
      <p className="text-xs text-gray-500 leading-relaxed">{feature.desc}</p>
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full left-0 right-0 mb-2 p-3 rounded-xl text-xs text-gray-300 z-20 leading-relaxed"
            style={{ background: '#09090B', border: '1px solid #EC4899', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
          >
            {feature.tooltip}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────

function FAQItem({ faq, index }: { faq: typeof FAQS[0]; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      onClick={() => setOpen((v) => !v)}
      className="rounded-xl overflow-hidden cursor-pointer"
      style={{
        border: open ? '1px solid rgba(236,72,153,0.35)' : '1px solid #27272A',
        background: open ? 'rgba(236,72,153,0.06)' : '#18181B',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-sm font-semibold text-white pr-4">{faq.q}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 text-gray-400 text-lg leading-none">+</motion.span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="a" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeInOut' }} className="overflow-hidden">
            <p className="px-5 pb-4 text-sm text-gray-400 leading-relaxed">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function VoiceServicePage() {
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [welcome, setWelcome] = useState('')
  const [schedule, setSchedule] = useState('')
  const [toggles, setToggles] = useState({ rdv: false, transfer: false, voicemail: false })
  const [showModal, setShowModal] = useState(false)
  const [hoveredCta, setHoveredCta] = useState(false)

  const canCreate = !!selectedVoice && companyName.trim().length > 0

  const handlePlay = (voiceId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPlayingVoice((prev) => {
      if (prev === voiceId) return null
      // Auto-stop after 3s
      setTimeout(() => setPlayingVoice((c) => c === voiceId ? null : c), 3000)
      return voiceId
    })
  }

  return (
    <div className="relative min-h-screen" style={{ background: '#09090B' }}>
      {/* Rose beam */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10"
        style={{ background: 'linear-gradient(90deg, transparent 5%, #EC4899 35%, #F472B6 65%, transparent 95%)' }}
      />

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-150">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Retour aux services
          </Link>
        </motion.div>

        {/* ── Hero — 2 columns ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5"
              style={{ background: 'rgba(236,72,153,0.12)', color: '#F9A8D4', border: '1px solid rgba(236,72,153,0.25)' }}
            >
              <span className="text-xs">✦</span>
              Agent IA vocal
            </span>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
              Un agent téléphonique IA qui répond{' '}
              <span style={{ color: '#EC4899' }}>24h/24</span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed mb-8">
              Votre standard intelligent gère vos appels clients avec une voix naturelle — réservations, informations, transferts.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-6">
              {[
                { value: '24/7', label: 'disponible' },
                { value: '0', label: 'appel manqué' },
                { value: '97%', label: 'voix naturelle' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-extrabold" style={{ color: '#EC4899' }}>{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="flex justify-center">
            <PhoneMockup />
          </motion.div>
        </div>

        {/* ── Demo section ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">Configurez votre agent</h2>
            <p className="text-gray-500 text-sm">Choisissez une voix et personnalisez le comportement de votre agent en quelques secondes.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Voice selection */}
            <div className="rounded-2xl p-5" style={{ background: '#18181B', border: '1px solid #27272A' }}>
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style={{ background: 'rgba(236,72,153,0.15)', color: '#EC4899' }}>🎤</span>
                Choisissez une voix
              </h3>
              <div className="flex flex-col gap-2">
                {VOICES.map((voice) => (
                  <VoiceCard
                    key={voice.id}
                    voice={voice}
                    selected={selectedVoice === voice.id}
                    onSelect={() => setSelectedVoice(voice.id)}
                    playing={playingVoice === voice.id}
                    onPlay={(e) => handlePlay(voice.id, e)}
                  />
                ))}
              </div>
            </div>

            {/* Config */}
            <div className="rounded-2xl p-5" style={{ background: '#18181B', border: '1px solid #27272A' }}>
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style={{ background: 'rgba(236,72,153,0.15)', color: '#EC4899' }}>⚙️</span>
                Paramètres de l&apos;agent
              </h3>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nom de votre entreprise *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex : Cabinet Dupont"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all"
                    style={{ background: '#09090B', border: companyName ? '1px solid #EC4899' : '1px solid #27272A' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Message d&apos;accueil</label>
                  <textarea
                    value={welcome}
                    onChange={(e) => setWelcome(e.target.value)}
                    placeholder="Bonjour, vous êtes bien chez [entreprise]. Comment puis-je vous aider ?"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none resize-none leading-relaxed"
                    style={{ background: '#09090B', border: welcome ? '1px solid #EC4899' : '1px solid #27272A' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Horaires de fonctionnement</label>
                  <select
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none cursor-pointer"
                    style={{ background: '#09090B', border: schedule ? '1px solid #EC4899' : '1px solid #27272A', color: schedule ? '#FAFAFA' : '#52525B' }}
                  >
                    <option value="">Choisir les horaires…</option>
                    {SCHEDULES.map((s) => <option key={s} value={s} style={{ background: '#18181B', color: '#FAFAFA' }}>{s}</option>)}
                  </select>
                </div>

                <div className="pt-1">
                  <p className="text-xs font-semibold text-gray-400 mb-2">Fonctionnalités activées</p>
                  <Toggle enabled={toggles.rdv}      onToggle={() => setToggles((t) => ({ ...t, rdv: !t.rdv }))}         label="Prise de rendez-vous" />
                  <Toggle enabled={toggles.transfer} onToggle={() => setToggles((t) => ({ ...t, transfer: !t.transfer }))} label="Transfert d'appel" />
                  <Toggle enabled={toggles.voicemail} onToggle={() => setToggles((t) => ({ ...t, voicemail: !t.voicemail }))} label="Messagerie vocale" />
                </div>
              </div>
            </div>
          </div>

          {/* CTA button */}
          <div className="relative overflow-hidden rounded-xl mt-5">
            <button
              disabled={!canCreate}
              onClick={() => canCreate && setShowModal(true)}
              onMouseEnter={() => setHoveredCta(true)}
              onMouseLeave={() => setHoveredCta(false)}
              className="w-full py-4 rounded-xl text-sm font-bold transition-all duration-200"
              style={{
                background: canCreate ? '#EC4899' : '#1C1C1F',
                color: canCreate ? '#fff' : '#52525B',
                boxShadow: canCreate && hoveredCta ? '0 8px 30px rgba(236,72,153,0.4)' : canCreate ? '0 4px 20px rgba(236,72,153,0.25)' : 'none',
                cursor: canCreate ? 'pointer' : 'not-allowed',
                transform: canCreate && hoveredCta ? 'translateY(-1px)' : 'translateY(0)',
                border: canCreate ? 'none' : '1px solid #27272A',
              }}
            >
              {canCreate ? '📞 Créer mon agent vocal →' : 'Choisissez une voix et renseignez votre entreprise'}
            </button>
            {canCreate && (
              <span
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
                  transform: hoveredCta ? 'translateX(100%)' : 'translateX(-100%)',
                  transition: 'transform 0.6s ease-in-out',
                }}
              />
            )}
          </div>
        </motion.div>

        {/* ── Conversation Simulator ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Voyez-le en action</h2>
            <p className="text-gray-500 text-sm">Une vraie prise de RDV gérée automatiquement par l&apos;agent IA.</p>
          </div>
          <div className="max-w-lg mx-auto">
            <ConversationSimulator />
          </div>
        </motion.div>

        {/* ── Use case carousel ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 overflow-hidden"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Adapté à votre métier</h2>
            <p className="text-gray-500 text-sm">L&apos;agent vocal s&apos;adapte au vocabulaire et aux besoins de chaque secteur.</p>
          </div>

          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, #09090B, transparent)' }} />
            <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none" style={{ background: 'linear-gradient(270deg, #09090B, transparent)' }} />

            <div className="overflow-hidden">
              <div className="flex gap-4" style={{ animation: 'scroll-right 36s linear infinite', width: 'max-content' }}>
                {[...USE_CASES, ...USE_CASES].map((uc, i) => (
                  <div
                    key={i}
                    className="shrink-0 w-56 rounded-xl p-4"
                    style={{ background: '#18181B', border: '1px solid #27272A' }}
                  >
                    <div className="text-3xl mb-3">{uc.icon}</div>
                    <h4 className="text-sm font-bold text-white mb-1">{uc.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3">{uc.desc}</p>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(236,72,153,0.12)', color: '#F9A8D4', border: '1px solid rgba(236,72,153,0.2)' }}>
                      {uc.stat}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Features ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Tout ce que votre agent sait faire</h2>
            <p className="text-gray-500 text-sm">Survolez une fonctionnalité pour en savoir plus.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => <FeatureCard key={i} feature={f} />)}
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
            {FAQS.map((faq, i) => <FAQItem key={i} faq={faq} index={i} />)}
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
            background: 'linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(244,114,182,0.04) 100%)',
            border: '1px solid rgba(236,72,153,0.2)',
          }}
        >
          <h2 className="text-2xl font-extrabold text-white mb-2">Prêt à ne plus manquer un appel ?</h2>
          <p className="text-gray-400 text-sm mb-6">Rejoignez 4 800+ entreprises qui utilisent déjà Velona Voice.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: '#EC4899', boxShadow: '0 4px 20px rgba(236,72,153,0.3)' }}
          >
            📞 Créer mon agent gratuitement
          </button>
          <p className="text-gray-600 text-xs mt-4">Essai 3 jours · Aucune carte bancaire requise · Opérationnel en 5 min</p>
        </motion.div>

      </div>

      <AnimatePresence>
        {showModal && <CreationModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  )
}
