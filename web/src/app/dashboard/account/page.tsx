'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useUsage } from '@/hooks/useUsage';
import { locales, localeNames, localeFlags, isRtl, type Locale } from '@/lib/i18n/config';
import i18n from '@/lib/i18n/client';
import { createClient } from '@/lib/supabase/client';

/* ── Constants ──────────────────────────────────────────────────────────────── */

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  starter_individual:   { label: 'Starter',    color: '#fb923c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
  starter_professional: { label: 'Starter Pro', color: '#fb923c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
  pro_individual:       { label: 'Pro',         color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  pro_professional:     { label: 'Pro',         color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  enterprise:           { label: 'Enterprise',  color: '#a78bfa', bg: 'rgba(108,92,231,0.15)', border: 'rgba(108,92,231,0.35)' },
};

const FREE_PLAN = { label: 'Compte gratuit', color: '#6b7280', bg: 'rgba(75,85,99,0.15)', border: 'rgba(75,85,99,0.25)' };

const AVATAR_COLORS = ['#6C5CE7', '#4834d4', '#e91e8c', '#f97316', '#00b894', '#0984e3'] as const;

const NOTIF_OPTIONS = [
  { key: 'creation_done' as const,       label: 'Création terminée',         desc: 'Notifié quand une génération est prête' },
  { key: 'subscription_ending' as const, label: 'Abonnement bientôt fini',   desc: 'Rappel avant expiration de votre plan' },
  { key: 'product_news' as const,        label: 'Actualités produit',         desc: 'Nouvelles fonctionnalités et mises à jour' },
  { key: 'exclusive_offers' as const,    label: 'Offres exclusives',          desc: 'Promotions réservées aux membres' },
  { key: 'push_mobile' as const,         label: 'Push mobile',                desc: 'Alertes directement sur votre téléphone', isMobile: true },
] as const;

type NotifPrefs = Record<typeof NOTIF_OPTIONS[number]['key'], boolean>;

const DAY_ABBR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function useCountUp(target: number, duration = 1300, enabled = true) {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (!enabled || target === 0) { setCurrent(0); return; }
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setCurrent(Math.round((1 - Math.pow(1 - progress, 3)) * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, enabled]);
  return current;
}

/* ── Toggle component ───────────────────────────────────────────────────────── */

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full shrink-0"
      style={{ background: checked ? '#6C5CE7' : 'rgba(75,85,99,0.5)', transition: 'background 0.2s' }}
    >
      <motion.div
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />
    </button>
  );
}

/* ── Card wrapper ────────────────────────────────────────────────────────────── */

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`relative rounded-2xl p-6 sm:p-8 ${className}`}
      style={{ background: 'rgba(15,12,36,0.82)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {children}
    </motion.section>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactElement }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {icon && (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(108,92,231,0.18)', color: '#a78bfa' }}>
          {icon}
        </div>
      )}
      <h2 className="text-base font-bold text-white">{children}</h2>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(108,92,231,0.35), transparent)' }} />
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────── */

