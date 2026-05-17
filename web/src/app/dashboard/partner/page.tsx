'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

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

const STATUS_CONFIG = {
  pending:  { label: 'En attente', className: 'bg-yellow-500/20 text-yellow-400' },
  approved: { label: 'Approuvé',   className: 'bg-success-DEFAULT/20 text-success-DEFAULT' },
  rejected: { label: 'Refusé',     className: 'bg-red-500/20 text-red-400' },
};

const REWARD_LABELS = {
  free_month:   '-15% sur votre prochain mois',
  plan_upgrade: 'Upgrade de plan',
};

const HOW_IT_WORKS = [
  { step: '01', title: 'Partagez Velona', desc: 'Publiez un avis, un article ou une vidéo sur vos réseaux avec votre code promo.' },
  { step: '02', title: 'Soumettez le lien', desc: 'Collez l\'URL de votre publication dans le formulaire ci-dessous.' },
  { step: '03', title: 'Validation (24-48h)', desc: 'Notre équipe vérifie la qualité du contenu et valide votre soumission.' },
  { step: '04', title: 'Récompense activée', desc: 'Appliqués sur votre prochain mois ou upgrade de plan — automatiquement.' },
];

/* ── Animated Counter ───────────────────────────────────────────────────────── */
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

/* ── Decorative orb background ──────────────────────────────────────────────── */
function OrbBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: 'rgba(108,92,231,0.12)' }} />
      <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: 'rgba(99,102,241,0.09)' }} />
      <div className="absolute top-1/2 right-1/4 w-64 h-64 rounded-full blur-[80px]" style={{ background: 'rgba(139,92,246,0.07)' }} />
      <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(108,92,231,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(108,92,231,0.03) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export default function PartnerPage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { profile } = useProfile();

  const [stats, setStats] = useState<Stats | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const [partnerUrl, setPartnerUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

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
        setSubmissions((prev) => [{ id: Date.now().toString(), url: partnerUrl.trim(), status: 'pending', reward_type: 'free_month', created_at: new Date().toISOString() }, ...prev]);
        setStats((s) => s ? { ...s, totalSubmissions: s.totalSubmissions + 1, pendingSubmissions: s.pendingSubmissions + 1 } : s);
      }
    } catch { setSubmitStatus('error'); }
    finally { setSubmitting(false); }
  };

  return (
    /* Full-bleed wrapper with decorative background */
    <div className="relative -mx-6 -mt-8 px-6 pt-8 pb-12 overflow-hidden"
         style={{ minHeight: 'calc(100vh - 120px)', background: 'linear-gradient(135deg, #030712 0%, #0d0b1f 50%, #030712 100%)' }}>

      <OrbBackground />

      {/* Agency/brand contact banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 mb-2 rounded-2xl border border-violet-500/20 px-5 py-4 flex items-center gap-4"
        style={{ background: 'rgba(108,92,231,0.06)', backdropFilter: 'blur(8px)' }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(108,92,231,0.15)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="22,6 12,13 2,6" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm text-gray-300 flex-1">
          Vous êtes une marque ou une agence ?{' '}
          <a href="mailto:hello@velona.io" className="text-violet-400 hover:text-violet-300 font-medium transition-colors underline underline-offset-2">
            Contactez-nous
          </a>{' '}
          pour un code promo partenaire personnalisé.
        </p>
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 max-w-2xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('partner.title')}</h1>
          <p className="text-gray-400 text-sm mt-1">{t('partner.description')}</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Soumissions',   value: stats.totalSubmissions,  accent: 'border-primary-500/30' },
              { label: 'Approuvées',    value: stats.approvedSubmissions, accent: 'border-success-DEFAULT/30' },
              { label: 'Utilisations',  value: stats.promoUses,          accent: 'border-gray-600' },
            ].map(({ label, value, accent }) => (
              <div key={label} className={clsx('bg-gray-900/80 backdrop-blur border rounded-2xl p-4', accent)}>
                <p className="text-2xl font-extrabold text-white">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Social counter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2"
        >
          <span className="text-2xl font-extrabold text-white">
            <AnimatedCounter target={247} />
          </span>
          <span className="text-gray-400 text-sm ml-2">partenaires actifs ce mois</span>
        </motion.div>

        {/* Promo code card */}
        {profile?.promo_code && (
          <section className="bg-gray-900/80 backdrop-blur border border-primary-500/30 rounded-2xl p-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t('partner.yourCode')}</p>
              <p className="text-3xl font-extrabold tracking-widest text-primary-300 font-mono">
                {profile.promo_code}
              </p>
              <p className="text-xs text-gray-500 mt-1">Vos filleuls bénéficient de 10% de réduction</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigator.clipboard?.writeText(profile.promo_code!)}
                className="text-xs border border-gray-600 hover:border-primary-500 hover:text-primary-300 px-4 py-2 rounded-xl transition-all text-gray-400"
              >
                Copier le code
              </button>
              <button
                onClick={() => navigator.clipboard?.writeText(`https://velona.io?ref=${profile.promo_code}`)}
                className="text-xs border border-gray-600 hover:border-primary-500 hover:text-primary-300 px-4 py-2 rounded-xl transition-all text-gray-400"
              >
                Copier le lien
              </button>
            </div>
          </section>
        )}

        {/* How it works — vertical timeline */}
        <section className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Comment ça marche</h2>
          <div className="relative flex flex-col gap-0">
            {/* Vertical violet line */}
            <div className="absolute left-[19px] top-5 bottom-5 w-px overflow-hidden">
              <motion.div
                className="w-full bg-gradient-to-b from-violet-500 to-indigo-600"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%', transformOrigin: 'top' }}
              />
            </div>

            {HOW_IT_WORKS.map(({ step, title, desc }, index) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.12, duration: 0.4, ease: 'easeOut' }}
                className="flex gap-4 relative pb-6 last:pb-0"
              >
                {/* Circle icon */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10"
                  style={{
                    background: 'linear-gradient(135deg, #6C5CE7, #4834d4)',
                    boxShadow: '0 0 14px rgba(108,92,231,0.5)',
                  }}
                >
                  <span className="text-white text-xs font-bold">{step}</span>
                </div>

                {/* Content */}
                <div className="pt-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{title}</p>
                    {/* Reward badge for step 04 */}
                    {step === '04' && (
                      <motion.span
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                        style={{
                          background: '#00D68F',
                          color: '#000',
                          boxShadow: '0 0 10px rgba(0,214,143,0.45)',
                        }}
                      >
                        -15%
                      </motion.span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Submit form */}
        <section className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('partner.submitLink')}</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="url"
                value={partnerUrl}
                onChange={(e) => { setPartnerUrl(e.target.value); setSubmitStatus('idle'); }}
                placeholder={t('partner.linkPlaceholder')}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm
                  placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
              {/* Shimmer-wrapped submit button */}
              <div className="relative overflow-hidden rounded-xl">
                <Button type="submit" loading={submitting} size="sm" disabled={!partnerUrl.trim()}>
                  {t('partner.submit')}
                </Button>
                <span className="shimmer absolute inset-0 rounded-xl pointer-events-none" />
              </div>
            </div>
            {submitStatus === 'success' && (
              <p className="text-xs text-success-DEFAULT">✓ Lien soumis avec succès. Validation sous 24-48h.</p>
            )}
            {submitStatus === 'error' && (
              <p className="text-xs text-red-400">Erreur — lien déjà soumis ou URL invalide.</p>
            )}
          </form>
        </section>

        {/* Submissions list */}
        {submissions.length > 0 && (
          <section className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Mes soumissions</h2>
            <div className="flex flex-col">
              {submissions.map((sub) => {
                const sc = STATUS_CONFIG[sub.status];
                return (
                  <div key={sub.id} className="flex items-start justify-between gap-3 py-3 border-b border-gray-800 last:border-0">
                    <div className="flex-1 min-w-0">
                      <a href={sub.url} target="_blank" rel="noopener noreferrer"
                         className="text-sm text-primary-300 hover:text-primary-200 truncate block transition-colors">
                        {sub.url}
                      </a>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', sc.className)}>
                          {sc.label}
                        </span>
                        {sub.status === 'approved' && (
                          <span className="text-xs text-gray-500">{REWARD_LABELS[sub.reward_type]}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 shrink-0">
                      {new Date(sub.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {!loading && submissions.length === 0 && (
          <p className="text-center py-8 text-gray-600 text-sm">
            Aucune soumission — partagez Velona et soumettez votre lien ci-dessus.
          </p>
        )}
      </div>
    </div>
  );
}
