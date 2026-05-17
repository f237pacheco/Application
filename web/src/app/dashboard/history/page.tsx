'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { SERVICES } from '@/lib/services';
import { clsx } from 'clsx';

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

const STATUS_CONFIG = {
  queued:     { label: 'En attente',   color: 'text-gray-400 bg-gray-800', dot: 'bg-gray-500' },
  processing: { label: 'En cours',     color: 'text-blue-400 bg-blue-500/10', dot: 'bg-blue-400 animate-pulse' },
  completed:  { label: 'Terminé',      color: 'text-success-DEFAULT bg-success-DEFAULT/10', dot: 'bg-success-DEFAULT' },
  failed:     { label: 'Échec',        color: 'text-red-400 bg-red-500/10', dot: 'bg-red-500' },
};

const FILTER_PILLS = [
  { label: 'Tout',             value: 'all' },
  { label: 'Sites web',        value: 'website' },
  { label: 'Vidéos',           value: 'video' },
  { label: 'Réseaux sociaux',  value: 'social' },
];

export default function HistoryPage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

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
    const container = containerRef.current;
    if (!container) return;
    const onMove = (e: MouseEvent) => {
      if (!spotlightRef.current) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spotlightRef.current.style.background = `radial-gradient(500px circle at ${x}px ${y}px, rgba(108,92,231,0.06), transparent 60%)`;
      spotlightRef.current.style.opacity = '1';
    };
    const onLeave = () => { if (spotlightRef.current) spotlightRef.current.style.opacity = '0'; };
    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', onLeave);
    return () => {
      container.removeEventListener('mousemove', onMove);
      container.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  const getService = (id: string) => SERVICES.find((s) => s.id === id);

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));

  const filteredItems = (data?.items ?? []).filter((order) => {
    if (activeFilter === 'all') return true;
    return order.service_type.includes(activeFilter);
  });

  return (
    <>
      <AnimatePresence>
        {error && (
          <motion.div
            key="error-toast"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="fixed top-4 right-4 z-50 bg-gray-800 border border-orange-500/30 rounded-xl shadow-xl px-5 py-4 flex items-center gap-3 max-w-sm"
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

      <div ref={containerRef} className="relative flex flex-col gap-6">
        {/* Cursor spotlight */}
        <div
          ref={spotlightRef}
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 rounded-3xl"
          style={{ opacity: 0 }}
          aria-hidden
        />

        {/* Gradient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden>
          <div
            className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-[80px]"
            style={{ background: 'rgba(108,92,231,0.12)' }}
          />
          <div
            className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full blur-[70px]"
            style={{ background: 'rgba(99,102,241,0.09)' }}
          />
        </div>

        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white">{t('dashboard.history')}</h1>
          <p className="text-gray-400 text-sm mt-1">Toutes vos générations IA</p>
        </div>

        {/* Filter pills — spring layoutId animation */}
        <div className="relative z-10 flex items-center gap-2 flex-wrap">
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill.value}
              onClick={() => setActiveFilter(pill.value)}
              className={clsx(
                'relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200',
                activeFilter === pill.value
                  ? 'text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700'
              )}
            >
              {activeFilter === pill.value && (
                <motion.div
                  layoutId="pill-active"
                  className="absolute inset-0 rounded-full bg-violet-600 shadow-md shadow-violet-500/20"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{pill.label}</span>
            </button>
          ))}
        </div>

        <div className="relative z-10">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
              ))}
            </div>
          ) : !data?.items.length ? (
            <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              >
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#6C5CE7" strokeWidth="1.5" opacity="0.3"/>
                  <circle cx="40" cy="40" r="20" fill="none" stroke="#6C5CE7" strokeWidth="2" opacity="0.5"/>
                  <circle cx="40" cy="40" r="10" fill="#6C5CE7" opacity="0.8"/>
                </svg>
              </motion.div>
              <div>
                <p className="text-lg font-semibold text-white">Aucune génération pour l&apos;instant</p>
                <p className="text-gray-500 text-sm max-w-xs mt-1">
                  Vos futures créations IA apparaîtront ici. Choisissez un service pour commencer.
                </p>
                <p className="text-gray-500 text-xs mt-2 max-w-sm text-center">
                  Chaque création Velona vous libère des heures de travail manuel
                </p>
              </div>
              <Link
                href="/dashboard"
                className="relative overflow-hidden px-8 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 transition-colors shadow-lg shadow-violet-500/20 group"
              >
                <span className="relative z-10">Commencer maintenant →</span>
                <span
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                  }}
                />
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {filteredItems.map((order) => {
                  const service = getService(order.service_type);
                  const status = STATUS_CONFIG[order.status];
                  return (
                    <div
                      key={order.id}
                      className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-start gap-4 hover:border-gray-700 transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{ background: service ? `${service.color}22` : '#1f2937' }}
                      >
                        {service?.icon ?? '🤖'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-white">
                            {service ? t(`${service.i18nKey}.name`) : order.service_type}
                          </span>
                          <span className={clsx('text-xs px-2 py-0.5 rounded-full flex items-center gap-1', status.color)}>
                            <span className={clsx('w-1.5 h-1.5 rounded-full', status.dot)} />
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate" title={order.prompt}>
                          {order.prompt}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">{formatDate(order.created_at)}</p>
                      </div>
                      {order.result_url && order.status === 'completed' && (
                        <a
                          href={order.result_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors shrink-0 mt-1"
                        >
                          Voir →
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>

              {data.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-sm text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
                  >
                    ← Précédent
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {page} / {data.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-sm text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
                  >
                    Suivant →
                  </button>
                </div>
              )}

              <p className="text-center text-xs text-gray-600 mt-2">
                {data.total} génération{data.total > 1 ? 's' : ''} au total
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
