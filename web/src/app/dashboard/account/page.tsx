'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/Button';
import { locales, localeNames, localeFlags, isRtl, type Locale } from '@/lib/i18n/config';
import i18n from '@/lib/i18n/client';
import { createClient } from '@/lib/supabase/client';
import { clsx } from 'clsx';

const PLAN_LABELS: Record<string, string> = {
  starter_individual: 'Starter — Particulier',
  starter_professional: 'Starter — Professionnel',
  pro_individual: 'Pro — Particulier',
  pro_professional: 'Pro — Professionnel',
  enterprise: 'Enterprise',
};

const NOTIF_OPTIONS = [
  { key: 'creation_done' as const,        label: 'Création terminée',          desc: 'Notifié quand une génération est prête' },
  { key: 'subscription_ending' as const,  label: 'Abonnement bientôt fini',    desc: 'Rappel avant expiration' },
  { key: 'product_news' as const,         label: 'Actualités produit',          desc: 'Nouvelles fonctionnalités et mises à jour' },
  { key: 'exclusive_offers' as const,     label: 'Offres exclusives',           desc: 'Promotions réservées aux membres' },
  { key: 'push_mobile' as const,          label: 'Push mobile',                 desc: 'Alertes directement sur votre téléphone' },
];

type NotifPrefs = Record<typeof NOTIF_OPTIONS[number]['key'], boolean>;

