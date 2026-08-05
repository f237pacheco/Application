'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  account_type: 'individual' | 'professional';
  company_name?: string;
  sector?: string;
  siret?: string;
  vat_number?: string;
  billing_address?: string;
  promo_code?: string;
  stripe_customer_id?: string;
  plan_key?: string;
}

export function useProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (res.ok) setProfile(await res.json());
    } catch (err) {
      // /api/auth/profile lives on the separate Express backend
      // (NEXT_PUBLIC_API_URL), not this Next.js app — it's expected to be
      // unreachable whenever that backend isn't running (e.g. only `web`
      // was started locally). That's a recoverable, non-blocking case:
      // callers already fall back gracefully with profile left null, so
      // this stays a warn (not error) to avoid looking like a real crash.
      console.warn('[useProfile] profil non chargé — backend (NEXT_PUBLIC_API_URL) injoignable', err);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { refetch(); }, [refetch]);

  return { profile, loading, refetch };
}
