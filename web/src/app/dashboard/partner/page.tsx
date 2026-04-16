'use client';

import { useEffect, useState } from 'react';
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
  free_month:    '🎁 1 mois offert',
  plan_upgrade:  '⬆️ Upgrade de plan',
};

const HOW_IT_WORKS = [
  { step: '01', title: 'Partagez Velona', desc: 'Publiez un avis, un article ou une vidéo sur vos réseaux avec votre code promo.' },
  { step: '02', title: 'Soumettez le lien', desc: 'Collez l\'URL de votre publication dans le formulaire ci-dessous.' },
  { step: '03', title: 'Validation (24-48h)', desc: 'Notre équipe vérifie la qualité du contenu et valide votre soumission.' },
  { step: '04', title: 'Récompense activée', desc: 'Recevez 1 mois gratuit ou un upgrade de plan — automatiquement appliqué.' },
];

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
      .then(([s, sub]) => {
        setStats(s);
        setSubmissions(Array.isArray(sub) ? sub : []);
      })
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ url: partnerUrl.trim() }),
      });

      if (res.status === 409) {
        setSubmitStatus('error');
        return;
      }

      setSubmitStatus(res.ok ? 'success' : 'error');
      if (res.ok) {
        setPartnerUrl('');
        // Optimistic update
        setSubmissions((prev) => [{
          id: Date.now().toString(),
          url: partnerUrl.trim(),
          status: 'pending',
          reward_type: 'free_month',
          created_at: new Date().toISOString(),
        }, ...prev]);
        setStats((s) => s ? { ...s, totalSubmissions: s.totalSubmissions + 1, pendingSubmissions: s.pendingSubmissions + 1 } : s);
      }
    } catch {
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('partner.title')}</h1>
        <p className="text-gray-400 text-sm mt-1">{t('partner.description')}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Soumissions', value: stats.totalSubmissions, icon: '📨' },
            { label: 'Approuvées',  value: stats.approvedSubmissions, icon: '✅' },
            { label: 'Utilisations du code', value: stats.promoUses, icon: '🏷️' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-1">
              <span className="text-2xl">{icon}</span>
              <p className="text-2xl font-extrabold text-white">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Promo code card */}
      {profile?.promo_code && (
        <section className="bg-gradient-to-br from-primary-500/10 to-primary-500/5 border border-primary-500/30 rounded-2xl p-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t('partner.yourCode')}</p>
            <p className="text-3xl font-extrabold tracking-widest text-primary-300 font-mono">
              {profile.promo_code}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Partagez ce code — vos filleuls bénéficient de 10% de réduction
            </p>
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

      {/* How it works */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Comment ça marche</h2>
        <div className="grid grid-cols-2 gap-4">
          {HOW_IT_WORKS.map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <span className="text-xs font-bold text-primary-500 mt-0.5 shrink-0">{step}</span>
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Submit form */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
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
            <Button type="submit" loading={submitting} size="sm" disabled={!partnerUrl.trim()}>
              {t('partner.submit')}
            </Button>
          </div>

          {submitStatus === 'success' && (
            <p className="text-xs text-success-DEFAULT">✓ Lien soumis avec succès ! Validation sous 24-48h.</p>
          )}
          {submitStatus === 'error' && (
            <p className="text-xs text-red-400">Erreur — lien déjà soumis ou URL invalide.</p>
          )}
        </form>
      </section>

      {/* Submissions list */}
      {submissions.length > 0 && (
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Mes soumissions</h2>
          <div className="flex flex-col gap-3">
            {submissions.map((sub) => {
              const sc = STATUS_CONFIG[sub.status];
              return (
                <div key={sub.id} className="flex items-start justify-between gap-3 py-3 border-b border-gray-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <a
                      href={sub.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-300 hover:text-primary-200 truncate block transition-colors"
                    >
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
        <div className="text-center py-8 text-gray-600 text-sm">
          Aucune soumission pour l'instant — partagez Velona et soumettez votre lien ci-dessus.
        </div>
      )}
    </div>
  );
}
