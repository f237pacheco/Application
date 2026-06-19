'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const ACCENT = '#6366F1'
const ACCENT_LIGHT = '#818CF8'
const ACCENT_DARK = '#4F46E5'

// ─── Tooltip helper ─────────────────────────────────────────────────────────────

function tooltipRenderer(unit = '') {
  return ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#09090B', border: `1px solid ${ACCENT}`, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        {label !== undefined && <p className="text-gray-500 mb-1">{label}</p>}
        {payload.map((p: any, i: number) => (
          <p key={i} className="font-semibold" style={{ color: p.color || p.fill || ACCENT_LIGHT }}>
            {p.name}: {Number(p.value).toLocaleString('fr-FR')}{unit}
          </p>
        ))}
      </div>
    )
  }
}

// ─── Period data ────────────────────────────────────────────────────────────────

type PeriodKey = '7j' | '30j' | '3m' | '12m'
interface ChartPoint { label: string; current: number; previous: number }

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '7j', label: '7 jours' },
  { key: '30j', label: '30 jours' },
  { key: '3m', label: '3 mois' },
  { key: '12m', label: '12 mois' },
]

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

function buildSeries(n: number, base: number, growth: number, label: (i: number) => string): ChartPoint[] {
  return Array.from({ length: n }, (_, i) => {
    const wig = Math.sin(i * 1.7) * 0.12 + Math.sin(i * 0.5) * 0.06
    const current = Math.round(base * (1 + (growth * i) / n) * (1 + wig))
    const previous = Math.round(current * (0.8 + Math.cos(i * 0.9) * 0.05))
    return { label: label(i), current, previous }
  })
}

const DATA_BY_PERIOD: Record<PeriodKey, ChartPoint[]> = {
  '7j': buildSeries(7, 11000, 0.25, (i) => WEEKDAY_LABELS[i]),
  '30j': buildSeries(10, 9500, 0.4, (i) => `J${(i + 1) * 3}`),
  '3m': buildSeries(12, 9000, 0.55, (i) => `S${i + 1}`),
  '12m': buildSeries(12, 8000, 0.9, (i) => MONTH_LABELS[i]),
}

// ─── KPIs ───────────────────────────────────────────────────────────────────────

interface Kpi { icon: string; label: string; value: number; decimals: number; unit: string; delta: number; color: string; spark: number[] }

const KPIS: Kpi[] = [
  { icon: '💰', label: 'Chiffre d\'affaires', value: 84320, decimals: 0, unit: ' €', delta: 12.4, color: ACCENT, spark: [40, 55, 48, 62, 58, 74, 69, 85] },
  { icon: '👥', label: 'Nouveaux clients', value: 312, decimals: 0, unit: '', delta: 8.1, color: ACCENT_LIGHT, spark: [22, 28, 25, 33, 30, 38, 35, 42] },
  { icon: '📈', label: 'Taux de conversion', value: 4.8, decimals: 1, unit: ' %', delta: -0.3, color: '#A5B4FC', spark: [52, 50, 53, 49, 51, 48, 50, 47] },
  { icon: '🛒', label: 'Panier moyen', value: 270, decimals: 0, unit: ' €', delta: 5.6, color: ACCENT_DARK, spark: [60, 63, 61, 68, 65, 70, 69, 75] },
]

// ─── Secondary chart data ───────────────────────────────────────────────────────

const REVENUE_BY_SOURCE = [
  { name: 'Site web', value: 32400, fill: ACCENT },
  { name: 'Réseaux sociaux', value: 18900, fill: ACCENT_LIGHT },
  { name: 'Rendez-vous', value: 21200, fill: ACCENT_DARK },
  { name: 'Vidéo', value: 11820, fill: '#A5B4FC' },
]

const SALES_BY_CATEGORY = [
  { name: 'Abonnements', value: 48, fill: ACCENT },
  { name: 'Services ponctuels', value: 27, fill: ACCENT_LIGHT },
  { name: 'Add-ons', value: 16, fill: ACCENT_DARK },
  { name: 'Autres', value: 9, fill: '#312E81' },
]

const CLIENTS_TREND = MONTH_LABELS.map((m, i) => ({ label: m, value: Math.round(180 + i * 14 + Math.sin(i * 1.1) * 10) }))

const GOAL_PROGRESS = 94
const GOAL_DATA = [{ name: 'objectif', value: GOAL_PROGRESS, fill: ACCENT }]

// ─── Insights ───────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, { label: string; bg: string; color: string; border: string }> = {
  urgent: { label: 'Urgent', bg: 'rgba(249,115,22,0.12)', color: '#FB923C', border: 'rgba(249,115,22,0.3)' },
  important: { label: 'Important', bg: 'rgba(99,102,241,0.12)', color: '#A5B4FC', border: 'rgba(99,102,241,0.3)' },
  info: { label: 'Info', bg: 'rgba(113,113,122,0.12)', color: '#A1A1AA', border: 'rgba(113,113,122,0.3)' },
}

