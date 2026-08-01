'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDateFR, formatHourFR, getParisNow, timeToMinutes } from '@/lib/booking'
import { NotFoundIllustration, SuccessBurstIllustration } from '@/components/booking/illustrations'
import { PageBackdrop, GradientIconBadge, GradientButton, ConfettiBurst, Glow, AdaptiveLogo } from '@/components/booking/decorative'
import {
  INK, MUTED, FAINT, BORDER, BORDER_HOVER, CARD, SECTION_BG, PAGE_BG, SHADOW_SOFT, SHADOW_MODAL,
  EMERALD, EMERALD_SOFT, EMERALD_BORDER, AMBER, AMBER_SOFT, RED_SOFT, RED_BORDER, BLUE, BLUE_SOFT,
} from '@/components/booking/theme'
import {
  CalendarIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon, ArrowLeftIcon,
  AlertCircleIcon, ShieldCheckIcon, TrashIcon,
} from '@/components/booking/icons'

const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const WEEK_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

type LookupData = {
  booking: {
    clientName: string
    clientEmail: string
    clientPhone: string | null
    serviceNote: string | null
    date: string
    time: string
    status: 'confirmed' | 'cancelled' | 'completed'
  }
  business: {
    businessName: string
    slug: string
    address: string | null
    phone: string | null
    logoUrl: string | null
    slotDuration: number
    bufferTime: number
    advanceBookingDays: number
  }
  isPast: boolean
}

type View = 'loading' | 'invalid' | 'error' | 'recap' | 'reschedule' | 'cancel-done' | 'reschedule-done'

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

// ─── Modal shell (mirrors /rdv/[slug]'s) ───────────────────────────────────────

function Modal({ open, onClose, accentHeader, children }: { open: boolean; onClose?: () => void; accentHeader?: React.ReactNode; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
          <motion.div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
            style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW_MODAL }}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            {accentHeader && <div className="px-6 pt-6 pb-4 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>{accentHeader}</div>}
            <div className="p-6 overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PageSkeleton() {
  const shimmer = { background: 'linear-gradient(90deg, #16161D 25%, #1D1D26 37%, #16161D 63%)', backgroundSize: '400% 100%' }
  const bar = (w: string, h = 'h-4') => <motion.div className={`${h} ${w} rounded-md`} style={shimmer} animate={{ backgroundPosition: ['100% 0%', '-100% 0%'] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }} />
  return (
    <div className="max-w-lg mx-auto px-4 py-14 relative" style={{ zIndex: 1 }}>
      <div className="rounded-2xl p-6 flex flex-col gap-3" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}>
        <motion.div className="w-16 h-16 rounded-2xl" style={shimmer} animate={{ backgroundPosition: ['100% 0%', '-100% 0%'] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }} />
        {bar('w-2/3', 'h-5')}
        {bar('w-full')}
        {bar('w-1/2')}
      </div>
    </div>
  )
}

