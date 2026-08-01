'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { formatDateFR, formatHourFR, getParisNow, toDateKey } from '@/lib/booking'
import { getAvailableSlotsForDate } from '@/lib/availability'
import {
  CalendarIcon, ListIcon, GridIcon, SearchIcon, TrendingUpIcon, UsersIcon, ClockIcon,
  ChevronLeftIcon, ChevronRightIcon, PhoneIcon, MailIcon, SparklesIcon, ArrowLeftIcon,
  CheckCircleIcon, RefreshIcon, AlertCircleIcon, TrashIcon,
} from '@/components/booking/icons'
import { EmptyInboxIllustration } from '@/components/booking/illustrations'
import { MeshBackground, GradientIconBadge, AnimatedCounter, Toast } from '@/components/booking/decorative'
import { EMERALD, BLUE, AMBER, MUTED, SHADOW_SOFT, CARD, BORDER, INK, SECTION_BG, SHADOW_MODAL } from '@/components/booking/theme'

type Status = 'confirmed' | 'cancelled' | 'completed'
type Booking = {
  id: string
  client_name: string
  client_email: string
  client_phone: string | null
  service_note: string | null
  booking_date: string
  booking_time: string
  status: Status
}

type FilterKey = 'upcoming' | 'past' | 'cancelled' | 'all'
type ViewMode = 'list' | 'calendar'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'upcoming', label: 'À venir' },
  { key: 'past', label: 'Passés' },
  { key: 'cancelled', label: 'Annulés' },
  { key: 'all', label: 'Tous' },
]

// Functional status colors — green/red/gray carry real semantic meaning.
const STATUS_BADGE: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  confirmed: { label: 'Confirmé', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: '#10B981' },
  cancelled: { label: 'Annulé', color: '#F87171', bg: 'rgba(239,68,68,0.1)', border: '#EF4444' },
  completed: { label: 'Terminé', color: '#9CA3AF', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)' },
}

