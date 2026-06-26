'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDateFR, formatTimeFR } from '@/lib/booking'

const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const WEEK_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Info = { businessName: string; description: string | null }
type Step = 'loading' | 'not-found' | 'calendar' | 'slots' | 'form' | 'confirmed' | 'error'

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
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

  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [serviceNote, setServiceNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmedAt, setConfirmedAt] = useState<{ date: string; time: string } | null>(null)

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
  const calendarMonth = useMemo(() => {
    const base = new Date()
    base.setDate(1)
    base.setMonth(base.getMonth() + monthOffset)
    return base
  }, [monthOffset])

  useEffect(() => {
    if (step !== 'calendar' && step !== 'slots') return
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
  }, [slug, calendarMonth, step])

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

  const handlePickDate = useCallback(async (date: Date) => {
    const key = toDateKey(date)
    if (!availableDates.has(key)) return
    setSelectedDate(key)
    setSelectedTime(null)
    setStep('slots')
    setSlotsLoading(true)
    try {
      const res = await fetch(`/api/bookings/availability?slug=${encodeURIComponent(slug)}&date=${key}`)
      const data = await res.json() as { slots?: string[] }
      setSlots(data.slots ?? [])
    } catch {
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }, [availableDates, slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !selectedTime) return
    setFormError('')

    if (!clientName.trim()) { setFormError('Votre nom est requis.'); return }
    if (!EMAIL_REGEX.test(clientEmail.trim())) { setFormError('Adresse email invalide.'); return }

    setSubmitting(true)
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
        setFormError(data.error ?? "Ce créneau n'est plus disponible.")
        setSubmitting(false)
        return
      }
      setConfirmedAt({ date: data.date ?? selectedDate, time: data.time ?? selectedTime })
      setStep('confirmed')
    } catch {
      setFormError('Erreur réseau, veuillez réessayer.')
      setSubmitting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090B' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (step === 'not-found' || step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#09090B' }}>
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-xl font-bold text-white mb-2">Page introuvable</h1>
          <p className="text-gray-500 text-sm">{step === 'error' ? 'Une erreur est survenue. Réessayez plus tard.' : "Cette page de réservation n'existe pas ou plus."}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen" style={{ background: '#09090B' }}>
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10" style={{ background: 'linear-gradient(90deg, transparent 5%, #10B981 35%, #34D399 65%, transparent 95%)' }} />

      <div className="max-w-lg mx-auto px-4 py-10 sm:py-14">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl font-extrabold" style={{ background: 'rgba(16,185,129,0.12)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.25)' }}>
            {info?.businessName?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1.5">{info?.businessName}</h1>
          {info?.description && <p className="text-gray-500 text-sm leading-relaxed">{info.description}</p>}
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ── Calendar ─────────────────────────────────────────────────── */}
          {(step === 'calendar' || step === 'slots') && (
            <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl p-6" style={{ background: '#18181B', border: '1px solid #27272A' }}>
              <div className="flex items-center justify-between mb-5">
                <button onClick={() => setMonthOffset((o) => Math.max(0, o - 1))} disabled={monthOffset === 0} className="text-gray-500 disabled:opacity-30 px-2 py-1">←</button>
                <span className="text-sm font-bold text-white capitalize">{MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
                <button onClick={() => setMonthOffset((o) => Math.min(6, o + 1))} disabled={monthOffset === 6} className="text-gray-500 disabled:opacity-30 px-2 py-1">→</button>
              </div>

              <div className="grid grid-cols-7 gap-1.5 mb-2">
                {WEEK_SHORT.map((d) => <div key={d} className="text-center text-[10px] font-semibold text-gray-600">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {calendarCells.map((date, i) => {
                  if (!date) return <div key={i} />
                  const key = toDateKey(date)
                  const isPast = date < today
                  const isAvailable = !isPast && availableDates.has(key)
                  const isSelected = key === selectedDate
                  return (
                    <button
                      key={i}
                      disabled={!isAvailable || calendarLoading}
                      onClick={() => handlePickDate(date)}
                      className="aspect-square rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: isSelected ? '#10B981' : isAvailable ? 'rgba(16,185,129,0.1)' : 'transparent',
                        color: isSelected ? '#fff' : isAvailable ? '#6EE7B7' : '#3F3F46',
                        cursor: isAvailable ? 'pointer' : 'default',
                      }}
                    >
                      {date.getDate()}
                    </button>
                  )
                })}
              </div>

              {!calendarLoading && availableDates.size === 0 && (
                <p className="text-center text-gray-500 text-sm mt-5">Aucun créneau disponible ce mois-ci.</p>
              )}

              {/* ── Time slots for selected day ───────────────────────────── */}
              {step === 'slots' && selectedDate && (
                <div className="mt-6 pt-6" style={{ borderTop: '1px solid #27272A' }}>
                  <p className="text-sm font-semibold text-white mb-3 capitalize">{formatDateFR(selectedDate)}</p>
                  {slotsLoading ? (
                    <p className="text-gray-500 text-sm">Chargement des créneaux…</p>
                  ) : slots.length === 0 ? (
                    <p className="text-gray-500 text-sm">Plus aucun créneau libre ce jour-là.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slots.map((s) => (
                        <button
                          key={s}
                          onClick={() => { setSelectedTime(s); setStep('form') }}
                          className="px-2 py-2 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: '#09090B', border: '1px solid #27272A', color: '#A1A1AA' }}
                        >
                          {formatTimeFR(s)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Booking form ─────────────────────────────────────────────── */}
          {step === 'form' && selectedDate && selectedTime && (
            <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl p-6" style={{ background: '#18181B', border: '1px solid #27272A' }}>
              <button onClick={() => setStep('slots')} className="text-xs text-gray-500 hover:text-white mb-4 transition-colors">← Changer de créneau</button>

              <div className="rounded-xl p-3.5 mb-5" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <p className="text-sm font-bold capitalize" style={{ color: '#6EE7B7' }}>{formatDateFR(selectedDate)} à {formatTimeFR(selectedTime)}</p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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

                <button type="submit" disabled={submitting} className="mt-1 w-full py-3 rounded-xl text-sm font-bold transition-all" style={{ background: '#10B981', color: '#fff', opacity: submitting ? 0.6 : 1 }}>
                  {submitting ? 'Confirmation…' : 'Confirmer le rendez-vous'}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Confirmation ─────────────────────────────────────────────── */}
          {step === 'confirmed' && confirmedAt && (
            <motion.div key="confirmed" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl p-8 text-center" style={{ background: '#18181B', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center text-2xl" style={{ background: 'rgba(16,185,129,0.12)' }}>✓</div>
              <h2 className="text-xl font-extrabold text-white mb-2">Rendez-vous confirmé</h2>
              <p className="text-gray-400 text-sm mb-1">Votre RDV avec <strong className="text-white">{info?.businessName}</strong> est confirmé le</p>
              <p className="text-base font-bold capitalize mb-4" style={{ color: '#6EE7B7' }}>{formatDateFR(confirmedAt.date)} à {formatTimeFR(confirmedAt.time)}</p>
              <p className="text-gray-500 text-xs">Un email de confirmation a été envoyé à {clientEmail}.</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
