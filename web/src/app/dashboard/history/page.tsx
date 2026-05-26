'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { SERVICES } from '@/lib/services';

interface Order {
  id: string;
  service_type: string;
  prompt: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result_url?: string;
  created_at: string;
  completed_at?: string;
}

interface HistoryResponse {
  items: Order[];
  total: number;
  page: number;
  totalPages: number;
}

function useCountUp(target: number, duration = 1300, enabled = true) {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || target === 0) { setCurrent(0); return; }
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, enabled]);

  return current;
}

function getDuration(order: Order): string {
  if (!order.completed_at || order.status !== 'completed') return '—';
  const ms = new Date(order.completed_at).getTime() - new Date(order.created_at).getTime();
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}min`;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

/* ── Constants ─────────────────────────────────────────────────────────────── */

const STATUS_CONFIG = {
  queued: {
    label: 'En attente',
    textColor: '#9ca3af',
    bg: 'rgba(75,85,99,0.18)',
    border: 'rgba(75,85,99,0.28)',
    dotColor: '#9ca3af',
    pulse: false,
  },
  processing: {
    label: 'En cours',
    textColor: '#60a5fa',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.3)',
    dotColor: '#60a5fa',
    pulse: true,
  },
  completed: {
    label: 'Terminé',
    textColor: '#34d399',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.3)',
    dotColor: '#34d399',
    pulse: false,
  },
  failed: {
    label: 'Erreur',
    textColor: '#f87171',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.3)',
    dotColor: '#f87171',
    pulse: false,
  },
} as const;

const SERVICE_ICONS: Record<string, React.ReactElement> = {
  website: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  ),
  voice_agent: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16c-2.47 0-4.52-1.8-4.93-4.15-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.09-.6-.39-1.14-1-1.14z"/>
    </svg>
  ),
  video_editing: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
    </svg>
  ),
  appointments: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/>
    </svg>
  ),
  social_media: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
    </svg>
  ),
  analytics: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
    </svg>
  ),
};

const SERVICE_META: Record<string, { color: string; glow: string; label: string }> = {
  website:       { color: '#6C5CE7', glow: 'rgba(108,92,231,0.4)',  label: 'Site web' },
  voice_agent:   { color: '#00b894', glow: 'rgba(0,184,148,0.4)',   label: 'Agent vocal' },
  video_editing: { color: '#e17055', glow: 'rgba(225,112,85,0.4)',  label: 'Vidéo' },
  appointments:  { color: '#0984e3', glow: 'rgba(9,132,227,0.4)',   label: 'Agenda' },
  social_media:  { color: '#fd79a8', glow: 'rgba(253,121,168,0.4)', label: 'Réseaux' },
  analytics:     { color: '#fdcb6e', glow: 'rgba(253,203,110,0.4)', label: 'Analytics' },
};

const FILTER_PILLS = [
  { label: 'Tout',            value: 'all' },
  { label: 'Sites web',       value: 'website' },
  { label: 'Vidéos',          value: 'video_editing' },
  { label: 'Réseaux sociaux', value: 'social_media' },
  { label: 'Vocal',           value: 'voice_agent' },
  { label: 'Analytics',       value: 'analytics' },
] as const;

const SORT_OPTIONS = [
  { label: 'Plus récent', value: 'newest' },
  { label: 'Plus ancien', value: 'oldest' },
  { label: 'Type',        value: 'type' },
] as const;

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function HistoryCard({ order, index }: { order: Order; index: number }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const service = SERVICES.find((s) => s.id === order.service_type);
  const meta = SERVICE_META[order.service_type] ?? {
    color: '#6C5CE7', glow: 'rgba(108,92,231,0.35)', label: order.service_type,
  };
  const status = STATUS_CONFIG[order.status];
  const duration = getDuration(order);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 200, damping: 26, delay: index * 0.04 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <motion.div
        animate={hovered
          ? { y: -3, boxShadow: `0 16px 48px ${meta.glow}` }
          : { y: 0,  boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="relative flex items-start gap-4 rounded-2xl p-4 sm:p-5 overflow-hidden"
        style={{
          background: 'rgba(15,12,36,0.8)',
          backdropFilter: 'blur(12px)',
          border: hovered ? `1px solid ${meta.color}50` : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${meta.color}60, transparent)`,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        />

        {/* Icon */}
        <motion.div
          animate={hovered
            ? { boxShadow: `0 0 20px ${meta.glow}`, scale: 1.05 }
            : { boxShadow: '0 0 0px transparent', scale: 1 }}
          transition={{ duration: 0.25 }}
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${meta.color}30, ${meta.color}18)`, color: meta.color }}
        >
          {SERVICE_ICONS[order.service_type] ?? <span className="text-lg">{service?.icon ?? '🤖'}</span>}
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-white truncate max-w-[180px] sm:max-w-xs">
              {service ? t(`${service.i18nKey}.name`) : order.service_type}
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{ background: `${meta.color}20`, color: meta.color }}
            >
              {meta.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 truncate mb-2" title={order.prompt}>
            {order.prompt}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] text-gray-600">{formatDate(order.created_at)}</span>
            {duration !== '—' && (
              <span className="text-[11px] text-gray-600 flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="opacity-50">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
                </svg>
                Généré en {duration}
              </span>
            )}
          </div>
        </div>

        {/* Right: status + actions */}
        <div className="flex flex-col items-end gap-2.5 shrink-0">
          <span
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
            style={{ background: status.bg, border: `1px solid ${status.border}`, color: status.textColor }}
          >
            {status.pulse ? (
              <motion.span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: status.dotColor }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.dotColor }} />
            )}
            {status.label}
          </span>

          {order.result_url && order.status === 'completed' && (
            <div className="flex gap-1.5">
              <a
                href={order.result_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: `${meta.color}20`, color: meta.color }}
              >
                Voir →
              </a>
              <a
                href={order.result_url}
                download
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg text-gray-400 hover:text-white"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                ↓
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="relative flex items-start gap-4 rounded-2xl p-5"
      style={{ background: 'rgba(15,12,36,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="w-11 h-11 rounded-xl bg-gray-800/80 shimmer shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-2.5">
        <div className="flex gap-2">
          <div className="h-3.5 w-28 rounded-full bg-gray-800/80 shimmer" />
          <div className="h-3.5 w-14 rounded-full bg-gray-800/80 shimmer" />
        </div>
        <div className="h-2.5 w-3/4 rounded-full bg-gray-800/80 shimmer" />
        <div className="h-2 w-20 rounded-full bg-gray-800/80 shimmer" />
      </div>
      <div className="h-5 w-16 rounded-full bg-gray-800/80 shimmer shrink-0" />
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center py-24 gap-7 text-center"
    >
      {/* Orbital SVG */}
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
        <defs>
          <filter id="orb-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Rings */}
        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(108,92,231,0.18)" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="36" fill="none" stroke="rgba(108,92,231,0.25)" strokeWidth="1" />
        <circle cx="60" cy="60" r="20" fill="none" stroke="rgba(108,92,231,0.35)" strokeWidth="1" />

        {/* Center pulse ring — CSS animation avoids framer-motion SVG attr issues */}
        <circle
          cx="60" cy="60" r="10"
          fill="none" stroke="#6C5CE7" strokeWidth="1.5"
          style={{ transformOrigin: '60px 60px', animation: 'ring-pulse 2.2s ease-in-out infinite' }}
        />

        {/* Center dot */}
        <circle cx="60" cy="60" r="8" fill="#6C5CE7" opacity="0.95" filter="url(#orb-glow)" />

        {/* Outer orbiting dot */}
        <g style={{ transformOrigin: '60px 60px', animation: 'orbit-cw 8s linear infinite' }}>
          <circle cx="112" cy="60" r="4.5" fill="#6C5CE7" opacity="0.9" filter="url(#orb-glow)" />
        </g>

        {/* Middle orbiting dot */}
        <g style={{ transformOrigin: '60px 60px', animation: 'orbit-ccw 5s linear infinite' }}>
          <circle cx="96" cy="60" r="3.5" fill="#a78bfa" opacity="0.9" filter="url(#orb-glow)" />
        </g>

        {/* Inner orbiting dot */}
        <g style={{ transformOrigin: '60px 60px', animation: 'orbit-cw 3.5s linear infinite' }}>
          <circle cx="80" cy="60" r="2.5" fill="#e879f9" opacity="0.9" />
        </g>
      </svg>

      {/* Text block */}
      <div className="flex flex-col gap-2 items-center max-w-md">
        <h2 className="text-2xl font-semibold text-white">Aucune création pour l&apos;instant</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          Chaque création Velona vous libère des heures de travail manuel — lancez votre premier service dès maintenant
        </p>
        <p className="text-xs text-gray-600 italic mt-1">
          Rejoignez les 2 400+ utilisateurs qui automatisent leur business avec Velona
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/dashboard"
          className="relative overflow-hidden px-7 py-3 rounded-xl text-sm font-bold text-white group"
          style={{
            background: 'linear-gradient(135deg, #6C5CE7, #4834d4)',
            boxShadow: '0 8px 32px rgba(108,92,231,0.35)',
          }}
        >
          <span className="relative z-10">Découvrir les services →</span>
          <span
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
          />
        </Link>
        <Link
          href="/dashboard/help"
          className="px-7 py-3 rounded-xl text-sm font-semibold text-violet-300 hover:text-white transition-colors"
          style={{ border: '1px solid rgba(108,92,231,0.35)' }}
        >
          En savoir plus
        </Link>
      </div>
    </motion.div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────── */

export default function HistoryPage() {
  const { t } = useTranslation();
  const { session } = useAuth();

  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'type'>('newest');
  const [search, setSearch] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const fetchHistory = useCallback(async (p: number) => {
    if (!session?.access_token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/services/history?page=${p}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) throw new Error('Fetch failed');
      setData(await res.json());
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, t]);

  useEffect(() => { fetchHistory(page); }, [fetchHistory, page]);

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(id);
  }, [error]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      if (!spotlightRef.current) return;
      const rect = el.getBoundingClientRect();
      spotlightRef.current.style.background = `radial-gradient(400px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(108,92,231,0.1), transparent 60%)`;
      spotlightRef.current.style.opacity = '1';
    };
    const onLeave = () => { if (spotlightRef.current) spotlightRef.current.style.opacity = '0'; };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  /* Derived metrics */
  const { thisMonthCount, servicesUsedCount } = useMemo(() => {
    const items = data?.items ?? [];
    const now = new Date();
    const thisMonth = items.filter((o) => {
      const d = new Date(o.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const services = new Set(items.map((o) => o.service_type)).size;
    return { thisMonthCount: thisMonth, servicesUsedCount: services };
  }, [data]);

  const totalCount = data?.total ?? 0;

  const countUpTotal    = useCountUp(totalCount,             1200, !loading);
  const countUpMonth    = useCountUp(thisMonthCount,         1000, !loading);
  const countUpHours    = useCountUp(thisMonthCount * 2,     1100, !loading);
  const countUpServices = useCountUp(servicesUsedCount,       900, !loading);

  /* Filter + sort */
  const processedItems = useMemo(() => {
    let items = [...(data?.items ?? [])];
    if (activeFilter !== 'all') items = items.filter((o) => o.service_type === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((o) =>
        o.prompt.toLowerCase().includes(q) ||
        (SERVICE_META[o.service_type]?.label ?? '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'oldest') {
      items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'type') {
      items.sort((a, b) => a.service_type.localeCompare(b.service_type));
    } else {
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return items;
  }, [data, activeFilter, search, sortBy]);

  const hasItems = !loading && (data?.items?.length ?? 0) > 0;

  return (
    <>
      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error-toast"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="fixed top-4 right-4 z-50 rounded-xl shadow-xl px-5 py-4 flex items-center gap-3 max-w-sm"
            style={{ background: 'rgba(15,12,36,0.95)', border: '1px solid rgba(249,115,22,0.3)', backdropFilter: 'blur(16px)' }}
          >
            <span className="text-orange-400 text-sm flex-1">{error}</span>
            <button
              onClick={() => { setError(null); fetchHistory(page); }}
              className="text-orange-400 text-xs underline underline-offset-2 shrink-0"
            >
              {t('common.retry')}
            </button>
            <button
              onClick={() => setError(null)}
              className="text-gray-500 hover:text-gray-300 transition-colors text-base leading-none shrink-0"
              aria-label="Fermer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={containerRef} className="relative">
        {/* Cursor spotlight */}
        <div
          ref={spotlightRef}
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 rounded-3xl"
          style={{ opacity: 0 }}
          aria-hidden
        />

        {/* Background orbs + grid */}
        <div className="pointer-events-none select-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden>
          <motion.div
            className="absolute rounded-full"
            style={{ top: '-15%', right: '-8%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(108,92,231,0.12) 0%, transparent 70%)' }}
            animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{ bottom: '-10%', left: '-5%', width: 420, height: 420, background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%)' }}
            animate={{ x: [0, 30, 0], y: [0, -40, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{ top: '40%', left: '35%', width: 320, height: 320, background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)' }}
            animate={{ x: [0, -20, 0], y: [0, -20, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col gap-8">

          {/* ── HEADER ──────────────────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col gap-5"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-4xl font-bold text-white leading-tight">Historique</h1>
                <p className="text-sm text-gray-500 mt-1.5">
                  Toutes vos créations IA — suivez vos performances
                </p>
              </div>

              {/* Pulsing badge counter */}
              <motion.div
                animate={{ boxShadow: ['0 0 0 0 rgba(108,92,231,0)', '0 0 0 6px rgba(108,92,231,0.14)', '0 0 0 0 rgba(108,92,231,0)'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="flex items-center gap-2 rounded-full px-4 py-2 shrink-0 mt-1"
                style={{ background: 'rgba(108,92,231,0.15)', border: '1px solid rgba(108,92,231,0.3)' }}
              >
                <motion.span
                  className="w-2 h-2 rounded-full"
                  style={{ background: '#a78bfa' }}
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="text-sm font-semibold text-violet-300">
                  {loading ? '—' : countUpTotal} création{totalCount !== 1 ? 's' : ''}
                </span>
              </motion.div>
            </div>

            {/* 3 metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {([
                {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                    </svg>
                  ),
                  value: loading ? '—' : String(countUpMonth),
                  label: 'créations ce mois',
                  color: '#6C5CE7',
                },
                {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
                    </svg>
                  ),
                  value: loading ? '—' : `${countUpHours}h`,
                  label: 'économisées ce mois',
                  color: '#00b894',
                },
                {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/>
                    </svg>
                  ),
                  value: loading ? '—' : String(countUpServices),
                  label: 'services utilisés',
                  color: '#f97316',
                },
              ] as const).map(({ icon, value, label, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl px-5 py-4"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${color}22`, color }}
                  >
                    {icon}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white leading-none">{value}</p>
                    <p className="text-xs text-gray-500 mt-1">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ── FILTER BAR ──────────────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col gap-3"
          >
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-500">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une création..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(8px)',
                  border: search ? '1px solid rgba(108,92,231,0.5)' : '1px solid rgba(255,255,255,0.07)',
                  boxShadow: search ? '0 0 0 3px rgba(108,92,231,0.1)' : 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute inset-y-0 right-3.5 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Pills + sort */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {FILTER_PILLS.map((pill) => (
                  <button
                    key={pill.value}
                    onClick={() => setActiveFilter(pill.value)}
                    className="relative px-3.5 py-1.5 rounded-full text-sm font-medium"
                    style={{
                      color: activeFilter === pill.value ? '#fff' : '#9ca3af',
                      background: activeFilter === pill.value ? 'transparent' : 'rgba(255,255,255,0.04)',
                      border: activeFilter === pill.value ? 'none' : '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    {activeFilter === pill.value && (
                      <motion.div
                        layoutId="pill-active"
                        className="absolute inset-0 rounded-full"
                        style={{ background: '#6C5CE7', boxShadow: '0 4px 16px rgba(108,92,231,0.35)' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{pill.label}</span>
                  </button>
                ))}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-sm text-gray-400 rounded-xl px-3.5 py-1.5 focus:outline-none cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} style={{ background: '#0c0a24', color: '#fff' }}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </motion.section>

          {/* ── CONTENT ─────────────────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="flex flex-col gap-3"
          >
            {loading ? (
              <div className="flex flex-col gap-3">
                {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (data?.items?.length ?? 0) === 0 ? (
              <EmptyState />
            ) : processedItems.length === 0 ? (
              <div className="py-16 text-center text-gray-500 text-sm">
                Aucune création ne correspond à votre recherche
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <AnimatePresence mode="sync">
                  {processedItems.map((order, i) => (
                    <HistoryCard key={order.id} order={order} index={i} />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Pagination */}
            {hasItems && data && data.totalPages > 1 && !search && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-3 mt-4"
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  ← Précédent
                </button>
                <span className="text-sm text-gray-600">Page {page} / {data.totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  Suivant →
                </button>
              </motion.div>
            )}

            {hasItems && data && (
              <p className="text-center text-xs text-gray-700 mt-1">
                {data.total} création{data.total > 1 ? 's' : ''} au total
              </p>
            )}
          </motion.section>

        </div>
      </div>
    </>
  );
}
