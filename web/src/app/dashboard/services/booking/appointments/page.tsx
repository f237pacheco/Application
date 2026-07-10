'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { formatDateFR, formatTimeFR, toDateKey } from '@/lib/booking'

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
      .order('booking_date', { ascending: false })
      .order('booking_time', { ascending: false })
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

  const today = useMemo(() => toDateKey(new Date()), [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return bookings.filter((b) => {
      if (filter === 'upcoming' && (b.booking_date < today || b.status === 'cancelled')) return false
      if (filter === 'past' && !(b.booking_date < today && b.status !== 'cancelled')) return false
      if (filter === 'cancelled' && b.status !== 'cancelled') return false
      if (q && !b.client_name.toLowerCase().includes(q) && !b.client_email.toLowerCase().includes(q)) return false
      return true
    })
  }, [bookings, filter, search, today])

  const grouped = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const b of filtered) {
      const list = map.get(b.booking_date) ?? []
      list.push(b)
      map.set(b.booking_date, list)
    }
    return Array.from(map.entries()).sort((a, b) =>
      filter === 'past' ? (a[0] < b[0] ? 1 : -1) : (a[0] < b[0] ? -1 : 1)
    )
  }, [filtered, filter])

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

      <div className="max-w-4xl mx-auto px-4 py-10">

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

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-2 mb-6">
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
            className="ml-auto px-3.5 py-1.5 rounded-full text-xs text-white placeholder-gray-600 outline-none w-full sm:w-56"
            style={{ background: '#18181B', border: '1px solid #27272A' }}
          />
        </motion.div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: '#18181B', border: '1px solid #27272A' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl p-10 text-center" style={{ background: '#18181B', border: '1px solid #27272A' }}>
            <p className="text-3xl mb-3">📭</p>
            <p className="text-gray-500 text-sm">Aucun rendez-vous dans cette catégorie.</p>
          </motion.div>
        ) : view === 'list' ? (
          <div className="flex flex-col gap-5">
            {grouped.map(([date, items]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-gray-500 mb-2 capitalize">{formatDateFR(date)}</p>
                <div className="flex flex-col gap-2">
                  <AnimatePresence>
                    {items.sort((a, b) => a.booking_time.localeCompare(b.booking_time)).map((b) => {
                      const badge = STATUS_BADGE[b.status]
                      return (
                        <motion.div
                          key={b.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="rounded-xl p-4 flex items-center gap-4 flex-wrap"
                          style={{ background: '#18181B', border: '1px solid #27272A', borderLeft: `3px solid ${badge.border}` }}
                        >
                          <div className="text-sm font-bold text-white w-14 shrink-0">{formatTimeFR(b.booking_time)}</div>
                          <div className="flex-1 min-w-[160px]">
                            <p className="text-sm font-semibold text-white">{b.client_name}</p>
                            <p className="text-xs text-gray-500">{b.client_email}{b.client_phone ? ` · ${b.client_phone}` : ''}</p>
                            {b.service_note && <p className="text-xs text-gray-600 mt-0.5 italic">&ldquo;{b.service_note}&rdquo;</p>}
                          </div>
                          <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>
                          {b.status === 'confirmed' && (
                            confirmCancelId === b.id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Confirmer ?</span>
                                <button onClick={() => handleCancel(b.id)} disabled={cancellingId === b.id} className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: '#EF4444', color: '#fff' }}>
                                  {cancellingId === b.id ? '…' : 'Oui'}
                                </button>
                                <button onClick={() => setConfirmCancelId(null)} className="text-xs px-2 py-1 rounded-lg text-gray-500">Non</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmCancelId(b.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors" style={{ background: 'rgba(239,68,68,0.08)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
                                Annuler
                              </button>
                            )
                          )}
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </div>
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
  const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const WEEK_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  const month = useMemo(() => {
    const base = new Date()
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
            return (
              <motion.div
                key={i}
                whileHover={items.length > 0 ? { scale: 1.05 } : undefined}
                className="aspect-square rounded-lg p-1 flex flex-col items-center justify-start"
                style={{ background: items.length > 0 ? 'rgba(16,185,129,0.08)' : 'transparent', border: items.length > 0 ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent' }}
              >
                <span className="text-[10px] font-semibold" style={{ color: items.length > 0 ? '#6EE7B7' : '#52525B' }}>{Number(date.slice(-2))}</span>
                {items.length > 0 && <span className="text-[9px] font-bold mt-0.5" style={{ color: '#34D399' }}>{items.length}</span>}
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
