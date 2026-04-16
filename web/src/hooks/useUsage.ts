'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface UsageSummary {
  usage: Record<string, number>;
  limit: number | null; // null = unlimited
  planKey: string | null;
  periodStart: string;
}

export function useUsage() {
  const { session } = useAuth();
  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/services/usage/summary`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch usage');
      setData(await res.json());
    } catch {
      setError('Impossible de charger les données d\'utilisation');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { refetch(); }, [refetch]);

  /** Returns usage % for a given service (0–100) */
  const getPercent = (serviceType: string): number => {
    if (!data || data.limit === null) return 0;
    return Math.min(100, Math.round(((data.usage[serviceType] ?? 0) / data.limit) * 100));
  };

  /** True if any service is over 80% of its limit */
  const isNearLimit = (): boolean => {
    if (!data || data.limit === null) return false;
    return Object.values(data.usage).some(
      (used) => data.limit !== null && used / data.limit >= 0.8
    );
  };

  return { data, loading, error, refetch, getPercent, isNearLimit };
}
