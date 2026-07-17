'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { formatDateFR, formatHourFR, getParisNow, toDateKey } from '@/lib/booking'

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

const STATUS_BADGE: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  confirmed: { label: 'Confirmé', color: '#6EE7B7', bg: 'rgba(16,185,129,0.12)', border: '#10B981' },
  cancelled: { label: 'Annulé', color: '#FCA5A5', bg: 'rgba(239,68,68,0.1)', border: '#EF4444' },
  completed: { label: 'Terminé', color: '#A1A1AA', bg: '#27272A', border: '#52525B' },
}

// Deterministic pastel-on-dark color per client, purely decorative (avatar background).
const AVATAR_PALETTE = [
  { bg: 'rgba(16,185,129,0.16)', color: '#6EE7B7' },
  { bg: 'rgba(59,130,246,0.16)', color: '#93C5FD' },
  { bg: 'rgba(168,85,247,0.16)', color: '#D8B4FE' },
  { bg: 'rgba(236,72,153,0.16)', color: '#F9A8D4' },
  { bg: 'rgba(245,158,11,0.16)', color: '#FCD34D' },
  { bg: 'rgba(20,184,166,0.16)', color: '#5EEAD4' },
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
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const [justUpdated, setJustUpdated] = useState(false)

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

  const handleCancel = async (id: string) => {
    setCancellingId(id)
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id }),
      })
      if (res.ok) {
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)))
      }
    } finally {
      setCancellingId(null)
      setConfirmCancelId(null)
    }
  }

  const counts = useMemo(() => ({
    upcoming: bookings.filter((b) => b.booking_date >= today && b.status !== 'cancelled').length,
    past: bookings.filter((b) => b.booking_date < today && b.status !== 'cancelled').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    all: bookings.length,
  }), [bookings, today])

  return (
    <div className="relative min-h-screen" style={{ background: '#09090B' }}>
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10" style={{ background: 'linear-gradient(90deg, transparent 5%, #10B981 35%, #34D399 65%, transparent 95%)' }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none" style={{ background: 'radial-gradient(ellipse at top, rgba(16,185,129,0.08), transparent 70%)' }} />

      <div className="relative max-w-4xl mx-auto px-4 py-10">

        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="mb-6">
          <Link href="/dashboard/services/booking" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-150">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Retour aux réglages
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-7 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-1 flex items-center gap-2.5">
              Vos rendez-vous
              <AnimatePresence>
                {justUpdated && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-[11px] font-semibold px-2 py-1 rounded-full"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7' }}
                  >
                    ● Mis à jour
                  </motion.span>
                )}
              </AnimatePresence>
            </h1>
            <p className="text-gray-500 text-sm">Suivez et gérez les réservations de vos clients — mis à jour en direct.</p>
          </div>
          <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: '#18181B', border: '1px solid #27272A' }}>
            {(['list', 'calendar'] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setView(v)} className="relative px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ color: view === v ? '#fff' : '#71717A' }}>
                {view === v && <motion.div layoutId="view-pill" className="absolute inset-0 rounded-lg" style={{ background: '#10B981' }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                <span className="relative">{v === 'list' ? '📋 Liste' : '📅 Calendrier'}</span>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex flex-wrap items-center gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="relative px-3.5 py-1.5 rounded-full text-xs font-semibold"
              style={{ color: filter === f.key ? '#fff' : '#A1A1AA', border: filter === f.key ? 'none' : '1px solid #27272A' }}
            >
              {filter === f.key && <motion.div layoutId="filter-pill" className="absolute inset-0 rounded-full" style={{ background: '#10B981' }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
              <span className="relative">{f.label} <span style={{ opacity: 0.7 }}>({counts[f.key]})</span></span>
            </button>
          ))}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client…"
            className="ml-auto px-3.5 py-1.5 rounded-full text-xs text-white placeholder-gray-600 outline-none w-full sm:w-56 transition-shadow"
            style={{ background: '#18181B', border: '1px solid #27272A' }}
          />
        </motion.div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div key={i} className="h-16 rounded-xl" style={{ background: '#18181B', border: '1px solid #27272A' }} animate={{ opacity: [0.5, 0.9, 0.5] }} transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.1 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl p-12 text-center" style={{ background: '#18181B', border: '1px solid #27272A' }}>
            <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 }} className="text-4xl mb-3">📭</motion.p>
            <p className="text-gray-400 text-sm font-medium mb-1">Aucun rendez-vous dans cette catégorie</p>
            <p className="text-gray-600 text-xs">{filter === 'upcoming' ? 'Vos prochaines réservations apparaîtront ici.' : 'Changez de filtre pour voir d\'autres rendez-vous.'}</p>
          </motion.div>
        ) : view === 'list' ? (
          <div className="flex flex-col gap-6">
            {grouped.map(([date, items], groupIdx) => (
              <motion.div key={date} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(groupIdx * 0.05, 0.3) }}>
                <p className="text-xs font-bold mb-2.5 capitalize flex items-center gap-2" style={{ color: '#6EE7B7' }}>
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
                          whileHover={{ borderColor: '#3F3F46' }}
                          className="rounded-xl p-4 flex items-center gap-3.5 flex-wrap"
                          style={{ background: '#18181B', border: '1px solid #27272A', borderLeft: `3px solid ${badge.border}` }}
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0" style={{ background: avatar.bg, color: avatar.color }}>
                            {b.client_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-sm font-bold text-white w-16 shrink-0">{formatHourFR(b.booking_time)}</div>
                          <div className="flex-1 min-w-[160px]">
                            <p className="text-sm font-semibold text-white">{b.client_name}</p>
                            <p className="text-xs text-gray-500">{b.client_email}{b.client_phone ? ` · ${b.client_phone}` : ''}</p>
                            {b.service_note && <p className="text-xs text-gray-600 mt-0.5 italic">&ldquo;{b.service_note}&rdquo;</p>}
                          </div>
                          <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>
                          {b.status === 'confirmed' && (
                            <AnimatePresence mode="wait">
                              {confirmCancelId === b.id ? (
                                <motion.div key="confirm" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Confirmer ?</span>
                                  <button onClick={() => handleCancel(b.id)} disabled={cancellingId === b.id} className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: '#EF4444', color: '#fff' }}>
                                    {cancellingId === b.id ? '…' : 'Oui'}
                                  </button>
                                  <button onClick={() => setConfirmCancelId(null)} className="text-xs px-2 py-1 rounded-lg text-gray-500">Non</button>
                                </motion.div>
                              ) : (
                                <motion.button key="cancel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmCancelId(b.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors" style={{ background: 'rgba(239,68,68,0.08)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
                                  Annuler
                                </motion.button>
                              )}
                            </AnimatePresence>
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
    </div>
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl p-6" style={{ background: '#18181B', border: '1px solid #27272A' }}>
      <div className="flex items-center justify-between mb-5">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMonthOffset((o) => o - 1)} className="w-7 h-7 rounded-lg text-gray-500" style={{ border: '1px solid #27272A' }}>←</motion.button>
        <span className="text-sm font-bold text-white capitalize">{MONTH_NAMES[month.getMonth()]} {month.getFullYear()}</span>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMonthOffset((o) => o + 1)} className="w-7 h-7 rounded-lg text-gray-500" style={{ border: '1px solid #27272A' }}>→</motion.button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {WEEK_SHORT.map((d) => <div key={d} className="text-center text-[10px] font-semibold text-gray-600">{d}</div>)}
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
                <span className="text-[10px] font-semibold" style={{ color: isSelected ? '#fff' : items.length > 0 ? '#6EE7B7' : '#52525B' }}>{Number(date.slice(-2))}</span>
                {items.length > 0 && <span className="text-[9px] font-bold mt-0.5" style={{ color: isSelected ? '#fff' : '#34D399' }}>{items.length}</span>}
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
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid #27272A' }}>
              <p className="text-xs font-semibold text-white mb-3 capitalize">{formatDateFR(selectedDate)}</p>
              <div className="flex flex-col gap-2">
                {selectedItems.map((b) => {
                  const badge = STATUS_BADGE[b.status]
                  return (
                    <div key={b.id} className="flex items-center gap-3 text-xs rounded-lg p-2.5" style={{ background: '#09090B', border: '1px solid #27272A' }}>
                      <span className="font-bold text-white w-14 shrink-0">{formatHourFR(b.booking_time)}</span>
                      <span className="flex-1 text-gray-300 truncate">{b.client_name}</span>
                      <span className="font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>
                    </div>
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