// Deterministic color per client, purely decorative (avatar background) —
// restricted to the four semantic accents so no stray brand color appears.
const AVATAR_PALETTE = [
  { bg: 'rgba(16,185,129,0.14)', color: '#10B981' },
  { bg: 'rgba(59,130,246,0.14)', color: '#3B82F6' },
  { bg: 'rgba(245,158,11,0.14)', color: '#F59E0B' },
  { bg: 'rgba(239,68,68,0.14)', color: '#F87171' },
]
function avatarStyle(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

// Single sortable key so chronological order can never drift between the
// grouping pass and the render pass — verified against a range of dates/times.
function sortKey(b: Booking): string {
  return `${b.booking_date}T${b.booking_time}`
}

export default function AppointmentsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState<FilterKey>('upcoming')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>('list')
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null)
  const [justUpdated, setJustUpdated] = useState(false)
  const [fillRate, setFillRate] = useState<number | null>(null)
  const [slug, setSlug] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [toastTone, setToastTone] = useState<'success' | 'info' | 'error'>('success')

  const showToast = useCallback((message: string, tone: 'success' | 'info' | 'error' = 'success') => {
    setToast(message)
    setToastTone(tone)
    setTimeout(() => setToast(''), 2500)
  }, [])

  const loadBookings = useCallback(async () => {
    if (!user?.id) return
    const supabase = createClient()
    const { data } = await supabase
      .from('bookings')
      .select('id, client_name, client_email, client_phone, service_note, booking_date, booking_time, status')
      .eq('user_id', user.id)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true })
    setBookings((data ?? []) as Booking[])
    setLoading(false)
  }, [user?.id])

  useEffect(() => { loadBookings() }, [loadBookings])

  // ── Realtime: new/updated/cancelled bookings appear without a manual refresh ─
  useEffect(() => {
    if (!user?.id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`bookings-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` },
        () => {
          loadBookings()
          setJustUpdated(true)
          setTimeout(() => setJustUpdated(false), 2000)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, loadBookings])

  // Europe/Paris wall-clock date, regardless of the pro's device timezone —
  // the day changes at 00:00 Paris time, not local device time nor UTC.
  const today = useMemo(() => toDateKey(getParisNow()), [])

  // Fill rate for the next 7 days: (already-booked slots) / (already-booked +
  // still-free slots), reusing the exact same slot math as the public booking
  // page so this can never drift from what clients actually see as available.
  useEffect(() => {
    if (!user?.id || bookings.length === 0 && loading) return
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data: settings } = await supabase
        .from('booking_settings')
        .select('slug, slot_duration, buffer_time, advance_booking_days')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled || !settings) return
      setSlug(settings.slug ?? null)

      const days: string[] = []
      const base = getParisNow()
      for (let i = 0; i < 7; i++) {
        const d = new Date(base)
        d.setDate(d.getDate() + i)
        days.push(toDateKey(d))
      }

      let totalFree = 0
      let totalBooked = 0
      for (const day of days) {
        const free = await getAvailableSlotsForDate(supabase, user.id, day, settings.slot_duration, settings.buffer_time, settings.advance_booking_days)
        const booked = bookings.filter((b) => b.booking_date === day && b.status !== 'cancelled').length
        totalFree += free.length
        totalBooked += booked
      }
      if (!cancelled) {
        const capacity = totalFree + totalBooked
        setFillRate(capacity > 0 ? Math.round((totalBooked / capacity) * 100) : null)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id, bookings, loading])

  // Filter then sort the flat list ONCE on a single combined date+time key —
  // grouping below simply preserves that order, so the two can never disagree.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return bookings
      .filter((b) => {
        if (filter === 'upcoming' && (b.booking_date < today || b.status === 'cancelled')) return false
        if (filter === 'past' && !(b.booking_date < today && b.status !== 'cancelled')) return false
        if (filter === 'cancelled' && b.status !== 'cancelled') return false
        if (q && !b.client_name.toLowerCase().includes(q) && !b.client_email.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => {
        const ak = sortKey(a)
        const bk = sortKey(b)
        if (filter === 'past') return ak < bk ? 1 : ak > bk ? -1 : 0 // most recent past first
        return ak < bk ? -1 : ak > bk ? 1 : 0 // soonest first
      })
  }, [bookings, filter, search, today])

  const grouped = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const b of filtered) {
      const list = map.get(b.booking_date) ?? []
      list.push(b)
      map.set(b.booking_date, list)
    }
    // `filtered` is already correctly ordered, and Map preserves insertion
    // order, so the group order follows automatically — no re-sort here.
    return Array.from(map.entries())
  }, [filtered])

  const handleCancelConfirmed = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: cancelTarget.id }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (res.ok && json.success) {
        setBookings((prev) => prev.map((b) => (b.id === cancelTarget.id ? { ...b, status: 'cancelled' } : b)))
        showToast('Rendez-vous annulé — le client a été notifié par email.')
        setCancelTarget(null)
      } else {
        showToast(json.error ?? "Impossible d'annuler ce rendez-vous.", 'error')
      }
    } catch {
      showToast('Erreur réseau, veuillez réessayer.', 'error')
    } finally {
      setCancelling(false)
    }
  }

  const handleComplete = async (id: string) => {
    setCompletingId(id)
    try {
      const res = await fetch('/api/bookings/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (res.ok && json.success) {
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'completed' } : b)))
        showToast('Rendez-vous marqué comme terminé.')
      } else {
        showToast(json.error ?? 'Impossible de mettre à jour ce rendez-vous.', 'error')
      }
    } catch {
      showToast('Erreur réseau, veuillez réessayer.', 'error')
    } finally {
      setCompletingId(null)
    }
  }

  const handleRescheduled = (id: string, date: string, time: string) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, booking_date: date, booking_time: time } : b)))
    showToast('Rendez-vous reprogrammé — le client a été notifié par email.')
    setRescheduleTarget(null)
  }

  const counts = useMemo(() => ({
    upcoming: bookings.filter((b) => b.booking_date >= today && b.status !== 'cancelled').length,
    past: bookings.filter((b) => b.booking_date < today && b.status !== 'cancelled').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    all: bookings.length,
  }), [bookings, today])

  // Confirmed-booking count per day, last 7 days including today — the shared
  // dataset behind every stat card's sparkline.
  const dailyTrend = useMemo(() => {
    const base = getParisNow()
    const days: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base)
      d.setDate(d.getDate() - i)
      const key = toDateKey(d)
      days.push({ date: key, count: bookings.filter((b) => b.booking_date === key && b.status !== 'cancelled').length })
    }
    return days
  }, [bookings])

  const todayCount = bookings.filter((b) => b.booking_date === today && b.status !== 'cancelled').length
  const uniqueClientsCount = new Set(bookings.map((b) => b.client_email.toLowerCase())).size

  return (
    <div className="relative min-h-screen" style={{ background: '#0A0A0F' }}>
      <MeshBackground />

      <div className="relative max-w-7xl mx-auto px-4 py-10" style={{ zIndex: 1 }}>

        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="mb-6">
          <Link href="/dashboard/services/booking" className="inline-flex items-center gap-2 text-sm text-[#9CA3AF] hover:text-[#FAFAFA] transition-colors duration-150">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Retour aux réglages
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-7 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-[#FAFAFA] mb-1 flex items-center gap-2.5">
              Vos rendez-vous
              <AnimatePresence>
                {justUpdated && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1, boxShadow: ['0 0 0 0 rgba(16,185,129,0.4)', '0 0 0 6px rgba(16,185,129,0)'] }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ boxShadow: { duration: 1, repeat: Infinity } }}
                    className="text-[11px] font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1.5"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
                    Mis à jour
                  </motion.span>
                )}
              </AnimatePresence>
            </h1>
            <p className="text-[#9CA3AF] text-sm">Suivez et gérez les réservations de vos clients — mis à jour en direct.</p>
          </div>
          <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}>
            {(['list', 'calendar'] as ViewMode[]).map((v) => (
              <motion.button key={v} onClick={() => setView(v)} whileHover={view !== v ? { color: '#FAFAFA' } : undefined} whileTap={{ scale: 0.95 }} className="relative px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ color: view === v ? '#fff' : '#9CA3AF' }}>
                {view === v && <motion.div layoutId="view-pill" className="absolute inset-0 rounded-lg" style={{ background: '#10B981' }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                <span className="relative inline-flex items-center gap-1.5">{v === 'list' ? <ListIcon size={13} /> : <GridIcon size={13} />}{v === 'list' ? 'Liste' : 'Calendrier'}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<CalendarIcon size={16} />} label="Rendez-vous aujourd'hui" value={todayCount} sparkline={dailyTrend.map((d) => d.count)} accent={EMERALD} delay={0} />
          <StatCard icon={<ClockIcon size={16} />} label="Cette semaine (à venir)" value={counts.upcoming} sparkline={dailyTrend.map((d) => d.count)} accent={BLUE} delay={0.05} />
          <StatCard icon={<TrendingUpIcon size={16} />} label="Taux de remplissage (7j)" value={fillRate} suffix="%" accent={AMBER} delay={0.1} />
          <StatCard icon={<UsersIcon size={16} />} label="Clients uniques" value={uniqueClientsCount} accent={MUTED} delay={0.15} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="min-w-0">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex flex-wrap items-center gap-2 mb-6">
          {FILTERS.map((f) => (
            <motion.button
              key={f.key}
              onClick={() => setFilter(f.key)}
              whileHover={filter !== f.key ? { borderColor: 'rgba(255,255,255,0.18)', color: '#FAFAFA' } : undefined}
              whileTap={{ scale: 0.95 }}
              className="relative px-3.5 py-1.5 rounded-full text-xs font-semibold"
              style={{ color: filter === f.key ? '#fff' : '#9CA3AF', border: filter === f.key ? 'none' : '1px solid rgba(255,255,255,0.06)' }}
            >
              {filter === f.key && <motion.div layoutId="filter-pill" className="absolute inset-0 rounded-full" style={{ background: '#10B981' }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
              <span className="relative">{f.label} <span style={{ opacity: 0.7 }}>({counts[f.key]})</span></span>
            </motion.button>
          ))}
          <div className="relative ml-auto w-full sm:w-56">
            <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un client…"
              className="w-full pl-8 pr-3.5 py-1.5 rounded-full text-xs text-[#FAFAFA] placeholder-gray-600 outline-none focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] transition-shadow duration-150"
              style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}
            />
          </div>
        </motion.div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div key={i} className="h-16 rounded-xl" style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }} animate={{ opacity: [0.5, 0.9, 0.5] }} transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.1 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl p-12 text-center" style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 }} className="mx-auto mb-3 w-fit">
              <EmptyInboxIllustration size={80} />
            </motion.div>
            <p className="text-[#9CA3AF] text-sm font-medium mb-1">Aucun rendez-vous dans cette catégorie</p>
            <p className="text-[#6B7280] text-xs">
              {bookings.length === 0
                ? 'Partagez votre lien de réservation pour recevoir vos premiers rendez-vous.'
                : filter === 'upcoming' ? 'Vos prochaines réservations apparaîtront ici.' : 'Changez de filtre pour voir d\'autres rendez-vous.'}
            </p>
            {bookings.length === 0 && (
              <Link href="/dashboard/services/booking" className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold px-4 py-2 rounded-xl transition-all duration-150 hover:scale-105 hover:shadow-[0_6px_20px_rgba(16,185,129,0.25)]" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>
                <ArrowLeftIcon size={12} /> Aller chercher mon lien de réservation
              </Link>
            )}
          </motion.div>
        ) : view === 'list' ? (
          <div className="flex flex-col gap-6">
            {grouped.map(([date, items], groupIdx) => (
              <motion.div key={date} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(groupIdx * 0.05, 0.3) }}>
                <p className="text-xs font-bold mb-2.5 capitalize flex items-center gap-2" style={{ color: '#10B981' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
                  {formatDateFR(date)}
                </p>
                <div className="flex flex-col gap-2">
                  <AnimatePresence>
                    {items.map((b, idx) => {
                      const badge = STATUS_BADGE[b.status]
                      const avatar = avatarStyle(b.client_email || b.client_name)
                      return (
                        <motion.div
                          key={b.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.15) }}
                          whileHover={{ borderColor: 'rgba(255,255,255,0.12)', background: '#15151C', y: -1 }}
                          className="rounded-xl p-4 flex items-center gap-3.5 flex-wrap"
                          style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${badge.border}` }}
                        >
                          <motion.div whileHover={{ scale: 1.1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }} className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0" style={{ background: avatar.bg, color: avatar.color }}>
                            {b.client_name.charAt(0).toUpperCase()}
                          </motion.div>
                          <div className="text-sm font-bold text-[#FAFAFA] w-16 shrink-0">{formatHourFR(b.booking_time)}</div>
                          <div className="flex-1 min-w-[160px]">
                            <p className="text-sm font-semibold text-[#FAFAFA]">{b.client_name}</p>
                            <div className="flex items-center gap-3 flex-wrap">
                              <a href={`mailto:${b.client_email}`} onClick={(e) => e.stopPropagation()} className="text-xs text-[#9CA3AF] hover:text-[#FAFAFA] inline-flex items-center gap-1 transition-colors">
                                <MailIcon size={11} />{b.client_email}
                              </a>
                              {b.client_phone && (
                                <a href={`tel:${b.client_phone.replace(/\s+/g, '')}`} onClick={(e) => e.stopPropagation()} className="text-xs text-[#9CA3AF] hover:text-[#FAFAFA] inline-flex items-center gap-1 transition-colors">
                                  <PhoneIcon size={11} />{b.client_phone}
                                </a>
                              )}
                            </div>
                            {b.service_note && <p className="text-xs text-[#6B7280] mt-0.5 italic">&ldquo;{b.service_note}&rdquo;</p>}
                          </div>
                          <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>
                          {b.status === 'confirmed' && (
                            <div className="flex items-center gap-1.5">
                              <motion.button
                                whileHover={{ scale: 1.04, background: 'rgba(16,185,129,0.14)' }}
                                whileTap={{ scale: 0.95 }}
                                disabled={completingId === b.id}
                                onClick={() => handleComplete(b.id)}
                                title="Marquer comme terminé"
                                className="w-8 h-8 rounded-lg inline-flex items-center justify-center disabled:opacity-50"
                                style={{ background: 'rgba(16,185,129,0.08)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
                              >
                                {completingId === b.id ? (
                                  <motion.span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent inline-block" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }} />
                                ) : (
                                  <CheckCircleIcon size={14} />
                                )}
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.04, background: 'rgba(59,130,246,0.14)' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setRescheduleTarget(b)}
                                title="Reprogrammer"
                                className="w-8 h-8 rounded-lg inline-flex items-center justify-center"
                                style={{ background: 'rgba(59,130,246,0.08)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.2)' }}
                              >
                                <RefreshIcon size={13} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.04, background: 'rgba(239,68,68,0.14)' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setCancelTarget(b)}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                                style={{ background: 'rgba(239,68,68,0.08)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}
                              >
                                Annuler
                              </motion.button>
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <CalendarView bookings={filtered} />
        )}

        </div>

        <StatsSidebar bookings={bookings} today={today} />

        </div>

      </div>

      <CancelModal
        booking={cancelTarget}
        cancelling={cancelling}
        onClose={() => !cancelling && setCancelTarget(null)}
        onConfirm={handleCancelConfirmed}
      />

      {rescheduleTarget && slug && (
        <RescheduleModal
          booking={rescheduleTarget}
          slug={slug}
          onClose={() => setRescheduleTarget(null)}
          onSuccess={(date, time) => handleRescheduled(rescheduleTarget.id, date, time)}
        />
      )}

      <Toast message={toast} tone={toastTone} />
    </div>
  )
}

// ─── Modal shell ────────────────────────────────────────────────────────────────

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

// ─── Cancel confirmation modal ──────────────────────────────────────────────────

function CancelModal({ booking, cancelling, onClose, onConfirm }: {
  booking: Booking | null; cancelling: boolean; onClose: () => void; onConfirm: () => void
}) {
  return (
    <Modal
      open={!!booking}
      onClose={onClose}
      accentHeader={
        <div className="text-center">
          <div className="w-11 h-11 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171' }}><TrashIcon size={20} /></div>
          <p className="text-sm font-bold" style={{ color: INK }}>Annuler ce rendez-vous ?</p>
        </div>
      }
    >
      {booking && (
        <>
          <p className="text-sm text-center mb-5" style={{ color: '#9CA3AF' }}>
            Le rendez-vous de <strong style={{ color: INK }}>{booking.client_name}</strong> du <strong style={{ color: INK }}>{formatDateFR(booking.booking_date)} à {formatHourFR(booking.booking_time)}</strong> sera annulé et le créneau redeviendra disponible. Le client sera notifié par email.
          </p>
          <div className="flex gap-2">
            <button disabled={cancelling} onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ background: SECTION_BG, color: '#9CA3AF' }}>Retour</button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={cancelling}
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: '#EF4444', color: '#fff' }}
            >
              {cancelling && <motion.span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white inline-block" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }} />}
              {cancelling ? 'Annulation…' : 'Oui, annuler'}
            </motion.button>
          </div>
        </>
      )}
    </Modal>
  )
}

// ─── Reschedule modal — compact calendar + slot picker ──────────────────────────

function RescheduleModal({ booking, slug, onClose, onSuccess }: {
  booking: Booking; slug: string; onClose: () => void; onSuccess: (date: string, time: string) => void
}) {
  const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const WEEK_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  const [monthOffset, setMonthOffset] = useState(0)
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set())
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const month = useMemo(() => {
    const base = getParisNow()
    base.setDate(1)
    base.setMonth(base.getMonth() + monthOffset)
    return base
  }, [monthOffset])

  useEffect(() => {
    let cancelled = false
    setCalendarLoading(true)
    ;(async () => {
      try {
        const year = month.getFullYear()
        const m = month.getMonth() + 1
        const res = await fetch(`/api/bookings/calendar?slug=${encodeURIComponent(slug)}&year=${year}&month=${m}`)
        if (cancelled) return
        if (res.ok) {
          const json = await res.json() as { availableDates: string[] }
          setAvailableDates(new Set(json.availableDates))
        }
      } finally {
        if (!cancelled) setCalendarLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [slug, month])

  const cells = useMemo(() => {
    const year = month.getFullYear()
    const m = month.getMonth()
    const firstDay = new Date(year, m, 1)
    const daysInMonth = new Date(year, m + 1, 0).getDate()
    const offset = (firstDay.getDay() + 6) % 7
    const result: (Date | null)[] = Array(offset).fill(null)
    for (let d = 1; d <= daysInMonth; d++) result.push(new Date(year, m, d))
    return result
  }, [month])

  const today = useMemo(() => { const d = getParisNow(); d.setHours(0, 0, 0, 0); return d }, [])

  const handlePickDate = async (date: Date) => {
    const key = toDateKey(date)
    if (!availableDates.has(key)) return
    setSelectedDate(key)
    setSelectedTime(null)
    setSlots([])
    setSlotsLoading(true)
    try {
      const res = await fetch(`/api/bookings/availability?slug=${encodeURIComponent(slug)}&date=${key}`)
      const json = await res.json() as { slots?: string[] }
      setSlots(json.slots ?? [])
    } finally {
      setSlotsLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/bookings/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, date: selectedDate, time: selectedTime }),
      })
      const json = await res.json() as { success?: boolean; date?: string; time?: string; error?: string }
      if (!res.ok || !json.success) {
        setError(json.error ?? "Ce créneau n'est plus disponible.")
        setSubmitting(false)
        return
      }
      onSuccess(json.date ?? selectedDate, json.time ?? selectedTime)
    } catch {
      setError('Erreur réseau, veuillez réessayer.')
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      onClose={submitting ? undefined : onClose}
      accentHeader={
        <div>
          <p className="text-xs font-semibold mb-0.5" style={{ color: '#6B7280' }}>Reprogrammer</p>
          <p className="text-sm font-bold" style={{ color: INK }}>{booking.client_name} — actuellement le {formatDateFR(booking.booking_date)} à {formatHourFR(booking.booking_time)}</p>
        </div>
      }
    >
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMonthOffset((o) => Math.max(0, o - 1))} disabled={monthOffset === 0} className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30" style={{ color: '#9CA3AF', border: `1px solid ${BORDER}` }}><ChevronLeftIcon size={14} /></motion.button>
        <span className="text-sm font-bold capitalize" style={{ color: INK }}>{MONTH_NAMES[month.getMonth()]} {month.getFullYear()}</span>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMonthOffset((o) => Math.min(6, o + 1))} disabled={monthOffset === 6} className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30" style={{ color: '#9CA3AF', border: `1px solid ${BORDER}` }}><ChevronRightIcon size={14} /></motion.button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEK_SHORT.map((d) => <div key={d} className="text-center text-[9px] font-semibold" style={{ color: '#6B7280' }}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {calendarLoading ? (
          Array.from({ length: 35 }).map((_, i) => <div key={i} className="aspect-square rounded-md animate-pulse" style={{ background: SECTION_BG }} />)
        ) : (
          cells.map((date, i) => {
            if (!date) return <div key={i} />
            const key = toDateKey(date)
            const isPast = date < today
            const isAvailable = !isPast && availableDates.has(key)
            const isSelected = key === selectedDate
            return (
              <motion.button
                key={i}
                whileTap={isAvailable ? { scale: 0.9 } : undefined}
                whileHover={isAvailable ? { scale: 1.08 } : undefined}
                disabled={!isAvailable}
                onClick={() => handlePickDate(date)}
                className="aspect-square rounded-md text-[11px] font-semibold"
                style={{
                  background: isSelected ? '#10B981' : isAvailable ? 'rgba(16,185,129,0.08)' : 'transparent',
                  color: isSelected ? '#0A0A0F' : isAvailable ? '#10B981' : 'rgba(255,255,255,0.18)',
                }}
              >
                {date.getDate()}
              </motion.button>
            )
          })
        )}
      </div>

      <AnimatePresence>
        {selectedDate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <p className="text-xs font-bold mb-2 capitalize" style={{ color: INK }}>{formatDateFR(selectedDate)}</p>
            {slotsLoading ? (
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: SECTION_BG }} />)}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>Plus aucun créneau libre ce jour-là.</p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {slots.map((s) => (
                  <motion.button
                    key={s}
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ borderColor: '#10B981', background: 'rgba(16,185,129,0.1)', color: '#10B981' }}
                    onClick={() => setSelectedTime(s)}
                    className="px-1.5 py-2 rounded-lg text-xs font-semibold"
                    style={{
                      background: selectedTime === s ? '#10B981' : SECTION_BG,
                      color: selectedTime === s ? '#0A0A0F' : INK,
                      border: `1px solid ${selectedTime === s ? '#10B981' : BORDER}`,
                    }}
                  >
                    {formatHourFR(s)}
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-xs font-medium mt-2 mb-1 flex items-center gap-1.5" style={{ color: '#F87171' }}><AlertCircleIcon size={13} />{error}</p>}

      <div className="flex gap-2 mt-4">
        <button disabled={submitting} onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ background: SECTION_BG, color: '#9CA3AF' }}>Annuler</button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={submitting || !selectedDate || !selectedTime}
          onClick={handleConfirm}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: '#10B981', color: '#0A0A0F' }}
        >
          {submitting && <motion.span className="w-3.5 h-3.5 rounded-full border-2 border-black/30 border-t-black inline-block" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }} />}
          {submitting ? 'Confirmation…' : 'Confirmer'}
        </motion.button>
      </div>
    </Modal>
  )
}

// ─── Overview stat cards ────────────────────────────────────────────────────────

function Sparkline({ data, accent }: { data: number[]; accent: string }) {
  const max = Math.max(1, ...data)
  return (
    <div className="flex items-end gap-1 h-8">
      {data.map((v, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${Math.max(8, (v / max) * 100)}%` }}
          transition={{ duration: 0.4, delay: i * 0.03 }}
          className="flex-1 rounded-sm"
          style={{ background: i === data.length - 1 ? accent : `${accent}55` }}
        />
      ))}
    </div>
  )
}

function StatCard({ icon, label, value, suffix = '', sparkline, accent, delay = 0 }: {
  icon: React.ReactNode; label: string; value: number | null; suffix?: string; sparkline?: number[]; accent: string; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileHover={{ borderColor: `${accent}55`, y: -3, boxShadow: `0 10px 28px ${accent}22` }}
      className="rounded-2xl p-5"
      style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)', boxShadow: SHADOW_SOFT }}
    >
      <div className="flex items-center justify-between mb-3">
        <motion.div whileHover={{ scale: 1.1, rotate: -4 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
          <GradientIconBadge icon={icon} gradient={accent} size={32} radius={10} />
        </motion.div>
      </div>
      <p className="text-2xl font-extrabold text-[#FAFAFA] mb-0.5">
        {value === null ? '—' : <AnimatedCounter value={value} suffix={suffix} />}
      </p>
      <p className="text-xs text-[#9CA3AF] mb-3">{label}</p>
      {sparkline && <Sparkline data={sparkline} accent={accent} />}
    </motion.div>
  )
}

function CalendarView({ bookings }: { bookings: Booking[] }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const WEEK_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  const month = useMemo(() => {
    const base = getParisNow()
    base.setDate(1)
    base.setMonth(base.getMonth() + monthOffset)
    return base
  }, [monthOffset])

  const byDate = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const b of bookings) {
      const list = map.get(b.booking_date) ?? []
      list.push(b)
      map.set(b.booking_date, list)
    }
    return map
  }, [bookings])

  const cells = useMemo(() => {
    const year = month.getFullYear()
    const m = month.getMonth()
    const firstDay = new Date(year, m, 1)
    const daysInMonth = new Date(year, m + 1, 0).getDate()
    const offset = (firstDay.getDay() + 6) % 7
    const result: (string | null)[] = Array(offset).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      result.push(`${year}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`)
    }
    return result
  }, [month])

  const selectedItems = selectedDate ? (byDate.get(selectedDate) ?? []) : []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl p-6" style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-5">
        <motion.button whileHover={{ scale: 1.1, borderColor: 'rgba(255,255,255,0.18)', color: '#FAFAFA' }} whileTap={{ scale: 0.9 }} onClick={() => setMonthOffset((o) => o - 1)} className="w-7 h-7 rounded-lg text-[#9CA3AF] flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.06)' }}><ChevronLeftIcon size={14} /></motion.button>
        <motion.span key={monthOffset} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="text-sm font-bold text-[#FAFAFA] capitalize">{MONTH_NAMES[month.getMonth()]} {month.getFullYear()}</motion.span>
        <motion.button whileHover={{ scale: 1.1, borderColor: 'rgba(255,255,255,0.18)', color: '#FAFAFA' }} whileTap={{ scale: 0.9 }} onClick={() => setMonthOffset((o) => o + 1)} className="w-7 h-7 rounded-lg text-[#9CA3AF] flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.06)' }}><ChevronRightIcon size={14} /></motion.button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {WEEK_SHORT.map((d) => <div key={d} className="text-center text-[10px] font-semibold text-[#6B7280]">{d}</div>)}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={monthOffset} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="grid grid-cols-7 gap-1.5">
          {cells.map((date, i) => {
            if (!date) return <div key={i} />
            const items = byDate.get(date) ?? []
            const isSelected = date === selectedDate
            return (
              <motion.button
                key={i}
                onClick={() => setSelectedDate(items.length > 0 ? (isSelected ? null : date) : null)}
                whileHover={items.length > 0 ? { scale: 1.06 } : undefined}
                whileTap={items.length > 0 ? { scale: 0.94 } : undefined}
                className="aspect-square rounded-lg p-1 flex flex-col items-center justify-start"
                style={{
                  background: isSelected ? '#10B981' : items.length > 0 ? 'rgba(16,185,129,0.08)' : 'transparent',
                  border: isSelected ? '1px solid #10B981' : items.length > 0 ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                  cursor: items.length > 0 ? 'pointer' : 'default',
                }}
              >
                <span className="text-[10px] font-semibold" style={{ color: isSelected ? '#fff' : items.length > 0 ? '#10B981' : '#6B7280' }}>{Number(date.slice(-2))}</span>
                {items.length > 0 && <span className="text-[9px] font-bold mt-0.5" style={{ color: isSelected ? '#fff' : '#10B981' }}>{items.length}</span>}
              </motion.button>
            )
          })}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {selectedDate && selectedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold text-[#FAFAFA] mb-3 capitalize">{formatDateFR(selectedDate)}</p>
              <div className="flex flex-col gap-2">
                {selectedItems.map((b, idx) => {
                  const badge = STATUS_BADGE[b.status]
                  return (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.04 }}
                      whileHover={{ borderColor: 'rgba(255,255,255,0.14)', background: '#15151C' }}
                      className="flex items-center gap-3 text-xs rounded-lg p-2.5"
                      style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <span className="font-bold text-[#FAFAFA] w-14 shrink-0">{formatHourFR(b.booking_time)}</span>
                      <span className="flex-1 text-[#9CA3AF] truncate">{b.client_name}</span>
                      <span className="font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Sidebar: next appointment + quick stats ───────────────────────────────────

function StatsSidebar({ bookings, today }: { bookings: Booking[]; today: string }) {
  const active = useMemo(() => bookings.filter((b) => b.status !== 'cancelled'), [bookings])

  const next = useMemo(() => {
    return active
      .filter((b) => sortKey(b) >= `${today}T00:00:00`)
      .sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1))[0] ?? null
  }, [active, today])

  const nextAvatar = next ? avatarStyle(next.client_email || next.client_name) : null

  return (
    <div className="flex flex-col gap-5 lg:sticky lg:top-6">

      {/* ── Next appointment ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={next ? { borderColor: 'rgba(16,185,129,0.4)', y: -2, boxShadow: '0 10px 28px rgba(16,185,129,0.15)' } : undefined}
        transition={{ duration: 0.4 }}
        className="rounded-2xl p-5"
        style={{ background: next ? 'rgba(16,185,129,0.06)' : '#111117', border: next ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: '#10B981' }}>
          {next && (
            <span className="relative inline-flex w-1.5 h-1.5">
              <motion.span className="absolute inset-0 rounded-full" style={{ background: '#10B981' }} animate={{ scale: [1, 2.2], opacity: [0.7, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }} />
              <span className="relative w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
            </span>
          )}
          Prochain rendez-vous
        </p>
        {next && nextAvatar ? (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }} className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0" style={{ background: nextAvatar.bg, color: nextAvatar.color }}>
                {next.client_name.charAt(0).toUpperCase()}
              </motion.div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#FAFAFA] truncate">{next.client_name}</p>
                <p className="text-xs text-[#9CA3AF] truncate">{next.client_email}</p>
              </div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: '#111117', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold text-[#FAFAFA] capitalize">{formatDateFR(next.booking_date)}</p>
              <p className="text-lg font-extrabold mt-0.5" style={{ color: '#10B981' }}>{formatHourFR(next.booking_time)}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#9CA3AF]">Aucun rendez-vous à venir pour le moment.</p>
        )}
      </motion.div>


      {/* ── Tips ──────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="rounded-2xl p-5" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: '#10B981' }}><SparklesIcon size={14} /> Conseil</p>
        <p className="text-xs text-[#9CA3AF] leading-relaxed">Utilisez la recherche pour retrouver rapidement un client, ou la vue calendrier pour visualiser votre charge sur le mois.</p>
      </motion.div>
    </div>
  )
}
