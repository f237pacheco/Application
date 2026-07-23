'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDateFR, formatHourFR, getParisNow, timeToMinutes } from '@/lib/booking'
import { downloadICS } from '@/lib/ics'
import { NotFoundIllustration, SuccessBurstIllustration } from '@/components/booking/illustrations'
import { MeshBackground, GradientIconBadge, GradientButton, ConfettiBurst, Toast } from '@/components/booking/decorative'
import {
  INK, MUTED, FAINT, BORDER, CARD, PAGE_BG, GRADIENT_BRAND, INDIGO, VIOLET, PINK,
  SHADOW_SOFT, SHADOW_MODAL, DANGER_TEXT, DANGER_SOFT,
} from '@/components/booking/theme'
import {
  CalendarIcon, ClockIcon, MapPinIcon, PhoneIcon, FileTextIcon, CreditCardIcon, InfoIcon,
  ChevronLeftIcon, ChevronRightIcon, CheckIcon, ZapIcon, ShieldCheckIcon, ArrowLeftIcon,
  AlertCircleIcon, ExternalLinkIcon, DownloadIcon,
} from '@/components/booking/icons'

const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const WEEK_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Info = {
  businessName: string
  description: string | null
  address: string | null
  phone: string | null
  logoUrl: string | null
  services: string | null
  instructions: string | null
  paymentMethods: string | null
  slotDuration: number
}
type Step = 'loading' | 'not-found' | 'calendar' | 'form' | 'confirmed' | 'error'

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

// ─── Step progress indicator ───────────────────────────────────────────────────

const STEPS = ['Date', 'Horaire', 'Vos informations', 'Confirmation']

