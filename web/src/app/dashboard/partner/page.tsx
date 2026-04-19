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
  free_month:   '-15% sur votre prochain mois',
  plan_upgrade: 'Upgrade de plan',
};

const HOW_IT_WORKS = [
  { step: '01', title: 'Partagez Velona', desc: 'Publiez un avis, un article ou une vidéo sur vos réseaux avec votre code promo.' },
  { step: '02', title: 'Soumettez le lien', desc: 'Collez l\'URL de votre publication dans le formulaire ci-dessous.' },
  { step: '03', title: 'Validation (24-48h)', desc: 'Notre équipe vérifie la qualité du contenu et valide votre soumission.' },
  { step: '04', title: 'Récompense activée', desc: '-15% appliqués sur votre prochain mois ou upgrade de plan — automatiquement.' },
];

/* ── Social proof background cards ─────────────────────────────────────────── */
function SocialProofBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      {/* Gradient overlay so content stays readable */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-gray-950/70 to-gray-950/90 z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950/60 via-transparent to-gray-950/80 z-[1]" />

      {/* Phone 1 — TikTok-style video — top left */}
      <div className="absolute top-8 left-8 rotate-[-6deg] opacity-60">
        <div className="bg-black rounded-[28px] border border-gray-700 w-28 h-52 overflow-hidden shadow-2xl">
          <div className="w-full h-full bg-gradient-to-b from-indigo-900/80 to-purple-900/60 flex flex-col justify-between p-3">
            <div className="flex justify-between items-start">
              <div className="text-white text-[8px] font-bold">LIVE</div>
              <div className="text-white text-[8px]">✕</div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-primary-500/70 border border-white/30" />
                <div>
                  <div className="text-white text-[8px] font-semibold">@julie_coach</div>
                  <div className="text-gray-300 text-[7px]">Velona a changé ma vie</div>
                </div>
              </div>
              <div className="text-gray-200 text-[7px] leading-relaxed">
                Mon site pro créé en 3 minutes avec l'IA 🤯 Incroyable
              </div>
              <div className="flex gap-3">
                <span className="text-[7px] text-gray-300">♥ 4.2k</span>
                <span className="text-[7px] text-gray-300">↗ 1.1k</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phone 2 — Instagram story — top right */}
      <div className="absolute top-4 right-12 rotate-[7deg] opacity-55">
        <div className="bg-black rounded-[28px] border border-gray-700 w-24 h-44 overflow-hidden shadow-2xl">
          <div className="w-full h-1.5 bg-gray-700 rounded-full m-2" style={{ width: 'calc(100% - 16px)' }}>
            <div className="h-full bg-white rounded-full w-[70%]" />
          </div>
          <div className="flex items-center gap-1.5 px-2 mb-1">
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500 border border-white" />
            <span className="text-white text-[7px] font-semibold">thomas_ceo</span>
          </div>
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 mx-2 rounded-lg h-24 flex items-center justify-center p-2">
            <div className="text-white text-[8px] text-center leading-relaxed font-medium">
              "Velona a automatisé tous mes appels clients. +12h/mois de récupérées"
            </div>
          </div>
        </div>
      </div>

      {/* Tweet/X card — middle left */}
      <div className="absolute top-[40%] left-4 rotate-[-4deg] opacity-50">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 w-56 shadow-2xl">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-sky-500/40 border border-sky-400/30" />
              <div>
                <div className="text-white text-[9px] font-bold">Marie Dupont</div>
                <div className="text-gray-500 text-[8px]">@mariedupont_rh</div>
              </div>
            </div>
            <div className="text-gray-400 text-xs font-bold">✕</div>
          </div>
          <p className="text-gray-200 text-[9px] leading-relaxed">
            L'agent vocal <span className="text-sky-400">@Velona_app</span> répond à tous nos appels RH 24h/7j. Économie de 3h/sem pour toute l'équipe.
          </p>
          <div className="flex gap-4 mt-2 text-[8px] text-gray-500">
            <span>47 RT</span>
            <span>286 ♥</span>
          </div>
        </div>
      </div>

      {/* LinkedIn post — bottom right */}
      <div className="absolute bottom-16 right-4 rotate-[5deg] opacity-50">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 w-60 shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/50 border border-blue-500/30 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">in</span>
            </div>
            <div>
              <div className="text-white text-[9px] font-bold">Thomas Renard</div>
              <div className="text-gray-500 text-[8px]">Directeur Commercial · Velona</div>
            </div>
          </div>
          <p className="text-gray-300 text-[9px] leading-relaxed">
            Après 3 mois avec Velona, notre stratégie social media est entièrement automatisée. 30 posts/mois générés par l'IA, engagements en hausse de 67%.
          </p>
          <div className="flex items-center gap-1 mt-2">
            <div className="flex -space-x-1">
              {['bg-blue-500','bg-red-400','bg-green-500'].map((c, i) => (
                <div key={i} className={`w-3.5 h-3.5 rounded-full border border-gray-900 ${c}`} />
              ))}
            </div>
            <span className="text-[8px] text-gray-500 ml-1">347 réactions</span>
          </div>
        </div>
      </div>

      {/* Google review — bottom left */}
      <div className="absolute bottom-8 left-[30%] rotate-[-3deg] opacity-45">
        <div className="bg-white rounded-xl p-3 w-44 shadow-2xl">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="flex gap-0.5">
              <span className="text-[10px] font-bold" style={{ color: '#4285F4' }}>G</span>
              <span className="text-[10px] font-bold" style={{ color: '#EA4335' }}>o</span>
              <span className="text-[10px] font-bold" style={{ color: '#FBBC05' }}>o</span>
              <span className="text-[10px] font-bold" style={{ color: '#4285F4' }}>g</span>
              <span className="text-[10px] font-bold" style={{ color: '#34A853' }}>l</span>
              <span className="text-[10px] font-bold" style={{ color: '#EA4335' }}>e</span>
            </div>
          </div>
          <div className="text-[9px] font-semibold text-gray-800 mb-0.5">Sophie Martin</div>
          <div className="flex gap-0.5 mb-1">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-[10px]" style={{ color: '#FBBC05' }}>★</span>
            ))}
          </div>
          <p className="text-[8px] text-gray-600 leading-relaxed">
            Parfait pour notre cabinet. Le site web généré en quelques minutes était professionnel dès le début.
          </p>
        </div>
      </div>
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

      <SocialProofBackground />

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

        {/* How it works */}
        <section className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
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
              <Button type="submit" loading={submitting} size="sm" disabled={!partnerUrl.trim()}>
                {t('partner.submit')}
              </Button>
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
