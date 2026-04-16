'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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

export default function HistoryPage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

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

  const getService = (id: string) => SERVICES.find((s) => s.id === id);

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('dashboard.history')}</h1>
        <p className="text-gray-400 text-sm mt-1">Toutes vos générations IA</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm text-center">
          {error}
          <button onClick={() => fetchHistory(page)} className="ml-3 underline">
            {t('common.retry')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <span className="text-6xl">📭</span>
          <p className="text-lg font-semibold text-white">Aucune génération pour l'instant</p>
          <p className="text-gray-500 text-sm max-w-xs">
            Vos futures créations IA apparaîtront ici. Choisissez un service pour commencer.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {data.items.map((order) => {
              const service = getService(order.service_type);
              const status = STATUS_CONFIG[order.status];
              return (
                <div
                  key={order.id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-start gap-4 hover:border-gray-700 transition-colors"
                >
                  {/* Service icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: service ? `${service.color}22` : '#1f2937' }}
                  >
                    {service?.icon ?? '🤖'}
                  </div>

                  {/* Content */}
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

                  {/* Action */}
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

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
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

          <p className="text-center text-xs text-gray-600">
            {data.total} génération{data.total > 1 ? 's' : ''} au total
          </p>
        </>
      )}
    </div>
  );
}