const INSIGHTS = [
  { icon: '📈', title: 'Pic du mardi', desc: 'Vos ventes augmentent le mardi — concentrez vos promotions ce jour-là.', priority: 'important' },
  { icon: '⚠️', title: 'Abandon panier en hausse', desc: 'Le taux d\'abandon panier a augmenté de 12% — vérifiez votre processus de paiement.', priority: 'urgent' },
  { icon: '💡', title: 'Audience clé identifiée', desc: 'Vos clients de la tranche 25-34 ans génèrent 60% du CA — ciblez cette audience.', priority: 'info' },
  { icon: '🎯', title: 'Objectif presque atteint', desc: 'Objectif mensuel atteignable à 94% — encore 2 400€ pour y arriver.', priority: 'important' },
]

// ─── Activity heatmap ───────────────────────────────────────────────────────────

const HEATMAP_ROWS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const HEATMAP_COLS = ['8h', '9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h']
const HEATMAP: number[][] = HEATMAP_ROWS.map((_, r) =>
  HEATMAP_COLS.map((_, c) => {
    const v = Math.abs(Math.sin((r + 1) * 0.9 + (c + 1) * 0.55)) * 0.7 + Math.abs(Math.cos((r + 1) * 0.4)) * 0.3
    return Math.min(1, v)
  })
)

// ─── Transactions table ─────────────────────────────────────────────────────────

interface Transaction { day: number; date: string; type: string; amount: number; status: 'Payé' | 'En attente' | 'Échoué' }

const TRANSACTIONS: Transaction[] = [
  { day: 19, date: '19 juin 2026', type: 'Abonnement Pro', amount: 49, status: 'Payé' },
  { day: 18, date: '18 juin 2026', type: 'Service ponctuel', amount: 120, status: 'Payé' },
  { day: 18, date: '18 juin 2026', type: 'Add-on SMS', amount: 9, status: 'En attente' },
  { day: 17, date: '17 juin 2026', type: 'Abonnement Starter', amount: 19, status: 'Payé' },
  { day: 16, date: '16 juin 2026', type: 'Service ponctuel', amount: 85, status: 'Échoué' },
  { day: 15, date: '15 juin 2026', type: 'Abonnement Pro', amount: 49, status: 'Payé' },
  { day: 14, date: '14 juin 2026', type: 'Add-on stockage', amount: 14, status: 'Payé' },
  { day: 13, date: '13 juin 2026', type: 'Service ponctuel', amount: 64, status: 'Payé' },
]

const STATUS_STYLES: Record<Transaction['status'], { bg: string; color: string }> = {
  'Payé': { bg: 'rgba(16,185,129,0.12)', color: '#6EE7B7' },
  'En attente': { bg: 'rgba(245,158,11,0.12)', color: '#FCD34D' },
  'Échoué': { bg: 'rgba(239,68,68,0.12)', color: '#FCA5A5' },
}

// ─── Features / FAQ ─────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '📊', title: 'Tableaux de bord temps réel', desc: 'Toutes vos métriques mises à jour en continu.', tooltip: 'Connectez vos sources une fois, les chiffres se rafraîchissent automatiquement, aucune action manuelle.' },
  { icon: '🗞️', title: 'Rapports automatiques', desc: 'Un rapport complet généré chaque semaine.', tooltip: 'PDF ou email, envoyé chaque lundi avec les chiffres clés et les tendances de la semaine.' },
  { icon: '🧠', title: 'Insights IA', desc: 'Des recommandations actionnables, pas juste des chiffres.', tooltip: 'L\'IA détecte les tendances, anomalies et opportunités, et les traduit en actions concrètes.' },
  { icon: '🔮', title: 'Prévisions', desc: 'Anticipez votre CA des prochaines semaines.', tooltip: 'Modèles de prévision basés sur votre historique, mis à jour à chaque nouvelle donnée.' },
  { icon: '📤', title: 'Export PDF/Excel', desc: 'Exportez vos rapports en un clic.', tooltip: 'Format PDF prêt à partager ou Excel pour vos propres analyses complémentaires.' },
  { icon: '🔔', title: 'Alertes intelligentes', desc: 'Soyez prévenu dès qu\'une métrique sort de la norme.', tooltip: 'Seuils personnalisables : chute de CA, pic d\'abandon panier, objectif en danger, etc.' },
  { icon: '🔁', title: 'Comparaisons de périodes', desc: 'Comparez chaque période à la précédente automatiquement.', tooltip: 'Semaine vs semaine, mois vs mois, ou période personnalisée — toujours en un coup d\'œil.' },
  { icon: '🎯', title: 'Objectifs personnalisés', desc: 'Définissez vos objectifs, suivez la progression.', tooltip: 'CA, nouveaux clients, conversion — fixez vos cibles et suivez l\'avancement en temps réel.' },
]

