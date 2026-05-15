'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/Button';
import { locales, localeNames, localeFlags, isRtl, type Locale } from '@/lib/i18n/config';
import i18n from '@/lib/i18n/client';
import { clsx } from 'clsx';

const PLAN_LABELS: Record<string, string> = {
  starter_individual: 'Starter — Particulier',
  starter_professional: 'Starter — Professionnel',
  pro_individual: 'Pro — Particulier',
  pro_professional: 'Pro — Professionnel',
  enterprise: 'Enterprise',
};

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setCount(current);
      if (current >= target) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [target]);

  return <span>{count}</span>;
}

export default function AccountPage() {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();
  const { profile, loading } = useProfile();

  const [partnerUrl, setPartnerUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [billingLoading, setBillingLoading] = useState(false);

  const handleLanguageChange = async (locale: Locale) => {
    await i18n.changeLanguage(locale);
    localStorage.setItem('velona_language', locale);
    document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  };

  const handleBillingPortal = async () => {
    try {
      setBillingLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/create-portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ returnUrl: `${window.location.origin}/dashboard/account` }),
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      alert(t('common.error'));
    } finally {
      setBillingLoading(false);
    }
  };

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerUrl.trim()) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/partner/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ url: partnerUrl.trim() }),
      });
      setSubmitStatus(res.ok ? 'success' : 'error');
      if (res.ok) setPartnerUrl('');
    } catch {
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const currentLang = (i18n.language?.slice(0, 2) ?? 'fr') as Locale;

  const daysActive = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">{t('dashboard.account')}</h1>

      {/* Profile card */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Profil</h2>

        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #6C5CE7, #4834d4)',
              boxShadow: '0 0 20px rgba(108,92,231,0.4)',
            }}
          >
            {profile?.first_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="text-lg font-bold text-white">{profile?.first_name}</p>
            <p className="text-sm text-gray-400">{profile?.email}</p>
            {profile?.company_name && (
              <p className="text-xs text-gray-500 mt-0.5">🏢 {profile.company_name}</p>
            )}
          </div>
        </div>

        {profile?.account_type && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-400">
              {profile.account_type === 'individual' ? 'Particulier' : 'Professionnel'}
            </span>
            {profile.sector && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-400">
                {profile.sector}
              </span>
            )}
          </div>
        )}
      </section>

      {/* Subscription card */}
      <section
        className={clsx(
          'bg-gray-900 rounded-2xl p-6 flex flex-col gap-4',
          profile?.plan_key
            ? 'border border-gray-800'
            : 'border border-orange-500/50 animate-pulse'
        )}
      >
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Abonnement</h2>

        {profile?.plan_key ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">
                  {PLAN_LABELS[profile.plan_key as string] ?? profile.plan_key}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Abonnement actif</p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-success-DEFAULT" />
            </div>
            <Button
              onClick={handleBillingPortal}
              loading={billingLoading}
              variant="outline"
              size="sm"
            >
              Gérer l'abonnement →
            </Button>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <p className="text-white font-semibold">Aucun abonnement actif</p>
            </div>
            <p className="text-sm text-red-400">Vos services sont limités</p>
            <a
              href="/plans"
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl font-bold text-white text-sm transition-all"
              style={{
                background: 'linear-gradient(135deg, #6C5CE7, #4834d4)',
                boxShadow: '0 0 16px rgba(108,92,231,0.35)',
              }}
            >
              Activer maintenant →
            </a>
          </div>
        )}
      </section>

      {/* Stats section */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Statistiques</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Générations utilisées', value: 0 },
            { label: 'Jours actif', value: daysActive },
            { label: 'Services utilisés', value: 0 },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1">
              <p
                className="text-3xl font-extrabold"
                style={{ color: '#6C5CE7' }}
              >
                <AnimatedCounter target={value} />
              </p>
              <p className="text-xs text-gray-500 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Language */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Langue</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {locales.map((locale) => {
            const isSelected = currentLang === locale;
            return (
              <motion.button
                key={locale}
                onClick={() => handleLanguageChange(locale)}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.15 }}
                className={clsx(
                  'flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all',
                  isSelected
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                )}
                style={
                  isSelected
                    ? { boxShadow: 'inset 0 0 0 2px #6C5CE7, 0 0 12px rgba(108,92,231,0.3)' }
                    : undefined
                }
              >
                <span className="text-2xl">{localeFlags[locale]}</span>
                <span className={clsx('text-xs', isSelected ? 'text-primary-300' : 'text-gray-500')}>
                  {localeNames[locale]}
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Partner programme */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
            {t('partner.title')}
          </h2>
          <p className="text-xs text-gray-500">{t('partner.description')}</p>
        </div>

        {/* Promo code */}
        {profile?.promo_code && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">{t('partner.yourCode')}</p>
              <p className="text-lg font-bold tracking-widest text-primary-300 font-mono">
                {profile.promo_code}
              </p>
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(profile.promo_code!)}
              className="text-xs text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-all"
            >
              Copier
            </button>
          </div>
        )}

        {/* Submit form */}
        <form onSubmit={handlePartnerSubmit} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-200">{t('partner.submitLink')}</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={partnerUrl}
              onChange={(e) => { setPartnerUrl(e.target.value); setSubmitStatus('idle'); }}
              placeholder={t('partner.linkPlaceholder')}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
            <Button type="submit" loading={submitting} size="sm" disabled={!partnerUrl.trim()}>
              {t('partner.submit')}
            </Button>
          </div>

          {submitStatus === 'success' && (
            <p className="text-xs text-success-DEFAULT">✓ Lien soumis ! Validation sous 24-48h.</p>
          )}
          {submitStatus === 'error' && (
            <p className="text-xs text-red-400">Erreur, vérifiez l'URL ou réessayez.</p>
          )}
        </form>
      </section>

      {/* Danger zone */}
      <section className="border border-red-500/20 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Déconnexion</p>
          <p className="text-xs text-gray-500 mt-0.5">Vous serez redirigé vers l'écran de connexion</p>
        </div>
        <Button onClick={() => signOut()} variant="outline" size="sm" className="border-red-500/40 text-red-400 hover:bg-red-500/10">
          Se déconnecter
        </Button>
      </section>
    </div>
  );
}
