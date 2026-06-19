'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import Link from 'next/link'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_LABEL = 'Juin 2026'
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAYS_IN_MONTH = 30
const FIRST_WEEKDAY_OFFSET = 0 // June 1 2026 is a Monday
const TODAY = 19

// deterministic day status: 0 = available, 1 = fully booked, 2 = past
function dayStatus(day: number): 'available' | 'full' | 'past' | 'weekend' {
  const weekdayIdx = (FIRST_WEEKDAY_OFFSET + day - 1) % 7
  if (day < TODAY) return 'past'
  if (weekdayIdx === 5 || weekdayIdx === 6) return 'weekend'
  if (day % 7 === 0) return 'full'
  return 'available'
}

const ALL_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00']

function slotsForDay(day: number) {
  return ALL_SLOTS.map((time, i) => ({
    time,
    booked: (day + i) % 4 === 0,
  }))
}

const WEEK_TOGGLES_DEFAULT = { Lun: true, Mar: true, Mer: true, Jeu: true, Ven: true, Sam: false, Dim: false }

const DURATIONS = ['15 min', '30 min', '45 min', '60 min']
const BUFFERS = ['0 min', '5 min', '10 min', '15 min']

const NOTIFICATION_CHAIN = [
  { icon: '📅', label: 'RDV pris',                            delay: 400  },
  { icon: '📧', label: 'Email de confirmation envoyé',        delay: 1800 },
  { icon: '📱', label: 'Rappel SMS 24h avant',                delay: 3200 },
  { icon: '⏰', label: 'Rappel 1h avant',                      delay: 4600 },
  { icon: '⭐', label: 'Demande d\'avis après le RDV',         delay: 6000 },
]

const DASHBOARD_APPOINTMENTS = [
  { name: 'Claire Bernard',  time: '09:00', service: 'Consultation',  status: 'confirmed' as const },
  { name: 'Thomas Lefèvre',  time: '10:30', service: 'Suivi',         status: 'confirmed' as const },
  { name: 'Inès Moreau',     time: '14:00', service: 'Première visite', status: 'pending' as const },
  { name: 'Hugo Petit',      time: '15:30', service: 'Consultation',  status: 'confirmed' as const },
  { name: 'Léa Girard',      time: '17:00', service: 'Suivi',         status: 'pending' as const },
]

const USE_CASES = [
  { icon: '💇', title: 'Coiffeur',         example: '"Coupe + brushing, 45 min, créneau 14h30"' },
  { icon: '🩺', title: 'Médecin',          example: '"Consultation, 20 min, rappel SMS automatique"' },
  { icon: '🏋️', title: 'Coach sportif',    example: '"Séance individuelle, 60 min, paiement en ligne"' },
  { icon: '🍽️', title: 'Restaurant',       example: '"Table de 4, 19h30, confirmation par SMS"' },
  { icon: '🔧', title: 'Garage auto',      example: '"Révision, créneau 1h, rappel la veille"' },
]

const FEATURES = [
  { icon: '🔄', title: 'Sync Google/Outlook', desc: 'Vos créneaux se synchronisent dans les deux sens.',        tooltip: 'Bidirectionnel en temps réel. Compatible Google Calendar, Outlook, Apple Calendar, Doctolib.' },
  { icon: '🔔', title: 'Rappels automatiques', desc: 'SMS et email envoyés sans aucune action de votre part.',  tooltip: 'Séquence personnalisable : J-1, H-1, ou tout autre délai. Taux de présence +35% en moyenne.' },
  { icon: '💳', title: 'Paiement en ligne',    desc: 'Encaissez l\'acompte ou le RDV directement à la réservation.', tooltip: 'Stripe intégré. Acompte configurable, remboursement automatique en cas d\'annulation.' },
  { icon: '🚫', title: 'Annulation facile',    desc: 'Vos clients annulent ou reportent en un clic.',            tooltip: 'Lien unique par RDV. Délai d\'annulation configurable, créneau libéré instantanément.' },
  { icon: '📝', title: 'Liste d\'attente',     desc: 'Remplissez automatiquement les créneaux annulés.',         tooltip: 'Notification automatique au premier client en liste dès qu\'un créneau se libère.' },
  { icon: '📊', title: 'Statistiques',         desc: 'Taux de remplissage, no-shows, revenus — en un tableau.',  tooltip: 'Dashboard temps réel avec export CSV. Comparaison mois par mois.' },
]