const FAQS = [
  { q: 'Mes données sont-elles sécurisées ?', a: 'Oui, toutes les données sont chiffrées et hébergées sur une infrastructure sécurisée. Vous seul avez accès à vos rapports et tableaux de bord.' },
  { q: 'Quelles sources de données puis-je connecter ?', a: 'Site web, réseaux sociaux, prise de RDV, paiements et bien d\'autres — toutes vos sources Velona se connectent automatiquement, sans configuration technique.' },
  { q: 'À quelle fréquence les données sont-elles mises à jour ?', a: 'Les tableaux de bord se rafraîchissent en temps réel. Le rapport hebdomadaire est généré et envoyé chaque lundi matin.' },
  { q: 'Puis-je exporter mes rapports ?', a: 'Oui, en PDF ou en Excel, en un clic depuis n\'importe quel tableau de bord ou directement depuis le rapport hebdomadaire reçu par email.' },
  { q: 'Comment fonctionnent les insights IA ?', a: 'L\'IA analyse en continu vos données pour détecter tendances, anomalies et opportunités, puis les transforme en recommandations claires et actionnables.' },
]

const USE_CASES = [
  { icon: '🛍️', title: 'E-commerce', example: '"Suivez votre CA, panier moyen et taux de conversion en un coup d\'œil"' },
  { icon: '💼', title: 'Consultant', example: '"Recevez un rapport hebdomadaire à envoyer directement à vos clients"' },
  { icon: '🍽️', title: 'Restaurant', example: '"Identifiez vos heures de pointe et ajustez votre personnel"' },
  { icon: '🏋️', title: 'Salle de sport', example: '"Suivez la rétention de vos abonnés mois après mois"' },
  { icon: '💇', title: 'Salon de beauté', example: '"Comparez vos ventes par service et par mois"' },
]

// ─── Count-up hook ──────────────────────────────────────────────────────────────

function useCountUp(target: number, decimals: number, inView: boolean, duration = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!inView) return
    let start: number | null = null
    let raf: number
    function tick(ts: number) {
      if (start === null) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      setValue(Number((progress * target).toFixed(decimals)))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, target, decimals, duration])
  return value
}

// ─── Animated dashboard mockup (hero) ───────────────────────────────────────────

const MOCK_BAR_HEIGHTS = [14, 22, 18, 28, 24, 34]