/* ── Toggle switch ──────────────────────────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0"
      style={{ background: checked ? '#6C5CE7' : '#374151' }}
    >
      <motion.div
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />
    </button>
  );
}

/* ── Animated counter ───────────────────────────────────────────────────────── */
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
  const { session, signOut, user } = useAuth();
  const { profile, loading } = useProfile();

  const [billingLoading, setBillingLoading] = useState(false);
  const [avatarColor, setAvatarColor] = useState('#6C5CE7');
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notifications state
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    creation_done: true,
    subscription_ending: true,
    product_news: false,
    exclusive_offers: false,
    push_mobile: false,
  });
  const [notifSaved, setNotifSaved] = useState(false);

  // Preferences (theme)
  const [isDark, setIsDark] = useState(true);

  const AVATAR_COLORS = ['#6C5CE7', '#4834d4', '#e91e8c', '#f97316', '#00b894', '#0984e3'];

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const getInitial = () => {
    const name = (user?.user_metadata?.full_name as string) || profile?.first_name || user?.email || '?';
    return name.charAt(0).toUpperCase();
  };

  const getPlanBadge = () => {
    const key = profile?.plan_key as string | undefined;
    if (!key) return { label: 'Compte gratuit', className: 'bg-gray-700 text-gray-400' };
    if (key === 'enterprise') return { label: 'Enterprise', className: 'bg-violet-500/20 text-violet-300 border border-violet-500/30' };
    if (key.startsWith('pro')) return { label: 'Pro', className: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' };
    if (key.startsWith('starter')) return { label: 'Starter', className: 'bg-orange-500/20 text-orange-300 border border-orange-500/30' };
    return { label: 'Compte gratuit', className: 'bg-gray-700 text-gray-400' };
  };

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

  const handleNotifChange = async (key: typeof NOTIF_OPTIONS[number]['key'], value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    try {
      const supabase = createClient();
      await supabase.from('user_preferences').upsert(
        { user_id: user?.id, notifications: updated },
        { onConflict: 'user_id' }
      );
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2000);
    } catch { /* silent */ }
  };

  const handleThemeToggle = (lightMode: boolean) => {
    setIsDark(!lightMode);
    if (lightMode) {
      document.documentElement.classList.add('light-mode');
      localStorage.setItem('velona_theme', 'light');
    } else {
      document.documentElement.classList.remove('light-mode');
      localStorage.setItem('velona_theme', 'dark');
    }
  };

  // Init preferences from storage / Supabase
  useEffect(() => {
    const theme = localStorage.getItem('velona_theme');
    if (theme === 'light') {
      setIsDark(false);
      document.documentElement.classList.add('light-mode');
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const loadPrefs = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('user_preferences')
        .select('notifications')
        .eq('user_id', user.id)
        .single();
      if (data?.notifications) setNotifPrefs(data.notifications as NotifPrefs);
    };
    loadPrefs();
  }, [user?.id]);

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

        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white overflow-hidden"
                style={{ background: avatarColor, boxShadow: '0 0 20px rgba(108,92,231,0.4)' }}
              >
                {avatarPhoto ? (
                  <img src={avatarPhoto} alt="avatar" className="w-full h-full object-cover" />
                ) : profile?.first_name || user?.user_metadata?.full_name || user?.email ? (
                  <span>{getInitial()}</span>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="12" r="6" fill="rgba(255,255,255,0.7)" />
                    <path d="M4 28c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              {avatarPhoto && (
                <button
                  onClick={() => setAvatarPhoto(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-900 hover:bg-red-700 border border-red-800 flex items-center justify-center z-10 transition-colors"
                >
                  <span className="text-white text-[10px] font-bold leading-none">×</span>
                </button>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-2 py-0.5 rounded-lg transition-all whitespace-nowrap"
            >
              Choisir une photo
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            <div className="flex gap-1.5 mt-0.5">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setAvatarColor(c)}
                  className="w-4 h-4 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: avatarColor === c ? 'white' : 'transparent' }}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <p className="text-lg font-bold text-white">
              {(user?.user_metadata?.full_name as string) || profile?.first_name}
            </p>
            <p className="text-sm text-gray-400">{profile?.email || user?.email}</p>
            {profile?.company_name && (
              <p className="text-xs text-gray-500 mt-0.5">🏢 {profile.company_name}</p>
            )}
            {(() => { const b = getPlanBadge(); return (
              <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium w-fit mt-1', b.className)}>{b.label}</span>
            ); })()}
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
            <Button onClick={handleBillingPortal} loading={billingLoading} variant="outline" size="sm">
              Gérer l&apos;abonnement →
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
              <p className="text-3xl font-extrabold" style={{ color: '#6C5CE7' }}>
                <AnimatedCounter target={value} />
              </p>
              <p className="text-xs text-gray-500 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NOTIFICATIONS */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Notifications</h2>
          <AnimatePresence>
            {notifSaved && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-xs text-success-DEFAULT font-medium"
              >
                ✓ Sauvegardé
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex flex-col gap-4">
          {NOTIF_OPTIONS.map((opt) => (
            <div key={opt.key} className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
              </div>
              <Toggle checked={notifPrefs[opt.key]} onChange={(v) => handleNotifChange(opt.key, v)} />
            </div>
          ))}
        </div>
      </section>

      {/* FACTURATION */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Facturation</h2>

        <div className="flex items-center justify-between py-3 border-b border-gray-800">
          <div>
            <p className="text-sm text-white font-medium">Plan actuel</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {PLAN_LABELS[profile?.plan_key as string] ?? 'Aucun plan actif'}
            </p>
          </div>
          <span className={clsx('w-2 h-2 rounded-full', profile?.plan_key ? 'bg-success-DEFAULT' : 'bg-red-500')} />
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-800">
          <div>
            <p className="text-sm text-white font-medium">Renouvellement</p>
            <p className="text-xs text-gray-500 mt-0.5">Géré automatiquement via Stripe</p>
          </div>
          <span className="text-xs text-gray-500">—</span>
        </div>

        <div className="flex items-center justify-between py-3 mb-3">
          <div>
            <p className="text-sm text-white font-medium">Moyen de paiement</p>
            <p className="text-xs text-gray-500 mt-0.5">Consultez le portail Stripe</p>
          </div>
          <span className="text-xs text-gray-500 font-mono">••••</span>
        </div>

        <Button onClick={handleBillingPortal} loading={billingLoading} variant="outline" size="sm">
          Gérer l&apos;abonnement →
        </Button>
      </section>

      {/* PRÉFÉRENCES */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Préférences</h2>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-white font-medium">Mode clair</p>
            <p className="text-xs text-gray-500 mt-0.5">Basculer entre le mode sombre et clair</p>
          </div>
          <Toggle checked={!isDark} onChange={(v) => handleThemeToggle(v)} />
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

      {/* PROGRAMME PARTENAIRE condensé */}
      <section
        className="rounded-2xl p-5 flex items-center gap-4"
        style={{ background: 'rgba(108,92,231,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(108,92,231,0.2)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(108,92,231,0.15)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="9" cy="7" r="4" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Programme Partenaire</p>
          <p className="text-xs text-gray-400 mt-0.5">Partagez Velona et gagnez des récompenses</p>
        </div>
        <Link
          href="/dashboard/partner"
          className="text-xs font-semibold px-4 py-2 rounded-xl text-violet-300 border border-violet-500/30 hover:bg-violet-500/10 transition-colors whitespace-nowrap shrink-0"
        >
          Découvrir →
        </Link>
      </section>

      {/* Danger zone */}
      <section className="border border-red-500/20 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Déconnexion</p>
          <p className="text-xs text-gray-500 mt-0.5">Vous serez redirigé vers l&apos;écran de connexion</p>
        </div>
        <Button onClick={() => signOut()} variant="outline" size="sm" className="border-red-500/40 text-red-400 hover:bg-red-500/10">
          Se déconnecter
        </Button>
      </section>
    </div>
  );
}