const FAQS = [
  { q: 'Mes clients peuvent-ils réserver sans créer de compte ?',         a: 'Oui. Vos clients réservent via un lien public, en renseignant simplement leur nom, email et téléphone — aucune création de compte n\'est nécessaire.' },
  { q: 'Que se passe-t-il si un client annule au dernier moment ?',       a: 'Le créneau est automatiquement libéré et proposé à la liste d\'attente si elle est activée. Vous pouvez aussi configurer des frais d\'annulation tardive.' },
  { q: 'Puis-je gérer plusieurs membres de mon équipe ?',                 a: 'Oui, chaque membre dispose de son propre agenda synchronisé, avec des disponibilités et services personnalisables. Les clients choisissent leur praticien lors de la réservation.' },
  { q: 'Les rappels SMS sont-ils inclus dans tous les plans ?',           a: 'Les rappels par email sont inclus dans tous les plans. Les rappels SMS sont disponibles à partir du plan Pro, avec un quota mensuel selon votre abonnement.' },
  { q: 'Puis-je personnaliser la page de réservation publique ?',        a: 'Oui — logo, couleurs, présentation des services et champs personnalisés sont entièrement configurables pour correspondre à votre image de marque.' },
]

// ─── Mini calendar (hero) ──────────────────────────────────────────────────────