export default function ManageBookingPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token ?? ''
  const searchParams = useSearchParams()
  const initialAction = searchParams?.get('action')

  const [view, setView] = useState<View>('loading')
  const [data, setData] = useState<LookupData | null>(null)
  const [autoActionHandled, setAutoActionHandled] = useState(false)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

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
  const [rescheduling, setRescheduling] = useState(false)
  const [rescheduleError, setRescheduleError] = useState('')
  const [confirmedAt, setConfirmedAt] = useState<{ date: string; time: string } | null>(null)
  const [confettiFired, setConfettiFired] = useState(false)

  const slotsRequestId = useRef(0)

  // ── Load booking + business info by token ───────────────────────────────
  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/bookings/manage/lookup?token=${encodeURIComponent(token)}`)
        if (cancelled) return
        if (!res.ok) {
          console.error(`[rdv/manage/${token}] lookup a répondu ${res.status}`)
          setView(res.status === 404 ? 'invalid' : 'error')
          return
        }
        const json = await res.json() as LookupData
        setData(json)
        setView('recap')
      } catch (err) {
        console.error(`[rdv/manage/${token}] erreur réseau`, err)
        if (!cancelled) setView('error')
      }
    })()
    return () => { cancelled = true }
  }, [token])

  // ── Auto-trigger the ?action= from the email link, once, after load ─────
  useEffect(() => {
    if (view !== 'recap' || autoActionHandled || !data) return
    setAutoActionHandled(true)
    if (data.isPast || data.booking.status !== 'confirmed') return
    if (initialAction === 'cancel') setShowCancelModal(true)
    else if (initialAction === 'reschedule') setView('reschedule')
  }, [view, data, autoActionHandled, initialAction])

  // ── Calendar (reschedule view) ───────────────────────────────────────────
  const calendarMonth = useMemo(() => {
    const base = getParisNow()
    base.setDate(1)
    base.setMonth(base.getMonth() + monthOffset)
    return base
  }, [monthOffset])

  useEffect(() => {
    if (view !== 'reschedule' || !data) return
    let cancelled = false
    setCalendarLoading(true)
    ;(async () => {
      try {
        const year = calendarMonth.getFullYear()
        const month = calendarMonth.getMonth() + 1
        const res = await fetch(`/api/bookings/calendar?slug=${encodeURIComponent(data.business.slug)}&year=${year}&month=${month}`)
        if (cancelled) return
        if (res.ok) {
          const json = await res.json() as { availableDates: string[]; slotCounts?: Record<string, number> }
          setAvailableDates(new Set(json.availableDates))
          setSlotCounts(json.slotCounts ?? {})
        }
      } finally {
        if (!cancelled) setCalendarLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [view, data, calendarMonth])

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

  const today = useMemo(() => { const d = getParisNow(); d.setHours(0, 0, 0, 0); return d }, [])

  const goMonth = (dir: 1 | -1) => {
    setMonthDirection(dir)
    setMonthOffset((o) => Math.max(0, Math.min(6, o + dir)))
  }

  const handlePickDate = useCallback(async (date: Date) => {
    if (!data) return
    const key = toDateKey(date)
    if (!availableDates.has(key)) return
    const requestId = ++slotsRequestId.current
    setSelectedDate(key)
    setSelectedTime(null)
    setSlots([])
    setSlotsLoading(true)
    try {
      const res = await fetch(`/api/bookings/availability?slug=${encodeURIComponent(data.business.slug)}&date=${key}`)
      if (requestId !== slotsRequestId.current) return
      const json = await res.json() as { slots?: string[] }
      setSlots(json.slots ?? [])
    } catch {
      if (requestId === slotsRequestId.current) setSlots([])
    } finally {
      if (requestId === slotsRequestId.current) setSlotsLoading(false)
    }
  }, [availableDates, data])

  const handlePickTime = useCallback((time: string) => {
    console.log(`[rdv/manage][reschedule] créneau sélectionné dans la liste -> time="${time}", date sélectionnée="${selectedDate}" -> ouverture de la modale de confirmation`)
    setSelectedTime(time)
    setRescheduleError('')
    setShowSlotModal(true)
  }, [selectedDate])

  const handleConfirmReschedule = async () => {
    console.log(`[rdv/manage][reschedule] clic sur "Confirmer" -> selectedDate="${selectedDate}" selectedTime="${selectedTime}"`)
    if (!selectedDate || !selectedTime) {
      console.warn('[rdv/manage][reschedule] ANNULÉ : date ou heure manquante au moment du clic — aucun appel réseau ne sera fait. Ceci ne devrait jamais arriver si un créneau a bien été sélectionné avant.')
      setRescheduleError('Veuillez resélectionner un créneau.')
      return
    }
    setRescheduling(true)
    setRescheduleError('')
    try {
      console.log(`[rdv/manage][reschedule] appel POST /api/bookings/manage/reschedule — body: { token: "${token}", date: "${selectedDate}", time: "${selectedTime}" }`)
      const res = await fetch('/api/bookings/manage/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, date: selectedDate, time: selectedTime }),
      })
      console.log(`[rdv/manage][reschedule] réponse HTTP reçue: status=${res.status} ok=${res.ok}`)
      const json = await res.json() as { success?: boolean; date?: string; time?: string; error?: string }
      console.log('[rdv/manage][reschedule] corps de la réponse:', json)
      if (!res.ok || !json.success) {
        console.warn(`[rdv/manage][reschedule] échec — affichage de l'erreur: "${json.error ?? "Ce créneau n'est plus disponible."}"`)
        setShowSlotModal(false)
        setRescheduleError(json.error ?? "Ce créneau n'est plus disponible.")
        setRescheduling(false)
        return
      }
      console.log(`[rdv/manage][reschedule] succès -> passage à l'écran de confirmation (date=${json.date ?? selectedDate}, time=${json.time ?? selectedTime})`)
      setShowSlotModal(false)
      setConfirmedAt({ date: json.date ?? selectedDate, time: json.time ?? selectedTime })
      setView('reschedule-done')
      setConfettiFired(true)
      setTimeout(() => setConfettiFired(false), 1500)
    } catch (err) {
      console.error('[rdv/manage][reschedule] EXCEPTION pendant l\'appel réseau (fetch a levé une erreur au lieu de répondre) :', err)
      setShowSlotModal(false)
      setRescheduleError('Erreur réseau, veuillez réessayer.')
      setRescheduling(false)
    }
  }

  const handleConfirmCancel = async () => {
    console.log(`[rdv/manage][cancel] clic sur "Oui, annuler" -> token="${token}"`)
    setCancelling(true)
    setCancelError('')
    try {
      console.log(`[rdv/manage][cancel] appel POST /api/bookings/manage/cancel`)
      const res = await fetch('/api/bookings/manage/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      console.log(`[rdv/manage][cancel] réponse HTTP reçue: status=${res.status} ok=${res.ok}`)
      const json = await res.json() as { success?: boolean; error?: string }
      console.log('[rdv/manage][cancel] corps de la réponse:', json)
      if (!res.ok || !json.success) {
        console.warn(`[rdv/manage][cancel] échec — affichage de l'erreur: "${json.error ?? "Impossible d'annuler ce rendez-vous."}"`)
        setCancelError(json.error ?? "Impossible d'annuler ce rendez-vous.")
        setCancelling(false)
        return
      }
      console.log('[rdv/manage][cancel] succès -> passage à l\'écran de confirmation d\'annulation')
      setShowCancelModal(false)
      setView('cancel-done')
    } catch (err) {
      console.error('[rdv/manage][cancel] EXCEPTION pendant l\'appel réseau (fetch a levé une erreur au lieu de répondre) :', err)
      setCancelError('Erreur réseau, veuillez réessayer.')
      setCancelling(false)
    }
  }

  const morningSlots = useMemo(() => slots.filter((s) => timeToMinutes(s) < 12 * 60), [slots])
  const afternoonSlots = useMemo(() => slots.filter((s) => timeToMinutes(s) >= 12 * 60), [slots])

  // ── Render: loading / invalid / error ────────────────────────────────────

  if (view === 'loading') {
    return <div className="min-h-screen relative" style={{ background: PAGE_BG }}><PageBackdrop /><PageSkeleton /></div>
  }

  if (view === 'invalid' || view === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ background: PAGE_BG }}>
        <PageBackdrop />
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative text-center max-w-sm rounded-2xl p-10" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT, zIndex: 1 }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="mx-auto mb-5">
            {view === 'error' ? (
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: RED_SOFT, color: '#F87171' }}>
                <AlertCircleIcon size={28} />
              </div>
            ) : (
              <NotFoundIllustration size={96} />
            )}
          </motion.div>
          <h1 className="text-lg font-extrabold mb-2" style={{ color: INK }}>{view === 'error' ? 'Une erreur est survenue' : 'Lien invalide'}</h1>
          <p className="text-sm" style={{ color: MUTED }}>
            {view === 'error' ? 'Impossible de charger ce rendez-vous pour le moment. Réessayez dans quelques instants.' : "Ce lien de gestion de rendez-vous n'existe pas ou plus. Vérifiez que vous avez copié l'adresse complète depuis votre email de confirmation."}
          </p>
        </motion.div>
      </div>
    )
  }

  if (!data) return null
  const { booking, business, isPast } = data
  const alreadyCancelled = booking.status === 'cancelled'
  const alreadyCompleted = booking.status === 'completed'
  const locked = isPast || alreadyCancelled || alreadyCompleted

  return (
    <div className="min-h-screen relative" style={{ background: PAGE_BG }}>
      <PageBackdrop />
      <div className="max-w-lg mx-auto px-4 py-10 sm:py-14 relative" style={{ zIndex: 1 }}>

        <AnimatePresence mode="wait">

          {/* ── Recap + actions ──────────────────────────────────────────── */}
          {view === 'recap' && (
            <motion.div key="recap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div className="rounded-2xl p-6 mb-4" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}>
                <div className="flex items-center gap-3 mb-5">
                  {business.logoUrl ? (
                    <AdaptiveLogo src={business.logoUrl} alt={business.businessName} maxSize={64} radius={16} background={SECTION_BG} />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold shrink-0" style={{ background: EMERALD_SOFT, color: EMERALD, border: `1px solid ${EMERALD_BORDER}` }}>
                      {business.businessName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-base font-extrabold truncate" style={{ color: INK }}>{business.businessName}</p>
                    {business.address && <p className="text-xs truncate" style={{ color: MUTED }}>{business.address}</p>}
                  </div>
                </div>

                {alreadyCancelled && (
                  <div className="flex items-center gap-2 mb-4 px-3.5 py-2.5 rounded-xl" style={{ background: RED_SOFT, border: `1px solid ${RED_BORDER}` }}>
                    <AlertCircleIcon size={15} style={{ color: '#F87171' }} className="shrink-0" />
                    <p className="text-xs font-semibold" style={{ color: '#F87171' }}>Ce rendez-vous a déjà été annulé.</p>
                  </div>
                )}
                {!alreadyCancelled && alreadyCompleted && (
                  <div className="flex items-center gap-2 mb-4 px-3.5 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <CheckIcon size={15} style={{ color: MUTED }} className="shrink-0" />
                    <p className="text-xs font-semibold" style={{ color: MUTED }}>Ce rendez-vous a déjà eu lieu.</p>
                  </div>
                )}
                {!alreadyCancelled && !alreadyCompleted && isPast && (
                  <div className="flex items-center gap-2 mb-4 px-3.5 py-2.5 rounded-xl" style={{ background: AMBER_SOFT }}>
                    <AlertCircleIcon size={15} style={{ color: AMBER }} className="shrink-0" />
                    <p className="text-xs font-semibold" style={{ color: AMBER }}>Ce rendez-vous est déjà passé — il ne peut plus être modifié ni annulé.</p>
                  </div>
                )}

                <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: SECTION_BG, border: `1px solid ${BORDER}` }}>
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: FAINT }}>Votre rendez-vous</p>
                    <p className="text-sm font-bold capitalize" style={{ color: INK }}>{formatDateFR(booking.date)}</p>
                  </div>
                  <span className="text-lg font-extrabold" style={{ color: alreadyCancelled ? FAINT : EMERALD, textDecoration: alreadyCancelled ? 'line-through' : 'none' }}>{formatHourFR(booking.time)}</span>
                </div>

                {booking.serviceNote && (
                  <p className="text-xs mt-3" style={{ color: MUTED }}><span className="font-semibold" style={{ color: INK }}>Motif :</span> {booking.serviceNote}</p>
                )}
              </div>

              {!locked && (
                <div className="flex flex-col gap-2.5">
                  <GradientButton onClick={() => { setRescheduleError(''); setSelectedDate(null); setSelectedTime(null); setView('reschedule') }} gradient={EMERALD}>
                    <CalendarIcon size={16} /> Choisir un nouveau créneau
                  </GradientButton>
                  <motion.button
                    whileHover={{ scale: 1.01, background: RED_SOFT }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setCancelError(''); setShowCancelModal(true) }}
                    className="w-full py-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2"
                    style={{ background: 'rgba(255,255,255,0.04)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <TrashIcon size={15} /> Annuler ce rendez-vous
                  </motion.button>
                </div>
              )}

              {business.phone && (
                <p className="text-xs text-center mt-5" style={{ color: FAINT }}>
                  Une question ? Contactez {business.businessName} au <a href={`tel:${business.phone.replace(/\s+/g, '')}`} style={{ color: MUTED, textDecoration: 'underline' }}>{business.phone}</a>.
                </p>
              )}
            </motion.div>
          )}

          {/* ── Reschedule: calendar + slots ─────────────────────────────── */}
          {view === 'reschedule' && (
            <motion.div key="reschedule" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}>
                <button onClick={() => setView('recap')} className="text-xs font-semibold mb-4 inline-flex items-center gap-1.5" style={{ color: MUTED }}><ArrowLeftIcon size={13} /> Retour</button>

                <p className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: INK }}>
                  <GradientIconBadge icon={<CalendarIcon size={13} />} gradient={EMERALD} size={26} radius={8} /> Choisissez un nouveau créneau
                </p>

                <div className="flex items-center justify-between mb-5">
                  <motion.button whileTap={{ scale: 0.9 }} whileHover={{ borderColor: BORDER_HOVER }} onClick={() => goMonth(-1)} disabled={monthOffset === 0} className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30" style={{ color: MUTED, border: `1px solid ${BORDER}` }}><ChevronLeftIcon size={16} /></motion.button>
                  <span className="text-sm font-bold capitalize" style={{ color: INK }}>{MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
                  <motion.button whileTap={{ scale: 0.9 }} whileHover={{ borderColor: BORDER_HOVER }} onClick={() => goMonth(1)} disabled={monthOffset === 6} className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30" style={{ color: MUTED, border: `1px solid ${BORDER}` }}><ChevronRightIcon size={16} /></motion.button>
                </div>

                <div className="grid grid-cols-7 gap-1.5 mb-2">
                  {WEEK_SHORT.map((d) => <div key={d} className="text-center text-[10px] font-semibold" style={{ color: FAINT }}>{d}</div>)}
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
                        <div key={i} className="aspect-square rounded-lg animate-pulse" style={{ background: SECTION_BG }} />
                      ))
                    ) : (
                      calendarCells.map((date, i) => {
                        if (!date) return <div key={i} />
                        const key = toDateKey(date)
                        const isPastCell = date < today
                        const isToday = key === toDateKey(today)
                        const isAvailable = !isPastCell && availableDates.has(key)
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
                              background: isSelected ? EMERALD : isAvailable ? EMERALD_SOFT : 'transparent',
                              color: isSelected ? '#0A0A0F' : isAvailable ? EMERALD : 'rgba(255,255,255,0.18)',
                              cursor: isAvailable ? 'pointer' : 'default',
                              boxShadow: isSelected ? `0 0 0 4px ${EMERALD_SOFT}` : isToday ? `inset 0 0 0 1.5px ${EMERALD}` : 'none',
                              transition: 'background 0.15s, color 0.15s',
                            }}
                          >
                            <span>{date.getDate()}</span>
                            {isAvailable && count !== undefined && (
                              <span className="text-[8px] font-bold leading-none" style={{ color: isSelected ? 'rgba(10,10,15,0.7)' : AMBER, opacity: 0.9 }}>{count}</span>
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

                <AnimatePresence>
                  {selectedDate && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${BORDER}` }}>
                        <p className="text-sm font-bold mb-3 capitalize" style={{ color: INK }}>{formatDateFR(selectedDate)}</p>
                        {slotsLoading ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 rounded-lg animate-pulse" style={{ background: SECTION_BG }} />)}
                          </div>
                        ) : slots.length === 0 ? (
                          <p className="text-sm" style={{ color: MUTED }}>Plus aucun créneau libre ce jour-là.</p>
                        ) : (
                          <div className="flex flex-col gap-4">
                            {morningSlots.length > 0 && (
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: FAINT }}>Matin</p>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {morningSlots.map((s) => (
                                    <motion.button key={s} whileTap={{ scale: 0.92 }} whileHover={{ borderColor: EMERALD, background: EMERALD_SOFT, color: EMERALD, scale: 1.03 }} onClick={() => handlePickTime(s)} className="px-2 py-2.5 rounded-lg text-xs font-semibold" style={{ background: SECTION_BG, border: `1px solid ${BORDER}`, color: INK, transition: 'border-color 0.15s, color 0.15s, background 0.15s' }}>
                                      {formatHourFR(s)}
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {afternoonSlots.length > 0 && (
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: FAINT }}>Après-midi</p>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {afternoonSlots.map((s) => (
                                    <motion.button key={s} whileTap={{ scale: 0.92 }} whileHover={{ borderColor: EMERALD, background: EMERALD_SOFT, color: EMERALD, scale: 1.03 }} onClick={() => handlePickTime(s)} className="px-2 py-2.5 rounded-lg text-xs font-semibold" style={{ background: SECTION_BG, border: `1px solid ${BORDER}`, color: INK, transition: 'border-color 0.15s, color 0.15s, background 0.15s' }}>
                                      {formatHourFR(s)}
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {rescheduleError && <p className="text-xs font-medium mt-4 flex items-center gap-1.5" style={{ color: '#F87171' }}><AlertCircleIcon size={14} />{rescheduleError}</p>}
            </motion.div>
          )}

          {/* ── Reschedule success ───────────────────────────────────────── */}
          {view === 'reschedule-done' && confirmedAt && (
            <motion.div key="reschedule-done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="relative rounded-2xl p-8 text-center overflow-visible" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}>
              <ConfettiBurst fire={confettiFired} />
              <div className="relative mx-auto mb-2" style={{ width: 96, height: 96 }}>
                <Glow color={EMERALD} size={160} opacity={0.18} />
                <div className="absolute inset-0 flex items-center justify-center"><SuccessBurstIllustration size={96} /></div>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.15 }} className="absolute inset-0 flex items-center justify-center">
                  <CheckIcon size={26} strokeWidth={3} style={{ color: '#0A0A0F', marginTop: 2 }} />
                </motion.div>
              </div>
              <h2 className="text-xl font-extrabold mb-2 mt-1" style={{ color: INK }}>Rendez-vous déplacé</h2>
              <p className="text-sm mb-5" style={{ color: MUTED }}>Un email de confirmation vous a été envoyé à {booking.clientEmail}.</p>
              <div className="rounded-xl p-4" style={{ background: SECTION_BG, border: `1px solid ${BORDER}` }}>
                <p className="text-sm font-semibold capitalize" style={{ color: INK }}>{formatDateFR(confirmedAt.date)}</p>
                <p className="text-2xl font-extrabold mt-1" style={{ color: EMERALD }}>{formatHourFR(confirmedAt.time)}</p>
              </div>
            </motion.div>
          )}

          {/* ── Cancel success ───────────────────────────────────────────── */}
          {view === 'cancel-done' && (
            <motion.div key="cancel-done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="relative rounded-2xl p-8 text-center" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', color: MUTED }}>
                <TrashIcon size={26} />
              </motion.div>
              <h2 className="text-xl font-extrabold mb-2" style={{ color: INK }}>Rendez-vous annulé</h2>
              <p className="text-sm" style={{ color: MUTED }}>Votre créneau du {formatDateFR(booking.date)} à {formatHourFR(booking.time)} a bien été annulé. Un email de confirmation vous a été envoyé.</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Cancel confirmation modal ─────────────────────────────────────── */}
      <Modal
        open={showCancelModal}
        onClose={() => !cancelling && setShowCancelModal(false)}
        accentHeader={
          <div className="text-center">
            <div className="w-11 h-11 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ background: RED_SOFT, color: '#F87171' }}><TrashIcon size={20} /></div>
            <p className="text-sm font-bold" style={{ color: INK }}>Annuler ce rendez-vous ?</p>
          </div>
        }
      >
        <p className="text-sm text-center mb-5" style={{ color: MUTED }}>
          Votre créneau du <strong style={{ color: INK }}>{formatDateFR(booking.date)} à {formatHourFR(booking.time)}</strong> sera libéré. Cette action est irréversible.
        </p>
        {cancelError && <p className="text-xs mb-3 font-medium flex items-center gap-1.5" style={{ color: '#F87171' }}><AlertCircleIcon size={14} />{cancelError}</p>}
        <div className="flex gap-2">
          <button disabled={cancelling} onClick={() => setShowCancelModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ background: SECTION_BG, color: MUTED }}>Retour</button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={cancelling}
            onClick={handleConfirmCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: '#EF4444', color: '#fff' }}
          >
            {cancelling && <motion.span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white inline-block" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }} />}
            {cancelling ? 'Annulation…' : 'Oui, annuler'}
          </motion.button>
        </div>
      </Modal>

      {/* ── Slot confirmation modal (reschedule) ─────────────────────────── */}
      <Modal
        open={showSlotModal}
        onClose={() => !rescheduling && setShowSlotModal(false)}
        accentHeader={
          <div className="text-center">
            <div className="w-11 h-11 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ background: EMERALD_SOFT, color: EMERALD }}><CalendarIcon size={20} /></div>
            <p className="text-xs font-semibold" style={{ color: MUTED }}>Nouveau créneau</p>
          </div>
        }
      >
        <div className="text-center">
          {selectedDate && selectedTime && (
            <>
              <p className="font-bold capitalize mb-0.5" style={{ color: INK }}>{formatDateFR(selectedDate)}</p>
              <p className="text-2xl font-extrabold mb-5" style={{ color: EMERALD }}>{formatHourFR(selectedTime)}</p>
            </>
          )}
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-left" style={{ background: BLUE_SOFT }}>
            <ShieldCheckIcon size={14} style={{ color: BLUE }} className="shrink-0" />
            <p className="text-[11px]" style={{ color: MUTED }}>Votre ancien créneau sera automatiquement libéré.</p>
          </div>
          <div className="flex gap-2">
            <button disabled={rescheduling} onClick={() => setShowSlotModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ background: SECTION_BG, color: MUTED }}>Annuler</button>
            <div className="flex-1">
              <GradientButton disabled={rescheduling} onClick={handleConfirmReschedule}>
                {rescheduling && <motion.span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white inline-block" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }} />}
                {rescheduling ? 'Confirmation…' : 'Confirmer'}
              </GradientButton>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