function ProgressSteps({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={{
                  background: done || active ? GRADIENT_BRAND : '#FFFFFF',
                  borderColor: done || active ? 'transparent' : BORDER,
                  color: done || active ? '#FFFFFF' : MUTED,
                  scale: active ? 1.1 : 1,
                }}
                transition={{ duration: 0.25 }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ border: '1.5px solid', boxShadow: active ? '0 4px 14px rgba(99,102,241,0.35)' : 'none' }}
              >
                {done ? <CheckIcon size={14} strokeWidth={2.5} /> : n}
              </motion.div>
              <span className="hidden sm:block text-[10px] font-semibold text-center whitespace-nowrap" style={{ color: active ? INK : MUTED }}>{label}</span>
            </div>
            {n < STEPS.length && (
              <div className="flex-1 h-px mx-2" style={{ background: BORDER, position: 'relative', top: '-12px' }}>
                <motion.div
                  className="h-px"
                  style={{ background: GRADIENT_BRAND }}
                  initial={false}
                  animate={{ width: done ? '100%' : '0%' }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Modal shell — gradient header option ──────────────────────────────────────

function Modal({ open, onClose, gradientHeader, children }: { open: boolean; onClose?: () => void; gradientHeader?: React.ReactNode; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(26,26,46,0.55)', backdropFilter: 'blur(3px)' }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
            style={{ background: CARD, boxShadow: SHADOW_MODAL }}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            {gradientHeader && (
              <div className="px-6 pt-6 pb-8 shrink-0" style={{ background: GRADIENT_BRAND }}>
                {gradientHeader}
              </div>
            )}
            <div className={`p-6 overflow-y-auto ${gradientHeader ? '-mt-4 rounded-t-2xl relative' : ''}`} style={gradientHeader ? { background: CARD } : undefined}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Business info card (left column) ──────────────────────────────────────────

function InfoRow({ icon, gradient, label, value, href }: { icon: React.ReactNode; gradient: string; label: string; value: string; href?: string }) {
  const content = (
    <div className="flex gap-3">
      <GradientIconBadge icon={icon} gradient={gradient} size={34} radius={10} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: FAINT }}>{label}</p>
        <p className="text-sm leading-snug" style={{ color: href ? INDIGO : INK }}>{value}</p>
      </div>
      {href && <ExternalLinkIcon size={13} className="shrink-0 mt-1" style={{ color: FAINT }} />}
    </div>
  )
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:opacity-75 transition-opacity">{content}</a>
  }
  return content
}

const TRUST_BADGES = [
  { icon: <ZapIcon size={12} />, label: 'Confirmation immédiate' },
  { icon: <ShieldCheckIcon size={12} />, label: 'Annulation gratuite' },
  { icon: <CheckIcon size={12} strokeWidth={2.5} />, label: 'Données sécurisées' },
]

function BusinessCard({ info }: { info: Info }) {
  const mapsUrl = info.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.address)}` : undefined
  const telUrl = info.phone ? `tel:${info.phone.replace(/\s+/g, '')}` : undefined

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
      <div className="relative rounded-2xl p-6 overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}>
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none" style={{ background: GRADIENT_BRAND, opacity: 0.06 }} />

        {info.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={info.logoUrl} alt={info.businessName} className="w-16 h-16 rounded-2xl object-cover mb-4 relative" style={{ border: '2px solid #fff', boxShadow: '0 4px 16px rgba(99,102,241,0.2)' }} />
        ) : (
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold mb-4 text-white relative" style={{ background: GRADIENT_BRAND, boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
            {info.businessName?.charAt(0).toUpperCase() ?? '?'}
          </div>
        )}

        <h1 className="text-xl font-extrabold mb-1.5 relative" style={{ color: INK }}>{info.businessName}</h1>
        {info.description && <p className="text-sm leading-relaxed mb-4 relative" style={{ color: MUTED }}>{info.description}</p>}

        <div className="flex flex-wrap gap-1.5 mb-1 relative">
          {TRUST_BADGES.map((b) => (
            <span key={b.label} className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit" style={{ background: '#F5F3FF', color: VIOLET }}>
              {b.icon} {b.label}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1.5 mt-3 relative">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: GRADIENT_BRAND }}>
            <ClockIcon size={12} /> Rendez-vous de {info.slotDuration} min
          </span>
        </div>

        {(info.address || info.phone) && (
          <div className="flex flex-col gap-3 mt-4 pt-4 relative" style={{ borderTop: `1px solid ${BORDER}` }}>
            {info.address && <InfoRow icon={<MapPinIcon size={15} />} gradient="linear-gradient(135deg, #6366F1, #818CF8)" label="Adresse" value={info.address} href={mapsUrl} />}
            {info.phone && <InfoRow icon={<PhoneIcon size={15} />} gradient="linear-gradient(135deg, #8B5CF6, #A78BFA)" label="Téléphone" value={info.phone} href={telUrl} />}
          </div>
        )}
      </div>

      {(info.services || info.paymentMethods || info.instructions) && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }} className="rounded-2xl p-6 mt-4 flex flex-col gap-4" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}>
          {info.services && <InfoRow icon={<FileTextIcon size={15} />} gradient="linear-gradient(135deg, #EC4899, #F472B6)" label="Prestations" value={info.services} />}
          {info.paymentMethods && <InfoRow icon={<CreditCardIcon size={15} />} gradient="linear-gradient(135deg, #F59E0B, #FBBF24)" label="Moyens de paiement" value={info.paymentMethods} />}
          {info.instructions && <InfoRow icon={<InfoIcon size={15} />} gradient="linear-gradient(135deg, #6366F1, #EC4899)" label="À savoir avant votre RDV" value={info.instructions} />}
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.14 }} className="rounded-2xl p-5 mt-4" style={{ background: '#F5F3FF', border: '1px solid rgba(139,92,246,0.15)' }}>
        <p className="text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: VIOLET }}><ShieldCheckIcon size={13} /> Politique d&apos;annulation</p>
        <p className="text-[11px] leading-relaxed" style={{ color: MUTED }}>Annulation gratuite jusqu&apos;à votre rendez-vous — contactez directement {info.businessName} pour annuler ou reporter.</p>
      </motion.div>
    </motion.div>
  )
}

// ─── Loading skeleton (2-column) ────────────────────────────────────────────────

function PageSkeleton() {
  const shimmer = { background: 'linear-gradient(90deg, #F1F0FA 25%, #E9E7F7 37%, #F1F0FA 63%)', backgroundSize: '400% 100%' }
  const bar = (w: string, h = 'h-4') => <motion.div className={`${h} ${w} rounded-md`} style={shimmer} animate={{ backgroundPosition: ['100% 0%', '-100% 0%'] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }} />
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 max-w-4xl mx-auto px-4 py-10 relative" style={{ zIndex: 1 }}>
      <div className="rounded-2xl p-6 flex flex-col gap-3" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}>
        <motion.div className="w-16 h-16 rounded-2xl" style={shimmer} animate={{ backgroundPosition: ['100% 0%', '-100% 0%'] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }} />
        {bar('w-3/4', 'h-5')}
        {bar('w-full')}
        {bar('w-2/3')}
      </div>
      <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}>
        {bar('w-1/3', 'h-5')}
        <div className="grid grid-cols-7 gap-2 mt-5">
          {Array.from({ length: 28 }).map((_, i) => (
            <motion.div key={i} className="aspect-square rounded-lg" style={shimmer} animate={{ backgroundPosition: ['100% 0%', '-100% 0%'] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', delay: i * 0.01 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PublicBookingPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug ?? ''

  const [step, setStep] = useState<Step>('loading')
  const [info, setInfo] = useState<Info | null>(null)

  const [monthOffset, setMonthOffset] = useState(0)
  const [monthDirection, setMonthDirection] = useState(1)
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set())
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({})
  const [calendarLoading, setCalendarLoading] = useState(false)

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const [showSlotModal, setShowSlotModal] = useState(false)
  const [showRecapModal, setShowRecapModal] = useState(false)

  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [serviceNote, setServiceNote] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmedAt, setConfirmedAt] = useState<{ date: string; time: string; bookingUid: string } | null>(null)
  const [toast, setToast] = useState('')
  const [confettiFired, setConfettiFired] = useState(false)

  const slotsRequestId = useRef(0)

  const nameError = nameTouched && !clientName.trim() ? 'Votre nom est requis.' : ''
  const emailError = emailTouched && !EMAIL_REGEX.test(clientEmail.trim()) ? 'Adresse email invalide.' : ''

  // ── Load business info ──────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/bookings/info?slug=${encodeURIComponent(slug)}`)
        if (cancelled) return
        if (!res.ok) {
          console.error(`[rdv/${slug}] /api/bookings/info a répondu ${res.status}`)
          setStep(res.status === 404 ? 'not-found' : 'error')
          return
        }
        const data = await res.json() as Info
        setInfo(data)
        setStep('calendar')
      } catch (err) {
        console.error(`[rdv/${slug}] erreur réseau en chargeant /api/bookings/info`, err)
        if (!cancelled) setStep('error')
      }
    })()
    return () => { cancelled = true }
  }, [slug])

  // ── Load calendar availability for the displayed month ─────────────────
  const calendarMonth = useMemo(() => {
    const base = getParisNow()
    base.setDate(1)
    base.setMonth(base.getMonth() + monthOffset)
    return base
  }, [monthOffset])

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setCalendarLoading(true)
    ;(async () => {
      try {
        const year = calendarMonth.getFullYear()
        const month = calendarMonth.getMonth() + 1
        const res = await fetch(`/api/bookings/calendar?slug=${encodeURIComponent(slug)}&year=${year}&month=${month}`)
        if (cancelled) return
        if (res.ok) {
          const data = await res.json() as { availableDates: string[]; slotCounts?: Record<string, number> }
          setAvailableDates(new Set(data.availableDates))
          setSlotCounts(data.slotCounts ?? {})
        }
      } finally {
        if (!cancelled) setCalendarLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [slug, calendarMonth])

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const offset = (firstDay.getDay() + 6) % 7
    const cells: (Date | null)[] = Array(offset).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    return cells
  }, [calendarMonth])

  // Europe/Paris wall-clock date, regardless of the client's device timezone.
  const today = useMemo(() => { const d = getParisNow(); d.setHours(0, 0, 0, 0); return d }, [])

  const goMonth = (dir: 1 | -1) => {
    setMonthDirection(dir)
    setMonthOffset((o) => Math.max(0, Math.min(6, o + dir)))
  }

  // Guards against a slower earlier request overwriting a faster later one
  // when the user clicks through several days quickly.
  const handlePickDate = useCallback(async (date: Date) => {
    const key = toDateKey(date)
    if (!availableDates.has(key)) return
    const requestId = ++slotsRequestId.current
    setSelectedDate(key)
    setSelectedTime(null)
    setSlots([])
    setSlotsLoading(true)
    try {
      const res = await fetch(`/api/bookings/availability?slug=${encodeURIComponent(slug)}&date=${key}`)
      if (requestId !== slotsRequestId.current) return
      const data = await res.json() as { slots?: string[] }
      setSlots(data.slots ?? [])
    } catch {
      if (requestId === slotsRequestId.current) setSlots([])
    } finally {
      if (requestId === slotsRequestId.current) setSlotsLoading(false)
    }
  }, [availableDates, slug])

  const handlePickTime = useCallback((time: string) => {
    setSelectedTime(time)
    setShowSlotModal(true)
  }, [])

  const handleConfirmSlot = useCallback(() => {
    setShowSlotModal(false)
    setStep('form')
  }, [])

  const handleOpenRecap = (e: React.FormEvent) => {
    e.preventDefault()
    setNameTouched(true)
    setEmailTouched(true)
    if (!selectedDate || !selectedTime) return
    setFormError('')
    if (!clientName.trim()) { setFormError('Votre nom est requis.'); return }
    if (!EMAIL_REGEX.test(clientEmail.trim())) { setFormError('Adresse email invalide.'); return }
    setShowRecapModal(true)
  }

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTime) return
    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          date: selectedDate,
          time: selectedTime,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          clientPhone: clientPhone.trim(),
          serviceNote: serviceNote.trim(),
        }),
      })
      const data = await res.json() as { success?: boolean; date?: string; time?: string; bookingId?: string; error?: string }
      if (!res.ok || !data.success) {
        setShowRecapModal(false)
        setFormError(data.error ?? "Ce créneau n'est plus disponible.")
        setSubmitting(false)
        return
      }
      setShowRecapModal(false)
      setConfirmedAt({ date: data.date ?? selectedDate, time: data.time ?? selectedTime, bookingUid: data.bookingId ?? `${slug}-${data.date}-${data.time}` })
      setStep('confirmed')
      setConfettiFired(true)
      setTimeout(() => setConfettiFired(false), 1500)
    } catch {
      setShowRecapModal(false)
      setFormError('Erreur réseau, veuillez réessayer.')
      setSubmitting(false)
    }
  }

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(''), 2500)
  }

  const handleAddToCalendar = () => {
    if (!confirmedAt || !info) return
    showToast('Fichier ajouté à vos téléchargements')
    downloadICS({
      uid: `${confirmedAt.bookingUid}@velona.app`,
      businessName: info.businessName,
      date: confirmedAt.date,
      time: confirmedAt.time,
      durationMinutes: info.slotDuration,
      address: info.address ?? undefined,
      description: info.description ?? undefined,
    }, `rdv-${info.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`)
  }

  const progressStep = step === 'confirmed' ? 4 : step === 'form' ? 3 : selectedDate ? 2 : 1

  const morningSlots = useMemo(() => slots.filter((s) => timeToMinutes(s) < 12 * 60), [slots])
  const afternoonSlots = useMemo(() => slots.filter((s) => timeToMinutes(s) >= 12 * 60), [slots])

  // ── Render ───────────────────────────────────────────────────────────────

  if (step === 'loading') {
    return <div className="min-h-screen relative" style={{ background: PAGE_BG }}><MeshBackground /><PageSkeleton /></div>
  }

  if (step === 'not-found' || step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ background: PAGE_BG }}>
        <MeshBackground />
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative text-center max-w-sm rounded-2xl p-10" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT, zIndex: 1 }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="mx-auto mb-5">
            {step === 'error' ? (
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: DANGER_SOFT, color: DANGER_TEXT }}>
                <AlertCircleIcon size={28} />
              </div>
            ) : (
              <NotFoundIllustration size={96} />
            )}
          </motion.div>
          <h1 className="text-lg font-extrabold mb-2" style={{ color: INK }}>{step === 'error' ? 'Une erreur est survenue' : 'Page introuvable'}</h1>
          <p className="text-sm" style={{ color: MUTED }}>
            {step === 'error' ? 'Impossible de charger cette page pour le moment. Réessayez dans quelques instants.' : "Cette page de réservation n'existe pas ou plus."}
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative" style={{ background: PAGE_BG }}>
      <MeshBackground />
      <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14 relative" style={{ zIndex: 1 }}>

        {step !== 'confirmed' && <ProgressSteps current={progressStep} />}

        <div className={step === 'confirmed' ? '' : 'grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start'}>

          {step !== 'confirmed' && info && (
            <div className="lg:sticky lg:top-10">
              <BusinessCard info={info} />
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* ── Calendar + slots ─────────────────────────────────────────── */}
            {step === 'calendar' && (
              <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}>
                <p className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: INK }}>
                  <GradientIconBadge icon={<CalendarIcon size={13} />} size={26} radius={8} /> Choisissez une date
                </p>

                <div className="flex items-center justify-between mb-5">
                  <motion.button whileTap={{ scale: 0.9 }} whileHover={{ background: '#F5F3FF' }} onClick={() => goMonth(-1)} disabled={monthOffset === 0} className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30" style={{ color: MUTED, border: `1px solid ${BORDER}` }}><ChevronLeftIcon size={16} /></motion.button>
                  <span className="text-sm font-bold capitalize" style={{ color: INK }}>{MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
                  <motion.button whileTap={{ scale: 0.9 }} whileHover={{ background: '#F5F3FF' }} onClick={() => goMonth(1)} disabled={monthOffset === 6} className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30" style={{ color: MUTED, border: `1px solid ${BORDER}` }}><ChevronRightIcon size={16} /></motion.button>
                </div>

                <div className="grid grid-cols-7 gap-1.5 mb-2">
                  {WEEK_SHORT.map((d) => <div key={d} className="text-center text-[10px] font-semibold" style={{ color: MUTED }}>{d}</div>)}
                </div>

                <AnimatePresence mode="wait" custom={monthDirection}>
                  <motion.div
                    key={monthOffset}
                    custom={monthDirection}
                    initial={{ opacity: 0, x: 24 * monthDirection }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 * monthDirection }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-7 gap-1.5"
                  >
                    {calendarLoading ? (
                      Array.from({ length: 35 }).map((_, i) => (
                        <div key={i} className="aspect-square rounded-lg animate-pulse" style={{ background: '#F5F3FF' }} />
                      ))
                    ) : (
                      calendarCells.map((date, i) => {
                        if (!date) return <div key={i} />
                        const key = toDateKey(date)
                        const isPast = date < today
                        const isToday = key === toDateKey(today)
                        const isAvailable = !isPast && availableDates.has(key)
                        const isSelected = key === selectedDate
                        const count = slotCounts[key]
                        return (
                          <motion.button
                            key={i}
                            whileTap={isAvailable ? { scale: 0.9 } : undefined}
                            whileHover={isAvailable ? { scale: 1.08 } : undefined}
                            disabled={!isAvailable}
                            onClick={() => handlePickDate(date)}
                            className="aspect-square rounded-lg text-xs font-semibold relative flex flex-col items-center justify-center gap-0.5"
                            style={{
                              background: isSelected ? GRADIENT_BRAND : isAvailable ? '#F5F3FF' : 'transparent',
                              color: isSelected ? '#fff' : isAvailable ? INDIGO : '#D1D0DE',
                              cursor: isAvailable ? 'pointer' : 'default',
                              boxShadow: isSelected ? '0 4px 14px rgba(99,102,241,0.35)' : isToday ? `inset 0 0 0 1.5px ${INDIGO}` : 'none',
                              transition: 'background 0.15s, color 0.15s',
                            }}
                          >
                            <span>{date.getDate()}</span>
                            {isAvailable && count !== undefined && (
                              <span className="text-[8px] font-bold leading-none" style={{ color: isSelected ? 'rgba(255,255,255,0.85)' : PINK, opacity: 0.85 }}>
                                {count}
                              </span>
                            )}
                          </motion.button>
                        )
                      })
                    )}
                  </motion.div>
                </AnimatePresence>

                {!calendarLoading && availableDates.size === 0 && (
                  <p className="text-center text-sm mt-5" style={{ color: MUTED }}>Aucun créneau disponible ce mois-ci.</p>
                )}

                {/* ── Time slots for selected day ───────────────────────────── */}
                <AnimatePresence>
                  {selectedDate && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${BORDER}` }}>
                        <p className="text-sm font-bold mb-3 capitalize" style={{ color: INK }}>{formatDateFR(selectedDate)}</p>
                        {slotsLoading ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <div key={i} className="h-9 rounded-lg animate-pulse" style={{ background: '#F5F3FF' }} />
                            ))}
                          </div>
                        ) : slots.length === 0 ? (
                          <p className="text-sm" style={{ color: MUTED }}>Plus aucun créneau libre ce jour-là.</p>
                        ) : (
                          <div className="flex flex-col gap-4">
                            {morningSlots.length > 0 && (
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: FAINT }}>Matin</p>
                                <motion.div className="grid grid-cols-3 sm:grid-cols-4 gap-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.03 } } }}>
                                  {morningSlots.map((s) => (
                                    <motion.button
                                      key={s}
                                      variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                                      whileTap={{ scale: 0.92 }}
                                      whileHover={{ borderColor: INDIGO, background: '#F5F3FF', color: INDIGO, scale: 1.03 }}
                                      onClick={() => handlePickTime(s)}
                                      className="px-2 py-2.5 rounded-lg text-xs font-semibold"
                                      style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, color: INK, transition: 'border-color 0.15s, color 0.15s, background 0.15s' }}
                                    >
                                      {formatHourFR(s)}
                                    </motion.button>
                                  ))}
                                </motion.div>
                              </div>
                            )}
                            {afternoonSlots.length > 0 && (
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: FAINT }}>Après-midi</p>
                                <motion.div className="grid grid-cols-3 sm:grid-cols-4 gap-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.03, delayChildren: morningSlots.length * 0.03 } } }}>
                                  {afternoonSlots.map((s) => (
                                    <motion.button
                                      key={s}
                                      variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                                      whileTap={{ scale: 0.92 }}
                                      whileHover={{ borderColor: PINK, background: '#FDF2F8', color: PINK, scale: 1.03 }}
                                      onClick={() => handlePickTime(s)}
                                      className="px-2 py-2.5 rounded-lg text-xs font-semibold"
                                      style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, color: INK, transition: 'border-color 0.15s, color 0.15s, background 0.15s' }}
                                    >
                                      {formatHourFR(s)}
                                    </motion.button>
                                  ))}
                                </motion.div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── Booking form ─────────────────────────────────────────────── */}
            {step === 'form' && selectedDate && selectedTime && (
              <motion.div key="form" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }} className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}>
                <button onClick={() => setStep('calendar')} className="text-xs font-semibold mb-4 inline-flex items-center gap-1.5" style={{ color: MUTED }}><ArrowLeftIcon size={13} /> Changer de créneau</button>

                <div className="rounded-xl p-3.5 mb-5 flex items-center gap-2.5 text-white" style={{ background: GRADIENT_BRAND }}>
                  <CalendarIcon size={18} />
                  <p className="text-sm font-bold capitalize">{formatDateFR(selectedDate)} à {formatHourFR(selectedTime)}</p>
                </div>

                <p className="text-sm font-bold mb-4" style={{ color: INK }}>Vos informations</p>

                <form onSubmit={handleOpenRecap} className="flex flex-col gap-3.5" noValidate>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Nom complet *</label>
                    <input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      onBlur={() => setNameTouched(true)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors"
                      style={{ background: '#FFFFFF', border: `1.5px solid ${nameError ? '#FCA5A5' : BORDER}`, color: INK }}
                      placeholder="Jean Dupont"
                    />
                    {nameError && <p className="text-xs font-medium mt-1" style={{ color: DANGER_TEXT }}>{nameError}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Email *</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors"
                      style={{ background: '#FFFFFF', border: `1.5px solid ${emailError ? '#FCA5A5' : BORDER}`, color: INK }}
                      placeholder="jean@email.com"
                    />
                    {emailError && <p className="text-xs font-medium mt-1" style={{ color: DANGER_TEXT }}>{emailError}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Téléphone</label>
                    <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors" style={{ background: '#FFFFFF', border: `1.5px solid ${BORDER}`, color: INK }} placeholder="06 12 34 56 78" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Note (optionnel)</label>
                    <textarea value={serviceNote} onChange={(e) => setServiceNote(e.target.value)} rows={2} className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none transition-colors" style={{ background: '#FFFFFF', border: `1.5px solid ${BORDER}`, color: INK }} placeholder="Précisez votre demande si besoin…" />
                  </div>

                  {formError && <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: DANGER_TEXT }}><AlertCircleIcon size={14} />{formError}</p>}

                  <div className="mt-1">
                    <GradientButton type="submit">Vérifier et confirmer</GradientButton>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ── Confirmation ─────────────────────────────────────────────── */}
            {step === 'confirmed' && confirmedAt && info && (
              <motion.div key="confirmed" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="relative max-w-md mx-auto rounded-2xl p-8 text-center overflow-visible" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}>
                <ConfettiBurst fire={confettiFired} />
                <div className="relative mx-auto mb-2" style={{ width: 96, height: 96 }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <SuccessBurstIllustration size={96} />
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.15 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <CheckIcon size={26} strokeWidth={3} className="text-white" style={{ marginTop: 2 }} />
                  </motion.div>
                </div>
                <h2 className="text-xl font-extrabold mb-2 mt-1" style={{ color: INK }}>Rendez-vous confirmé</h2>
                <p className="text-sm mb-4" style={{ color: MUTED }}>Un email de confirmation vous a été envoyé à {clientEmail}.</p>

                <div className="rounded-xl p-4 mb-5 text-left" style={{ background: '#FAFAFF', border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-3 mb-3">
                    {info.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={info.logoUrl} alt={info.businessName} className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold text-white" style={{ background: GRADIENT_BRAND }}>
                        {info.businessName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold" style={{ color: INK }}>{info.businessName}</p>
                      {info.address && <p className="text-xs" style={{ color: MUTED }}>{info.address}</p>}
                    </div>
                  </div>
                  <div style={{ borderTop: `1px solid ${BORDER}` }} className="pt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold capitalize" style={{ color: INK }}>{formatDateFR(confirmedAt.date)}</span>
                    <span className="text-base font-extrabold" style={{ color: INDIGO }}>{formatHourFR(confirmedAt.time)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <span className="text-[11px]" style={{ color: FAINT }}>Durée</span>
                    <span className="text-[11px] font-semibold" style={{ color: MUTED }}>{info.slotDuration} min</span>
                  </div>
                  {info.phone && <p className="text-xs mt-2" style={{ color: MUTED }}>{info.phone}</p>}
                </div>

                <GradientButton onClick={handleAddToCalendar} gradient={GRADIENT_BRAND}>
                  <DownloadIcon size={16} /> Ajouter à mon agenda
                </GradientButton>

                {info.instructions && (
                  <div className="pt-4 mt-4 text-left" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>À savoir avant votre RDV</p>
                    <p className="text-sm leading-relaxed" style={{ color: INK }}>{info.instructions}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4 p-3 rounded-lg" style={{ background: '#F5F3FF' }}>
                  <ShieldCheckIcon size={14} style={{ color: VIOLET }} className="shrink-0" />
                  <p className="text-[11px] text-left" style={{ color: MUTED }}>Annulation gratuite jusqu&apos;à votre rendez-vous.</p>
                </div>

                {(info.phone || info.address) && (
                  <p className="text-xs mt-3" style={{ color: MUTED }}>
                    Besoin de modifier ou d&apos;annuler ? {info.phone ? <>Contactez {info.businessName} au <a href={`tel:${info.phone.replace(/\s+/g, '')}`} className="font-semibold" style={{ color: INDIGO }}>{info.phone}</a>.</> : `Contactez directement ${info.businessName}.`}
                  </p>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ── Slot confirmation modal ────────────────────────────────────────── */}
      <Modal
        open={showSlotModal}
        onClose={() => setShowSlotModal(false)}
        gradientHeader={
          <div className="text-center text-white">
            <div className="w-11 h-11 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}><CalendarIcon size={20} /></div>
            <p className="text-xs font-semibold opacity-90">Créneau sélectionné</p>
          </div>
        }
      >
        <div className="text-center">
          {selectedDate && selectedTime && (
            <>
              <p className="font-bold capitalize mb-0.5" style={{ color: INK }}>{formatDateFR(selectedDate)}</p>
              <p className="text-2xl font-extrabold mb-5" style={{ color: INDIGO }}>{formatHourFR(selectedTime)}</p>
            </>
          )}
          <div className="flex gap-2">
            <button onClick={() => setShowSlotModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#F5F3FF', color: MUTED }}>Annuler</button>
            <div className="flex-1">
              <GradientButton onClick={handleConfirmSlot}>Continuer</GradientButton>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Recap modal before final validation ──────────────────────────── */}
      <Modal
        open={showRecapModal}
        onClose={() => !submitting && setShowRecapModal(false)}
        gradientHeader={
          <div className="text-white">
            <p className="text-xs font-semibold opacity-80 mb-0.5">Dernière étape</p>
            <p className="text-lg font-extrabold">Vérifiez votre réservation</p>
          </div>
        }
      >
        {selectedDate && selectedTime && info && (
          <div className="rounded-xl p-3.5 mb-4" style={{ background: '#F5F3FF', border: '1px solid rgba(139,92,246,0.15)' }}>
            <p className="text-sm font-bold capitalize" style={{ color: VIOLET }}>{formatDateFR(selectedDate)} à {formatHourFR(selectedTime)}</p>
            <p className="text-xs mt-0.5" style={{ color: VIOLET, opacity: 0.75 }}>Durée : {info.slotDuration} min</p>
          </div>
        )}
        <div className="flex flex-col gap-2 mb-5 text-sm">
          {info && <div className="flex justify-between gap-3"><span style={{ color: MUTED }}>Entreprise</span><span className="font-medium text-right" style={{ color: INK }}>{info.businessName}</span></div>}
          {info?.address && <div className="flex justify-between gap-3"><span style={{ color: MUTED }}>Adresse</span><span className="font-medium text-right" style={{ color: INK }}>{info.address}</span></div>}
          <div className="flex justify-between gap-3"><span style={{ color: MUTED }}>Nom</span><span className="font-medium text-right" style={{ color: INK }}>{clientName}</span></div>
          <div className="flex justify-between gap-3"><span style={{ color: MUTED }}>Email</span><span className="font-medium text-right break-all" style={{ color: INK }}>{clientEmail}</span></div>
          {clientPhone && <div className="flex justify-between gap-3"><span style={{ color: MUTED }}>Téléphone</span><span className="font-medium text-right" style={{ color: INK }}>{clientPhone}</span></div>}
          {serviceNote && <div className="flex justify-between gap-3"><span className="shrink-0" style={{ color: MUTED }}>Note</span><span className="font-medium text-right" style={{ color: INK }}>{serviceNote}</span></div>}
        </div>
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ background: '#FAFAFF' }}>
          <ShieldCheckIcon size={14} style={{ color: VIOLET }} className="shrink-0" />
          <p className="text-[11px]" style={{ color: MUTED }}>Vos informations ne sont utilisées que pour ce rendez-vous.</p>
        </div>
        {formError && <p className="text-xs mb-3 font-medium flex items-center gap-1.5" style={{ color: DANGER_TEXT }}><AlertCircleIcon size={14} />{formError}</p>}
        <div className="flex gap-2">
          <button disabled={submitting} onClick={() => setShowRecapModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ background: '#F5F3FF', color: MUTED }}>Modifier</button>
          <div className="flex-1">
            <GradientButton disabled={submitting} onClick={handleConfirmBooking}>
              {submitting && (
                <motion.span
                  className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white inline-block"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                />
              )}
              {submitting ? 'Confirmation…' : 'Confirmer'}
            </GradientButton>
          </div>
        </div>
      </Modal>

      <Toast message={toast} tone="success" />
    </div>
  )
}