function MiniCalendarHero() {
  const cells = Array.from({ length: 30 })
  return (
    <div className="rounded-2xl p-5 mx-auto" style={{ width: 280, background: '#18181B', border: '1px solid #27272A', boxShadow: '0 0 60px rgba(16,185,129,0.15)' }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-white">{MONTH_LABEL}</span>
        <div className="flex items-center gap-1.5">
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
          <span className="text-[9px] text-gray-500">live</span>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {cells.map((_, i) => (
          <motion.div
            key={i}
            className="rounded-md"
            style={{ aspectRatio: '1', background: '#27272A' }}
            animate={{ background: ['#27272A', '#10B981', '#27272A'] }}
            transition={{ duration: 4, delay: (i * 0.15) % 4, repeat: Infinity, repeatDelay: 4 }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4">
        <div className="w-2 h-2 rounded-sm" style={{ background: '#10B981' }} />
        <span className="text-[9px] text-gray-500">Créneau confirmé en temps réel</span>
      </div>
    </div>
  )
}

// ─── Interactive Calendar ──────────────────────────────────────────────────────

function InteractiveCalendar({ selectedDay, onSelectDay }: { selectedDay: number | null; onSelectDay: (d: number) => void }) {
  const cells: (number | null)[] = []
  for (let i = 0; i < FIRST_WEEKDAY_OFFSET; i++) cells.push(null)
  for (let d = 1; d <= DAYS_IN_MONTH; d++) cells.push(d)

  return (
    <div className="rounded-2xl p-5" style={{ background: '#18181B', border: '1px solid #27272A' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">{MONTH_LABEL}</h3>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#10B981' }} />Disponible</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#3F3F46' }} />Complet</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {WEEKDAYS.map((w) => <div key={w} className="text-center text-[10px] font-semibold text-gray-600">{w}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />
          const status = dayStatus(day)
          const clickable = status === 'available'
          const isSelected = selectedDay === day
          const isToday = day === TODAY

          return (
            <button
              key={i}
              disabled={!clickable}
              onClick={() => clickable && onSelectDay(day)}
              className="relative aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-semibold transition-all duration-150"
              style={{
                background: isSelected ? '#10B981' : status === 'available' ? 'rgba(16,185,129,0.08)' : status === 'full' ? '#27272A' : 'transparent',
                color: isSelected ? '#fff' : status === 'available' ? '#6EE7B7' : status === 'past' ? '#3F3F46' : status === 'weekend' ? '#3F3F46' : '#71717A',
                border: isToday && !isSelected ? '1px solid #10B981' : '1px solid transparent',
                cursor: clickable ? 'pointer' : 'default',
              }}
            >
              {day}
              {status === 'available' && !isSelected && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ background: '#10B981' }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Booking modal ─────────────────────────────────────────────────────────────

function BookingModal({ day, time, onClose }: { day: number; time: string; onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [reason, setReason] = useState('')

  const canConfirm = name.trim().length > 0 && email.trim().length > 3

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-sm rounded-2xl p-7"
        style={{ background: '#18181B', border: '1px solid #27272A' }}
      >
        <AnimatePresence mode="wait">
          {!confirmed ? (
            <motion.div key="form" exit={{ opacity: 0 }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">📅</span>
                <h3 className="text-white font-bold text-base">Réserver ce créneau</h3>
              </div>
              <p className="text-sm mb-5" style={{ color: '#6EE7B7' }}>
                {day} {MONTH_LABEL.split(' ')[0]} 2026 à {time}
              </p>

              <div className="flex flex-col gap-3 mb-5">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nom complet *"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                  style={{ background: '#09090B', border: name ? '1px solid #10B981' : '1px solid #27272A' }}
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email *"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                  style={{ background: '#09090B', border: email ? '1px solid #10B981' : '1px solid #27272A' }}
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Téléphone"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                  style={{ background: '#09090B', border: '1px solid #27272A' }}
                />
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Motif du rendez-vous"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                  style={{ background: '#09090B', border: '1px solid #27272A' }}
                />
              </div>

              <button
                disabled={!canConfirm}
                onClick={() => canConfirm && setConfirmed(true)}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-150"
                style={{
                  background: canConfirm ? '#10B981' : '#1C1C1F',
                  color: canConfirm ? '#fff' : '#52525B',
                  boxShadow: canConfirm ? '0 4px 20px rgba(16,185,129,0.3)' : 'none',
                  cursor: canConfirm ? 'pointer' : 'not-allowed',
                  border: canConfirm ? 'none' : '1px solid #27272A',
                }}
              >
                Confirmer le RDV
              </button>
              <button onClick={onClose} className="w-full py-2.5 mt-2 rounded-xl text-xs font-medium" style={{ color: '#52525B' }}>
                Annuler
              </button>
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)' }}
              >
                <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
                  <path d="M2 10l6.5 6.5L24 2" stroke="#34D399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
              <h3 className="text-white font-extrabold text-lg mb-1.5">✓ RDV confirmé !</h3>
              <p className="text-gray-400 text-sm mb-4">{day} {MONTH_LABEL.split(' ')[0]} 2026 à {time} — {name}</p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium mb-5"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#6EE7B7' }}
              >
                📧 Email de confirmation envoyé à {email || 'votre adresse'}
              </motion.div>
              <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity" style={{ background: '#10B981', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}>
                Fermer
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ─── Day toggle ───────────────────────────────────────────────────────────────

function DayToggle({ day, enabled, onToggle }: { day: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl transition-all duration-150"
      style={{ background: enabled ? 'rgba(16,185,129,0.1)' : '#09090B', border: enabled ? '1px solid #10B981' : '1px solid #27272A', minWidth: 56 }}
    >
      <span className="text-xs font-semibold" style={{ color: enabled ? '#6EE7B7' : '#52525B' }}>{day}</span>
      <div className="relative w-7 h-4 rounded-full" style={{ background: enabled ? '#10B981' : '#3F3F46' }}>
        <motion.div animate={{ x: enabled ? 13 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute top-0.5 w-3 h-3 rounded-full" style={{ background: '#FAFAFA' }} />
      </div>
    </button>
  )
}

// ─── Notification chain ────────────────────────────────────────────────────────

function NotificationChain() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const [revealed, setRevealed] = useState<number[]>([])

  useEffect(() => {
    if (!inView) return
    NOTIFICATION_CHAIN.forEach((step, i) => {
      setTimeout(() => setRevealed((prev) => [...prev, i]), step.delay)
    })
  }, [inView])

  return (
    <div ref={ref} className="rounded-2xl p-6 sm:p-8" style={{ background: '#18181B', border: '1px solid #27272A' }}>
      <div className="flex flex-col gap-0">
        {NOTIFICATION_CHAIN.map((step, i) => {
          const isRevealed = revealed.includes(i)
          return (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.3 }}
                  animate={isRevealed ? { scale: 1, opacity: 1 } : {}}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base"
                  style={{ background: isRevealed ? 'rgba(16,185,129,0.15)' : '#27272A', border: isRevealed ? '1px solid rgba(16,185,129,0.4)' : '1px solid #3F3F46' }}
                >
                  {step.icon}
                </motion.div>
                {i < NOTIFICATION_CHAIN.length - 1 && (
                  <div className="w-px flex-1 my-1" style={{ minHeight: 28, background: isRevealed ? '#10B981' : '#27272A', transition: 'background 0.4s' }} />
                )}
              </div>
              <div className="pb-7">
                <motion.p
                  initial={{ opacity: 0.3, x: -8 }}
                  animate={isRevealed ? { opacity: 1, x: 0 } : {}}
                  className="text-sm font-semibold pt-2"
                  style={{ color: isRevealed ? '#FAFAFA' : '#52525B' }}
                >
                  {step.label}
                </motion.p>
                {isRevealed && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-xs mt-0.5" style={{ color: '#6EE7B7' }}>
                    Envoyé automatiquement
                  </motion.p>
                )}
              </div>
            </div>
          )
        })}
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
            style={{ background: '#09090B', border: '1px solid #10B981', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
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
      style={{ border: open ? '1px solid rgba(16,185,129,0.35)' : '1px solid #27272A', background: open ? 'rgba(16,185,129,0.06)' : '#18181B', transition: 'border-color 0.2s, background 0.2s' }}
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

export default function BookingServicePage() {
  const [selectedDay, setSelectedDay] = useState<number | null>(TODAY)
  const [bookingSlot, setBookingSlot] = useState<string | null>(null)
  const [weekToggles, setWeekToggles] = useState(WEEK_TOGGLES_DEFAULT)
  const [duration, setDuration] = useState('30 min')
  const [buffer, setBuffer] = useState('5 min')

  const slots = selectedDay ? slotsForDay(selectedDay) : []

  return (
    <div className="relative min-h-screen" style={{ background: '#09090B' }}>
      {/* Emerald beam */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10"
        style={{ background: 'linear-gradient(90deg, transparent 5%, #10B981 35%, #34D399 65%, transparent 95%)' }}
      />

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-150">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Retour aux services
          </Link>
        </motion.div>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5" style={{ background: 'rgba(16,185,129,0.12)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.25)' }}>
              <span className="text-xs">✦</span>
              Gestion des RDV clients
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
              Votre agenda intelligent,{' '}
              <span style={{ color: '#10B981' }}>en pilote automatique</span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed mb-8">
              Confirmations, rappels et suivi client automatisés — ne perdez plus jamais un rendez-vous.
            </p>
            <div className="flex flex-wrap gap-6">
              {[{ value: '0', label: 'RDV manqué' }, { value: '100%', label: 'rappels auto' }, { value: 'Live', label: 'sync agenda' }].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-extrabold" style={{ color: '#10B981' }}>{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
            <MiniCalendarHero />
          </motion.div>
        </div>

        {/* ── Interactive calendar + slots ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">Réservez un créneau</h2>
            <p className="text-gray-500 text-sm">Cliquez sur un jour disponible, puis choisissez un créneau horaire.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
            <InteractiveCalendar selectedDay={selectedDay} onSelectDay={setSelectedDay} />

            <div className="rounded-2xl p-5" style={{ background: '#18181B', border: '1px solid #27272A' }}>
              <h3 className="text-sm font-bold text-white mb-1">
                {selectedDay ? `${selectedDay} ${MONTH_LABEL.split(' ')[0]} 2026` : 'Sélectionnez un jour'}
              </h3>
              <p className="text-xs text-gray-500 mb-4">{selectedDay ? `${slots.filter(s => !s.booked).length} créneaux disponibles` : ''}</p>

              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    disabled={slot.booked}
                    onClick={() => !slot.booked && setBookingSlot(slot.time)}
                    className="px-2 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
                    style={{
                      background: slot.booked ? '#27272A' : 'rgba(16,185,129,0.08)',
                      border: slot.booked ? '1px solid #3F3F46' : '1px solid rgba(16,185,129,0.3)',
                      color: slot.booked ? '#52525B' : '#6EE7B7',
                      cursor: slot.booked ? 'not-allowed' : 'pointer',
                      textDecoration: slot.booked ? 'line-through' : 'none',
                    }}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
              {slots.length === 0 && <p className="text-xs text-gray-600">Choisissez un jour vert dans le calendrier.</p>}
            </div>
          </div>
        </motion.div>

        {/* ── Availability config ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 rounded-2xl p-6 sm:p-7"
          style={{ background: '#18181B', border: '1px solid #27272A' }}
        >
          <h2 className="text-xl font-bold text-white mb-1">Configurez vos disponibilités</h2>
          <p className="text-gray-500 text-sm mb-6">Définissez quand vos clients peuvent réserver.</p>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-400 mb-3">Jours ouverts</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(weekToggles).map(([day, enabled]) => (
                <DayToggle key={day} day={day} enabled={enabled} onToggle={() => setWeekToggles((t) => ({ ...t, [day]: !t[day as keyof typeof t] }))} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Plages horaires</label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-300" style={{ background: '#09090B', border: '1px solid #27272A' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
                  Matin — 09:00 à 12:00
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-300" style={{ background: '#09090B', border: '1px solid #27272A' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
                  Après-midi — 14:00 à 18:00
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Durée des RDV</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: duration === d ? '#10B981' : '#09090B', color: duration === d ? '#fff' : '#71717A', border: duration === d ? 'none' : '1px solid #27272A' }}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Battement entre RDV</label>
              <div className="flex flex-wrap gap-2">
                {BUFFERS.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBuffer(b)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: buffer === b ? '#10B981' : '#09090B', color: buffer === b ? '#fff' : '#71717A', border: buffer === b ? 'none' : '1px solid #27272A' }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Notification chain ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Tout est automatisé</h2>
            <p className="text-gray-500 text-sm">Dès qu&apos;un RDV est pris, la chaîne de notifications se déclenche seule.</p>
          </div>
          <div className="max-w-md mx-auto">
            <NotificationChain />
          </div>
        </motion.div>

        {/* ── Dashboard mockup ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Votre tableau de bord</h2>
            <p className="text-gray-500 text-sm">Vue d&apos;ensemble de tous vos prochains rendez-vous.</p>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#18181B', border: '1px solid #27272A' }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ background: '#27272A', borderBottom: '1px solid #3F3F46' }}>
              <span className="text-xs font-bold text-white">Aujourd&apos;hui — {TODAY} {MONTH_LABEL.split(' ')[0]}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7' }}>{DASHBOARD_APPOINTMENTS.length} RDV</span>
            </div>
            <div className="divide-y" style={{ borderColor: '#27272A' }}>
              {DASHBOARD_APPOINTMENTS.map((apt, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid #27272A' }}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'rgba(16,185,129,0.12)', color: '#6EE7B7' }}>
                    {apt.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{apt.name}</p>
                    <p className="text-xs text-gray-500">{apt.service}</p>
                  </div>
                  <span className="text-xs font-mono text-gray-400 shrink-0">{apt.time}</span>
                  <span
                    className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0"
                    style={apt.status === 'confirmed'
                      ? { background: 'rgba(16,185,129,0.12)', color: '#6EE7B7' }
                      : { background: 'rgba(245,158,11,0.12)', color: '#FCD34D' }}
                  >
                    {apt.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                  </span>
                  <button className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: '#27272A', color: '#A1A1AA' }}>
                    Voir
                  </button>
                </motion.div>
              ))}
            </div>
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
            <p className="text-gray-500 text-sm">Quatre étapes pour ne plus jamais gérer un agenda à la main.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: '01', icon: '🗓️', title: 'Définissez vos disponibilités', desc: 'Jours, horaires, durée des RDV et battement — configuré en 2 minutes.' },
              { step: '02', icon: '🔗', title: 'Partagez votre lien',           desc: 'Un lien unique à mettre sur votre site, vos réseaux ou par SMS.' },
              { step: '03', icon: '👥', title: 'Les clients réservent',         desc: 'Ils choisissent un créneau disponible en temps réel, sans appel.' },
              { step: '04', icon: '🤖', title: 'Tout est automatisé',          desc: 'Confirmations, rappels et suivi se déclenchent sans aucune action.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="relative rounded-xl p-5"
                style={{ background: '#18181B', border: '1px solid #27272A' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-3xl font-black tabular-nums" style={{ color: 'rgba(16,185,129,0.15)', lineHeight: 1 }}>{item.step}</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                {i < 3 && <div className="hidden lg:block absolute top-1/2 -right-2.5 -translate-y-1/2 text-gray-700 z-10 text-xs">→</div>}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Use cases carousel ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Adapté à votre activité</h2>
            <p className="text-gray-500 text-sm">Quel que soit votre métier, l&apos;agenda s&apos;adapte à vos besoins.</p>
          </div>
          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, #09090B, transparent)' }} />
            <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none" style={{ background: 'linear-gradient(270deg, #09090B, transparent)' }} />
            <div className="overflow-hidden">
              <div className="flex gap-4" style={{ animation: 'scroll-left 32s linear infinite', width: 'max-content' }}>
                {[...USE_CASES, ...USE_CASES].map((uc, i) => (
                  <div key={i} className="shrink-0 w-60 rounded-xl p-4" style={{ background: '#18181B', border: '1px solid #27272A' }}>
                    <div className="text-3xl mb-3">{uc.icon}</div>
                    <h4 className="text-sm font-bold text-white mb-1.5">{uc.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed italic">{uc.example}</p>
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
            <h2 className="text-2xl font-bold text-white mb-2">Tout ce qu&apos;il faut pour gérer votre agenda</h2>
            <p className="text-gray-500 text-sm">Survolez pour en savoir plus.</p>
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
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(52,211,153,0.04))', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <h2 className="text-2xl font-extrabold text-white mb-2">Prêt à automatiser votre agenda ?</h2>
          <p className="text-gray-400 text-sm mb-6">Rejoignez 6 300+ professionnels qui ne gèrent plus leurs RDV à la main.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: '#10B981', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}
          >
            📅 Créer mon agenda gratuitement
          </button>
          <p className="text-gray-600 text-xs mt-4">Essai 3 jours · Aucune carte bancaire requise · Configuration en 5 min</p>
        </motion.div>

      </div>

      <AnimatePresence>
        {bookingSlot && selectedDay && (
          <BookingModal day={selectedDay} time={bookingSlot} onClose={() => setBookingSlot(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