export default function AccountPage() {
  const { session, signOut, user } = useAuth();
  const { profile, loading } = useProfile();
  const { data: usage } = useUsage();

  const [billingLoading, setBillingLoading] = useState(false);
  const [avatarColor, setAvatarColor] = useState<string>('#6C5CE7');
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    creation_done: true, subscription_ending: true,
    product_news: false, exclusive_offers: false, push_mobile: false,
  });
  const [notifSaved, setNotifSaved] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Derived data */
  const planInfo = PLAN_LABELS[profile?.plan_key as string] ?? FREE_PLAN;
  const hasPlan = !!profile?.plan_key;

  const totalCreations = usage ? Object.values(usage.usage).reduce((a, b) => a + b, 0) : 0;
  const hoursSaved = totalCreations * 2;
  const daysActive = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86_400_000)
    : 0;

  const countCreations = useCountUp(totalCreations, 1200, !loading);
  const countHours     = useCountUp(hoursSaved, 1100, !loading);
  const countDays      = useCountUp(daysActive, 1000, !loading);

  const currentLang = (i18n.language?.slice(0, 2) ?? 'fr') as Locale;

  const last7Days = useMemo(() => {
    return [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { label: DAY_ABBR[d.getDay()], value: 0 };
    });
  }, []);

  /* Cursor spotlight */
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
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, []);

  /* Theme init */
  useEffect(() => {
    if (localStorage.getItem('velona_theme') === 'light') {
      setIsDark(false);
      document.documentElement.classList.add('light-mode');
    }
  }, []);

  /* Load notification prefs */
  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('user_preferences').select('notifications').eq('user_id', user.id).single();
      if (data?.notifications) setNotifPrefs(data.notifications as NotifPrefs);
    };
    load();
  }, [user?.id]);

  const getInitial = () => {
    const name = (user?.user_metadata?.full_name as string) || profile?.first_name || user?.email || '?';
    return name.charAt(0).toUpperCase();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleBillingPortal = async () => {
    try {
      setBillingLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/create-portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ returnUrl: `${window.location.origin}/dashboard/account` }),
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.location.href = url;
    } catch { /* silent */ }
    finally { setBillingLoading(false); }
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

  const handleLanguageChange = async (locale: Locale) => {
    await i18n.changeLanguage(locale);
    localStorage.setItem('velona_language', locale);
    document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-5 max-w-7xl mx-auto px-6 lg:px-10">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-36 rounded-2xl shimmer" style={{ background: 'rgba(15,12,36,0.6)', border: '1px solid rgba(255,255,255,0.05)' }} />
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Cursor spotlight */}
      <div ref={spotlightRef} className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 rounded-3xl" style={{ opacity: 0 }} aria-hidden />

      {/* Background orbs + grid */}
      <div className="pointer-events-none select-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden>
        <motion.div className="absolute rounded-full"
          style={{ top: '-10%', right: '-6%', width: 520, height: 520, background: 'radial-gradient(circle, rgba(108,92,231,0.11) 0%, transparent 70%)' }}
          animate={{ x: [0, -40, 0], y: [0, 28, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div className="absolute rounded-full"
          style={{ bottom: '-8%', left: '-4%', width: 440, height: 440, background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%)' }}
          animate={{ x: [0, 32, 0], y: [0, -32, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div className="absolute rounded-full"
          style={{ top: '50%', left: '40%', width: 320, height: 320, background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)' }}
          animate={{ x: [0, -18, 0], y: [0, -22, 0] }}
          transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-6 px-6 lg:px-10">

        {/* Page title */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}>
          <h1 className="text-4xl font-bold text-white">Mon compte</h1>
          <p className="text-sm text-gray-500 mt-1.5">Gérez votre profil, abonnement et préférences</p>
        </motion.div>

        {/* ── PROFILE ─────────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionTitle icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          }>Profil</SectionTitle>

          <div className="flex flex-col sm:flex-row items-start gap-8">
            {/* Avatar column */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="relative">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}cc)`, boxShadow: `0 0 28px ${avatarColor}55` }}
                >
                  {avatarPhoto ? (
                    <img src={avatarPhoto} alt="avatar" className="w-full h-full object-cover" />
                  ) : (profile?.first_name || user?.user_metadata?.full_name || user?.email) ? (
                    <span>{getInitial()}</span>
                  ) : (
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <circle cx="20" cy="15" r="8" fill="rgba(255,255,255,0.7)" />
                      <path d="M4 36c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                {avatarPhoto && (
                  <button
                    onClick={() => setAvatarPhoto(null)}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center z-10"
                    style={{ background: '#ef4444', border: '2px solid rgba(15,12,36,1)' }}
                  >
                    <span className="text-white text-xs font-bold leading-none">×</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Choisir une photo
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

              {/* Color picker */}
              <div className="flex gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAvatarColor(c)}
                    className="w-5 h-5 rounded-full transition-transform"
                    style={{
                      backgroundColor: c,
                      outline: avatarColor === c ? `2px solid ${c}` : 'none',
                      outlineOffset: '2px',
                      transform: avatarColor === c ? 'scale(1.25)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Info column */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-2xl font-bold text-white leading-tight">
                    {(user?.user_metadata?.full_name as string) || profile?.first_name || '—'}
                  </h3>
                  <p className="text-sm text-gray-400">{profile?.email || user?.email}</p>
                  {profile?.company_name && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <span>🏢</span> {profile.company_name}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: planInfo.bg, border: `1px solid ${planInfo.border}`, color: planInfo.color }}
                    >
                      {planInfo.label}
                    </span>
                    {profile?.account_type && (
                      <span className="text-xs px-2.5 py-1 rounded-full text-gray-400" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {profile.account_type === 'individual' ? 'Particulier' : 'Professionnel'}
                      </span>
                    )}
                    {profile?.sector && (
                      <span className="text-xs px-2.5 py-1 rounded-full text-gray-400" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {profile.sector}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setEditMode((v) => !v)}
                  className="text-sm font-semibold px-4 py-2 rounded-xl transition-colors shrink-0"
                  style={{ border: '1px solid rgba(108,92,231,0.4)', color: '#a78bfa', background: editMode ? 'rgba(108,92,231,0.12)' : 'transparent' }}
                >
                  {editMode ? 'Annuler' : 'Modifier le profil'}
                </button>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── ABONNEMENT ──────────────────────────────────────────────────── */}
        {hasPlan ? (
          <SectionCard>
            <SectionTitle icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
              </svg>
            }>Abonnement</SectionTitle>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" style={{ boxShadow: '0 0 8px rgba(52,211,153,0.6)' }} />
                <div>
                  <p className="text-base font-semibold text-white">
                    {PLAN_LABELS[profile?.plan_key as string]?.label ?? profile?.plan_key ?? 'Plan actif'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Abonnement actif · Renouvelé automatiquement via Stripe</p>
                </div>
              </div>
              <button
                onClick={handleBillingPortal}
                disabled={billingLoading}
                className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                style={{ border: '1px solid rgba(108,92,231,0.4)', color: '#a78bfa' }}
              >
                {billingLoading ? 'Chargement...' : 'Gérer l\'abonnement →'}
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Type', value: 'Mensuel', icon: '📅' },
                { label: 'Renouvellement', value: 'Portail Stripe', icon: '🔄' },
                { label: 'Paiement', value: '•••• ••••', icon: '💳' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-base shrink-0">{icon}</span>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-semibold text-gray-300">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            animate={{ boxShadow: ['0 0 0 0 rgba(249,115,22,0)', '0 0 0 6px rgba(249,115,22,0.18)', '0 0 0 0 rgba(249,115,22,0)'] }}
            className="relative rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
            style={{ background: 'rgba(15,12,36,0.82)', backdropFilter: 'blur(12px)', border: '1px solid rgba(249,115,22,0.4)' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(249,115,22,0.15)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fb923c">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
              </div>
              <div>
                <p className="text-base font-bold text-white">Aucun abonnement actif</p>
                <p className="text-sm text-orange-400 mt-0.5">Vos services sont limités — activez un plan pour tout débloquer</p>
              </div>
            </div>
            <motion.a
              href="/checkout/plans"
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative overflow-hidden px-6 py-3 rounded-xl text-sm font-bold text-white shrink-0 group"
              style={{ background: 'linear-gradient(135deg, #6C5CE7, #4834d4)', boxShadow: '0 8px 28px rgba(108,92,231,0.35)' }}
            >
              <span className="relative z-10">Activer maintenant →</span>
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
            </motion.a>
          </motion.section>
        )}

        {/* ── STATISTIQUES ────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionTitle icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
          }>Statistiques</SectionTitle>

          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Créations totales', value: countCreations, color: '#6C5CE7', icon: '✦' },
              { label: 'Heures économisées', value: `${countHours}h`, color: '#00b894', icon: '⏱' },
              { label: 'Jours actif', value: countDays, color: '#f97316', icon: '📅' },
            ].map(({ label, value, color, icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-lg shrink-0">{icon}</span>
                <div>
                  <p className="text-2xl font-extrabold leading-none" style={{ color }}>{value}</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 7-day activity chart */}
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wider mb-4">Activité — 7 derniers jours</p>
            <div className="flex items-end gap-2 h-20">
              {last7Days.map(({ label, value }, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center" style={{ height: 56 }}>
                    <motion.div
                      className="w-full rounded-t-md"
                      style={{ backgroundColor: '#6C5CE7', minHeight: 3 }}
                      initial={{ height: 3 }}
                      whileInView={{ height: value > 0 ? Math.max(3, (value / Math.max(...last7Days.map((d) => d.value), 1)) * 52) : 3 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-600 font-medium">{label}</span>
                </div>
              ))}
            </div>
            {totalCreations === 0 && (
              <p className="text-center text-xs text-gray-700 mt-3 italic">Aucune activité — vos statistiques apparaîtront ici après vos premières créations</p>
            )}
          </div>
        </SectionCard>

        {/* ── NOTIFICATIONS ───────────────────────────────────────────────── */}
        <SectionCard>
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(108,92,231,0.18)', color: '#a78bfa' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>
              </div>
              <h2 className="text-base font-bold text-white">Notifications</h2>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(108,92,231,0.35), transparent)' }} />
            </div>
            <AnimatePresence>
              {notifSaved && (
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-xs font-semibold text-emerald-400 flex items-center gap-1 shrink-0"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  Sauvegardé
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col gap-4">
            {NOTIF_OPTIONS.map((opt) => (
              <div key={opt.key} className="flex items-center justify-between gap-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white font-medium">{opt.label}</p>
                    {opt.isMobile && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
                        Mobile
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
                <Toggle checked={notifPrefs[opt.key]} onChange={(v) => handleNotifChange(opt.key, v)} />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── FACTURATION ─────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionTitle icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
            </svg>
          }>Facturation</SectionTitle>

          <div className="flex flex-col gap-0">
            {[
              {
                label: 'Plan actuel',
                value: PLAN_LABELS[profile?.plan_key as string]?.label ?? 'Aucun plan actif',
                accent: hasPlan ? '#34d399' : '#f87171',
                dot: true,
              },
              { label: 'Renouvellement', value: 'Géré automatiquement via Stripe', accent: '#6b7280', dot: false },
              { label: 'Moyen de paiement', value: '•••• •••• •••• ••••', accent: '#6b7280', dot: false },
            ].map(({ label, value, accent, dot }) => (
              <div key={label} className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <p className="text-sm text-white font-medium">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{value}</p>
                </div>
                {dot && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: accent, boxShadow: `0 0 6px ${accent}80` }} />}
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={handleBillingPortal}
              disabled={billingLoading}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
              style={{ border: '1px solid rgba(108,92,231,0.4)', color: '#a78bfa' }}
            >
              {billingLoading ? 'Chargement...' : 'Portail de facturation →'}
            </button>
            {!hasPlan && (
              <a
                href="/checkout/plans"
                className="text-sm font-bold px-5 py-2.5 rounded-xl text-white"
                style={{ background: 'linear-gradient(135deg, #6C5CE7, #4834d4)' }}
              >
                Activer un plan
              </a>
            )}
          </div>
        </SectionCard>

        {/* ── PRÉFÉRENCES ─────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionTitle icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          }>Préférences</SectionTitle>

          {/* Theme toggle */}
          <div className="flex items-center justify-between gap-4 py-3 mb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-3">
              <AnimatePresence mode="wait">
                {isDark ? (
                  <motion.div key="moon" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 30 }} transition={{ duration: 0.25 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#a78bfa">
                      <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
                    </svg>
                  </motion.div>
                ) : (
                  <motion.div key="sun" initial={{ scale: 0, rotate: 30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: -30 }} transition={{ duration: 0.25 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fbbf24">
                      <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/>
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
              <div>
                <p className="text-sm text-white font-medium">{isDark ? 'Mode sombre' : 'Mode clair'}</p>
                <p className="text-xs text-gray-500 mt-0.5">Basculer l&apos;apparence de l&apos;interface</p>
              </div>
            </div>
            <Toggle checked={!isDark} onChange={(v) => handleThemeToggle(v)} />
          </div>

          {/* Language picker */}
          <div className="pt-4">
            <p className="text-xs text-gray-600 uppercase tracking-wider mb-3">Langue</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {locales.map((locale) => {
                const isSelected = currentLang === locale;
                return (
                  <motion.button
                    key={locale}
                    onClick={() => handleLanguageChange(locale)}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all"
                    style={{
                      border: isSelected ? '1px solid rgba(108,92,231,0.5)' : '1px solid rgba(255,255,255,0.07)',
                      background: isSelected ? 'rgba(108,92,231,0.12)' : 'rgba(255,255,255,0.03)',
                      boxShadow: isSelected ? '0 0 12px rgba(108,92,231,0.2)' : 'none',
                    }}
                  >
                    <span className="text-xl">{localeFlags[locale]}</span>
                    <span className="text-[10px] font-medium" style={{ color: isSelected ? '#a78bfa' : '#6b7280' }}>
                      {localeNames[locale]}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {/* ── PROGRAMME PARTENAIRE ────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative flex items-center gap-5 rounded-2xl p-5 overflow-hidden"
          style={{ background: 'rgba(108,92,231,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(108,92,231,0.22)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(108,92,231,0.5), transparent)' }} />
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(108,92,231,0.18)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#a78bfa">
              <path d="M20 6h-2.18c.07-.24.18-.47.18-.75C18 3.45 16.55 2 14.75 2c-.86 0-1.6.36-2.15.94L12 3.43l-.6-.49C10.85 2.36 10.11 2 9.25 2 7.45 2 6 3.45 6 5.25c0 .28.11.51.18.75H4c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v7c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-7h1c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5-2.5c.69 0 1.25.56 1.25 1.25S15.69 6 15 6h-2.09c.28-.64.89-2.5 2.09-2.5zM9.25 3.5c1.19 0 1.8 1.85 2.09 2.5H9.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25zM11 19H7v-7h4v7zm0-9H4V8h7v2zm2 9v-7h4v7h-4zm6-9h-7V8h7v2z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Programme Partenaire</p>
            <p className="text-xs text-gray-400 mt-0.5">Partagez Velona et gagnez jusqu&apos;à 1 mois offert par partage validé</p>
          </div>
          <Link
            href="/dashboard/partner"
            className="text-xs font-bold px-4 py-2 rounded-xl text-violet-300 hover:text-white transition-colors shrink-0"
            style={{ border: '1px solid rgba(108,92,231,0.35)' }}
          >
            Découvrir →
          </Link>
        </motion.section>

        {/* ── DANGER ZONE ─────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex items-center justify-between gap-4 rounded-2xl p-5 mb-10"
          style={{ border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <div>
            <p className="text-sm font-semibold text-white">Déconnexion</p>
            <p className="text-xs text-gray-500 mt-0.5">Vous serez redirigé vers l&apos;écran de connexion</p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            style={{ border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}
          >
            Se déconnecter
          </button>
        </motion.section>

      </div>
    </div>
  );
}
