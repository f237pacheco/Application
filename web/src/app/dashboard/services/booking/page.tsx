'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { slugify, SLUG_REGEX, getParisNow, formatHourFR } from '@/lib/booking'
import { compressImage, extensionForMimeType } from '@/lib/image'
import {
  StoreIcon, LinkIcon, MessageSquareIcon, ImageIcon, FileTextIcon, CreditCardIcon, InfoIcon,
  ClockIcon, CalendarIcon, SparklesIcon, EyeIcon, ExternalLinkIcon, RefreshIcon, CheckIcon,
  ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, TrashIcon, AlertCircleIcon, ArrowLeftIcon, ArrowRightIcon,
  ZapIcon, CheckCircleIcon, MailIcon,
} from '@/components/booking/icons'
import { MeshBackground, GradientIconBadge, GradientButton, AnimatedCounter, Toast, AdaptiveLogo } from '@/components/booking/decorative'
import { INK, MUTED, FAINT, BORDER, BORDER_STRONG, CARD, PAGE_BG, GRADIENT_BRAND, INDIGO, VIOLET, PINK, AMBER, SHADOW_SOFT, TINTS } from '@/components/booking/theme'

const MAX_LOGO_SIZE = 50 * 1024 * 1024 // 50 MB — image is compressed to ~800x800 client-side before upload anyway
const ACCEPTED_LOGO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] // Monday-first display order (DB stores JS getDay(): 0=Sun..6=Sat)
const WEEK_LABELS: Record<number, string> = { 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi', 0: 'Dimanche' }
const WEEK_SHORT: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 0: 'Dim' }

const DURATIONS = [15, 30, 45, 60]
const BUFFERS = [0, 5, 10, 15]
const ADVANCE_OPTIONS = [7, 14, 30, 60, 90]
const ONBOARDING_STEPS = ['Vos informations', 'Détails pratiques', 'Réglages des créneaux', 'Disponibilités']

const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

type Range = { start: string; end: string; enabled: boolean }
type DayState = { dayActive: boolean; morning: Range; afternoon: Range }
type SlugStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'current' | 'check-failed'

function defaultDay(active: boolean): DayState {
  return {
    dayActive: active,
    morning: { start: '09:00', end: '12:00', enabled: true },
    afternoon: { start: '14:00', end: '18:00', enabled: true },
  }
}

function defaultWeek(): Record<number, DayState> {
  return { 1: defaultDay(true), 2: defaultDay(true), 3: defaultDay(true), 4: defaultDay(true), 5: defaultDay(true), 6: defaultDay(false), 0: defaultDay(false) }
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

// ─── Small UI atoms ─────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <motion.button
      onClick={onToggle}
      whileTap={{ scale: 0.92 }}
      animate={{ background: on ? '#10B981' : 'rgba(255,255,255,0.12)', boxShadow: on ? '0 0 0 3px rgba(16,185,129,0.18)' : '0 0 0 0px rgba(16,185,129,0)' }}
      transition={{ duration: 0.2 }}
      className="relative w-9 h-5 rounded-full shrink-0"
    >
      <motion.div animate={{ x: on ? 18 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute top-0.5 w-4 h-4 rounded-full" style={{ background: '#FAFAFA' }} />
    </motion.button>
  )
}

// 15-minute increments, 00:00 through 23:45 — matches the granularity a
// pro would actually want when setting opening hours.
const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4).toString().padStart(2, '0')
  const m = ((i % 4) * 15).toString().padStart(2, '0')
  return `${h}:${m}`
})

