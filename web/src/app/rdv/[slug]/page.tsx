'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDateFR, formatHourFR } from '@/lib/booking'
import { downloadICS } from '@/lib/ics'

const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const WEEK_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const INK = '#0F172A'
const MUTED = '#64748B'
const BORDER = '#E2E8F0'
const CARD = '#FFFFFF'
const PAGE_BG = '#F8FAFC'
const ACCENT = '#10B981'
const ACCENT_DARK = '#059669'
const ACCENT_SOFT = '#ECFDF5'
const ACCENT_BORDER = '#A7F3D0'

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
                  background: done || active ? ACCENT : '#FFFFFF',
                  borderColor: done || active ? ACCENT : BORDER,
                  color: done || active ? '#FFFFFF' : MUTED,
                }}
                transition={{ duration: 0.25 }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ border: '1.5px solid' }}
              >
                {done ? '✓' : n}
              </motion.div>
              <span className="hidden sm:block text-[10px] font-semibold text-center whitespace-nowrap" style={{ color: active ? INK : MUTED }}>{label}</span>
            </div>
            {n < STEPS.length && (
              <div className="flex-1 h-px mx-2" style={{ background: BORDER, position: 'relative', top: '-10px' }}>
                <motion.div
                  className="h-px"
                  style={{ background: ACCENT }}
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

// ─── Modal shell ────────────────────────────────────────────────────────────────

function Modal({ open, onClose, children }: { open: boolean; onClose?: () => void; children: React.ReactNode }) {
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
            style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-sm rounded-2xl p-6"
            style={{ background: CARD, boxShadow: '0 24px 64px rgba(15,23,42,0.25)' }}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Business info card (left column) ──────────────────────────────────────────

function BusinessCard({ info }: { info: Info }) {
  const hasPractical = !!(info.services || info.paymentMethods || info.instructions)
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        {info.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={info.logoUrl} alt={info.businessName} className="w-16 h-16 rounded-2xl object-cover mb-4" style={{ border: `1px solid ${BORDER}` }} />
        ) : (
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold mb-4" style={{ background: ACCENT_SOFT, color: ACCENT_DARK, border: `1px solid ${ACCENT_BORDER}` }}>
            {info.businessName?.charAt(0).toUpperCase() ?? '?'}
          </div>
        )}

        <h1 className="text-xl font-extrabold mb-1.5" style={{ color: INK }}>{info.businessName}</h1>
        {info.description && <p className="text-sm leading-relaxed mb-4" style={{ color: MUTED }}>{info.description}</p>}

        <div className="flex flex-col gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit" style={{ background: ACCENT_SOFT, color: ACCENT_DARK }}>
            ⏱ Rendez-vous de {info.slotDuration} min
          </span>
        </div>

        {(info.address || info.phone) && (
          <div className="flex flex-col gap-2.5 mt-4 pt-4 text-sm" style={{ borderTop: `1px solid ${BORDER}` }}>
            {info.address && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#94A3B8' }}>Adresse</p>
                <p style={{ color: INK }}>{info.address}</p>
              </div>
            )}
            {info.phone && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#94A3B8' }}>Téléphone</p>
                <p style={{ color: INK }}>{info.phone}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {hasPractical && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }} className="rounded-2xl p-6 mt-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          {info.services && (
            <div className="mb-4 last:mb-0">
              <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Prestations</p>
              <p className="text-sm leading-relaxed" style={{ color: INK }}>{info.services}</p>
            </div>
          )}
          {info.paymentMethods && (
            <div className="mb-4 last:mb-0">
              <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Moyens de paiement</p>
              <p className="text-sm leading-relaxed" style={{ color: INK }}>{info.paymentMethods}</p>
            </div>
          )}
          {info.instructions && (
            <div className="last:mb-0">
              <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>À savoir avant votre RDV</p>
              <p className="text-sm leading-relaxed" style={{ color: INK }}>{info.instructions}</p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

// ─── Loading skeleton (2-column) ────────────────────────────────────────────────

function PageSkeleton() {
  const bar = (w: string, h = 'h-4') => <div className={`${h} ${w} rounded-md animate-pulse`} style={{ background: '#E2E8F0' }} />
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 max-w-4xl mx-auto px-4 py-10">
      <div className="rounded-2xl p-6 flex flex-col gap-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="w-16 h-16 rounded-2xl animate-pulse" style={{ background: '#E2E8F0' }} />
        {bar('w-3/4', 'h-5')}
        {bar('w-full')}
        {bar('w-2/3')}
      </div>
      <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        {bar('w-1/3', 'h-5')}
        <div className="grid grid-cols-7 gap-2 mt-5">
          {Array.from({ length: 28 }).map((_, i) => <div key={i} className="aspect-square rounded-lg animate-pulse" style={{ background: '#E2E8F0' }} />)}
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
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmedAt, setConfirmedAt] = useState<{ date: string; time: string; bookingUid: string } | null>(null)
  const [toast, setToast] = useState('')

  const slotsRequestId = useRef(0)

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
    const base = new Date()
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
          const data = await res.json() as { availableDates: string[] }
          setAvailableDates(new Set(data.availableDates))
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

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])

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

  // ── Render ───────────────────────────────────────────────────────────────

  if (step === 'loading') {
    return <div className="min-h-screen" style={{ background: PAGE_BG }}><PageSkeleton /></div>
  }

  if (step === 'not-found' || step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: PAGE_BG }}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm rounded-2xl p-10" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: '0 8px 30px rgba(15,23,42,0.06)' }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center text-3xl" style={{ background: '#F1F5F9' }}>
            {step === 'error' ? '⚠️' : '🔍'}
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
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14">

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
              <motion.div key="calendar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <p className="text-sm font-bold mb-4" style={{ color: INK }}>Choisissez une date</p>

                <div className="flex items-center justify-between mb-5">
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => goMonth(-1)} disabled={monthOffset === 0} className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30" style={{ color: MUTED, border: `1px solid ${BORDER}` }}>←</motion.button>
                  <span className="text-sm font-bold capitalize" style={{ color: INK }}>{MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => goMonth(1)} disabled={monthOffset === 6} className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30" style={{ color: MUTED, border: `1px solid ${BORDER}` }}>→</motion.button>
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
                        <div key={i} className="aspect-square rounded-lg animate-pulse" style={{ background: '#F1F5F9' }} />
                      ))
                    ) : (
                      calendarCells.map((date, i) => {
                        if (!date) return <div key={i} />
                        const key = toDateKey(date)
                        const isPast = date < today
                        const isToday = key === toDateKey(today)
                        const isAvailable = !isPast && availableDates.has(key)
                        const isSelected = key === selectedDate
                        return (
                          <motion.button
                            key={i}
                            whileTap={isAvailable ? { scale: 0.9 } : undefined}
                            whileHover={isAvailable ? { scale: 1.06 } : undefined}
                            disabled={!isAvailable}
                            onClick={() => handlePickDate(date)}
                            className="aspect-square rounded-lg text-xs font-semibold relative"
                            style={{
                              background: isSelected ? ACCENT : isAvailable ? ACCENT_SOFT : 'transparent',
                              color: isSelected ? '#fff' : isAvailable ? ACCENT_DARK : '#CBD5E1',
                              cursor: isAvailable ? 'pointer' : 'default',
                              boxShadow: isToday && !isSelected ? `inset 0 0 0 1.5px ${ACCENT}` : 'none',
                              transition: 'background 0.15s, color 0.15s',
                            }}
                          >
                            {date.getDate()}
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
                              <div key={i} className="h-9 rounded-lg animate-pulse" style={{ background: '#F1F5F9' }} />
                            ))}
                          </div>
                        ) : slots.length === 0 ? (
                          <p className="text-sm" style={{ color: MUTED }}>Plus aucun créneau libre ce jour-là.</p>
                        ) : (
                          <motion.div
                            className="grid grid-cols-3 sm:grid-cols-4 gap-2"
                            initial="hidden"
                            animate="show"
                            variants={{ show: { transition: { staggerChildren: 0.03 } } }}
                          >
                            {slots.map((s) => (
                              <motion.button
                                key={s}
                                variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                                whileTap={{ scale: 0.92 }}
                                whileHover={{ borderColor: ACCENT, background: ACCENT_SOFT, color: ACCENT_DARK }}
                                onClick={() => handlePickTime(s)}
                                className="px-2 py-2.5 rounded-lg text-xs font-semibold"
                                style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, color: INK, transition: 'border-color 0.15s, color 0.15s, background 0.15s' }}
                              >
                                {formatHourFR(s)}
                              </motion.button>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── Booking form ─────────────────────────────────────────────── */}
            {step === 'form' && selectedDate && selectedTime && (
              <motion.div key="form" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }} className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <button onClick={() => setStep('calendar')} className="text-xs font-semibold mb-4 transition-colors" style={{ color: MUTED }}>← Changer de créneau</button>

                <div className="rounded-xl p-3.5 mb-5 flex items-center gap-2.5" style={{ background: ACCENT_SOFT, border: `1px solid ${ACCENT_BORDER}` }}>
                  <span className="text-lg">🗓️</span>
                  <p className="text-sm font-bold capitalize" style={{ color: ACCENT_DARK }}>{formatDateFR(selectedDate)} à {formatHourFR(selectedTime)}</p>
                </div>

                <p className="text-sm font-bold mb-4" style={{ color: INK }}>Vos informations</p>

                <form onSubmit={handleOpenRecap} className="flex flex-col gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Nom complet *</label>
                    <input value={clientName} onChange={(e) => setClientName(e.target.value)} required className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, color: INK }} placeholder="Jean Dupont" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Email *</label>
                    <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, color: INK }} placeholder="jean@email.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Téléphone</label>
                    <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, color: INK }} placeholder="06 12 34 56 78" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Note (optionnel)</label>
                    <textarea value={serviceNote} onChange={(e) => setServiceNote(e.target.value)} rows={2} className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none" style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, color: INK }} placeholder="Précisez votre demande si besoin…" />
                  </div>

                  {formError && <p className="text-xs font-medium" style={{ color: '#DC2626' }}>{formError}</p>}

                  <motion.button whileTap={{ scale: 0.98 }} type="submit" className="mt-1 w-full py-3 rounded-xl text-sm font-bold" style={{ background: ACCENT, color: '#fff' }}>
                    Vérifier et confirmer
                  </motion.button>
                </form>
              </motion.div>
            )}

            {/* ── Confirmation ─────────────────────────────────────────────── */}
            {step === 'confirmed' && confirmedAt && info && (
              <motion.div key="confirmed" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="max-w-md mx-auto rounded-2xl p-8 text-center" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: '0 8px 30px rgba(15,23,42,0.06)' }}>
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                  className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center text-3xl"
                  style={{ background: ACCENT_SOFT, color: ACCENT_DARK }}
                >
                  ✓
                </motion.div>
                <h2 className="text-xl font-extrabold mb-2" style={{ color: INK }}>Rendez-vous confirmé</h2>
                <p className="text-sm mb-4" style={{ color: MUTED }}>Un email de confirmation vous a été envoyé à {clientEmail}.</p>

                <div className="rounded-xl p-4 mb-5 text-left" style={{ background: '#F8FAFC', border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-3 mb-3">
                    {info.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={info.logoUrl} alt={info.businessName} className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold" style={{ background: ACCENT_SOFT, color: ACCENT_DARK }}>
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
                    <span className="text-base font-extrabold" style={{ color: ACCENT_DARK }}>{formatHourFR(confirmedAt.time)}</span>
                  </div>
                  {info.phone && <p className="text-xs mt-2" style={{ color: MUTED }}>{info.phone}</p>}
                </div>

                <motion.button whileTap={{ scale: 0.98 }} onClick={handleAddToCalendar} className="w-full py-3 rounded-xl text-sm font-bold mb-3" style={{ background: INK, color: '#fff' }}>
                  📅 Ajouter à mon agenda
                </motion.button>

                {info.instructions && (
                  <div className="pt-4 mt-1 text-left" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>À savoir avant votre RDV</p>
                    <p className="text-sm leading-relaxed" style={{ color: INK }}>{info.instructions}</p>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ── Slot confirmation modal ────────────────────────────────────────── */}
      <Modal open={showSlotModal} onClose={() => setShowSlotModal(false)}>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center text-xl" style={{ background: ACCENT_SOFT }}>🗓️</div>
          <p className="text-xs font-semibold mb-1" style={{ color: MUTED }}>Créneau sélectionné</p>
          {selectedDate && selectedTime && (
            <>
              <p className="font-bold capitalize mb-0.5" style={{ color: INK }}>{formatDateFR(selectedDate)}</p>
              <p className="text-2xl font-extrabold mb-5" style={{ color: ACCENT_DARK }}>{formatHourFR(selectedTime)}</p>
            </>
          )}
          <div className="flex gap-2">
            <button onClick={() => setShowSlotModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#F1F5F9', color: MUTED }}>Annuler</button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleConfirmSlot} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: ACCENT, color: '#fff' }}>Continuer</motion.button>
          </div>
        </div>
      </Modal>

      {/* ── Recap modal before final validation ──────────────────────────── */}
      <Modal open={showRecapModal} onClose={() => !submitting && setShowRecapModal(false)}>
        <p className="text-sm font-bold mb-4" style={{ color: INK }}>Vérifiez votre réservation</p>
        {selectedDate && selectedTime && info && (
          <div className="rounded-xl p-3.5 mb-4" style={{ background: ACCENT_SOFT, border: `1px solid ${ACCENT_BORDER}` }}>
            <p className="text-sm font-bold capitalize" style={{ color: ACCENT_DARK }}>{formatDateFR(selectedDate)} à {formatHourFR(selectedTime)}</p>
            <p className="text-xs mt-0.5" style={{ color: ACCENT_DARK, opacity: 0.8 }}>Durée : {info.slotDuration} min</p>
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
        {formError && <p className="text-xs mb-3 font-medium" style={{ color: '#DC2626' }}>{formError}</p>}
        <div className="flex gap-2">
          <button disabled={submitting} onClick={() => setShowRecapModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ background: '#F1F5F9', color: MUTED }}>Modifier</button>
          <motion.button whileTap={{ scale: 0.97 }} disabled={submitting} onClick={handleConfirmBooking} className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2" style={{ background: ACCENT, color: '#fff' }}>
            {submitting && (
              <motion.span
                className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white inline-block"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
              />
            )}
            {submitting ? 'Confirmation…' : 'Confirmer'}
          </motion.button>
        </div>
      </Modal>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 10, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-1/2 z-[60] px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
            style={{ background: INK, color: '#fff', boxShadow: '0 12px 32px rgba(0,0,0,0.3)' }}
          >
            ✓ {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