function AnimatedDashboardMockup() {
  return (
    <div className="rounded-2xl p-5 mx-auto" style={{ width: 300, background: '#18181B', border: '1px solid #27272A', boxShadow: '0 0 60px rgba(99,102,241,0.15)' }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-white">Dashboard · juin 2026</span>
        <div className="flex items-center gap-1.5">
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
          <span className="text-[9px] text-gray-500">live</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-lg p-2.5" style={{ background: '#09090B', border: '1px solid #27272A' }}>
          <p className="text-[9px] text-gray-500 mb-1">CA ce mois</p>
          <p className="text-sm font-extrabold text-white">84 320 €</p>
        </div>
        <div className="rounded-lg p-2.5" style={{ background: '#09090B', border: '1px solid #27272A' }}>
          <p className="text-[9px] text-gray-500 mb-1">Variation</p>
          <p className="text-sm font-extrabold" style={{ color: '#6EE7B7' }}>+12,4%</p>
        </div>
      </div>

      <div className="rounded-lg p-3 mb-3" style={{ background: '#09090B', border: '1px solid #27272A' }}>
        <svg viewBox="0 0 240 60" width="100%" height="50">
          <motion.path
            d="M0,45 L30,38 L60,42 L90,28 L120,32 L150,16 L180,22 L210,8 L240,12"
            fill="none"
            stroke={ACCENT}
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
          />
        </svg>
      </div>

      <div className="flex items-end gap-1.5 h-10 mb-3">
        {MOCK_BAR_HEIGHTS.map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-sm"
            style={{ background: i % 2 === 0 ? ACCENT : ACCENT_LIGHT }}
            initial={{ height: 0 }}
            animate={{ height: h }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-9 h-9 shrink-0">
          <svg viewBox="0 0 36 36" width="36" height="36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#27272A" strokeWidth="4" />
            <motion.circle
              cx="18" cy="18" r="15" fill="none" stroke={ACCENT} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 15}
              initial={{ strokeDashoffset: 2 * Math.PI * 15 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 15 * (1 - 0.94) }}
              transition={{ duration: 1.4, delay: 0.4, ease: 'easeOut' }}
              transform="rotate(-90 18 18)"
            />
          </svg>
        </div>
        <span className="text-[10px] text-gray-500">Objectif mensuel à 94%</span>
      </div>
    </div>
  )
}

// ─── Control bar ────────────────────────────────────────────────────────────────

const SOURCES = ['Toutes les sources', 'Site web', 'Réseaux sociaux', 'Rendez-vous', 'Vidéo']

function ControlBar({
  period, onPeriod, source, onSource, onExport,
}: { period: PeriodKey; onPeriod: (p: PeriodKey) => void; source: string; onSource: (s: string) => void; onExport: () => void }) {
  const [open, setOpen] = useState(false)
  const periodIndex = PERIODS.findIndex((p) => p.key === period)

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
      <div className="relative grid grid-cols-4 rounded-xl p-1" style={{ background: '#18181B', border: '1px solid #27272A' }}>
        <motion.div
          className="absolute top-1 bottom-1 rounded-lg"
          style={{ background: ACCENT, width: 'calc(25% - 4px)' }}
          animate={{ left: `calc(${periodIndex * 25}% + 2px)` }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        />
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => onPeriod(p.key)}
            className="relative z-10 px-3 py-2 text-xs font-semibold rounded-lg transition-colors duration-150"
            style={{ color: period === p.key ? '#fff' : '#71717A' }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full sm:w-56 flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-gray-300"
          style={{ background: '#18181B', border: '1px solid #27272A' }}
        >
          {source}
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-gray-500">▾</motion.span>
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 mt-2 rounded-xl overflow-hidden z-20"
              style={{ background: '#18181B', border: '1px solid #27272A', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
            >
              {SOURCES.map((s) => (
                <button
                  key={s}
                  onClick={() => { onSource(s); setOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-white/[0.04] transition-colors"
                  style={{ color: s === source ? ACCENT_LIGHT : '#A1A1AA' }}
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={onExport}
        className="sm:ml-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
        style={{ background: ACCENT, boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}
      >
        📄 Exporter le rapport PDF
      </button>
    </div>
  )
}

// ─── KPI card ───────────────────────────────────────────────────────────────────

function KpiCard({ kpi, index }: { kpi: Kpi; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const value = useCountUp(kpi.value, kpi.decimals, inView)
  const positive = kpi.delta >= 0
  const sparkData = kpi.spark.map((v, i) => ({ i, v }))

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileHover={{ y: -4 }}
      className="rounded-2xl p-5"
      style={{ background: '#18181B', border: '1px solid #27272A' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: `${kpi.color}1F` }}>
          {kpi.icon}
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"
          style={positive ? { background: 'rgba(16,185,129,0.12)', color: '#6EE7B7' } : { background: 'rgba(239,68,68,0.12)', color: '#FCA5A5' }}
        >
          {positive ? '▲' : '▼'} {Math.abs(kpi.delta)}%
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
      <p className="text-2xl font-extrabold text-white mb-3 tabular-nums">
        {value.toLocaleString('fr-FR', { minimumFractionDigits: kpi.decimals, maximumFractionDigits: kpi.decimals })}{kpi.unit}
      </p>
      <div style={{ height: 32 }}>
        {inView && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={`spark-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={kpi.color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={kpi.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={kpi.color} strokeWidth={1.5} fill={`url(#spark-${index})`} isAnimationActive animationDuration={1000} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main area chart ────────────────────────────────────────────────────────────

function MainChartCard({ period }: { period: PeriodKey }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const data = DATA_BY_PERIOD[period]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl p-5 sm:p-6 mb-6"
      style={{ background: '#18181B', border: '1px solid #27272A' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div>
          <h3 className="text-base font-bold text-white">Évolution du chiffre d&apos;affaires</h3>
          <p className="text-xs text-gray-500">Période actuelle vs précédente</p>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-gray-400"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: ACCENT }} />Actuelle</span>
          <span className="flex items-center gap-1.5 text-gray-400"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#3F3F46' }} />Précédente</span>
        </div>
      </div>
      <div style={{ height: 300 }} className="mt-4">
        {inView && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="caGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#27272A" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={{ stroke: '#27272A' }} tickLine={false} />
              <YAxis tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={tooltipRenderer(' €')} cursor={{ stroke: '#3F3F46' }} />
              <Area type="monotone" dataKey="previous" name="Précédente" stroke="#3F3F46" strokeWidth={2} strokeDasharray="4 4" fill="transparent" isAnimationActive animationDuration={1200} />
              <Area type="monotone" dataKey="current" name="Actuelle" stroke={ACCENT} strokeWidth={2.5} fill="url(#caGradient)" isAnimationActive animationDuration={1400} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  )
}

// ─── Secondary chart cards ──────────────────────────────────────────────────────

function RevenueBarCard() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="rounded-2xl p-5" style={{ background: '#18181B', border: '1px solid #27272A' }}>
      <h3 className="text-sm font-bold text-white mb-0.5">Revenus par source</h3>
      <p className="text-xs text-gray-500 mb-4">Répartition du CA par canal</p>
      <div style={{ height: 220 }}>
        {inView && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={REVENUE_BY_SOURCE} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#27272A" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={{ stroke: '#27272A' }} tickLine={false} />
              <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={tooltipRenderer(' €')} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
              <Bar dataKey="value" name="Revenus" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={1000}>
                {REVENUE_BY_SOURCE.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  )
}

function CategoryDonutCard() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="rounded-2xl p-5" style={{ background: '#18181B', border: '1px solid #27272A' }}>
      <h3 className="text-sm font-bold text-white mb-0.5">Ventes par catégorie</h3>
      <p className="text-xs text-gray-500 mb-4">Répartition en % du CA total</p>
      <div className="relative" style={{ height: 220 }}>
        {inView && (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={tooltipRenderer(' %')} />
                <Pie data={SALES_BY_CATEGORY} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3} isAnimationActive animationDuration={1000}>
                  {SALES_BY_CATEGORY.map((d, i) => <Cell key={i} fill={d.fill} stroke="none" />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-gray-500">CA total</span>
              <span className="text-sm font-extrabold text-white">84 320€</span>
            </div>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {SALES_BY_CATEGORY.map((d) => (
          <span key={d.name} className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: d.fill }} />{d.name} · {d.value}%
          </span>
        ))}
      </div>
    </motion.div>
  )
}

function ClientsLineCard() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="rounded-2xl p-5" style={{ background: '#18181B', border: '1px solid #27272A' }}>
      <h3 className="text-sm font-bold text-white mb-0.5">Évolution des clients</h3>
      <p className="text-xs text-gray-500 mb-4">Nombre de clients actifs par mois</p>
      <div style={{ height: 220 }}>
        {inView && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={CLIENTS_TREND} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#27272A" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={{ stroke: '#27272A' }} tickLine={false} />
              <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={tooltipRenderer('')} cursor={{ stroke: '#3F3F46' }} />
              <Line type="monotone" dataKey="value" name="Clients" stroke={ACCENT_LIGHT} strokeWidth={2.5} dot={{ r: 3, fill: ACCENT_LIGHT, strokeWidth: 0 }} isAnimationActive animationDuration={1200} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  )
}

function GoalRadialCard() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="rounded-2xl p-5" style={{ background: '#18181B', border: '1px solid #27272A' }}>
      <h3 className="text-sm font-bold text-white mb-0.5">Objectif du mois</h3>
      <p className="text-xs text-gray-500 mb-4">26 000€ de CA visé</p>
      <div className="relative" style={{ height: 220 }}>
        {inView && (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart data={GOAL_DATA} startAngle={90} endAngle={-270} innerRadius={70} outerRadius={95}>
                <RadialBar dataKey="value" cornerRadius={12} background={{ fill: '#27272A' }} isAnimationActive animationDuration={1200} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-white">{GOAL_PROGRESS}%</span>
              <span className="text-[10px] text-gray-500">atteint</span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}

// ─── Insights IA ────────────────────────────────────────────────────────────────

function InsightsSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl p-6 sm:p-7 mb-16 relative overflow-hidden"
      style={{ background: '#18181B', border: `1px solid ${ACCENT}`, boxShadow: '0 0 50px rgba(99,102,241,0.12)' }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(99,102,241,0.15)' }}>🧠</div>
        <div>
          <h2 className="text-lg font-bold text-white">Insights IA</h2>
          <p className="text-xs text-gray-500">Recommandations générées automatiquement à partir de vos données</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {INSIGHTS.map((insight, i) => {
          const style = PRIORITY_STYLES[insight.priority]
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.4 }}
              className="rounded-xl p-4"
              style={{ background: '#09090B', border: '1px solid #27272A' }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-lg">{insight.icon}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                  {style.label}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1">{insight.title}</h4>
              <p className="text-xs text-gray-500 leading-relaxed">{insight.desc}</p>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── Activity heatmap ───────────────────────────────────────────────────────────

function ActivityHeatmap() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl p-5 sm:p-6 mb-16"
      style={{ background: '#18181B', border: '1px solid #27272A' }}
    >
      <h3 className="text-base font-bold text-white mb-0.5">Heatmap d&apos;activité</h3>
      <p className="text-xs text-gray-500 mb-5">Pics de ventes par jour et par heure</p>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 560 }}>
          <div className="grid mb-1" style={{ gridTemplateColumns: `40px repeat(${HEATMAP_COLS.length}, 1fr)`, gap: 4 }}>
            <div />
            {HEATMAP_COLS.map((c) => <div key={c} className="text-center text-[9px] text-gray-600">{c}</div>)}
          </div>
          {HEATMAP_ROWS.map((row, r) => (
            <div key={row} className="grid mb-1" style={{ gridTemplateColumns: `40px repeat(${HEATMAP_COLS.length}, 1fr)`, gap: 4 }}>
              <div className="text-[10px] text-gray-500 flex items-center">{row}</div>
              {HEATMAP_COLS.map((_, c) => (
                <motion.div
                  key={c}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: (r * HEATMAP_COLS.length + c) * 0.008, duration: 0.3 }}
                  className="aspect-square rounded-sm"
                  style={{ background: `rgba(99,102,241,${0.12 + HEATMAP[r][c] * 0.75})` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 justify-end">
        <span className="text-[10px] text-gray-600">Moins</span>
        {[0.15, 0.35, 0.55, 0.75, 0.95].map((o, i) => (
          <span key={i} className="w-3 h-3 rounded-sm inline-block" style={{ background: `rgba(99,102,241,${o})` }} />
        ))}
        <span className="text-[10px] text-gray-600">Plus</span>
      </div>
    </motion.div>
  )
}

// ─── Transactions table ─────────────────────────────────────────────────────────

function TransactionsTable() {
  const [sortKey, setSortKey] = useState<'date' | 'amount'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const toggleSort = (key: 'date' | 'amount') => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...TRANSACTIONS].sort((a, b) => {
    const av = sortKey === 'date' ? a.day : a.amount
    const bv = sortKey === 'date' ? b.day : b.amount
    return sortDir === 'asc' ? av - bv : bv - av
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl overflow-hidden mb-16"
      style={{ background: '#18181B', border: '1px solid #27272A' }}
    >
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #27272A' }}>
        <h3 className="text-base font-bold text-white">Dernières transactions</h3>
        <p className="text-xs text-gray-500 mt-0.5">Cliquez sur une colonne pour trier</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{ minWidth: 480 }}>
          <thead>
            <tr className="text-[11px] text-gray-500">
              <th className="px-5 py-2.5 font-semibold cursor-pointer select-none" onClick={() => toggleSort('date')}>
                Date {sortKey === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-5 py-2.5 font-semibold">Type</th>
              <th className="px-5 py-2.5 font-semibold cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                Montant {sortKey === 'amount' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-5 py-2.5 font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, i) => (
              <tr key={i} className="text-sm hover:bg-white/[0.02] transition-colors" style={{ borderTop: '1px solid #27272A' }}>
                <td className="px-5 py-3 text-gray-400 text-xs">{t.date}</td>
                <td className="px-5 py-3 text-white text-xs font-medium">{t.type}</td>
                <td className="px-5 py-3 text-white text-xs font-semibold tabular-nums">{t.amount} €</td>
                <td className="px-5 py-3">
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: STATUS_STYLES[t.status].bg, color: STATUS_STYLES[t.status].color }}>
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

// ─── Report generation modal ────────────────────────────────────────────────────

const REPORT_STEPS = [
  { label: 'Compilation des données...', duration: 900 },
  { label: 'Génération des graphiques...', duration: 1100 },
  { label: 'Analyse IA...', duration: 1000 },
  { label: 'Mise en forme...', duration: 700 },
]
const REPORT_TOTAL = REPORT_STEPS.reduce((s, st) => s + st.duration, 0)

function ReportModal({ onClose }: { onClose: () => void }) {
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((e) => {
        const next = e + 50
        if (next >= REPORT_TOTAL) {
          clearInterval(timer)
          setTimeout(() => setDone(true), 200)
          return REPORT_TOTAL
        }
        return next
      })
    }, 50)
    return () => clearInterval(timer)
  }, [])

  const progress = Math.min(100, (elapsed / REPORT_TOTAL) * 100)
  let acc = 0
  let currentStep = 0
  for (let i = 0; i < REPORT_STEPS.length; i++) {
    acc += REPORT_STEPS[i].duration
    if (elapsed < acc) { currentStep = i; break }
    currentStep = i
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-sm rounded-2xl p-7"
        style={{ background: '#18181B', border: '1px solid #27272A' }}
      >
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div key="progress" exit={{ opacity: 0 }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">📄</span>
                <h3 className="text-white font-bold text-base">Génération du rapport</h3>
              </div>
              <p className="text-sm mb-6" style={{ color: ACCENT_LIGHT }}>Veuillez patienter quelques instants...</p>

              <div className="flex items-end gap-2 h-16 mb-6 justify-center">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-9 rounded-md"
                    style={{ background: '#27272A', border: '1px solid #3F3F46' }}
                    initial={{ height: 24, opacity: 0.3 }}
                    animate={progress > (i + 1) * 25 ? { height: 24 + i * 12, opacity: 1, borderColor: ACCENT } : {}}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </div>

              <div className="h-1.5 rounded-full overflow-hidden mb-5" style={{ background: '#27272A' }}>
                <motion.div className="h-full rounded-full" style={{ background: ACCENT }} animate={{ width: `${progress}%` }} transition={{ duration: 0.1 }} />
              </div>

              <div className="flex flex-col gap-2.5">
                {REPORT_STEPS.map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]"
                      style={{
                        background: i < currentStep ? ACCENT : i === currentStep ? 'rgba(99,102,241,0.15)' : '#27272A',
                        border: i === currentStep ? `1px solid ${ACCENT}` : 'none',
                      }}
                    >
                      {i < currentStep ? '✓' : ''}
                    </div>
                    <span className="text-xs" style={{ color: i <= currentStep ? '#FAFAFA' : '#52525B' }}>{step.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(99,102,241,0.12)', border: `1px solid ${ACCENT}` }}
              >
                <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
                  <path d="M2 10l6.5 6.5L24 2" stroke={ACCENT_LIGHT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
              <h3 className="text-white font-extrabold text-lg mb-1.5">✓ Rapport prêt !</h3>
              <p className="text-gray-400 text-sm mb-5">Votre rapport analytics de juin 2026 est prêt à télécharger.</p>
              <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity mb-2" style={{ background: ACCENT, boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}>
                ⬇ Télécharger le PDF
              </button>
              <button onClick={onClose} className="w-full py-2.5 rounded-xl text-xs font-medium" style={{ color: '#52525B' }}>
                Fermer
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ─── Weekly report automation ───────────────────────────────────────────────────

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="relative w-11 h-6 rounded-full shrink-0" style={{ background: enabled ? ACCENT : '#3F3F46' }}>
      <motion.div animate={{ x: enabled ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute top-1 w-4 h-4 rounded-full" style={{ background: '#FAFAFA' }} />
    </button>
  )
}

function WeeklyReportSection() {
  const [enabled, setEnabled] = useState(true)
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16 rounded-2xl p-6 sm:p-7"
      style={{ background: '#18181B', border: '1px solid #27272A' }}
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">Rapport hebdomadaire automatique</h3>
          <Toggle enabled={enabled} onToggle={() => setEnabled((v) => !v)} />
        </div>
        <p className="text-sm text-gray-400 leading-relaxed mb-4">
          Chaque lundi à 8h, l&apos;IA compile vos performances de la semaine et vous l&apos;envoie directement par email — chiffres clés, tendances et recommandations inclus.
        </p>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: enabled ? 'rgba(99,102,241,0.12)' : 'rgba(113,113,122,0.12)', color: enabled ? ACCENT_LIGHT : '#71717A' }}>
          {enabled ? '✓ Activé — envoi chaque lundi 8h' : 'Désactivé'}
        </span>
      </div>

      <div className="rounded-xl p-4" style={{ background: '#09090B', border: '1px solid #27272A' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-white">📧 Rapport — Semaine du 15 juin</span>
          <span className="text-[9px] text-gray-600">Aperçu</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">CA de la semaine</span>
            <span className="text-white font-semibold">19 840 €</span>
          </div>
          <div className="flex items-end gap-1 h-8">
            {[12, 18, 14, 22, 26, 16, 10].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm" style={{ height: h, background: i === 4 ? ACCENT : '#3F3F46' }} />
            ))}
          </div>
          <div className="h-px my-1" style={{ background: '#27272A' }} />
          <p className="text-[11px] text-gray-500 leading-relaxed">💡 Vos ventes augmentent le mardi — concentrez vos promotions ce jour-là.</p>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Feature card / FAQ ─────────────────────────────────────────────────────────

function FeatureCard({ feature }: { feature: typeof FEATURES[0] }) {
  const [tooltip, setTooltip] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="relative rounded-xl p-4"
      style={{ background: '#18181B', border: '1px solid #27272A' }}
      onMouseEnter={() => setTooltip(true)}
      onMouseLeave={() => setTooltip(false)}
    >
      <div className="text-xl mb-2">{feature.icon}</div>
      <h4 className="text-sm font-bold text-white mb-1">{feature.title}</h4>
      <p className="text-xs text-gray-500 leading-relaxed">{feature.desc}</p>
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full left-0 right-0 mb-2 p-3 rounded-xl text-xs text-gray-300 z-20 leading-relaxed"
            style={{ background: '#09090B', border: `1px solid ${ACCENT}`, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
          >
            {feature.tooltip}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function FAQItem({ faq, index }: { faq: typeof FAQS[0]; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      onClick={() => setOpen((v) => !v)}
      className="rounded-xl overflow-hidden cursor-pointer"
      style={{ border: open ? `1px solid ${ACCENT}` : '1px solid #27272A', background: open ? 'rgba(99,102,241,0.06)' : '#18181B', transition: 'border-color 0.2s, background 0.2s' }}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-sm font-semibold text-white pr-4">{faq.q}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 text-gray-400 text-lg leading-none">+</motion.span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="a" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeInOut' }} className="overflow-hidden">
            <p className="px-5 pb-4 text-sm text-gray-400 leading-relaxed">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────────

export default function AnalyticsServicePage() {
  const [period, setPeriod] = useState<PeriodKey>('30j')
  const [source, setSource] = useState(SOURCES[0])
  const [showReport, setShowReport] = useState(false)

  return (
    <div className="relative min-h-screen" style={{ background: '#09090B' }}>
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10"
        style={{ background: `linear-gradient(90deg, transparent 5%, ${ACCENT} 35%, ${ACCENT_LIGHT} 65%, transparent 95%)` }}
      />

      <div className="max-w-7xl mx-auto px-4 py-10">

        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-150">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Retour aux services
          </Link>
        </motion.div>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5" style={{ background: 'rgba(99,102,241,0.12)', color: ACCENT_LIGHT, border: `1px solid rgba(99,102,241,0.25)` }}>
              <span className="text-xs">✦</span>
              Analytics & rapports business IA
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
              Pilotez votre business{' '}
              <span style={{ color: ACCENT }}>avec des données claires</span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed mb-8">
              Visualisez vos performances et recevez des rapports IA actionnables chaque semaine.
            </p>
            <div className="flex flex-wrap gap-6">
              {[{ value: 'Auto', label: 'Rapports automatiques' }, { value: 'IA', label: 'Insights actionnables' }, { value: 'Live', label: 'Temps réel' }].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-extrabold" style={{ color: ACCENT }}>{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
            <AnimatedDashboardMockup />
          </motion.div>
        </div>

        {/* ── Control bar ──────────────────────────────────────────────────── */}
        <ControlBar period={period} onPeriod={setPeriod} source={source} onSource={setSource} onExport={() => setShowReport(true)} />

        {/* ── KPI cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {KPIS.map((kpi, i) => <KpiCard key={i} kpi={kpi} index={i} />)}
        </div>

        {/* ── Main chart ───────────────────────────────────────────────────── */}
        <MainChartCard period={period} />

        {/* ── Secondary charts grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-16">
          <RevenueBarCard />
          <CategoryDonutCard />
          <ClientsLineCard />
          <GoalRadialCard />
        </div>

        {/* ── Insights IA ──────────────────────────────────────────────────── */}
        <InsightsSection />

        {/* ── Activity heatmap ─────────────────────────────────────────────── */}
        <ActivityHeatmap />

        {/* ── Transactions table ───────────────────────────────────────────── */}
        <TransactionsTable />

        {/* ── Weekly report automation ─────────────────────────────────────── */}
        <WeeklyReportSection />

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Comment ça marche</h2>
            <p className="text-gray-500 text-sm">Quatre étapes pour transformer vos données en décisions.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: '01', icon: '🔗', title: 'Connectez vos sources de données', desc: 'Site web, réseaux sociaux, RDV, paiements — tout se synchronise automatiquement.' },
              { step: '02', icon: '🧠', title: 'L\'IA analyse en continu', desc: 'Vos données sont traitées en temps réel pour détecter tendances et anomalies.' },
              { step: '03', icon: '💡', title: 'Recevez des insights actionnables', desc: 'Des recommandations claires, pas juste des chiffres bruts.' },
              { step: '04', icon: '🎯', title: 'Prenez les bonnes décisions', desc: 'Ajustez votre stratégie en vous appuyant sur des données fiables.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="relative rounded-xl p-5"
                style={{ background: '#18181B', border: '1px solid #27272A' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-3xl font-black tabular-nums" style={{ color: 'rgba(99,102,241,0.15)', lineHeight: 1 }}>{item.step}</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                {i < 3 && <div className="hidden lg:block absolute top-1/2 -right-2.5 -translate-y-1/2 text-gray-700 z-10 text-xs">→</div>}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Use cases carousel ───────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-16">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Adapté à votre activité</h2>
            <p className="text-gray-500 text-sm">Quel que soit votre métier, vos données prennent du sens.</p>
          </div>
          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, #09090B, transparent)' }} />
            <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none" style={{ background: 'linear-gradient(270deg, #09090B, transparent)' }} />
            <div className="overflow-hidden">
              <div className="flex gap-4" style={{ animation: 'scroll-left 32s linear infinite', width: 'max-content' }}>
                {[...USE_CASES, ...USE_CASES].map((uc, i) => (
                  <div key={i} className="shrink-0 w-60 rounded-xl p-4" style={{ background: '#18181B', border: '1px solid #27272A' }}>
                    <div className="text-3xl mb-3">{uc.icon}</div>
                    <h4 className="text-sm font-bold text-white mb-1.5">{uc.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed italic">{uc.example}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Features ──────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Tout ce qu&apos;il faut pour piloter votre business</h2>
            <p className="text-gray-500 text-sm">Survolez pour en savoir plus.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => <FeatureCard key={i} feature={f} />)}
          </div>
        </motion.div>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Questions fréquentes</h2>
          </div>
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            {FAQS.map((faq, i) => <FAQItem key={i} faq={faq} index={i} />)}
          </div>
        </motion.div>

        {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center rounded-2xl p-10 mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(129,140,248,0.04))', border: `1px solid rgba(99,102,241,0.2)` }}
        >
          <h2 className="text-2xl font-extrabold text-white mb-2">Prêt à piloter votre business avec des données ?</h2>
          <p className="text-gray-400 text-sm mb-6">Rejoignez les professionnels qui prennent leurs décisions à partir de vrais chiffres.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: ACCENT, boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}
          >
            📊 Activer mes tableaux de bord
          </button>
          <p className="text-gray-600 text-xs mt-4">Essai 3 jours · Aucune carte bancaire requise · Configuration en 5 min</p>
        </motion.div>

      </div>

      <AnimatePresence>
        {showReport && <ReportModal onClose={() => setShowReport(false)} />}
      </AnimatePresence>
    </div>
  )
}
