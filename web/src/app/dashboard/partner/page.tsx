'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

interface Stats {
  totalSubmissions: number;
  approvedSubmissions: number;
  pendingSubmissions: number;
  rejectedSubmissions: number;
  promoUses: number;
}

interface Submission {
  id: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  reward_type: 'free_month' | 'plan_upgrade';
  created_at: string;
}

/* ── Constants ──────────────────────────────────────────────────────────────── */

const STATUS_CONFIG = {
  pending:  { label: 'En attente', textColor: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.28)' },
  approved: { label: 'Approuvé',   textColor: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  rejected: { label: 'Refusé',     textColor: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.28)' },
} as const;

const REWARD_LABELS = {
  free_month:   '-15% sur votre prochain mois',
  plan_upgrade: 'Upgrade de plan',
};

const REWARDS = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 6h-2.18c.07-.24.18-.47.18-.75C18 3.45 16.55 2 14.75 2c-.86 0-1.6.36-2.15.94L12 3.43l-.6-.49C10.85 2.36 10.11 2 9.25 2 7.45 2 6 3.45 6 5.25c0 .28.11.51.18.75H4c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v7c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-7h1c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5-2.5c.69 0 1.25.56 1.25 1.25S15.69 6 15 6h-2.09c.28-.64.89-2.5 2.09-2.5zM9.25 3.5c1.19 0 1.8 1.85 2.09 2.5H9.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25zM11 19H7v-7h4v7zm0-9H4V8h7v2zm2 9v-7h4v7h-4zm6-9h-7V8h7v2z"/>
      </svg>
    ),
    title: '1 mois offert',
    desc: 'Pour chaque partage validé sur vos réseaux',
    color: '#00b894',
    glow: 'rgba(0,184,148,0.4)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
      </svg>
    ),
    title: '-15% immédiat',
    desc: 'Réduction appliquée automatiquement sur votre prochain mois',
    color: '#f97316',
    glow: 'rgba(249,115,22,0.4)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
      </svg>
    ),
    title: 'Upgrade de plan',
    desc: 'Accédez au plan supérieur gratuitement pendant 30 jours',
    color: '#6C5CE7',
    glow: 'rgba(108,92,231,0.4)',
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Partagez Velona',
    desc: 'Publiez un avis, article ou vidéo sur vos réseaux avec votre code promo',
    color: '#6C5CE7',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Soumettez le lien',
    desc: "Collez l'URL de votre publication dans le formulaire ci-dessous",
    color: '#0984e3',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Validation sous 24-48h',
    desc: 'Notre équipe vérifie la qualité du contenu et valide votre soumission',
    color: '#f97316',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    ),
  },
  {
    step: '04',
    title: 'Récompense activée ✓',
    desc: 'Appliqué automatiquement sur votre prochain mois',
    color: '#00b894',
    badge: '-15%',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 6h-2.18c.07-.24.18-.47.18-.75C18 3.45 16.55 2 14.75 2c-.86 0-1.6.36-2.15.94L12 3.43l-.6-.49C10.85 2.36 10.11 2 9.25 2 7.45 2 6 3.45 6 5.25c0 .28.11.51.18.75H4c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v7c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-7h1c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5-2.5c.69 0 1.25.56 1.25 1.25S15.69 6 15 6h-2.09c.28-.64.89-2.5 2.09-2.5zM9.25 3.5c1.19 0 1.8 1.85 2.09 2.5H9.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25zM11 19H7v-7h4v7zm0-9H4V8h7v2zm2 9v-7h4v7h-4zm6-9h-7V8h7v2z"/>
      </svg>
    ),
  },
] as const;

/* ── useCountUp ─────────────────────────────────────────────────────────────── */

function useCountUp(target: number, duration = 1400) {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) { setCurrent(0); return; }
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return current;
}

/* ── Page ───────────────────────────────────────────────────────────────────── */