// Custom dropdown standing in for a native <input type="time"> — the native
// picker UI can't be restyled (only the closed-state field can), so a fully
// custom list is the only way to get a result that matches the dark theme.
function TimeSelect({ value, onChange, disabled, accent = '#10B981' }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; accent?: string
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Rendered through a portal (see below) — several ancestors use
  // `overflow: hidden` for the day-row's rounded corners and its height
  // reveal animation, which would otherwise clip this dropdown the moment
  // it tried to open below the row's visible bounds.
  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) setCoords({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (buttonRef.current?.contains(e.target as Node)) return
      if (listRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    // Capture phase, deliberately: the page scrolling underneath a fixed-
    // position dropdown should close it. But scroll events don't bubble, and
    // the dropdown's OWN internal list also scrolls itself to the selected
    // time on open (see the effect below) — without excluding events whose
    // target is that same list, that self-scroll closed the dropdown the
    // instant it opened, making the whole picker look completely dead.
    const onScrollOrResize = (e: Event) => {
      if (listRef.current && e.target instanceof Node && listRef.current.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  useEffect(() => {
    if (!open || !listRef.current) return
    const selected = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null
    selected?.scrollIntoView({ block: 'center' })
  }, [open])

  return (
    <>
      <motion.button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        whileHover={!disabled ? { borderColor: 'rgba(255,255,255,0.16)' } : undefined}
        whileTap={!disabled ? { scale: 0.97 } : undefined}
        className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
        style={{ background: '#0A0A0F', border: `1px solid ${open ? accent : 'rgba(255,255,255,0.08)'}`, color: disabled ? '#6B7280' : '#FAFAFA', transition: 'border-color 0.15s' }}
      >
        {formatHourFR(value)}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }} style={{ color: '#6B7280' }}>
          <ChevronDownIcon size={12} />
        </motion.span>
      </motion.button>
      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={listRef}
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="fixed z-[100] w-24 max-h-52 overflow-y-auto rounded-xl p-1"
              style={{ top: coords.top, left: coords.left, background: '#1D1D26', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}
            >
              {TIME_OPTIONS.map((t) => {
                const isSelected = t === value
                return (
                  <button
                    key={t}
                    type="button"
                    data-selected={isSelected}
                    onClick={() => { onChange(t); setOpen(false) }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: isSelected ? `${accent}22` : 'transparent', color: isSelected ? accent : '#D4D4D8' }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    {formatHourFR(t)}
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

// At-a-glance 24h bar showing exactly when a day is open — morning/afternoon
// ranges rendered as emerald segments positioned by their share of the day.
function DayTimeline({ day }: { day: DayState }) {
  const toPct = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return ((h * 60 + m) / (24 * 60)) * 100
  }
  const segments = (['morning', 'afternoon'] as const).filter((p) => day[p].enabled && day[p].start < day[p].end)
  return (
    <div className="relative h-1.5 rounded-full overflow-hidden mt-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
      {segments.map((p) => {
        const left = toPct(day[p].start)
        const width = toPct(day[p].end) - left
        return (
          <motion.div
            key={p}
            className="absolute top-0 h-full rounded-full"
            style={{ left: `${left}%`, background: '#10B981' }}
            initial={{ width: 0 }}
            animate={{ width: `${width}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        )
      })}
    </div>
  )
}

// Grows with its content instead of scrolling internally — the pro always
// sees everything they've typed. Height is set imperatively (not by CSS
// `field-sizing: content`, not yet universally supported) so the CSS
// `transition` on height can animate each resize smoothly.
function AutoTextarea({
  value, onChange, placeholder, minRows = 2, className = '', style,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  minRows?: number
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => { resize() }, [value, resize])
  useEffect(() => {
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [resize])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      onInput={resize}
      placeholder={placeholder}
      rows={minRows}
      className={`resize-none overflow-hidden transition-[height] duration-150 ease-out ${className}`}
      style={style}
    />
  )
}

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
        style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}
        aria-label="Aide"
      >
        i
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute z-20 top-6 left-0 w-64 rounded-xl p-3 text-xs leading-relaxed"
            style={{ background: '#1D1D26', color: '#FAFAFA', boxShadow: '0 12px 32px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

function SectionCard({ title, subtitle, tooltip, icon, gradient = GRADIENT_BRAND, children }: { title: string; subtitle?: string; tooltip?: string; icon?: React.ReactNode; gradient?: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ borderColor: BORDER_STRONG, y: -2, boxShadow: '0 12px 32px rgba(0,0,0,0.45)' }}
      className="relative rounded-2xl p-6 sm:p-7 mb-6 overflow-hidden"
      style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}
    >
      <motion.div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: gradient, opacity: 0.05 }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="flex items-center gap-3 mb-1 relative">
        {icon && (
          <motion.div whileHover={{ scale: 1.08, rotate: -4 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
            <GradientIconBadge icon={icon} gradient={gradient} size={36} radius={12} />
          </motion.div>
        )}
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold" style={{ color: INK }}>{title}</h2>
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
      </div>
      {subtitle && <p className="text-sm mb-5 mt-1 relative" style={{ color: MUTED }}>{subtitle}</p>}
      <div className="relative">{children}</div>
    </motion.div>
  )
}

function Modal({ open, onClose, gradientHeader, children }: { open: boolean; onClose: () => void; gradientHeader?: React.ReactNode; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.72)' }}
            initial={{ backdropFilter: 'blur(0px)' }}
            animate={{ backdropFilter: 'blur(6px)' }}
            exit={{ backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl"
            style={{ background: CARD, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.65)' }}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          >
            {gradientHeader && <div className="px-6 pt-6 pb-5" style={{ background: GRADIENT_BRAND }}>{gradientHeader}</div>}
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

type MessageTemplate = { icon: React.ReactNode; label: string; tag: string; accent: string; accentSoft: string; text: string }

function buildMessageTemplates(businessName: string, url: string): MessageTemplate[] {
  const name = businessName || 'Votre activité'
  return [
    {
      icon: <MessageSquareIcon size={13} />,
      label: 'SMS',
      tag: 'Court et direct',
      accent: '#3B82F6',
      accentSoft: 'rgba(59,130,246,0.1)',
      text: `${name} : réservez votre prochain RDV en ligne en 30 secondes, où que vous soyez → ${url}`,
    },
    {
      icon: <MailIcon size={13} />,
      label: 'Email',
      tag: 'Formel et complet',
      accent: '#F59E0B',
      accentSoft: 'rgba(245,158,11,0.1)',
      text: `Bonjour,\n\nPour vous simplifier la prise de rendez-vous, vous pouvez désormais réserver directement en ligne, à l'heure qui vous convient le mieux — sans appel ni attente :\n\n${url}\n\nLa réservation prend moins d'une minute et vous recevrez une confirmation immédiate par email. N'hésitez pas à nous contacter si vous avez la moindre question.\n\nAu plaisir de vous accueillir prochainement,\n${name}`,
    },
    {
      icon: <SparklesIcon size={13} />,
      label: 'Réseaux sociaux',
      tag: 'Accrocheur',
      accent: '#10B981',
      accentSoft: 'rgba(16,185,129,0.1)',
      text: `Nouveauté chez ${name} !\n\nFini le temps d'attente au téléphone : réservez votre rendez-vous en ligne, 24h/24, en quelques clics :\n${url}`,
    },
  ]
}

function ClientMessageModal({ open, onClose, businessName, url }: { open: boolean; onClose: () => void; businessName: string; url: string }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const templates = useMemo(() => buildMessageTemplates(businessName, url), [businessName, url])

  const handleCopy = (idx: number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 2000)
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      gradientHeader={
        <div className="flex items-start justify-between text-white">
          <div>
            <p className="text-lg font-bold flex items-center gap-2"><MessageSquareIcon size={18} /> Messages prêts à envoyer</p>
            <p className="text-xs mt-1 opacity-85">Trois formats pour annoncer votre nouvelle prise de rendez-vous en ligne.</p>
          </div>
          <motion.button whileHover={{ scale: 1.15, rotate: 90 }} whileTap={{ scale: 0.9 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }} onClick={onClose} className="text-white/80 hover:text-white text-xl leading-none px-1 shrink-0">×</motion.button>
        </div>
      }
    >
      <div className="flex flex-col gap-3.5">
        {templates.map((t, idx) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.08 }}
            whileHover={{ borderColor: t.accent + '55', y: -2, boxShadow: `0 8px 24px ${t.accent}22` }}
            className="rounded-2xl overflow-hidden"
            style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ background: t.accentSoft, borderBottom: `1px solid ${t.accent}33` }}>
              <span className="text-xs font-bold flex items-center gap-2" style={{ color: t.accent }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px]" style={{ background: t.accent + '22' }}>{t.icon}</span>
                {t.label}
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}>{t.tag}</span>
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => handleCopy(idx, t.text)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                style={{ background: copiedIdx === idx ? '#10B981' : 'rgba(255,255,255,0.06)', color: copiedIdx === idx ? '#fff' : '#9CA3AF' }}
              >
                <span className="inline-flex items-center gap-1">{copiedIdx === idx && <CheckIcon size={11} strokeWidth={2.5} />}{copiedIdx === idx ? 'Copié !' : 'Copier ce message'}</span>
              </motion.button>
            </div>
            <div className="px-4 py-3.5">
              <p className="text-[13px] text-[#9CA3AF] leading-relaxed whitespace-pre-line">{t.text}</p>
              {t.label === 'SMS' && (
                <p className="text-[10px] mt-2.5 pt-2.5" style={{ color: t.text.length > 160 ? '#F87171' : '#6B7280', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {t.text.length} caractères {t.text.length > 160 ? '· sera envoyé en plusieurs SMS' : '· tient dans un seul SMS'}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <p className="text-[11px] text-[#6B7280] mt-4 text-center flex items-center justify-center gap-1.5"><SparklesIcon size={12} /> N&apos;hésitez pas à personnaliser ces messages avant de les envoyer.</p>
    </Modal>
  )
}

function SlugBadge({ status }: { status: SlugStatus }) {
  const map: Record<SlugStatus, { label: string; color: string; bg: string; icon?: React.ReactNode } | null> = {
    idle: null,
    invalid: { label: 'Format invalide (lettres, chiffres, tirets)', color: '#F87171', bg: 'rgba(239,68,68,0.1)' },
    checking: { label: 'Vérification…', color: '#9CA3AF', bg: 'rgba(255,255,255,0.06)' },
    available: { label: 'Disponible', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: <CheckIcon size={11} strokeWidth={2.5} /> },
    taken: { label: 'Déjà pris', color: '#F87171', bg: 'rgba(239,68,68,0.1)' },
    current: { label: 'Votre lien actuel', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: <CheckIcon size={11} strokeWidth={2.5} /> },
    'check-failed': { label: 'Vérification impossible', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: <AlertCircleIcon size={11} /> },
  }
  const cfg = map[status]
  if (!cfg) return null
  return (
    <span className="text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap inline-flex items-center gap-1" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BookingSettingsPage() {
  const { user } = useAuth()

  const [loaded, setLoaded] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [slug, setSlug] = useState('')
  const [savedSlug, setSavedSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [emailContact, setEmailContact] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoProgress, setLogoProgress] = useState(0)
  const [logoError, setLogoError] = useState('')
  const [logoPendingFile, setLogoPendingFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [services, setServices] = useState('')
  const [instructions, setInstructions] = useState('')
  const [paymentMethods, setPaymentMethods] = useState('')
  const [slotDuration, setSlotDuration] = useState(30)
  const [bufferTime, setBufferTime] = useState(5)
  const [advanceDays, setAdvanceDays] = useState(30)

  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [showRemoveLogoConfirm, setShowRemoveLogoConfirm] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(1)

  const [week, setWeek] = useState<Record<number, DayState>>(defaultWeek())
  const [dayErrors, setDayErrors] = useState<Record<number, boolean>>({})
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set())
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0)

  const dayDebounce = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  // ── Load existing config ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const [{ data: settingsRow }, { data: availRows }, { data: blockedRows }] = await Promise.all([
        supabase.from('booking_settings').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('availability').select('*').eq('user_id', user.id),
        supabase.from('blocked_dates').select('date').eq('user_id', user.id),
      ])
      if (cancelled) return

      if (settingsRow) {
        setBusinessName(settingsRow.business_name ?? '')
        setSlug(settingsRow.slug ?? '')
        setSavedSlug(settingsRow.slug ?? '')
        setSlugTouched(true)
        setDescription(settingsRow.description ?? '')
        setAddress(settingsRow.address ?? '')
        setPhone(settingsRow.phone ?? '')
        setEmailContact(settingsRow.email_contact ?? '')
        setLogoUrl(settingsRow.logo_url ?? '')
        setServices(settingsRow.services ?? '')
        setInstructions(settingsRow.instructions ?? '')
        setPaymentMethods(settingsRow.payment_methods ?? '')
        setSlotDuration(settingsRow.slot_duration ?? 30)
        setBufferTime(settingsRow.buffer_time ?? 5)
        setAdvanceDays(settingsRow.advance_booking_days ?? 30)
      }

      if (availRows && availRows.length > 0) {
        const next = defaultWeek()
        WEEK_ORDER.forEach((d) => {
          next[d] = { dayActive: false, morning: { ...next[d].morning, enabled: false }, afternoon: { ...next[d].afternoon, enabled: false } }
        })
        type AvailRow = { day_of_week: number; start_time: string; end_time: string }
        ;(availRows as AvailRow[]).forEach((row) => {
          const day = next[row.day_of_week]
          if (!day) return
          day.dayActive = true
          const range: Range = { start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5), enabled: true }
          if (!day.morning.enabled) day.morning = range
          else day.afternoon = range
        })
        setWeek(next)
      }

      if (blockedRows) {
        setBlockedDates(new Set((blockedRows as { date: string }[]).map((r) => r.date)))
      }

      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [user?.id])

  // ── Auto-derive slug from business name until user edits it manually ──────
  useEffect(() => {
    if (!loaded) return
    if (slugTouched) return
    setSlug(slugify(businessName))
  }, [businessName, loaded, slugTouched])

  // ── Live slug availability check ───────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return
    if (slug === savedSlug && savedSlug !== '') { setSlugStatus('current'); return }
    if (slug.length === 0) { setSlugStatus('idle'); return }
    if (slug.length < 3 || !SLUG_REGEX.test(slug)) { setSlugStatus('invalid'); return }

    setSlugStatus('checking')
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/bookings/check-slug?slug=${encodeURIComponent(slug)}`)
        if (!res.ok) {
          console.error('[booking-settings] check-slug returned', res.status)
          setSlugStatus('check-failed')
          return
        }
        const data = await res.json() as { available: boolean }
        setSlugStatus(data.available ? 'available' : 'taken')
      } catch (err) {
        console.error('[booking-settings] check-slug network error', err)
        setSlugStatus('check-failed')
      }
    }, 500)
    return () => clearTimeout(handle)
  }, [slug, savedSlug, loaded])

  function buildAvailabilityRows(userId: string, dayOfWeek: number, day: DayState) {
    const rows: { user_id: string; day_of_week: number; start_time: string; end_time: string; is_active: boolean }[] = []
    if (day.dayActive) {
      if (day.morning.enabled && day.morning.start < day.morning.end) {
        rows.push({ user_id: userId, day_of_week: dayOfWeek, start_time: day.morning.start, end_time: day.morning.end, is_active: true })
      }
      if (day.afternoon.enabled && day.afternoon.start < day.afternoon.end) {
        rows.push({ user_id: userId, day_of_week: dayOfWeek, start_time: day.afternoon.start, end_time: day.afternoon.end, is_active: true })
      }
    }
    return rows
  }

  // Replaces all of a day's rows with the current UI state. Returns an error, if any.
  async function writeDayAvailability(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    dayOfWeek: number,
    day: DayState
  ) {
    const { error: deleteError } = await supabase.from('availability').delete().eq('user_id', userId).eq('day_of_week', dayOfWeek)
    if (deleteError) return deleteError
    const rows = buildAvailabilityRows(userId, dayOfWeek, day)
    if (rows.length === 0) return null
    const { error: insertError } = await supabase.from('availability').insert(rows)
    return insertError
  }

  // ── Persist one day's availability ranges (debounced, on toggle/range edit) ─
  const persistDay = useCallback((dayOfWeek: number, day: DayState) => {
    if (!user?.id) return
    clearTimeout(dayDebounce.current[dayOfWeek])
    dayDebounce.current[dayOfWeek] = setTimeout(async () => {
      const supabase = createClient()
      const error = await writeDayAvailability(supabase, user.id, dayOfWeek, day)
      if (error) {
        console.error(`[booking-settings] availability save failed for day ${dayOfWeek}`, error)
        setDayErrors((prev) => ({ ...prev, [dayOfWeek]: true }))
      } else {
        setDayErrors((prev) => {
          if (!prev[dayOfWeek]) return prev
          const next = { ...prev }
          delete next[dayOfWeek]
          return next
        })
      }
    }, 500)
  }, [user?.id])

  const updateDay = useCallback((dayOfWeek: number, patch: Partial<DayState>) => {
    setWeek((prev) => {
      const next = { ...prev, [dayOfWeek]: { ...prev[dayOfWeek], ...patch } }
      persistDay(dayOfWeek, next[dayOfWeek])
      return next
    })
  }, [persistDay])

  const updateRange = useCallback((dayOfWeek: number, period: 'morning' | 'afternoon', patch: Partial<Range>) => {
    setWeek((prev) => {
      const day = { ...prev[dayOfWeek], [period]: { ...prev[dayOfWeek][period], ...patch } }
      const next = { ...prev, [dayOfWeek]: day }
      persistDay(dayOfWeek, day)
      return next
    })
  }, [persistDay])

  // ── Logo upload: pick → preview → confirm → compress client-side → upload ──
  const handleLogoSelect = useCallback((file: File) => {
    setLogoError('')
    console.log(`[logo-upload] ÉTAPE 1/4 — sélection fichier : nom="${file.name}" type="${file.type}" taille=${(file.size / 1024).toFixed(0)}Ko`)
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      console.warn(`[logo-upload] rejeté — type MIME "${file.type}" non accepté (accepte: ${ACCEPTED_LOGO_TYPES.join(', ')})`)
      setLogoError(`Formats acceptés : JPG, PNG, WebP (type reçu : "${file.type}").`)
      return
    }
    if (file.size > MAX_LOGO_SIZE) {
      console.warn(`[logo-upload] rejeté — fichier trop lourd (${(file.size / 1024 / 1024).toFixed(1)} Mo > 50 Mo max)`)
      setLogoError('Image trop lourde (50 Mo maximum).')
      return
    }
    setLogoPendingFile(file)
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleCancelLogoSelect = useCallback(() => {
    setLogoPendingFile(null)
    setLogoPreview('')
    setLogoError('')
  }, [])

  const handleConfirmLogoUpload = useCallback(async () => {
    if (!user?.id || !logoPendingFile) return
    setLogoError('')
    setLogoUploading(true)
    setLogoProgress(15)
    try {
      const compressed = await compressImage(logoPendingFile, 1600, 0.92)
      console.log(`[logo-upload] ÉTAPE 2/4 — compression OK : ${(logoPendingFile.size / 1024).toFixed(0)}Ko → ${(compressed.size / 1024).toFixed(0)}Ko, type="${compressed.type}"`)
      setLogoProgress(50)

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      console.log(`[logo-upload] utilisateur authentifié : user.id="${user.id}" session présente=${!!session}`)

      const ext = extensionForMimeType(compressed.type || logoPendingFile.type)
      const path = `${user.id}/logo.${ext}`
      console.log(`[logo-upload] ÉTAPE 3/4 — envoi vers Supabase Storage bucket "booking-logos", chemin="${path}"`)

      const uploadResult = await supabase.storage.from('booking-logos').upload(path, compressed, { upsert: true, contentType: compressed.type })
      console.log(`[logo-upload] RÉPONSE SUPABASE STORAGE COMPLÈTE:`, JSON.stringify(uploadResult))
      setLogoProgress(80)

      if (uploadResult.error) {
        const err = uploadResult.error as { message?: string; statusCode?: string; error?: string; name?: string }
        console.error(`[logo-upload] ÉCHEC UPLOAD — objet erreur complet:`, uploadResult.error)
        setLogoError(`Échec de l'envoi (Supabase Storage) : ${err.message || err.error || JSON.stringify(uploadResult.error)}`)
        return
      }

      const { data: publicUrlData } = supabase.storage.from('booking-logos').getPublicUrl(path)
      const url = `${publicUrlData.publicUrl}?t=${Date.now()}`
      console.log(`[logo-upload] ÉTAPE 4/4 — enregistrement de logo_url="${url}" dans booking_settings`)

      // A targeted UPDATE on the existing row — never an upsert/insert here.
      // An upsert with only { user_id, logo_url } would omit slug/business_name
      // from the payload; if it ever took the INSERT branch (row not matched,
      // e.g. after a stale client state) it would violate booking_settings'
      // NOT NULL constraint on slug. This can only ever touch logo_url on the
      // row the user already owns (gated on savedSlug being set beforehand).
      const updatePayload = { logo_url: url }
      console.log(`[logo-upload] UPDATE envoyé à booking_settings (user_id="${user.id}"):`, JSON.stringify(updatePayload))

      const { data: updatedRows, error: saveError } = await supabase
        .from('booking_settings')
        .update(updatePayload)
        .eq('user_id', user.id)
        .select('id, slug')

      if (saveError) {
        console.error(`[logo-upload] ÉCHEC ENREGISTREMENT booking_settings:`, JSON.stringify(saveError))
        setLogoError(`Image envoyée mais échec de l'enregistrement : ${saveError.message}`)
        return
      }
      console.log(`[logo-upload] réponse UPDATE booking_settings:`, JSON.stringify(updatedRows))
      if (!updatedRows || updatedRows.length === 0) {
        console.error('[logo-upload] UPDATE n\'a touché aucune ligne — aucune config booking_settings existante pour cet utilisateur')
        setLogoError("Image envoyée mais aucune configuration existante à mettre à jour — enregistrez d'abord vos informations.")
        return
      }
      console.log(`[logo-upload] TERMINÉ — logo enregistré avec succès, slug conservé="${updatedRows[0].slug}"`)
      setLogoProgress(100)
      setLogoUrl(url)
      setLogoPendingFile(null)
      setLogoPreview('')
    } catch (err) {
      console.error('[logo-upload] EXCEPTION (compression ou réseau):', err)
      const message = err instanceof Error ? err.message : String(err)
      setLogoError(`Échec du traitement de l'image : ${message}`)
    } finally {
      setLogoUploading(false)
      setTimeout(() => setLogoProgress(0), 600)
    }
  }, [user?.id, logoPendingFile])

  const handleRemoveLogo = useCallback(async () => {
    if (!user?.id) return
    setLogoError('')
    setShowRemoveLogoConfirm(false)
    const supabase = createClient()
    const { error } = await supabase.from('booking_settings').update({ logo_url: null }).eq('user_id', user.id)
    if (error) {
      console.error('[booking-settings] logo removal failed', error)
      setLogoError('Impossible de supprimer le logo — réessayez.')
      return
    }
    setLogoUrl('')
  }, [user?.id])

  // ── Explicit save (business info + slot config + full week availability) ──
  const canSave = businessName.trim().length > 0 && slug.length >= 3 && SLUG_REGEX.test(slug)

  const handleSave = useCallback(async () => {
    if (!user?.id || !canSave) return
    setSaveState('saving')
    setSaveError('')
    const supabase = createClient()

    const { error: settingsError } = await supabase.from('booking_settings').upsert(
      {
        user_id: user.id,
        business_name: businessName.trim(),
        slug,
        description: description.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        email_contact: emailContact.trim() || null,
        services: services.trim() || null,
        instructions: instructions.trim() || null,
        payment_methods: paymentMethods.trim() || null,
        slot_duration: slotDuration,
        buffer_time: bufferTime,
        advance_booking_days: advanceDays,
      },
      { onConflict: 'user_id' }
    )

    if (settingsError) {
      console.error('[booking-settings] booking_settings save failed', settingsError)
      const message = settingsError.code === '23505'
        ? 'Ce lien de réservation est déjà utilisé — choisissez-en un autre.'
        : `Erreur : ${settingsError.message}`
      setSaveError(message)
      setSaveState('error')
      return
    }

    // Flush any pending per-day debounces and persist the full week now, so a
    // save click always reflects exactly what's on screen (no race with a reload).
    Object.values(dayDebounce.current).forEach(clearTimeout)
    const dayResults = await Promise.all(
      WEEK_ORDER.map(async (dayOfWeek) => ({
        dayOfWeek,
        error: await writeDayAvailability(supabase, user.id, dayOfWeek, week[dayOfWeek]),
      }))
    )
    const failedDays = dayResults.filter((r) => r.error)
    setDayErrors(Object.fromEntries(failedDays.map((r) => [r.dayOfWeek, true])))

    if (failedDays.length > 0) {
      failedDays.forEach((r) => console.error(`[booking-settings] availability save failed for day ${r.dayOfWeek}`, r.error))
      setSaveError(`Vos informations sont enregistrées, mais ${failedDays.length} jour(s) de disponibilité n'ont pas pu être sauvegardés.`)
      setSaveState('error')
      return
    }

    setSavedSlug(slug)
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2500)
  }, [user?.id, canSave, businessName, slug, description, address, phone, emailContact, services, instructions, paymentMethods, slotDuration, bufferTime, advanceDays, week])

  // ── Blocked dates calendar (current + next month) ──────────────────────────
  const calendarMonth = useMemo(() => {
    const base = getParisNow()
    base.setDate(1)
    base.setMonth(base.getMonth() + calendarMonthOffset)
    return base
  }, [calendarMonthOffset])

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const offset = (firstDay.getDay() + 6) % 7 // Monday-first offset
    const cells: (Date | null)[] = Array(offset).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    return cells
  }, [calendarMonth])

  const toggleBlockedDate = useCallback(async (date: Date) => {
    if (!user?.id) return
    const key = toDateKey(date)
    const supabase = createClient()
    const isBlocked = blockedDates.has(key)
    setBlockedDates((prev) => {
      const next = new Set(prev)
      if (isBlocked) next.delete(key)
      else next.add(key)
      return next
    })
    const { error } = isBlocked
      ? await supabase.from('blocked_dates').delete().eq('user_id', user.id).eq('date', key)
      : await supabase.from('blocked_dates').insert({ user_id: user.id, date: key })
    if (error) {
      console.error('[booking-settings] blocked_dates save failed', error)
      // Revert the optimistic UI update since the write didn't actually persist
      setBlockedDates((prev) => {
        const next = new Set(prev)
        if (isBlocked) next.add(key)
        else next.delete(key)
        return next
      })
    }
  }, [user?.id, blockedDates])

  const publicUrl = useMemo(() => {
    const origin = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
    return `${origin}/rdv/${slug || '...'}`
  }, [slug])

  const handleCopyLink = () => {
    if (!savedSlug) return
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Europe/Paris wall-clock date, regardless of the pro's device timezone.
  const today = useMemo(() => { const d = getParisNow(); d.setHours(0, 0, 0, 0); return d }, [])

  const activeDaysCount = Object.values(week).filter((d) => d.dayActive).length
  const completionChecklist = [
    !!savedSlug,
    !!logoUrl,
    !!description.trim(),
    !!(address.trim() || phone.trim()),
    activeDaysCount > 0,
    !!(services.trim() || instructions.trim() || paymentMethods.trim()),
  ]
  const completionPercent = Math.round((completionChecklist.filter(Boolean).length / completionChecklist.length) * 100)
  const isOnboarding = loaded && !savedSlug

  return (
    <div className="relative min-h-screen" style={{ background: PAGE_BG }}>
      <MeshBackground />

      <div className="relative max-w-7xl mx-auto px-4 py-10" style={{ zIndex: 1 }}>

        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="mb-8 flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm hover:opacity-70 transition-opacity duration-150" style={{ color: MUTED }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Retour aux services
          </Link>
          <Link href="/dashboard/services/booking/appointments" className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-xl transition-all duration-150 hover:scale-[1.04] hover:shadow-[0_6px_20px_rgba(16,185,129,0.25)] active:scale-[0.97]" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>
            <CalendarIcon size={15} /> Voir mes RDV <ArrowRightIcon size={13} />
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-[#FAFAFA] mb-2">Configurez votre agenda</h1>
              <p className="text-[#9CA3AF] text-sm">Renseignez vos informations et vos disponibilités — vos clients pourront réserver immédiatement.</p>
            </div>
            {loaded && (
              <div className="shrink-0 w-full sm:w-48">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-[#9CA3AF]">Profil complété</span>
                  <motion.span
                    key={completionPercent === 100 ? 'done' : 'progress'}
                    initial={{ opacity: 0, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-bold"
                    style={{ color: completionPercent === 100 ? '#10B981' : '#F59E0B' }}
                  >
                    <AnimatedCounter value={completionPercent} suffix="%" />
                  </motion.span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${completionPercent}%`, background: completionPercent === 100 ? '#10B981' : '#F59E0B' }}
                    initial={{ width: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Public link ──────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={savedSlug ? { borderColor: 'rgba(16,185,129,0.4)' } : undefined} className="rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: savedSlug ? 'rgba(16,185,129,0.06)' : '#111117', border: savedSlug ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#9CA3AF] mb-1.5 inline-flex items-center gap-1.5">
              {savedSlug && (
                <span className="relative inline-flex w-1.5 h-1.5">
                  <motion.span className="absolute inset-0 rounded-full" style={{ background: '#10B981' }} animate={{ scale: [1, 2.2], opacity: [0.7, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }} />
                  <span className="relative w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
                </span>
              )}
              Votre lien de réservation public
            </p>
            <p className="text-sm font-mono truncate" style={{ color: savedSlug ? '#10B981' : '#6B7280' }}>{publicUrl}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {savedSlug && (
              <motion.a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.04, background: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.96 }}
                className="px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#FAFAFA' }}
              >
                <EyeIcon size={14} /> Prévisualiser
              </motion.a>
            )}
            <motion.button
              disabled={!savedSlug}
              onClick={handleCopyLink}
              whileHover={savedSlug ? { scale: 1.04, boxShadow: '0 6px 20px rgba(16,185,129,0.35)' } : undefined}
              whileTap={savedSlug ? { scale: 0.96 } : undefined}
              className="px-4 py-2 rounded-xl text-xs font-bold"
              style={{ background: savedSlug ? '#10B981' : 'rgba(255,255,255,0.06)', color: savedSlug ? '#fff' : '#6B7280', cursor: savedSlug ? 'pointer' : 'not-allowed' }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={copied ? 'copied' : 'copy'}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="inline-block"
                >
                  <span className="inline-flex items-center gap-1.5">{copied ? <CheckIcon size={13} strokeWidth={2.5} /> : <LinkIcon size={13} />}{copied ? 'Copié !' : 'Copier le lien'}</span>
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.div>

        {savedSlug && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            whileHover={{ borderColor: '#10B981', color: '#10B981' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowMessageModal(true)}
            className="w-full sm:w-auto mb-6 px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2"
            style={{ background: '#111117', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <MessageSquareIcon size={15} /> Message à envoyer à vos clients
          </motion.button>
        )}

        <ClientMessageModal open={showMessageModal} onClose={() => setShowMessageModal(false)} businessName={businessName} url={publicUrl} />

        <Modal open={showRemoveLogoConfirm} onClose={() => setShowRemoveLogoConfirm(false)}>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}><TrashIcon size={20} /></div>
            <p className="text-sm font-bold text-[#FAFAFA] mb-1.5">Supprimer le logo ?</p>
            <p className="text-xs text-[#9CA3AF] mb-5">Il disparaîtra de votre page de réservation publique. Vous pourrez en ajouter un nouveau à tout moment.</p>
            <div className="flex gap-2">
              <motion.button whileHover={{ background: 'rgba(255,255,255,0.1)' }} whileTap={{ scale: 0.97 }} onClick={() => setShowRemoveLogoConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}>Annuler</motion.button>
              <motion.button whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(239,68,68,0.35)' }} whileTap={{ scale: 0.97 }} onClick={handleRemoveLogo} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#EF4444', color: '#fff' }}>Supprimer</motion.button>
            </div>
          </div>
        </Modal>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="min-w-0">

        {isOnboarding && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-sm font-bold text-[#FAFAFA] mb-1">Bienvenue — configurons votre page de réservation</p>
            <p className="text-xs text-[#9CA3AF] mb-4">Quatre étapes rapides pour que vos clients puissent réserver dès aujourd&apos;hui.</p>
            <div className="flex items-center gap-2 mb-1">
              {ONBOARDING_STEPS.map((s, idx) => {
                const n = idx + 1
                const done = n < onboardingStep
                const active = n === onboardingStep
                return (
                  <div key={s} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1">
                      <motion.div
                        animate={{ background: done || active ? '#10B981' : 'rgba(255,255,255,0.06)', color: done || active ? '#fff' : '#9CA3AF' }}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                      >
                        {done ? <CheckIcon size={11} strokeWidth={3} /> : n}
                      </motion.div>
                    </div>
                    {n < ONBOARDING_STEPS.length && (
                      <div className="flex-1 h-px mx-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div className="h-px" style={{ background: '#10B981' }} initial={false} animate={{ width: done ? '100%' : '0%' }} transition={{ duration: 0.3 }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] font-semibold text-[#9CA3AF] mt-2">Étape {onboardingStep}/{ONBOARDING_STEPS.length} — {ONBOARDING_STEPS[onboardingStep - 1]}</p>
          </motion.div>
        )}

        {/* ── Business info ────────────────────────────────────────────────── */}
        {(!isOnboarding || onboardingStep === 1) && (
        <SectionCard title="Informations" subtitle="Le nom et la description visibles par vos clients sur la page de réservation." tooltip="Ces informations apparaissent en haut de votre page publique et dans les emails envoyés à vos clients. Le logo remplace le rond avec vos initiales." icon={<StoreIcon size={18} />} gradient={TINTS.indigo.gradient}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Logo</label>

              {logoPreview ? (
                <div className="flex items-center gap-4">
                  <AdaptiveLogo src={logoPreview} alt="Aperçu" maxSize={112} radius={18} />
                  <div className="flex-1">
                    <p className="text-xs text-[#9CA3AF] mb-2">Aperçu — confirmez pour envoyer.</p>
                    {logoUploading && (
                      <div className="w-full h-1.5 rounded-full mb-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div className="h-full" style={{ background: '#10B981' }} animate={{ width: `${logoProgress}%` }} transition={{ duration: 0.3 }} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={!logoUploading ? { scale: 1.03, boxShadow: '0 6px 18px rgba(16,185,129,0.35)' } : undefined}
                        whileTap={!logoUploading ? { scale: 0.96 } : undefined}
                        onClick={handleConfirmLogoUpload}
                        disabled={logoUploading}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-60"
                        style={{ background: '#10B981', color: '#fff' }}
                      >
                        {logoUploading ? 'Envoi…' : 'Confirmer'}
                      </motion.button>
                      <motion.button
                        whileHover={!logoUploading ? { background: 'rgba(255,255,255,0.1)' } : undefined}
                        whileTap={!logoUploading ? { scale: 0.96 } : undefined}
                        onClick={handleCancelLogoSelect}
                        disabled={logoUploading}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
                        style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}
                      >
                        Annuler
                      </motion.button>
                    </div>
                    {logoError && <p className="text-[11px] mt-1.5" style={{ color: '#F87171' }}>{logoError}</p>}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <AdaptiveLogo src={logoUrl} alt="Logo" maxSize={112} radius={18} />
                  ) : (
                    <div className="w-28 h-28 rounded-2xl flex items-center justify-center text-3xl font-bold shrink-0" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {businessName.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label
                        className="inline-block px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 hover:scale-[1.03] active:scale-[0.97]"
                        style={{
                          background: !savedSlug ? 'rgba(255,255,255,0.06)' : '#111117',
                          color: !savedSlug ? '#6B7280' : '#9CA3AF',
                          border: '1px solid rgba(255,255,255,0.06)',
                          pointerEvents: !savedSlug ? 'none' : 'auto',
                        }}
                      >
                        {logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={!savedSlug}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoSelect(f); e.target.value = '' }}
                        />
                      </label>
                      {logoUrl && (
                        <button onClick={() => setShowRemoveLogoConfirm(true)} className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 hover:scale-[1.03] hover:bg-[rgba(239,68,68,0.14)] active:scale-[0.97]" style={{ background: 'rgba(239,68,68,0.08)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                          Supprimer
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6B7280] mt-1.5">
                      {!savedSlug ? 'Enregistrez vos informations une première fois pour activer l\'upload.' : 'JPG, PNG ou WebP, 10 Mo maximum — redimensionné automatiquement.'}
                    </p>
                    {logoError && <p className="text-[11px] mt-1" style={{ color: '#F87171' }}>{logoError}</p>}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Nom de votre activité *</label>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ex : Salon Claire Bernard"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-[#FAFAFA] placeholder-gray-600 outline-none focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] transition-shadow duration-150"
                style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Lien personnalisé *</label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-shadow duration-150 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]" style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-xs text-[#6B7280] shrink-0">/rdv/</span>
                <input
                  value={slug}
                  onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)) }}
                  placeholder="votre-nom"
                  className="flex-1 bg-transparent text-sm text-[#FAFAFA] placeholder-gray-600 outline-none min-w-0 transition-shadow duration-150"
                />
                <SlugBadge status={slugStatus} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Description</label>
              <AutoTextarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Une courte description de votre activité, visible sur votre page publique."
                minRows={3}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-[#FAFAFA] placeholder-gray-600 outline-none focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] transition-shadow duration-150"
                style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Adresse</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex : 12 rue de la Paix, 49000 Angers"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-[#FAFAFA] placeholder-gray-600 outline-none focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] transition-shadow duration-150"
                style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Téléphone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex : 02 41 00 00 00"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-[#FAFAFA] placeholder-gray-600 outline-none focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] transition-shadow duration-150"
                  style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Email de contact</label>
                <input
                  type="email"
                  value={emailContact}
                  onChange={(e) => setEmailContact(e.target.value)}
                  placeholder="contact@votre-activite.fr"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-[#FAFAFA] placeholder-gray-600 outline-none focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] transition-shadow duration-150"
                  style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}
                />
              </div>
            </div>

            <p className="text-xs text-[#6B7280]">Ces informations apparaissent dans les emails de confirmation envoyés à vos clients. Si elles sont vides, des valeurs par défaut génériques sont utilisées.</p>
          </div>
        </SectionCard>
        )}

        {isOnboarding && onboardingStep === 1 && (
          <div className="flex justify-end mb-6 -mt-2">
            <motion.button whileTap={{ scale: 0.97 }} disabled={!canSave} onClick={() => setOnboardingStep(2)} className="px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 disabled:opacity-40" style={{ background: canSave ? '#10B981' : 'rgba(255,255,255,0.06)', color: canSave ? '#fff' : '#6B7280' }}>
              Continuer <ArrowRightIcon size={14} />
            </motion.button>
          </div>
        )}

        {/* ── Practical details ────────────────────────────────────────────── */}
        {(!isOnboarding || onboardingStep === 2) && (
        <SectionCard title="Détails pratiques" subtitle="Ces informations sont affichées à vos clients sur la page de réservation publique." tooltip="Facultatif mais recommandé : plus vos clients savent à quoi s'attendre (prestations, paiement, consignes), moins vous recevrez de questions avant le RDV." icon={<FileTextIcon size={18} />} gradient={TINTS.violet.gradient}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Prestations proposées</label>
              <AutoTextarea
                value={services}
                onChange={(e) => setServices(e.target.value)}
                placeholder="Ex : Coupe, coloration, brushing, soins…"
                minRows={2}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-[#FAFAFA] placeholder-gray-600 outline-none focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] transition-shadow duration-150"
                style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Consignes avant le RDV</label>
              <AutoTextarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ex : Merci d'arriver 5 minutes en avance, cheveux propres et secs."
                minRows={2}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-[#FAFAFA] placeholder-gray-600 outline-none focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] transition-shadow duration-150"
                style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Moyens de paiement acceptés</label>
              <AutoTextarea
                value={paymentMethods}
                onChange={(e) => setPaymentMethods(e.target.value)}
                placeholder="Ex : Carte bancaire, espèces, chèque"
                minRows={1}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-[#FAFAFA] placeholder-gray-600 outline-none focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] transition-shadow duration-150"
                style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}
              />
            </div>
          </div>
        </SectionCard>
        )}

        {isOnboarding && onboardingStep === 2 && (
          <div className="flex justify-between mb-6 -mt-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setOnboardingStep(1)} className="px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2" style={{ background: '#111117', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.06)' }}>
              <ArrowLeftIcon size={14} /> Retour
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setOnboardingStep(3)} className="px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2" style={{ background: '#10B981', color: '#fff' }}>
              Continuer <ArrowRightIcon size={14} />
            </motion.button>
          </div>
        )}

        {/* ── Slot config ──────────────────────────────────────────────────── */}
        {(!isOnboarding || onboardingStep === 3) && (
        <SectionCard title="Réglages des créneaux" subtitle="Durée de chaque rendez-vous, battement entre deux RDV, et fenêtre de réservation." tooltip="Durée : le temps réservé pour chaque créneau proposé — ex : 30 min pour une coupe, 60 min pour une couleur. Battement : la pause automatique ajoutée entre deux RDV consécutifs. Réservable jusqu'à : le nombre de jours à l'avance où vos clients peuvent réserver." icon={<ClockIcon size={18} />} gradient={TINTS.amber.gradient}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Durée d&apos;un créneau</label>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <motion.button
                    key={d}
                    onClick={() => setSlotDuration(d)}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    animate={{ background: slotDuration === d ? '#10B981' : '#111117', color: slotDuration === d ? '#fff' : '#9CA3AF', boxShadow: slotDuration === d ? '0 4px 14px rgba(16,185,129,0.3)' : '0 0 0 0 rgba(0,0,0,0)' }}
                    transition={{ duration: 0.15 }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ border: slotDuration === d ? 'none' : '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {d} min
                  </motion.button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Battement entre RDV</label>
              <div className="flex flex-wrap gap-2">
                {BUFFERS.map((b) => (
                  <motion.button
                    key={b}
                    onClick={() => setBufferTime(b)}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    animate={{ background: bufferTime === b ? '#10B981' : '#111117', color: bufferTime === b ? '#fff' : '#9CA3AF', boxShadow: bufferTime === b ? '0 4px 14px rgba(16,185,129,0.3)' : '0 0 0 0 rgba(0,0,0,0)' }}
                    transition={{ duration: 0.15 }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ border: bufferTime === b ? 'none' : '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {b} min
                  </motion.button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Réservable jusqu&apos;à</label>
              <div className="flex flex-wrap gap-2">
                {ADVANCE_OPTIONS.map((a) => (
                  <motion.button
                    key={a}
                    onClick={() => setAdvanceDays(a)}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    animate={{ background: advanceDays === a ? '#10B981' : '#111117', color: advanceDays === a ? '#fff' : '#9CA3AF', boxShadow: advanceDays === a ? '0 4px 14px rgba(16,185,129,0.3)' : '0 0 0 0 rgba(0,0,0,0)' }}
                    transition={{ duration: 0.15 }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ border: advanceDays === a ? 'none' : '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {a}j
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
        )}

        {isOnboarding && onboardingStep === 3 && (
          <div className="flex justify-between mb-6 -mt-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setOnboardingStep(2)} className="px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2" style={{ background: '#111117', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.06)' }}>
              <ArrowLeftIcon size={14} /> Retour
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setOnboardingStep(4)} className="px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2" style={{ background: '#10B981', color: '#fff' }}>
              Continuer <ArrowRightIcon size={14} />
            </motion.button>
          </div>
        )}

        {/* ── Weekly availability ──────────────────────────────────────────── */}
        {(!isOnboarding || onboardingStep === 4) && (
        <SectionCard title="Disponibilités hebdomadaires" subtitle="Activez les jours ouverts et définissez vos plages horaires (matin / après-midi)." tooltip="Ce sont vos horaires récurrents, toutes les semaines. Pour bloquer une date ponctuelle (congé, jour férié) sans toucher à ces réglages, utilisez la section « Jours bloqués » plus bas." icon={<CalendarIcon size={18} />} gradient={TINTS.pink.gradient}>
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
              {Object.values(week).filter((d) => d.dayActive).length} jour{Object.values(week).filter((d) => d.dayActive).length > 1 ? 's' : ''} actif{Object.values(week).filter((d) => d.dayActive).length > 1 ? 's' : ''} sur 7
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {WEEK_ORDER.map((dayKey, idx) => {
              const day = week[dayKey]
              const activePeriods = (['morning', 'afternoon'] as const).filter((p) => day[p].enabled)
              return (
                <motion.div
                  key={dayKey}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.03 }}
                  whileHover={{ borderColor: day.dayActive ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.12)' }}
                  className="rounded-xl p-4 overflow-hidden"
                  style={{
                    background: day.dayActive ? 'rgba(16,185,129,0.04)' : '#111117',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderLeft: `3px solid ${day.dayActive ? '#10B981' : 'rgba(255,255,255,0.06)'}`,
                    transition: 'border-color 0.2s, background 0.25s',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Toggle on={day.dayActive} onToggle={() => updateDay(dayKey, { dayActive: !day.dayActive })} />
                    <span className="text-sm font-bold w-24 shrink-0" style={{ color: day.dayActive ? INK : '#6B7280' }}>{WEEK_LABELS[dayKey]}</span>

                    <AnimatePresence mode="wait">
                      {day.dayActive ? (
                        <motion.span
                          key="open"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}
                        >
                          {activePeriods.length === 0 ? 'Aucun horaire' : `${activePeriods.length} plage${activePeriods.length > 1 ? 's' : ''}`}
                        </motion.span>
                      ) : (
                        <motion.span key="closed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="text-[10px] font-semibold shrink-0" style={{ color: '#6B7280' }}>
                          Fermé
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence initial={false}>
                    {day.dayActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-2 mt-3.5 pl-1">
                          {(['morning', 'afternoon'] as const).map((period) => (
                            <div key={period} className="flex flex-wrap items-center gap-2.5">
                              <button
                                onClick={() => updateRange(dayKey, period, { enabled: !day[period].enabled })}
                                className="flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-lg w-[92px] shrink-0 justify-center"
                                style={{
                                  color: day[period].enabled ? '#10B981' : '#6B7280',
                                  background: day[period].enabled ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${day[period].enabled ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'}`,
                                  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                                }}
                              >
                                <motion.span animate={{ scale: day[period].enabled ? 1 : 0.8, opacity: day[period].enabled ? 1 : 0.5 }} className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'currentColor' }} />
                                {period === 'morning' ? 'Matin' : 'Après-midi'}
                              </button>
                              <AnimatePresence mode="wait">
                                {day[period].enabled ? (
                                  <motion.div key="pickers" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex items-center gap-2">
                                    <TimeSelect value={day[period].start} onChange={(v) => updateRange(dayKey, period, { start: v })} />
                                    <span className="w-3 h-px shrink-0" style={{ background: '#3F3F46' }} />
                                    <TimeSelect value={day[period].end} onChange={(v) => updateRange(dayKey, period, { end: v })} />
                                  </motion.div>
                                ) : (
                                  <motion.span key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs" style={{ color: '#4B5563' }}>
                                    Non proposé
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                        {activePeriods.length > 0 && <DayTimeline day={day} />}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {dayErrors[dayKey] && (
                    <p className="text-[11px] mt-2 flex items-center gap-1" style={{ color: '#F87171' }}><AlertCircleIcon size={12} /> Erreur d&apos;enregistrement pour ce jour — réessayez.</p>
                  )}
                </motion.div>
              )
            })}
          </div>
        </SectionCard>
        )}

        {isOnboarding && onboardingStep === 4 && (
          <div className="flex justify-start mb-3 -mt-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setOnboardingStep(3)} className="px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2" style={{ background: '#111117', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.06)' }}>
              <ArrowLeftIcon size={14} /> Retour
            </motion.button>
          </div>
        )}

        {/* ── Save bar ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{
            opacity: 1, y: 0,
            background: saveState === 'saved' ? 'rgba(16,185,129,0.07)' : saveState === 'error' ? 'rgba(239,68,68,0.06)' : '#111117',
            borderColor: saveState === 'saved' ? 'rgba(16,185,129,0.25)' : saveState === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)',
          }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-3"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {saveState === 'saving' && (
                <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-[#9CA3AF] inline-flex items-center gap-1.5">
                  <motion.span className="w-2.5 h-2.5 rounded-full border-2 border-t-transparent border-[#9CA3AF]" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                  Enregistrement…
                </motion.span>
              )}
              {saveState === 'saved' && (
                <motion.span key="saved" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="text-xs font-semibold inline-flex items-center gap-1.5" style={{ color: '#10B981' }}>
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}><CheckIcon size={13} strokeWidth={2.5} /></motion.span>
                  Enregistré — vos informations et disponibilités sont à jour.
                </motion.span>
              )}
              {saveState === 'error' && (
                <motion.span key="error" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-xs font-semibold inline-flex items-center gap-1.5" style={{ color: '#F87171' }}>
                  <AlertCircleIcon size={13} /> {saveError}
                </motion.span>
              )}
              {saveState === 'idle' && !canSave && <motion.span key="idle-nosave" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-[#6B7280]">Renseignez un nom d&apos;activité et un lien valide pour enregistrer.</motion.span>}
              {saveState === 'idle' && canSave && isOnboarding && <motion.span key="idle-onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-[#6B7280]">Dernière étape : enregistrez pour activer votre page de réservation.</motion.span>}
            </AnimatePresence>
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <GradientButton onClick={handleSave} disabled={!canSave || saveState === 'saving'} fullWidth={false} className="px-5 py-2.5 text-xs">
              {saveState === 'saving' ? 'Enregistrement…' : isOnboarding ? <>Terminer la configuration <CheckIcon size={13} strokeWidth={2.5} /></> : 'Enregistrer'}
            </GradientButton>
          </div>
        </motion.div>

        {/* ── Blocked dates ────────────────────────────────────────────────── */}
        {!isOnboarding && (
        <SectionCard title="Jours bloqués" subtitle="Cliquez sur une date pour la bloquer (congés, indisponibilité ponctuelle)." tooltip="Un jour bloqué n'apparaît plus comme disponible sur votre page publique, même s'il correspond à un jour normalement ouvert dans vos disponibilités hebdomadaires." icon={<TrashIcon size={18} />} gradient="linear-gradient(135deg, #EF4444, #F87171)">
          <div className="flex items-center justify-between mb-4">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCalendarMonthOffset((o) => Math.max(0, o - 1))} disabled={calendarMonthOffset === 0} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9CA3AF] disabled:opacity-30" style={{ border: '1px solid rgba(255,255,255,0.06)' }}><ChevronLeftIcon size={14} /></motion.button>
            <span className="text-sm font-bold text-[#FAFAFA] capitalize">{MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCalendarMonthOffset((o) => Math.min(2, o + 1))} disabled={calendarMonthOffset === 2} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9CA3AF] disabled:opacity-30" style={{ border: '1px solid rgba(255,255,255,0.06)' }}><ChevronRightIcon size={14} /></motion.button>
          </div>
          <div className="flex items-center gap-3 mb-3.5">
            <span className="flex items-center gap-1.5 text-[10px] text-[#9CA3AF]"><span className="w-2 h-2 rounded-full" style={{ background: 'rgba(16,185,129,0.4)' }} />Disponible</span>
            <span className="flex items-center gap-1.5 text-[10px] text-[#9CA3AF]"><span className="w-2 h-2 rounded-full" style={{ background: 'rgba(239,68,68,0.6)' }} />Bloqué</span>
            <span className="flex items-center gap-1.5 text-[10px] text-[#9CA3AF]"><span className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />Passé</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {WEEK_ORDER.map((d) => <div key={d} className="text-center text-[10px] font-semibold text-[#6B7280]">{WEEK_SHORT[d]}</div>)}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={calendarMonthOffset}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-7 gap-1.5"
            >
              {calendarCells.map((date, i) => {
                if (!date) return <div key={i} />
                const key = toDateKey(date)
                const isPast = date < today
                const isBlocked = blockedDates.has(key)
                return (
                  <motion.button
                    key={i}
                    whileHover={!isPast ? { scale: 1.06 } : undefined}
                    whileTap={!isPast ? { scale: 0.92 } : undefined}
                    disabled={isPast}
                    onClick={() => toggleBlockedDate(date)}
                    className="aspect-square rounded-lg text-xs font-semibold"
                    style={{
                      background: isBlocked ? 'rgba(239,68,68,0.15)' : isPast ? 'transparent' : 'rgba(16,185,129,0.05)',
                      color: isPast ? 'rgba(255,255,255,0.12)' : isBlocked ? '#F87171' : '#9CA3AF',
                      border: isBlocked ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
                      cursor: isPast ? 'default' : 'pointer',
                      transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                    }}
                  >
                    {date.getDate()}
                  </motion.button>
                )
              })}
            </motion.div>
          </AnimatePresence>
          {blockedDates.size > 0 && (
            <p className="text-xs text-[#9CA3AF] mt-4">{blockedDates.size} jour{blockedDates.size > 1 ? 's' : ''} bloqué{blockedDates.size > 1 ? 's' : ''}.</p>
          )}
        </SectionCard>
        )}

        </div>

        <ConfigSidebar
          publicUrl={publicUrl}
          savedSlug={savedSlug}
          logoUrl={logoUrl}
          description={description}
          address={address}
          phone={phone}
          services={services}
          instructions={instructions}
          paymentMethods={paymentMethods}
          activeDaysCount={Object.values(week).filter((d) => d.dayActive).length}
        />

        </div>

      </div>
    </div>
  )
}

