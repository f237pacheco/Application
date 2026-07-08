'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDateFR, formatHourFR } from '@/lib/booking'

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
}
type Step = 'loading' | 'not-found' | 'calendar' | 'form' | 'confirmed' | 'error'

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
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
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-sm rounded-2xl p-6"
            style={{ background: '#18181B', border: '1px solid #27272A', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
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

export default function PublicBookingPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug ?? ''

  const [step, setStep] = useState<Step>('loading')
  const [info, setInfo] = useState<Info | null>(null)

  const [monthOffset, setMonthOffset] = useState(0)
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
  const [confirmedAt, setConfirmedAt] = useState<{ date: string; time: string } | null>(null)

  const slotsRequestId = useRef(0)

  // ── Load business info ──────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/bookings/info?slug=${encodeURIComponent(slug)}`)
        if (cancelled) return
        if (!res.ok) { setStep('not-found'); return }
        const data = await res.json() as Info
        setInfo(data)
        setStep('calendar')
      } catch {
        if (!cancelled) setStep('error')
      }
    })()
    return () => { cancelled = true }
  }, [slug])

  // ── Load calendar availability for the displayed month ─────────────────
  // Depends only on slug/month — NOT on step, so picking a day or opening the
  // form never re-triggers a full month refetch (that was causing the
  // calendar to flicker/reload every time a day was selected).
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
      const data = await res.json() as { success?: boolean; date?: string; time?: string; error?: string }
      if (!res.ok || !data.success) {
        setShowRecapModal(false)
        setFormError(data.error ?? "Ce créneau n'est plus disponible.")
        setSubmitting(false)
        return
      }
      setShowRecapModal(false)
      setConfirmedAt({ date: data.date ?? selectedDate, time: data.time ?? selectedTime })
      setStep('confirmed')
    } catch {
      setShowRecapModal(false)
      setFormError('Erreur réseau, veuillez réessayer.')
      setSubmitting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090B' }}>
        <motion.div
          className="w-8 h-8 rounded-full border-2 border-t-transparent"
          style={{ borderColor: '#10B981', borderTopColor: 'transparent' }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
        />
      </div>
    )
  }

  if (step === 'not-found' || step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#09090B' }}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-xl font-bold text-white mb-2">Page introuvable</h1>
          <p className="text-gray-500 text-sm">{step === 'error' ? 'Une erreur est survenue. Réessayez plus tard.' : "Cette page de réservation n'existe pas ou plus."}</p>
        </motion.div>
      </div>
    )
  }

  const hasPracticalInfo = !!(info?.services || info?.paymentMethods || info?.instructions)

  return (
    <div className="relative min-h-screen" style={{ background: '#09090B' }}>
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10" style={{ background: 'linear-gradient(90deg, transparent 5%, #10B981 35%, #34D399 65%, transparent 95%)' }} />

      <div className="max-w-lg mx-auto px-4 py-10 sm:py-14">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          {info?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={info.logoUrl}
              alt={info.businessName}
              className="w-16 h-16 mx-auto mb-4 rounded-2xl object-cover"
              style={{ border: '1px solid #27272A' }}
            />
          ) : (
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl font-extrabold" style={{ background: 'rgba(16,185,129,0.12)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.25)' }}>
              {info?.businessName?.charAt(0).toUpperCase() ?? '?'}
            </div>
          )}
          <h1 className="text-2xl font-extrabold text-white mb-1.5">{info?.businessName}</h1>
          {info?.description && <p className="text-gray-500 text-sm leading-relaxed mb-3">{info.description}</p>}

          {(info?.address || info?.phone) && (
            <div className="flex flex-col items-center gap-0.5 text-xs text-gray-500">
              {info.address && <span>📍 {info.address}</span>}
              {info.phone && <span>📞 {info.phone}</span>}
            </div>
          )}
        </motion.div>

        {/* ── Practical info ───────────────────────────────────────────────── */}
        {hasPracticalInfo && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl p-5 mb-6" style={{ background: '#18181B', border: '1px solid #27272A' }}>
            {info?.services && (
              <div className="mb-2.5 last:mb-0">
                <p className="text-[11px] font-semibold text-gray-500 mb-0.5">Prestations</p>
                <p className="text-sm text-gray-300 leading-relaxed">{info.services}</p>
              </div>
            )}
            {info?.paymentMethods && (
              <div className="mb-2.5 last:mb-0">
                <p className="text-[11px] font-semibold text-gray-500 mb-0.5">Moyens de paiement</p>
                <p className="text-sm text-gray-300 leading-relaxed">{info.paymentMethods}</p>
              </div>
            )}
            {info?.instructions && (
              <div className="last:mb-0">
                <p className="text-[11px] font-semibold text-gray-500 mb-0.5">À savoir avant votre RDV</p>
                <p className="text-sm text-gray-300 leading-relaxed">{info.instructions}</p>
              </div>
            )}
          </motion.div>
        )}

        <AnimatePresence mode="wait">

          {/* ── Calendar + slots ─────────────────────────────────────────── */}
          {step === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="rounded-2xl p-6" style={{ background: '#18181B', border: '1px solid #27272A' }}>
              <div className="flex items-center justify-between mb-5">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMonthOffset((o) => Math.max(0, o - 1))} disabled={monthOffset === 0} className="text-gray-500 disabled:opacity-30 px-2 py-1">←</motion.button>
                <span className="text-sm font-bold text-white capitalize">{MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMonthOffset((o) => Math.min(6, o + 1))} disabled={monthOffset === 6} className="text-gray-500 disabled:opacity-30 px-2 py-1">→</motion.button>
              </div>

              <div className="grid grid-cols-7 gap-1.5 mb-2">
                {WEEK_SHORT.map((d) => <div key={d} className="text-center text-[10px] font-semibold text-gray-600">{d}</div>)}
              </div>
              <motion.div layout className="grid grid-cols-7 gap-1.5">
                {calendarLoading ? (
                  Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-lg animate-pulse" style={{ background: '#27272A', opacity: 0.4 }} />
                  ))
                ) : (
                  calendarCells.map((date, i) => {
                    if (!date) return <div key={i} />
                    const key = toDateKey(date)
                    const isPast = date < today
                    const isAvailable = !isPast && availableDates.has(key)
                    const isSelected = key === selectedDate
                    return (
                      <motion.button
                        key={i}
                        whileTap={isAvailable ? { scale: 0.9 } : undefined}
                        whileHover={isAvailable ? { scale: 1.05 } : undefined}
                        disabled={!isAvailable}
                        onClick={() => handlePickDate(date)}
                        className="aspect-square rounded-lg text-xs font-semibold"
                        style={{
                          background: isSelected ? '#10B981' : isAvailable ? 'rgba(16,185,129,0.1)' : 'transparent',
                          color: isSelected ? '#fff' : isAvailable ? '#6EE7B7' : '#3F3F46',
                          cursor: isAvailable ? 'pointer' : 'default',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                      >
                        {date.getDate()}
                      </motion.button>
                    )
                  })
                )}
              </motion.div>

              {!calendarLoading && availableDates.size === 0 && (
                <p className="text-center text-gray-500 text-sm mt-5">Aucun créneau disponible ce mois-ci.</p>
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
                    <div className="mt-6 pt-6" style={{ borderTop: '1px solid #27272A' }}>
                      <p className="text-sm font-semibold text-white mb-3 capitalize">{formatDateFR(selectedDate)}</p>
                      {slotsLoading ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: '#27272A', opacity: 0.4 }} />
                          ))}
                        </div>
                      ) : slots.length === 0 ? (
                        <p className="text-gray-500 text-sm">Plus aucun créneau libre ce jour-là.</p>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {slots.map((s) => (
                            <motion.button
                              key={s}
                              whileTap={{ scale: 0.92 }}
                              whileHover={{ borderColor: '#10B981', color: '#6EE7B7' }}
                              onClick={() => handlePickTime(s)}
                              className="px-2 py-2 rounded-lg text-xs font-semibold"
                              style={{ background: '#09090B', border: '1px solid #27272A', color: '#A1A1AA', transition: 'border-color 0.15s, color 0.15s' }}
                            >
                              {formatHourFR(s)}
                            </motion.button>
                          ))}
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
            <motion.div key="form" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }} className="rounded-2xl p-6" style={{ background: '#18181B', border: '1px solid #27272A' }}>
              <button onClick={() => setStep('calendar')} className="text-xs text-gray-500 hover:text-white mb-4 transition-colors">← Changer de créneau</button>

              <div className="rounded-xl p-3.5 mb-5" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <p className="text-sm font-bold capitalize" style={{ color: '#6EE7B7' }}>{formatDateFR(selectedDate)} à {formatHourFR(selectedTime)}</p>
              </div>

              <form onSubmit={handleOpenRecap} className="flex flex-col gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nom complet *</label>
                  <input value={clientName} onChange={(e) => setClientName(e.target.value)} required className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none" style={{ background: '#09090B', border: '1px solid #27272A' }} placeholder="Jean Dupont" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email *</label>
                  <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none" style={{ background: '#09090B', border: '1px solid #27272A' }} placeholder="jean@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Téléphone</label>
                  <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none" style={{ background: '#09090B', border: '1px solid #27272A' }} placeholder="06 12 34 56 78" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Note (optionnel)</label>
                  <textarea value={serviceNote} onChange={(e) => setServiceNote(e.target.value)} rows={2} className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none resize-none" style={{ background: '#09090B', border: '1px solid #27272A' }} placeholder="Précisez votre demande si besoin…" />
                </div>

                {formError && <p className="text-xs" style={{ color: '#FCA5A5' }}>{formError}</p>}

                <motion.button whileTap={{ scale: 0.98 }} type="submit" className="mt-1 w-full py-3 rounded-xl text-sm font-bold" style={{ background: '#10B981', color: '#fff' }}>
                  Vérifier et confirmer
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ── Confirmation ─────────────────────────────────────────────── */}
          {step === 'confirmed' && confirmedAt && (
            <motion.div key="confirmed" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="rounded-2xl p-8 text-center" style={{ background: '#18181B', border: '1px solid rgba(16,185,129,0.3)' }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center text-2xl"
                style={{ background: 'rgba(16,185,129,0.12)' }}
              >
                ✓
              </motion.div>
              <h2 className="text-xl font-extrabold text-white mb-2">Rendez-vous confirmé</h2>
              <p className="text-gray-400 text-sm mb-1">Votre RDV avec <strong className="text-white">{info?.businessName}</strong> est confirmé le</p>
              <p className="text-base font-bold capitalize mb-4" style={{ color: '#6EE7B7' }}>{formatDateFR(confirmedAt.date)} à {formatHourFR(confirmedAt.time)}</p>
              <p className="text-gray-500 text-xs mb-1">Un email de confirmation a été envoyé à {clientEmail}.</p>
              {info?.instructions && (
                <div className="mt-5 pt-5 text-left" style={{ borderTop: '1px solid #27272A' }}>
                  <p className="text-[11px] font-semibold text-gray-500 mb-1">À savoir avant votre RDV</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{info.instructions}</p>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Slot confirmation modal ────────────────────────────────────────── */}
      <Modal open={showSlotModal} onClose={() => setShowSlotModal(false)}>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(16,185,129,0.12)' }}>🗓️</div>
          <p className="text-xs font-semibold text-gray-500 mb-1">Créneau sélectionné</p>
          {selectedDate && selectedTime && (
            <>
              <p className="text-white font-bold capitalize mb-0.5">{formatDateFR(selectedDate)}</p>
              <p className="text-2xl font-extrabold mb-5" style={{ color: '#6EE7B7' }}>{formatHourFR(selectedTime)}</p>
            </>
          )}
          <div className="flex gap-2">
            <button onClick={() => setShowSlotModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#27272A', color: '#A1A1AA' }}>Annuler</button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleConfirmSlot} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#10B981', color: '#fff' }}>Continuer</motion.button>
          </div>
        </div>
      </Modal>

      {/* ── Recap modal before final validation ──────────────────────────── */}
      <Modal open={showRecapModal} onClose={() => !submitting && setShowRecapModal(false)}>
        <p className="text-sm font-bold text-white mb-4">Vérifiez votre réservation</p>
        {selectedDate && selectedTime && (
          <div className="rounded-xl p-3.5 mb-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-sm font-bold capitalize" style={{ color: '#6EE7B7' }}>{formatDateFR(selectedDate)} à {formatHourFR(selectedTime)}</p>
          </div>
        )}
        <div className="flex flex-col gap-2 mb-5 text-sm">
          <div className="flex justify-between gap-3"><span className="text-gray-500">Nom</span><span className="text-white font-medium text-right">{clientName}</span></div>
          <div className="flex justify-between gap-3"><span className="text-gray-500">Email</span><span className="text-white font-medium text-right break-all">{clientEmail}</span></div>
          {clientPhone && <div className="flex justify-between gap-3"><span className="text-gray-500">Téléphone</span><span className="text-white font-medium text-right">{clientPhone}</span></div>}
          {serviceNote && <div className="flex justify-between gap-3"><span className="text-gray-500 shrink-0">Note</span><span className="text-white font-medium text-right">{serviceNote}</span></div>}
        </div>
        {formError && <p className="text-xs mb-3" style={{ color: '#FCA5A5' }}>{formError}</p>}
        <div className="flex gap-2">
          <button disabled={submitting} onClick={() => setShowRecapModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ background: '#27272A', color: '#A1A1AA' }}>Modifier</button>
          <motion.button whileTap={{ scale: 0.97 }} disabled={submitting} onClick={handleConfirmBooking} className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60" style={{ background: '#10B981', color: '#fff' }}>
            {submitting ? 'Confirmation…' : 'Confirmer la réservation'}
          </motion.button>
        </div>
      </Modal>
    </div>
  )
}
