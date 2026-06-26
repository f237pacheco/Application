'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { slugify, SLUG_REGEX } from '@/lib/booking'

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] // Monday-first display order (DB stores JS getDay(): 0=Sun..6=Sat)
const WEEK_LABELS: Record<number, string> = { 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi', 0: 'Dimanche' }
const WEEK_SHORT: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 0: 'Dim' }

const DURATIONS = [15, 30, 45, 60]
const BUFFERS = [0, 5, 10, 15]
const ADVANCE_OPTIONS = [7, 14, 30, 60, 90]

const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

type Range = { start: string; end: string; enabled: boolean }
type DayState = { dayActive: boolean; morning: Range; afternoon: Range }
type SlugStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'current'

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

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="rounded-2xl p-6 sm:p-7 mb-6" style={{ background: '#18181B', border: '1px solid #27272A' }}>
      <h2 className="text-lg font-bold text-white mb-1">{title}</h2>
      {subtitle && <p className="text-gray-500 text-sm mb-5">{subtitle}</p>}
      {children}
    </motion.div>
  )
}

function SlugBadge({ status }: { status: SlugStatus }) {
  const map: Record<SlugStatus, { label: string; color: string; bg: string } | null> = {
    idle: null,
    invalid: { label: 'Format invalide (lettres, chiffres, tirets)', color: '#FCA5A5', bg: 'rgba(239,68,68,0.1)' },
    checking: { label: 'Vérification…', color: '#A1A1AA', bg: '#27272A' },
    available: { label: '✓ Disponible', color: '#6EE7B7', bg: 'rgba(16,185,129,0.12)' },
    taken: { label: 'Déjà pris', color: '#FCA5A5', bg: 'rgba(239,68,68,0.1)' },
    current: { label: '✓ Votre lien actuel', color: '#6EE7B7', bg: 'rgba(16,185,129,0.12)' },
  }
  const cfg = map[status]
  if (!cfg) return null
  return <span className="text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
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
  const [slotDuration, setSlotDuration] = useState(30)
  const [bufferTime, setBufferTime] = useState(5)
  const [advanceDays, setAdvanceDays] = useState(30)

  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [copied, setCopied] = useState(false)

  const [week, setWeek] = useState<Record<number, DayState>>(defaultWeek())
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
        const data = await res.json() as { available: boolean }
        setSlugStatus(data.available ? 'available' : 'taken')
      } catch {
        setSlugStatus('idle')
      }
    }, 500)
    return () => clearTimeout(handle)
  }, [slug, savedSlug, loaded])

  // ── Autosave settings (name, slug, description, duration, buffer, advance) ─
  useEffect(() => {
    if (!loaded || !user?.id) return
    const canSaveSlug = slugStatus === 'available' || slugStatus === 'current'
    if (businessName.trim().length === 0 || !canSaveSlug) return

    setSaveState('saving')
    const handle = setTimeout(async () => {
      const supabase = createClient()
      const { error } = await supabase.from('booking_settings').upsert(
        {
          user_id: user.id,
          business_name: businessName.trim(),
          slug,
          description: description.trim() || null,
          slot_duration: slotDuration,
          buffer_time: bufferTime,
          advance_booking_days: advanceDays,
        },
        { onConflict: 'user_id' }
      )
      if (!error) {
        setSavedSlug(slug)
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 1800)
      } else {
        setSaveState('idle')
      }
    }, 600)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessName, slug, description, slotDuration, bufferTime, advanceDays, loaded, user?.id, slugStatus])

  // ── Persist one day's availability ranges ──────────────────────────────────
  const persistDay = useCallback((dayOfWeek: number, day: DayState) => {
    if (!user?.id) return
    clearTimeout(dayDebounce.current[dayOfWeek])
    dayDebounce.current[dayOfWeek] = setTimeout(async () => {
      const supabase = createClient()
      await supabase.from('availability').delete().eq('user_id', user.id).eq('day_of_week', dayOfWeek)
      const rows: { user_id: string; day_of_week: number; start_time: string; end_time: string; is_active: boolean }[] = []
      if (day.dayActive) {
        if (day.morning.enabled && day.morning.start < day.morning.end) {
          rows.push({ user_id: user.id, day_of_week: dayOfWeek, start_time: day.morning.start, end_time: day.morning.end, is_active: true })
        }
        if (day.afternoon.enabled && day.afternoon.start < day.afternoon.end) {
          rows.push({ user_id: user.id, day_of_week: dayOfWeek, start_time: day.afternoon.start, end_time: day.afternoon.end, is_active: true })
        }
      }
      if (rows.length > 0) await supabase.from('availability').insert(rows)
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

  // ── Blocked dates calendar (current + next month) ──────────────────────────
  const calendarMonth = useMemo(() => {
    const base = new Date()
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
    if (isBlocked) {
      await supabase.from('blocked_dates').delete().eq('user_id', user.id).eq('date', key)
    } else {
      await supabase.from('blocked_dates').insert({ user_id: user.id, date: key })
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

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])

  return (
    <div className="relative min-h-screen" style={{ background: '#09090B' }}>
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10" style={{ background: 'linear-gradient(90deg, transparent 5%, #10B981 35%, #34D399 65%, transparent 95%)' }} />

      <div className="max-w-4xl mx-auto px-4 py-10">

        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="mb-8 flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-150">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Retour aux services
          </Link>
          <Link href="/dashboard/services/booking/appointments" className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-xl transition-colors" style={{ background: 'rgba(16,185,129,0.1)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.25)' }}>
            📋 Voir mes RDV →
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-extrabold text-white mb-2">Configurez votre agenda</h1>
          <p className="text-gray-500 text-sm">Renseignez vos informations et vos disponibilités — vos clients pourront réserver immédiatement.</p>
        </motion.div>

        {/* ── Public link ──────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: savedSlug ? 'rgba(16,185,129,0.06)' : '#18181B', border: savedSlug ? '1px solid rgba(16,185,129,0.25)' : '1px solid #27272A' }}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500 mb-1">Votre lien de réservation public</p>
            <p className="text-sm font-mono truncate" style={{ color: savedSlug ? '#6EE7B7' : '#52525B' }}>{publicUrl}</p>
          </div>
          <button
            disabled={!savedSlug}
            onClick={handleCopyLink}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: savedSlug ? '#10B981' : '#27272A', color: savedSlug ? '#fff' : '#52525B', cursor: savedSlug ? 'pointer' : 'not-allowed' }}
          >
            {copied ? '✓ Copié' : '🔗 Copier le lien'}
          </button>
        </motion.div>

        {/* ── Business info ────────────────────────────────────────────────── */}
        <SectionCard title="Informations" subtitle="Le nom et la description visibles par vos clients sur la page de réservation.">
          <div className="flex flex-col gap-4">
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

            <div className="flex items-center gap-2 text-xs h-4">
              {saveState === 'saving' && <span className="text-gray-500">Enregistrement…</span>}
              {saveState === 'saved' && <span style={{ color: '#6EE7B7' }}>✓ Enregistré</span>}
            </div>
          </div>
        </SectionCard>

        {/* ── Slot config ──────────────────────────────────────────────────── */}
        <SectionCard title="Réglages des créneaux" subtitle="Durée de chaque rendez-vous, battement entre deux RDV, et fenêtre de réservation.">
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

        {/* ── Weekly availability ──────────────────────────────────────────── */}
        <SectionCard title="Disponibilités hebdomadaires" subtitle="Activez les jours ouverts et définissez vos plages horaires (matin / après-midi).">
          <div className="flex flex-col gap-2.5">
            {WEEK_ORDER.map((dayKey) => {
              const day = week[dayKey]
              return (
                <div key={dayKey} className="rounded-xl p-3.5" style={{ background: '#09090B', border: '1px solid #27272A' }}>
                  <div className="flex items-center gap-3 mb-2.5">
                    <Toggle on={day.dayActive} onToggle={() => updateDay(dayKey, { dayActive: !day.dayActive })} />
                    <span className="text-sm font-semibold w-24 shrink-0" style={{ color: day.dayActive ? '#FAFAFA' : '#52525B' }}>{WEEK_LABELS[dayKey]}</span>

                    {day.dayActive && (
                      <div className="flex flex-wrap items-center gap-3 flex-1">
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
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>

        {/* ── Blocked dates ────────────────────────────────────────────────── */}
        <SectionCard title="Jours bloqués" subtitle="Cliquez sur une date pour la bloquer (congés, indisponibilité ponctuelle).">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalendarMonthOffset((o) => Math.max(0, o - 1))} disabled={calendarMonthOffset === 0} className="text-gray-500 disabled:opacity-30 px-2 py-1">←</button>
            <span className="text-sm font-bold text-white capitalize">{MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
            <button onClick={() => setCalendarMonthOffset((o) => Math.min(2, o + 1))} disabled={calendarMonthOffset === 2} className="text-gray-500 disabled:opacity-30 px-2 py-1">→</button>
          </div>
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {WEEK_ORDER.map((d) => <div key={d} className="text-center text-[10px] font-semibold text-gray-600">{WEEK_SHORT[d]}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((date, i) => {
              if (!date) return <div key={i} />
              const key = toDateKey(date)
              const isPast = date < today
              const isBlocked = blockedDates.has(key)
              return (
                <button
                  key={i}
                  disabled={isPast}
                  onClick={() => toggleBlockedDate(date)}
                  className="aspect-square rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: isBlocked ? 'rgba(239,68,68,0.15)' : isPast ? 'transparent' : 'rgba(16,185,129,0.05)',
                    color: isPast ? '#3F3F46' : isBlocked ? '#FCA5A5' : '#A1A1AA',
                    border: isBlocked ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
                    cursor: isPast ? 'default' : 'pointer',
                  }}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
          {blockedDates.size > 0 && (
            <p className="text-xs text-gray-500 mt-4">{blockedDates.size} jour{blockedDates.size > 1 ? 's' : ''} bloqué{blockedDates.size > 1 ? 's' : ''}.</p>
          )}
        </SectionCard>

      </div>
    </div>
  )
}
