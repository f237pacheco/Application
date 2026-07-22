'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { slugify, SLUG_REGEX, getParisNow } from '@/lib/booking'
import { compressImage, extensionForMimeType } from '@/lib/image'
import {
  StoreIcon, LinkIcon, MessageSquareIcon, ImageIcon, FileTextIcon, CreditCardIcon, InfoIcon,
  ClockIcon, CalendarIcon, SparklesIcon, EyeIcon, ExternalLinkIcon, RefreshIcon, CheckIcon,
  ChevronLeftIcon, ChevronRightIcon, TrashIcon, AlertCircleIcon, ArrowLeftIcon, ArrowRightIcon,
  ZapIcon, CheckCircleIcon, MailIcon,
} from '@/components/booking/icons'

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
    <button onClick={onToggle} className="relative w-9 h-5 rounded-full shrink-0 transition-colors" style={{ background: on ? '#10B981' : '#3F3F46' }}>
      <motion.div animate={{ x: on ? 18 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute top-0.5 w-4 h-4 rounded-full" style={{ background: '#FAFAFA' }} />
    </button>
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
        style={{ background: '#27272A', color: '#71717A' }}
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
            style={{ background: '#27272A', color: '#D4D4D8', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', border: '1px solid #3F3F46' }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

function SectionCard({ title, subtitle, tooltip, icon, iconColor = '#6EE7B7', iconBg = 'rgba(16,185,129,0.12)', children }: { title: string; subtitle?: string; tooltip?: string; icon?: React.ReactNode; iconColor?: string; iconBg?: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ borderColor: '#3F3F46' }}
      className="rounded-2xl p-6 sm:p-7 mb-6"
      style={{ background: '#18181B', border: '1px solid #27272A' }}
    >
      <div className="flex items-center gap-3 mb-1">
        {icon && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg, color: iconColor }}>
            {icon}
          </div>
        )}
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
      </div>
      {subtitle && <p className="text-gray-500 text-sm mb-5 mt-1">{subtitle}</p>}
      {children}
    </motion.div>
  )
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
          <motion.div
            className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-6"
            style={{ background: '#18181B', border: '1px solid #27272A', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {children}
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
      accent: '#A855F7',
      accentSoft: 'rgba(168,85,247,0.1)',
      text: `Bonjour,\n\nPour vous simplifier la prise de rendez-vous, vous pouvez désormais réserver directement en ligne, à l'heure qui vous convient le mieux — sans appel ni attente :\n\n${url}\n\nLa réservation prend moins d'une minute et vous recevrez une confirmation immédiate par email. N'hésitez pas à nous contacter si vous avez la moindre question.\n\nAu plaisir de vous accueillir prochainement,\n${name}`,
    },
    {
      icon: <SparklesIcon size={13} />,
      label: 'Réseaux sociaux',
      tag: 'Accrocheur',
      accent: '#EC4899',
      accentSoft: 'rgba(236,72,153,0.1)',
      text: `✨ Nouveauté chez ${name} !\n\nFini le temps d'attente au téléphone : réservez votre rendez-vous en ligne, 24h/24, en quelques clics 👇\n${url}`,
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
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <p className="text-lg font-bold text-white">Messages prêts à envoyer</p>
          <p className="text-xs text-gray-500 mt-0.5">Trois formats pour annoncer votre nouvelle prise de rendez-vous en ligne.</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none px-1 shrink-0">×</button>
      </div>

      <div className="flex flex-col gap-3.5 mt-4">
        {templates.map((t, idx) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.08 }}
            whileHover={{ borderColor: t.accent + '55' }}
            className="rounded-2xl overflow-hidden"
            style={{ background: '#09090B', border: '1px solid #27272A' }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ background: t.accentSoft, borderBottom: `1px solid ${t.accent}33` }}>
              <span className="text-xs font-bold flex items-center gap-2" style={{ color: t.accent }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px]" style={{ background: t.accent + '22' }}>{t.icon}</span>
                {t.label}
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#A1A1AA' }}>{t.tag}</span>
              </span>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => handleCopy(idx, t.text)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                style={{ background: copiedIdx === idx ? '#10B981' : '#27272A', color: copiedIdx === idx ? '#fff' : '#A1A1AA' }}
              >
                <span className="inline-flex items-center gap-1">{copiedIdx === idx && <CheckIcon size={11} strokeWidth={2.5} />}{copiedIdx === idx ? 'Copié !' : 'Copier ce message'}</span>
              </motion.button>
            </div>
            <div className="px-4 py-3.5">
              <p className="text-[13px] text-gray-300 leading-relaxed whitespace-pre-line">{t.text}</p>
              {t.label === 'SMS' && (
                <p className="text-[10px] mt-2.5 pt-2.5" style={{ color: t.text.length > 160 ? '#FCA5A5' : '#52525B', borderTop: '1px solid #27272A' }}>
                  {t.text.length} caractères {t.text.length > 160 ? '· sera envoyé en plusieurs SMS' : '· tient dans un seul SMS'}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <p className="text-[11px] text-gray-600 mt-4 text-center flex items-center justify-center gap-1.5"><SparklesIcon size={12} /> N&apos;hésitez pas à personnaliser ces messages avant de les envoyer.</p>
    </Modal>
  )
}

function SlugBadge({ status }: { status: SlugStatus }) {
  const map: Record<SlugStatus, { label: string; color: string; bg: string; icon?: React.ReactNode } | null> = {
    idle: null,
    invalid: { label: 'Format invalide (lettres, chiffres, tirets)', color: '#FCA5A5', bg: 'rgba(239,68,68,0.1)' },
    checking: { label: 'Vérification…', color: '#A1A1AA', bg: '#27272A' },
    available: { label: 'Disponible', color: '#6EE7B7', bg: 'rgba(16,185,129,0.12)', icon: <CheckIcon size={11} strokeWidth={2.5} /> },
    taken: { label: 'Déjà pris', color: '#FCA5A5', bg: 'rgba(239,68,68,0.1)' },
    current: { label: 'Votre lien actuel', color: '#6EE7B7', bg: 'rgba(16,185,129,0.12)', icon: <CheckIcon size={11} strokeWidth={2.5} /> },
    'check-failed': { label: 'Vérification impossible', color: '#FCD34D', bg: 'rgba(245,158,11,0.1)', icon: <AlertCircleIcon size={11} /> },
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
      const compressed = await compressImage(logoPendingFile, 800, 0.85)
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
    <div className="relative min-h-screen" style={{ background: '#09090B' }}>
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10" style={{ background: 'linear-gradient(90deg, transparent 5%, #10B981 35%, #34D399 65%, transparent 95%)' }} />

      <div className="max-w-7xl mx-auto px-4 py-10">

        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="mb-8 flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-150">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Retour aux services
          </Link>
          <Link href="/dashboard/services/booking/appointments" className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-xl transition-colors" style={{ background: 'rgba(16,185,129,0.1)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.25)' }}>
            <CalendarIcon size={15} /> Voir mes RDV <ArrowRightIcon size={13} />
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white mb-2">Configurez votre agenda</h1>
              <p className="text-gray-500 text-sm">Renseignez vos informations et vos disponibilités — vos clients pourront réserver immédiatement.</p>
            </div>
            {loaded && (
              <div className="shrink-0 w-full sm:w-48">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-gray-500">Profil complété</span>
                  <span className="text-xs font-bold" style={{ color: completionPercent === 100 ? '#6EE7B7' : '#A1A1AA' }}>{completionPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#27272A' }}>
                  <motion.div className="h-full rounded-full" style={{ background: completionPercent === 100 ? '#10B981' : 'linear-gradient(90deg, #10B981, #34D399)' }} initial={{ width: 0 }} animate={{ width: `${completionPercent}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Public link ──────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: savedSlug ? 'rgba(16,185,129,0.06)' : '#18181B', border: savedSlug ? '1px solid rgba(16,185,129,0.25)' : '1px solid #27272A' }}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500 mb-1">Votre lien de réservation public</p>
            <p className="text-sm font-mono truncate" style={{ color: savedSlug ? '#6EE7B7' : '#52525B' }}>{publicUrl}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {savedSlug && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
                style={{ background: '#27272A', color: '#E4E4E7' }}
              >
                <EyeIcon size={14} /> Prévisualiser
              </a>
            )}
            <motion.button
              disabled={!savedSlug}
              onClick={handleCopyLink}
              whileTap={savedSlug ? { scale: 0.96 } : undefined}
              className="px-4 py-2 rounded-xl text-xs font-bold"
              style={{ background: savedSlug ? '#10B981' : '#27272A', color: savedSlug ? '#fff' : '#52525B', cursor: savedSlug ? 'pointer' : 'not-allowed' }}
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
            whileHover={{ borderColor: '#10B981', color: '#6EE7B7' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowMessageModal(true)}
            className="w-full sm:w-auto mb-6 px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2"
            style={{ background: '#18181B', color: '#A1A1AA', border: '1px solid #27272A' }}
          >
            <MessageSquareIcon size={15} /> Message à envoyer à vos clients
          </motion.button>
        )}

        <ClientMessageModal open={showMessageModal} onClose={() => setShowMessageModal(false)} businessName={businessName} url={publicUrl} />

        <Modal open={showRemoveLogoConfirm} onClose={() => setShowRemoveLogoConfirm(false)}>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}><TrashIcon size={20} /></div>
            <p className="text-sm font-bold text-white mb-1.5">Supprimer le logo ?</p>
            <p className="text-xs text-gray-500 mb-5">Il disparaîtra de votre page de réservation publique. Vous pourrez en ajouter un nouveau à tout moment.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowRemoveLogoConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#27272A', color: '#A1A1AA' }}>Annuler</button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleRemoveLogo} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#EF4444', color: '#fff' }}>Supprimer</motion.button>
            </div>
          </div>
        </Modal>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="min-w-0">

        {isOnboarding && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-sm font-bold text-white mb-1">Bienvenue — configurons votre page de réservation</p>
            <p className="text-xs text-gray-400 mb-4">Quatre étapes rapides pour que vos clients puissent réserver dès aujourd&apos;hui.</p>
            <div className="flex items-center gap-2 mb-1">
              {ONBOARDING_STEPS.map((s, idx) => {
                const n = idx + 1
                const done = n < onboardingStep
                const active = n === onboardingStep
                return (
                  <div key={s} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1">
                      <motion.div
                        animate={{ background: done || active ? '#10B981' : '#27272A', color: done || active ? '#fff' : '#71717A' }}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                      >
                        {done ? <CheckIcon size={11} strokeWidth={3} /> : n}
                      </motion.div>
                    </div>
                    {n < ONBOARDING_STEPS.length && (
                      <div className="flex-1 h-px mx-1.5" style={{ background: '#27272A' }}>
                        <motion.div className="h-px" style={{ background: '#10B981' }} initial={false} animate={{ width: done ? '100%' : '0%' }} transition={{ duration: 0.3 }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] font-semibold text-gray-500 mt-2">Étape {onboardingStep}/{ONBOARDING_STEPS.length} — {ONBOARDING_STEPS[onboardingStep - 1]}</p>
          </motion.div>
        )}

        {/* ── Business info ────────────────────────────────────────────────── */}
        {(!isOnboarding || onboardingStep === 1) && (
        <SectionCard title="Informations" subtitle="Le nom et la description visibles par vos clients sur la page de réservation." tooltip="Ces informations apparaissent en haut de votre page publique et dans les emails envoyés à vos clients. Le logo remplace le rond avec vos initiales." icon={<StoreIcon size={18} />} iconColor="#6EE7B7" iconBg="rgba(16,185,129,0.12)">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Logo</label>

              {logoPreview ? (
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview} alt="Aperçu" className="w-16 h-16 rounded-2xl object-cover" style={{ border: '1px solid #27272A' }} />
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-2">Aperçu — confirmez pour envoyer.</p>
                    {logoUploading && (
                      <div className="w-full h-1.5 rounded-full mb-2 overflow-hidden" style={{ background: '#27272A' }}>
                        <motion.div className="h-full" style={{ background: '#10B981' }} animate={{ width: `${logoProgress}%` }} transition={{ duration: 0.3 }} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirmLogoUpload}
                        disabled={logoUploading}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-60"
                        style={{ background: '#10B981', color: '#fff' }}
                      >
                        {logoUploading ? 'Envoi…' : 'Confirmer'}
                      </button>
                      <button
                        onClick={handleCancelLogoSelect}
                        disabled={logoUploading}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
                        style={{ background: '#27272A', color: '#A1A1AA' }}
                      >
                        Annuler
                      </button>
                    </div>
                    {logoError && <p className="text-[11px] mt-1.5" style={{ color: '#FCA5A5' }}>{logoError}</p>}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-2xl object-cover" style={{ border: '1px solid #27272A' }} />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#6EE7B7', border: '1px solid #27272A' }}>
                      {businessName.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label
                        className="inline-block px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                        style={{
                          background: !savedSlug ? '#27272A' : '#09090B',
                          color: !savedSlug ? '#52525B' : '#A1A1AA',
                          border: '1px solid #27272A',
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
                        <button onClick={() => setShowRemoveLogoConfirm(true)} className="px-3.5 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.08)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
                          Supprimer
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1.5">
                      {!savedSlug ? 'Enregistrez vos informations une première fois pour activer l\'upload.' : 'JPG, PNG ou WebP, 10 Mo maximum — redimensionné automatiquement.'}
                    </p>
                    {logoError && <p className="text-[11px] mt-1" style={{ color: '#FCA5A5' }}>{logoError}</p>}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Nom de votre activité *</label>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ex : Salon Claire Bernard"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                style={{ background: '#09090B', border: '1px solid #27272A' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Lien personnalisé *</label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl" style={{ background: '#09090B', border: '1px solid #27272A' }}>
                <span className="text-xs text-gray-600 shrink-0">/rdv/</span>
                <input
                  value={slug}
                  onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)) }}
                  placeholder="votre-nom"
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none min-w-0"
                />
                <SlugBadge status={slugStatus} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Une courte description de votre activité, visible sur votre page publique."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none resize-none"
                style={{ background: '#09090B', border: '1px solid #27272A' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Adresse</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex : 12 rue de la Paix, 49000 Angers"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                style={{ background: '#09090B', border: '1px solid #27272A' }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Téléphone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex : 02 41 00 00 00"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                  style={{ background: '#09090B', border: '1px solid #27272A' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Email de contact</label>
                <input
                  type="email"
                  value={emailContact}
                  onChange={(e) => setEmailContact(e.target.value)}
                  placeholder="contact@votre-activite.fr"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                  style={{ background: '#09090B', border: '1px solid #27272A' }}
                />
              </div>
            </div>

            <p className="text-xs text-gray-600">Ces informations apparaissent dans les emails de confirmation envoyés à vos clients. Si elles sont vides, des valeurs par défaut génériques sont utilisées.</p>
          </div>
        </SectionCard>
        )}

        {isOnboarding && onboardingStep === 1 && (
          <div className="flex justify-end mb-6 -mt-2">
            <motion.button whileTap={{ scale: 0.97 }} disabled={!canSave} onClick={() => setOnboardingStep(2)} className="px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 disabled:opacity-40" style={{ background: canSave ? '#10B981' : '#27272A', color: canSave ? '#fff' : '#52525B' }}>
              Continuer <ArrowRightIcon size={14} />
            </motion.button>
          </div>
        )}

        {/* ── Practical details ────────────────────────────────────────────── */}
        {(!isOnboarding || onboardingStep === 2) && (
        <SectionCard title="Détails pratiques" subtitle="Ces informations sont affichées à vos clients sur la page de réservation publique." tooltip="Facultatif mais recommandé : plus vos clients savent à quoi s'attendre (prestations, paiement, consignes), moins vous recevrez de questions avant le RDV." icon={<FileTextIcon size={18} />} iconColor="#93C5FD" iconBg="rgba(59,130,246,0.12)">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Prestations proposées</label>
              <textarea
                value={services}
                onChange={(e) => setServices(e.target.value)}
                placeholder="Ex : Coupe, coloration, brushing, soins…"
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none resize-none"
                style={{ background: '#09090B', border: '1px solid #27272A' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Consignes avant le RDV</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ex : Merci d'arriver 5 minutes en avance, cheveux propres et secs."
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none resize-none"
                style={{ background: '#09090B', border: '1px solid #27272A' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Moyens de paiement acceptés</label>
              <input
                value={paymentMethods}
                onChange={(e) => setPaymentMethods(e.target.value)}
                placeholder="Ex : Carte bancaire, espèces, chèque"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                style={{ background: '#09090B', border: '1px solid #27272A' }}
              />
            </div>
          </div>
        </SectionCard>
        )}

        {isOnboarding && onboardingStep === 2 && (
          <div className="flex justify-between mb-6 -mt-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setOnboardingStep(1)} className="px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2" style={{ background: '#18181B', color: '#A1A1AA', border: '1px solid #27272A' }}>
              <ArrowLeftIcon size={14} /> Retour
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setOnboardingStep(3)} className="px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2" style={{ background: '#10B981', color: '#fff' }}>
              Continuer <ArrowRightIcon size={14} />
            </motion.button>
          </div>
        )}

        {/* ── Slot config ──────────────────────────────────────────────────── */}
        {(!isOnboarding || onboardingStep === 3) && (
        <SectionCard title="Réglages des créneaux" subtitle="Durée de chaque rendez-vous, battement entre deux RDV, et fenêtre de réservation." tooltip="Durée : le temps réservé pour chaque créneau proposé — ex : 30 min pour une coupe, 60 min pour une couleur. Battement : la pause automatique ajoutée entre deux RDV consécutifs. Réservable jusqu'à : le nombre de jours à l'avance où vos clients peuvent réserver." icon={<ClockIcon size={18} />} iconColor="#FCD34D" iconBg="rgba(245,158,11,0.12)">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Durée d&apos;un créneau</label>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <button key={d} onClick={() => setSlotDuration(d)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: slotDuration === d ? '#10B981' : '#09090B', color: slotDuration === d ? '#fff' : '#71717A', border: slotDuration === d ? 'none' : '1px solid #27272A' }}>
                    {d} min
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Battement entre RDV</label>
              <div className="flex flex-wrap gap-2">
                {BUFFERS.map((b) => (
                  <button key={b} onClick={() => setBufferTime(b)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: bufferTime === b ? '#10B981' : '#09090B', color: bufferTime === b ? '#fff' : '#71717A', border: bufferTime === b ? 'none' : '1px solid #27272A' }}>
                    {b} min
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Réservable jusqu&apos;à</label>
              <div className="flex flex-wrap gap-2">
                {ADVANCE_OPTIONS.map((a) => (
                  <button key={a} onClick={() => setAdvanceDays(a)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: advanceDays === a ? '#10B981' : '#09090B', color: advanceDays === a ? '#fff' : '#71717A', border: advanceDays === a ? 'none' : '1px solid #27272A' }}>
                    {a}j
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
        )}

        {isOnboarding && onboardingStep === 3 && (
          <div className="flex justify-between mb-6 -mt-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setOnboardingStep(2)} className="px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2" style={{ background: '#18181B', color: '#A1A1AA', border: '1px solid #27272A' }}>
              <ArrowLeftIcon size={14} /> Retour
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setOnboardingStep(4)} className="px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2" style={{ background: '#10B981', color: '#fff' }}>
              Continuer <ArrowRightIcon size={14} />
            </motion.button>
          </div>
        )}

        {/* ── Weekly availability ──────────────────────────────────────────── */}
        {(!isOnboarding || onboardingStep === 4) && (
        <SectionCard title="Disponibilités hebdomadaires" subtitle="Activez les jours ouverts et définissez vos plages horaires (matin / après-midi)." tooltip="Ce sont vos horaires récurrents, toutes les semaines. Pour bloquer une date ponctuelle (congé, jour férié) sans toucher à ces réglages, utilisez la section « Jours bloqués » plus bas." icon={<CalendarIcon size={18} />} iconColor="#D8B4FE" iconBg="rgba(168,85,247,0.12)">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#6EE7B7' }}>
              {Object.values(week).filter((d) => d.dayActive).length} jour{Object.values(week).filter((d) => d.dayActive).length > 1 ? 's' : ''} actif{Object.values(week).filter((d) => d.dayActive).length > 1 ? 's' : ''} sur 7
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {WEEK_ORDER.map((dayKey, idx) => {
              const day = week[dayKey]
              return (
                <motion.div
                  key={dayKey}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.03 }}
                  whileHover={{ borderColor: day.dayActive ? 'rgba(16,185,129,0.4)' : '#3F3F46' }}
                  className="rounded-xl p-3.5"
                  style={{ background: '#09090B', border: '1px solid #27272A', borderLeft: `3px solid ${day.dayActive ? '#10B981' : '#27272A'}`, transition: 'border-color 0.2s' }}
                >
                  <div className="flex items-center gap-3 mb-2.5">
                    <Toggle on={day.dayActive} onToggle={() => updateDay(dayKey, { dayActive: !day.dayActive })} />
                    <span className="text-sm font-semibold w-24 shrink-0" style={{ color: day.dayActive ? '#FAFAFA' : '#52525B' }}>{WEEK_LABELS[dayKey]}</span>

                    {day.dayActive && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex flex-wrap items-center gap-3 flex-1">
                        {(['morning', 'afternoon'] as const).map((period) => (
                          <div key={period} className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateRange(dayKey, period, { enabled: !day[period].enabled })}
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                              style={{ color: day[period].enabled ? '#6EE7B7' : '#52525B', background: day[period].enabled ? 'rgba(16,185,129,0.1)' : 'transparent' }}
                            >
                              {period === 'morning' ? 'Matin' : 'Après-midi'}
                            </button>
                            <input
                              type="time"
                              disabled={!day[period].enabled}
                              value={day[period].start}
                              onChange={(e) => updateRange(dayKey, period, { start: e.target.value })}
                              className="px-1.5 py-1 rounded-md text-xs text-white outline-none"
                              style={{ background: '#18181B', border: '1px solid #27272A', opacity: day[period].enabled ? 1 : 0.4, colorScheme: 'dark' }}
                            />
                            <span className="text-gray-600 text-xs">–</span>
                            <input
                              type="time"
                              disabled={!day[period].enabled}
                              value={day[period].end}
                              onChange={(e) => updateRange(dayKey, period, { end: e.target.value })}
                              className="px-1.5 py-1 rounded-md text-xs text-white outline-none"
                              style={{ background: '#18181B', border: '1px solid #27272A', opacity: day[period].enabled ? 1 : 0.4, colorScheme: 'dark' }}
                            />
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                  {dayErrors[dayKey] && (
                    <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: '#FCA5A5' }}><AlertCircleIcon size={12} /> Erreur d&apos;enregistrement pour ce jour — réessayez.</p>
                  )}
                </motion.div>
              )
            })}
          </div>
        </SectionCard>
        )}

        {isOnboarding && onboardingStep === 4 && (
          <div className="flex justify-start mb-3 -mt-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setOnboardingStep(3)} className="px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2" style={{ background: '#18181B', color: '#A1A1AA', border: '1px solid #27272A' }}>
              <ArrowLeftIcon size={14} /> Retour
            </motion.button>
          </div>
        )}

        {/* ── Save bar ─────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: '#18181B', border: '1px solid #27272A' }}>
          <div className="flex-1 min-w-0">
            {saveState === 'saving' && <span className="text-xs text-gray-500">Enregistrement…</span>}
            {saveState === 'saved' && <span className="text-xs font-semibold inline-flex items-center gap-1.5" style={{ color: '#6EE7B7' }}><CheckIcon size={13} strokeWidth={2.5} /> Enregistré — vos informations et disponibilités sont à jour.</span>}
            {saveState === 'error' && <span className="text-xs font-semibold inline-flex items-center gap-1.5" style={{ color: '#FCA5A5' }}><AlertCircleIcon size={13} /> {saveError}</span>}
            {saveState === 'idle' && !canSave && <span className="text-xs text-gray-600">Renseignez un nom d&apos;activité et un lien valide pour enregistrer.</span>}
            {saveState === 'idle' && canSave && isOnboarding && <span className="text-xs text-gray-600">Dernière étape : enregistrez pour activer votre page de réservation.</span>}
          </div>
          <button
            onClick={handleSave}
            disabled={!canSave || saveState === 'saving'}
            className="shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-2"
            style={{ background: canSave ? '#10B981' : '#27272A', color: canSave ? '#fff' : '#52525B', cursor: canSave && saveState !== 'saving' ? 'pointer' : 'not-allowed', opacity: saveState === 'saving' ? 0.7 : 1 }}
          >
            {saveState === 'saving' ? 'Enregistrement…' : isOnboarding ? <>Terminer la configuration <CheckIcon size={13} strokeWidth={2.5} /></> : 'Enregistrer'}
          </button>
        </motion.div>

        {/* ── Blocked dates ────────────────────────────────────────────────── */}
        {!isOnboarding && (
        <SectionCard title="Jours bloqués" subtitle="Cliquez sur une date pour la bloquer (congés, indisponibilité ponctuelle)." tooltip="Un jour bloqué n'apparaît plus comme disponible sur votre page publique, même s'il correspond à un jour normalement ouvert dans vos disponibilités hebdomadaires." icon={<TrashIcon size={18} />} iconColor="#FCA5A5" iconBg="rgba(239,68,68,0.12)">
          <div className="flex items-center justify-between mb-4">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCalendarMonthOffset((o) => Math.max(0, o - 1))} disabled={calendarMonthOffset === 0} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 disabled:opacity-30" style={{ border: '1px solid #27272A' }}><ChevronLeftIcon size={14} /></motion.button>
            <span className="text-sm font-bold text-white capitalize">{MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCalendarMonthOffset((o) => Math.min(2, o + 1))} disabled={calendarMonthOffset === 2} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 disabled:opacity-30" style={{ border: '1px solid #27272A' }}><ChevronRightIcon size={14} /></motion.button>
          </div>
          <div className="flex items-center gap-3 mb-3.5">
            <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="w-2 h-2 rounded-full" style={{ background: 'rgba(16,185,129,0.4)' }} />Disponible</span>
            <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="w-2 h-2 rounded-full" style={{ background: 'rgba(239,68,68,0.6)' }} />Bloqué</span>
            <span className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="w-2 h-2 rounded-full" style={{ background: '#3F3F46' }} />Passé</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {WEEK_ORDER.map((d) => <div key={d} className="text-center text-[10px] font-semibold text-gray-600">{WEEK_SHORT[d]}</div>)}
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
                      color: isPast ? '#3F3F46' : isBlocked ? '#FCA5A5' : '#A1A1AA',
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
            <p className="text-xs text-gray-500 mt-4">{blockedDates.size} jour{blockedDates.size > 1 ? 's' : ''} bloqué{blockedDates.size > 1 ? 's' : ''}.</p>
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
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="rounded-2xl overflow-hidden" style={{ background: '#18181B', border: '1px solid #27272A' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #27272A' }}>
          <span className="text-xs font-bold text-white flex items-center gap-1.5"><EyeIcon size={14} /> Aperçu en direct</span>
          {savedSlug && (
            <div className="flex items-center gap-2.5">
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white text-[10px] font-semibold inline-flex items-center gap-1" title="Ouvrir en grand">
                <ExternalLinkIcon size={12} /> Ouvrir en grand
              </a>
              <motion.button whileTap={{ scale: 0.9, rotate: 180 }} onClick={() => setPreviewKey((k) => k + 1)} className="text-gray-500 hover:text-white" title="Actualiser l'aperçu">
                <RefreshIcon size={13} />
              </motion.button>
            </div>
          )}
        </div>
        {savedSlug ? (
          <div style={{ background: '#F8FAFC' }}>
            <iframe key={previewKey} src={publicUrl} title="Aperçu de votre page de réservation" className="w-full" style={{ height: 480, border: 'none' }} />
          </div>
        ) : (
          <div className="p-6 text-center">
            <EyeIcon size={32} className="mx-auto mb-2 text-gray-600" />
            <p className="text-xs text-gray-500">Enregistrez un nom et un lien pour voir l&apos;aperçu de votre page.</p>
          </div>
        )}
        <div className="px-4 py-2.5" style={{ borderTop: '1px solid #27272A' }}>
          <p className="text-[10px] text-gray-600">C&apos;est exactement ce que voient vos clients.</p>
        </div>
      </motion.div>

      {/* ── Profile completeness ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="rounded-2xl p-5" style={{ background: '#18181B', border: '1px solid #27272A' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-white">Profil complété</span>
          <span className="text-xs font-bold" style={{ color: doneCount === checklist.length ? '#6EE7B7' : '#A1A1AA' }}>{doneCount}/{checklist.length}</span>
        </div>
        <div className="w-full h-1.5 rounded-full mb-4 overflow-hidden" style={{ background: '#27272A' }}>
          <motion.div className="h-full" style={{ background: '#10B981' }} animate={{ width: `${(doneCount / checklist.length) * 100}%` }} transition={{ duration: 0.4 }} />
        </div>
        <div className="flex flex-col gap-2">
          {checklist.map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-xs">
              <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: c.done ? 'rgba(16,185,129,0.15)' : '#27272A', color: c.done ? '#6EE7B7' : '#52525B' }}>
                {c.done ? <CheckIcon size={9} strokeWidth={3} /> : <span className="w-1 h-1 rounded-full" style={{ background: 'currentColor' }} />}
              </span>
              <span style={{ color: c.done ? '#D4D4D8' : '#71717A' }}>{c.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Tips ──────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="rounded-2xl p-5" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: '#6EE7B7' }}><SparklesIcon size={14} /> Conseils pour vous</p>
        <ul className="flex flex-col gap-2.5 text-xs text-gray-400 leading-relaxed">
          {personalizedTips.map((tip) => <li key={tip} className="flex gap-2"><span className="shrink-0">•</span>{tip}</li>)}
        </ul>
      </motion.div>
    </div>
  )
}