// ─── Sidebar: live preview + profile completeness + tips ──────────────────────

function ConfigSidebar({
  publicUrl, savedSlug, logoUrl, description, address, phone, services, instructions, paymentMethods, activeDaysCount,
}: {
  publicUrl: string; savedSlug: string; logoUrl: string; description: string; address: string; phone: string
  services: string; instructions: string; paymentMethods: string; activeDaysCount: number
}) {
  const [previewKey, setPreviewKey] = useState(0)

  const checklist = [
    { done: !!savedSlug, label: 'Nom et lien de réservation' },
    { done: !!logoUrl, label: 'Logo ajouté' },
    { done: !!description.trim(), label: 'Description renseignée' },
    { done: !!(address.trim() || phone.trim()), label: 'Coordonnées renseignées' },
    { done: activeDaysCount > 0, label: 'Au moins un jour ouvert' },
    { done: !!(services.trim() || instructions.trim() || paymentMethods.trim()), label: 'Détails pratiques renseignés' },
  ]
  const doneCount = checklist.filter((c) => c.done).length

  const personalizedTips: string[] = []
  if (!logoUrl) personalizedTips.push("Ajoutez un logo pour rassurer vos clients — les pages avec logo inspirent davantage confiance.")
  if (!description.trim()) personalizedTips.push('Une courte description aide vos clients à savoir à quoi s\'attendre avant même de réserver.')
  if (!(address.trim() || phone.trim())) personalizedTips.push('Renseignez une adresse ou un téléphone : vos clients pourront vous localiser ou vous joindre facilement.')
  if (activeDaysCount === 0) personalizedTips.push('Activez au moins un jour dans vos disponibilités pour commencer à recevoir des réservations.')
  if (!(services.trim() || instructions.trim() || paymentMethods.trim())) personalizedTips.push('Détaillez vos prestations : moins de questions avant le RDV, plus de réservations directes.')
  if (personalizedTips.length === 0) {
    personalizedTips.push('Votre profil est complet — partagez votre lien sur vos réseaux et par SMS pour recevoir vos premières réservations.')
  }

  return (
    <div className="flex flex-col gap-5 lg:sticky lg:top-6">

      {/* ── Live preview ──────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="rounded-2xl overflow-hidden" style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-xs font-bold text-[#FAFAFA] flex items-center gap-1.5"><EyeIcon size={14} /> Aperçu en direct</span>
          {savedSlug && (
            <div className="flex items-center gap-2.5">
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-[#9CA3AF] hover:text-[#FAFAFA] text-[10px] font-semibold inline-flex items-center gap-1 transition-all duration-150 hover:scale-105" title="Ouvrir en grand">
                <ExternalLinkIcon size={12} /> Ouvrir en grand
              </a>
              <motion.button whileHover={{ scale: 1.15, color: '#FAFAFA' }} whileTap={{ scale: 0.9, rotate: 180 }} onClick={() => setPreviewKey((k) => k + 1)} className="text-[#9CA3AF]" title="Actualiser l'aperçu">
                <RefreshIcon size={13} />
              </motion.button>
            </div>
          )}
        </div>
        {savedSlug ? (
          <div style={{ background: '#0A0A0F' }}>
            <iframe key={previewKey} src={publicUrl} title="Aperçu de votre page de réservation" className="w-full" style={{ height: 480, border: 'none' }} />
          </div>
        ) : (
          <div className="p-6 text-center">
            <EyeIcon size={32} className="mx-auto mb-2 text-[#6B7280]" />
            <p className="text-xs text-[#9CA3AF]">Enregistrez un nom et un lien pour voir l&apos;aperçu de votre page.</p>
          </div>
        )}
        <div className="px-4 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] text-[#6B7280]">C&apos;est exactement ce que voient vos clients.</p>
        </div>
      </motion.div>

      {/* ── Profile completeness ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="rounded-2xl p-5" style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-[#FAFAFA]">Profil complété</span>
          <span className="text-xs font-bold" style={{ color: doneCount === checklist.length ? '#10B981' : '#9CA3AF' }}>{doneCount}/{checklist.length}</span>
        </div>
        <div className="w-full h-1.5 rounded-full mb-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div className="h-full" style={{ background: '#10B981' }} animate={{ width: `${(doneCount / checklist.length) * 100}%` }} transition={{ duration: 0.4 }} />
        </div>
        <div className="flex flex-col gap-2">
          {checklist.map((c) => (
            <motion.div key={c.label} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs">
              <motion.span
                animate={{ background: c.done ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', color: c.done ? '#10B981' : '#6B7280', scale: c.done ? [1, 1.25, 1] : 1 }}
                transition={{ duration: 0.3 }}
                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
              >
                {c.done ? <CheckIcon size={9} strokeWidth={3} /> : <span className="w-1 h-1 rounded-full" style={{ background: 'currentColor' }} />}
              </motion.span>
              <span style={{ color: c.done ? '#FAFAFA' : '#9CA3AF', transition: 'color 0.2s' }}>{c.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Tips ──────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="rounded-2xl p-5" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: '#10B981' }}><SparklesIcon size={14} /> Conseils pour vous</p>
        <ul className="flex flex-col gap-2.5 text-xs text-[#9CA3AF] leading-relaxed">
          {personalizedTips.map((tip) => <li key={tip} className="flex gap-2"><span className="shrink-0">•</span>{tip}</li>)}
        </ul>
      </motion.div>
    </div>
  )
}