export default function PartnerPage() {
  const { session } = useAuth();
  const { profile } = useProfile();

  const [stats, setStats] = useState<Stats | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerUrl, setPartnerUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const activePartnersCount = useCountUp(247, 1800);

  useEffect(() => {
    if (!session?.access_token) return;
    const headers = { Authorization: `Bearer ${session.access_token}` };
    Promise.all([
      fetch(`${apiUrl}/api/partner/stats`, { headers }).then((r) => r.json()),
      fetch(`${apiUrl}/api/partner/submissions`, { headers }).then((r) => r.json()),
    ])
      .then(([s, sub]) => { setStats(s); setSubmissions(Array.isArray(sub) ? sub : []); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [session, apiUrl]);

  useEffect(() => {
    if (submitStatus !== 'success') return;
    const id = setTimeout(() => setSubmitStatus('idle'), 3000);
    return () => clearTimeout(id);
  }, [submitStatus]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerUrl.trim()) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${apiUrl}/api/partner/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ url: partnerUrl.trim() }),
      });
      if (res.status === 409) { setSubmitStatus('error'); return; }
      setSubmitStatus(res.ok ? 'success' : 'error');
      if (res.ok) {
        setPartnerUrl('');
        setSubmissions((prev) => [
          { id: Date.now().toString(), url: partnerUrl.trim(), status: 'pending', reward_type: 'free_month', created_at: new Date().toISOString() },
          ...prev,
        ]);
        setStats((s) => s ? { ...s, totalSubmissions: s.totalSubmissions + 1, pendingSubmissions: s.pendingSubmissions + 1 } : s);
      }
    } catch { setSubmitStatus('error'); }
    finally { setSubmitting(false); }
  };

  const handleCopy = (text: string, type: 'code' | 'link') => {
    navigator.clipboard?.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
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
          style={{ top: '-12%', right: '-6%', width: 560, height: 560, background: 'radial-gradient(circle, rgba(108,92,231,0.13) 0%, transparent 70%)' }}
          animate={{ x: [0, -45, 0], y: [0, 25, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{ bottom: '-10%', left: '-5%', width: 460, height: 460, background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)' }}
          animate={{ x: [0, 35, 0], y: [0, -35, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{ top: '45%', left: '38%', width: 340, height: 340, background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)' }}
          animate={{ x: [0, -20, 0], y: [0, -25, 0] }}
          transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-10 px-6 lg:px-10">

        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col gap-5"
        >
          {/* Contact banner */}
          <div
            className="flex items-center gap-4 rounded-2xl px-5 py-4"
            style={{ background: 'rgba(108,92,231,0.07)', border: '1px solid rgba(108,92,231,0.2)', backdropFilter: 'blur(8px)' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(108,92,231,0.18)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="22,6 12,13 2,6" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-sm text-gray-300 flex-1">
              Marque ou agence ?{' '}
              <a
                href="mailto:hello@velona.io"
                className="font-medium underline underline-offset-2 hover:text-violet-300 transition-colors"
                style={{ color: '#a78bfa' }}
              >
                Contactez-nous
              </a>
              {' '}pour un code promo partenaire personnalisé.
            </p>
          </div>

          {/* Badge */}
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(108,92,231,0.15)', border: '1px solid rgba(108,92,231,0.28)', color: '#a78bfa' }}
            >
              🤝 Programme Partenaire
            </span>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Partagez Velona,{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #a78bfa 0%, #6C5CE7 40%, #e879f9 75%, #a78bfa 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'name-shimmer 4s linear infinite',
                }}
              >
                gagnez des récompenses
              </span>
            </h1>
            <p className="text-sm text-gray-400 mt-2 max-w-xl">
              Rejoignez 247 partenaires actifs et gagnez jusqu&apos;à 1 mois offert par partage validé
            </p>
          </div>

          {/* Active partners counter */}
          <div className="flex items-center gap-2.5">
            <motion.span
              className="w-2.5 h-2.5 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="text-sm text-gray-400">
              <span className="text-white font-bold text-lg">{activePartnersCount}</span>
              {' '}partenaires actifs ce mois
            </span>
          </div>
        </motion.section>

        {/* ── REWARDS ───────────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex flex-col gap-5"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Vos récompenses</h2>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(108,92,231,0.4), transparent)' }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {REWARDS.map((reward, i) => (
              <motion.div
                key={reward.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 160, damping: 22, delay: i * 0.1 }}
                whileHover={{ y: -6, boxShadow: `0 24px 60px ${reward.glow}` }}
                className="relative flex flex-col gap-4 rounded-2xl p-6 cursor-default"
                style={{
                  background: 'rgba(15,12,36,0.85)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${reward.color}70, transparent)` }} />
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${reward.color}30, ${reward.color}15)`, color: reward.color }}
                >
                  {reward.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{reward.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{reward.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex flex-col gap-5"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Comment ça marche</h2>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(108,92,231,0.4), transparent)' }} />
          </div>

          <div
            className="rounded-2xl p-6 sm:p-8"
            style={{ background: 'rgba(15,12,36,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="relative flex flex-col">
              {/* Vertical fill line */}
              <div className="absolute left-[19px] top-5 bottom-5 w-0.5 overflow-hidden">
                <motion.div
                  className="w-full"
                  style={{
                    height: '100%',
                    transformOrigin: 'top',
                    background: 'linear-gradient(to bottom, #6C5CE7, #4834d4, #6366f1)',
                  }}
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
                />
              </div>

              {HOW_IT_WORKS.map(({ step, title, desc, color, icon, badge }, index) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 200, damping: 26, delay: index * 0.12 }}
                  className="relative flex gap-5 pb-8 last:pb-0"
                >
                  {/* Numbered circle */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10"
                    style={{
                      background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                      boxShadow: `0 0 16px ${color}55`,
                    }}
                  >
                    <span className="text-white">{icon}</span>
                  </div>

                  {/* Content */}
                  <div className="pt-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1">
                      <span className="text-xs font-bold" style={{ color }}>
                        {step}
                      </span>
                      <p className="text-sm font-semibold text-white">{title}</p>
                      {badge && (
                        <motion.span
                          animate={{ scale: [1, 1.06, 1] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                          className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                          style={{ background: '#00D68F', color: '#000', boxShadow: '0 0 10px rgba(0,214,143,0.5)' }}
                        >
                          {badge}
                        </motion.span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── PROMO CODE ────────────────────────────────────────────────────── */}
        {profile?.promo_code && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <div
              className="relative rounded-2xl p-6 sm:p-8 overflow-hidden"
              style={{
                background: 'rgba(108,92,231,0.08)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(108,92,231,0.25)',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(108,92,231,0.6), transparent)' }} />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Votre code promo</p>
                  <p className="text-4xl font-extrabold tracking-[0.2em] font-mono" style={{ color: '#a78bfa' }}>
                    {profile.promo_code}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Vos filleuls bénéficient de 10% de réduction</p>
                </div>
                <div className="flex flex-row sm:flex-col gap-2">
                  <button
                    onClick={() => handleCopy(profile.promo_code!, 'code')}
                    className="text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                    style={{
                      background: copied === 'code' ? 'rgba(0,184,148,0.2)' : 'rgba(108,92,231,0.18)',
                      border: copied === 'code' ? '1px solid rgba(0,184,148,0.4)' : '1px solid rgba(108,92,231,0.3)',
                      color: copied === 'code' ? '#34d399' : '#a78bfa',
                    }}
                  >
                    {copied === 'code' ? '✓ Copié !' : 'Copier le code'}
                  </button>
                  <button
                    onClick={() => handleCopy(`https://velona.io?ref=${profile.promo_code}`, 'link')}
                    className="text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                    style={{
                      background: copied === 'link' ? 'rgba(0,184,148,0.2)' : 'rgba(255,255,255,0.05)',
                      border: copied === 'link' ? '1px solid rgba(0,184,148,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      color: copied === 'link' ? '#34d399' : '#9ca3af',
                    }}
                  >
                    {copied === 'link' ? '✓ Copié !' : 'Copier le lien'}
                  </button>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* ── SUBMIT FORM ───────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex flex-col gap-4"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Soumettre votre partage</h2>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(108,92,231,0.4), transparent)' }} />
          </div>

          <div
            className="rounded-2xl p-6 sm:p-8 flex flex-col gap-5"
            style={{ background: 'rgba(15,12,36,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* URL input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-500">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <input
                  type="url"
                  value={partnerUrl}
                  onChange={(e) => { setPartnerUrl(e.target.value); setSubmitStatus('idle'); }}
                  placeholder="https://..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(8px)',
                    border: partnerUrl ? '1px solid rgba(108,92,231,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: partnerUrl ? '0 0 0 3px rgba(108,92,231,0.1)' : 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                />
              </div>

              {/* Submit button */}
              <div className="relative overflow-hidden rounded-xl">
                <button
                  type="submit"
                  disabled={!partnerUrl.trim() || submitting || submitStatus === 'success'}
                  className="relative w-full py-3 text-sm font-bold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
                  style={{ background: submitStatus === 'success' ? 'linear-gradient(135deg, #00b894, #00a381)' : 'linear-gradient(135deg, #6C5CE7, #4834d4)', boxShadow: submitStatus === 'success' ? '0 8px 32px rgba(0,184,148,0.3)' : '0 8px 32px rgba(108,92,231,0.3)' }}
                >
                  <AnimatePresence mode="wait">
                    {submitStatus === 'success' ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                        className="flex items-center justify-center gap-2"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                        Soumis avec succès !
                      </motion.span>
                    ) : (
                      <motion.span
                        key="submit"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                      >
                        {submitting ? 'Envoi en cours...' : 'Soumettre →'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <span
                    className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
                  />
                </button>
              </div>

              {submitStatus === 'error' && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-400 flex items-center gap-1.5"
                >
                  <span>⚠</span> Lien déjà soumis ou URL invalide. Réessayez.
                </motion.p>
              )}
            </form>

            <p className="text-xs text-gray-600 flex items-center gap-1.5">
              <span>🔒</span> Vos soumissions sont vérifiées manuellement sous 24-48h
            </p>
          </div>
        </motion.section>

        {/* ── USER STATS / SUBMISSIONS ──────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex flex-col gap-5 pb-12"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Mes statistiques</h2>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(108,92,231,0.4), transparent)' }} />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 rounded-2xl shimmer" style={{ background: 'rgba(15,12,36,0.6)', border: '1px solid rgba(255,255,255,0.05)' }} />
              ))}
            </div>
          ) : stats && (stats.totalSubmissions > 0) ? (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'En attente',  value: stats.pendingSubmissions,  color: '#fbbf24' },
                  { label: 'Validées',    value: stats.approvedSubmissions, color: '#34d399' },
                  { label: 'Récompenses', value: stats.promoUses,           color: '#a78bfa' },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-2xl px-5 py-4"
                    style={{ background: 'rgba(15,12,36,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <div>
                      <p className="text-xl font-bold text-white leading-none">{value}</p>
                      <p className="text-xs text-gray-500 mt-1">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Submissions list */}
              {submissions.length > 0 && (
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(15,12,36,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {submissions.map((sub, i) => {
                    const sc = STATUS_CONFIG[sub.status];
                    return (
                      <motion.div
                        key={sub.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06, type: 'spring', stiffness: 200, damping: 26 }}
                        className="flex items-center gap-4 px-5 py-4"
                        style={{ borderBottom: i < submissions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                      >
                        <div className="flex-1 min-w-0">
                          <a
                            href={sub.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-violet-400 hover:text-violet-300 truncate block transition-colors"
                          >
                            {sub.url}
                          </a>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.textColor }}
                            >
                              {sc.label}
                            </span>
                            {sub.status === 'approved' && (
                              <span className="text-[11px] text-gray-500">{REWARD_LABELS[sub.reward_type]}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 shrink-0">
                          {new Date(sub.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div
              className="flex flex-col items-center justify-center py-14 gap-4 rounded-2xl text-center"
              style={{ background: 'rgba(15,12,36,0.6)', border: '1px dashed rgba(255,255,255,0.08)' }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(108,92,231,0.15)' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" fill="#6C5CE7"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Vous n&apos;avez pas encore soumis de partage</p>
                <p className="text-xs text-gray-500 mt-1">Commencez dès maintenant — soumettez votre premier lien ci-dessus !</p>
              </div>
            </div>
          )}
        </motion.section>

      </div>
    </div>
  );
}
