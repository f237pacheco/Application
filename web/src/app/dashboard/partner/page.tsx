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

/* ── Social proof background cards ─────────────────────────────────────────── */
function SocialProofBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      {/* Gradient overlays — keep content readable */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-950/95 via-gray-950/75 to-gray-950/60 z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950/70 via-transparent to-gray-950/85 z-[1]" />

      {/* ── TOP ZONE ──────────────────────────────────────────────────────── */}

      {/* 1 — TikTok full phone — top right */}
      <div className="absolute top-4 right-6 rotate-[5deg] opacity-60">
        <div className="bg-black rounded-[30px] border border-gray-700 w-32 h-60 overflow-hidden shadow-2xl flex flex-col">
          {/* Top bar */}
          <div className="flex justify-center gap-4 pt-2 pb-1">
            <span className="text-gray-500 text-[8px]">Abonnements</span>
            <span className="text-white text-[8px] font-bold border-b border-white pb-0.5">Pour toi</span>
          </div>
          {/* Video area */}
          <div className="flex-1 relative bg-gradient-to-b from-violet-950 to-indigo-950">
            {/* Right action bar */}
            <div className="absolute right-1.5 bottom-8 flex flex-col items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-pink-500 to-violet-500 border-2 border-white" />
                <div className="w-3 h-3 rounded-full bg-primary-500 -mt-1.5 border border-black flex items-center justify-center">
                  <span className="text-white text-[5px] font-bold">+</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-white text-base">♥</span>
                <span className="text-white text-[7px]">48.2k</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-white text-[10px]">💬</span>
                <span className="text-white text-[7px]">1.4k</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-white text-[10px]">↗</span>
                <span className="text-white text-[7px]">2.1k</span>
              </div>
            </div>
            {/* Caption */}
            <div className="absolute bottom-2 left-2 right-10">
              <div className="text-white text-[7px] font-bold mb-0.5">@julie_coach</div>
              <div className="text-gray-200 text-[6px] leading-tight">
                Mon site pro créé en 2min avec Velona 🤯 Incroyable ce que l'IA peut faire
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-white text-[6px]">♪</span>
                <span className="text-gray-300 text-[6px]">son original · julie_coach</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2 — Instagram story phone — top right (behind TikTok) */}
      <div className="absolute top-2 right-[22%] rotate-[-7deg] opacity-55">
        <div className="bg-black rounded-[24px] border border-gray-700 w-24 h-48 overflow-hidden shadow-2xl">
          {/* Story bars */}
          <div className="flex gap-0.5 px-2 pt-2">
            {[100, 100, 55].map((w, i) => (
              <div key={i} className="flex-1 h-0.5 bg-gray-600 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
          {/* Header */}
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-orange-400 via-pink-500 to-purple-600 p-0.5">
              <div className="w-full h-full rounded-full bg-black" />
            </div>
            <span className="text-white text-[7px] font-semibold">thomas_ceo</span>
          </div>
          {/* Content */}
          <div className="mx-1.5 rounded-lg overflow-hidden h-28 bg-gradient-to-b from-slate-800 to-indigo-950 flex flex-col items-center justify-center p-2 gap-1">
            <div className="w-8 h-8 rounded-full bg-primary-500/30 border border-primary-500/50 flex items-center justify-center">
              <span className="text-primary-300 text-[10px] font-bold">V</span>
            </div>
            <div className="text-white text-[7px] text-center font-semibold leading-tight">
              Velona a automatisé tous mes appels clients
            </div>
            <div className="text-success-DEFAULT text-[6px] font-bold">+12h/mois récupérées</div>
          </div>
          {/* Reply bar */}
          <div className="flex items-center gap-1 px-2 pt-1.5">
            <div className="flex-1 h-5 rounded-full border border-gray-600 flex items-center px-2">
              <span className="text-gray-500 text-[6px]">Répondre...</span>
            </div>
            <span className="text-white text-[8px]">↗</span>
          </div>
        </div>
      </div>

      {/* 3 — TikTok post card (flat) — top left peeking */}
      <div className="absolute top-6 left-[-18px] rotate-[-5deg] opacity-50">
        <div className="bg-gray-950 border border-gray-700 rounded-2xl overflow-hidden w-52 shadow-2xl">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-400 to-violet-600" />
              <div>
                <div className="text-white text-[8px] font-bold">@sofie_entrepreneur</div>
                <div className="text-gray-500 text-[7px]">2.3k abonnés</div>
              </div>
            </div>
            <div className="border border-primary-500 rounded px-1.5 py-0.5">
              <span className="text-primary-400 text-[7px] font-bold">Suivre</span>
            </div>
          </div>
          <div className="h-24 bg-gradient-to-br from-violet-900/60 to-indigo-900/40 flex items-center justify-center relative">
            <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center">
              <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[9px] border-l-white border-b-[5px] border-b-transparent ml-0.5" />
            </div>
            <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1">
              <span className="text-white text-[6px]">0:58</span>
            </div>
          </div>
          <div className="px-3 py-2">
            <div className="text-gray-200 text-[7px] leading-tight mb-1.5">
              J'ai testé Velona pour créer mon site — résultat en 2 minutes chrono
            </div>
            <div className="flex gap-3">
              <span className="text-[7px] text-gray-400">♥ 12.4k</span>
              <span className="text-[7px] text-gray-400">💬 843</span>
              <span className="text-[7px] text-gray-400">↗ 2.1k</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 — Twitter/X post — top center-right */}
      <div className="absolute top-[14%] right-[45%] rotate-[3deg] opacity-50">
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-3 w-56 shadow-2xl">
          <div className="flex items-start gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-sky-500/40 border border-sky-400/30 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white text-[8px] font-bold">Marie Dupont</div>
                  <div className="text-gray-500 text-[7px]">@mariedupont_rh · 3h</div>
                </div>
                <div className="text-gray-500 text-[9px] font-bold">✕</div>
              </div>
            </div>
          </div>
          <p className="text-gray-200 text-[8px] leading-relaxed mb-2">
            L'agent vocal <span className="text-sky-400">@Velona_app</span> répond à tous nos appels RH 24h/7j. On a récupéré 3h par semaine pour toute l'équipe 🙌
          </p>
          <div className="flex gap-4 text-[7px] text-gray-500 border-t border-gray-800 pt-2">
            <span>💬 12</span>
            <span>↺ 47</span>
            <span>♥ 286</span>
            <span>↗</span>
          </div>
        </div>
      </div>

      {/* ── MIDDLE ZONE ───────────────────────────────────────────────────── */}

      {/* 5 — Facebook post — middle right */}
      <div className="absolute top-[30%] right-4 rotate-[-4deg] opacity-55">
        <div className="bg-[#242526] border border-gray-700 rounded-2xl overflow-hidden w-60 shadow-2xl">
          <div className="px-3 py-2.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600/60 border border-blue-500/40 flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">A</span>
            </div>
            <div>
              <div className="text-white text-[8px] font-bold">Alexandre Faure</div>
              <div className="text-gray-500 text-[7px]">il y a 4h · 🌐</div>
            </div>
          </div>
          <div className="px-3 pb-2">
            <p className="text-gray-200 text-[8px] leading-relaxed">
              Sérieusement, Velona a généré le site de mon cabinet en moins de 2 minutes. Professionnel, responsive, hébergé. Je recommande à 100% à tous les indépendants.
            </p>
          </div>
          <div className="h-16 bg-gradient-to-r from-primary-500/20 to-purple-900/30 flex items-center justify-center">
            <span className="text-primary-300 text-[8px] font-semibold">cabinet-faure.velona.io</span>
          </div>
          <div className="px-3 py-2 border-t border-gray-700">
            <div className="flex items-center justify-between text-[7px] text-gray-500 mb-1.5">
              <div className="flex items-center gap-1">
                <span>👍❤️</span>
                <span>184</span>
              </div>
              <div>23 commentaires · 41 partages</div>
            </div>
            <div className="flex justify-around border-t border-gray-700 pt-1.5">
              {['J\'aime', 'Commenter', 'Partager'].map((a) => (
                <span key={a} className="text-[7px] text-gray-500 font-semibold">{a}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6 — Instagram post card — middle center-right */}
      <div className="absolute top-[26%] right-[37%] rotate-[5deg] opacity-50">
        <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden w-44 shadow-2xl">
          <div className="flex items-center gap-1.5 px-2.5 py-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
              <div className="w-full h-full rounded-full bg-gray-950" />
            </div>
            <span className="text-white text-[7px] font-semibold">velona.app</span>
            <span className="ml-auto text-gray-500 text-[9px]">···</span>
          </div>
          <div className="h-32 bg-gradient-to-br from-primary-500/30 via-violet-900/50 to-gray-950 flex flex-col items-center justify-center gap-1 px-3">
            <div className="text-white text-[10px] font-extrabold text-center leading-tight">Votre site web pro</div>
            <div className="text-primary-300 text-[8px] font-semibold">en 2 minutes chrono</div>
            <div className="mt-1 text-[7px] text-gray-400">Essai gratuit · Sans carte</div>
          </div>
          <div className="px-2.5 py-2">
            <div className="flex gap-3 mb-1">
              <span className="text-white text-[10px]">♥</span>
              <span className="text-white text-[10px]">💬</span>
              <span className="text-white text-[10px]">↗</span>
              <span className="ml-auto text-white text-[10px]">🔖</span>
            </div>
            <div className="text-white text-[7px] font-bold">1 284 J'aime</div>
            <div className="text-gray-500 text-[6px] mt-0.5">velona.app Partagez et gagnez -15% →</div>
          </div>
        </div>
      </div>

      {/* 7 — TikTok comments panel — center right */}
      <div className="absolute top-[46%] right-[38%] rotate-[-3deg] opacity-48">
        <div className="bg-gray-900/95 border border-gray-700 rounded-2xl p-3 w-52 shadow-2xl">
          <div className="text-white text-[8px] font-bold mb-2">Commentaires (2 481)</div>
          {[
            { user: '@camille_mkt', text: 'Sérieusement le meilleur outil IA du moment 🔥', likes: '412' },
            { user: '@romain_dev', text: 'J\'ai partagé à tous mes clients indépendants', likes: '287' },
            { user: '@laure_coach', text: 'Mon agent vocal gère 30+ appels/jour maintenant', likes: '198' },
          ].map((c, i) => (
            <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-800 last:border-0">
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-400 to-violet-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-white text-[7px] font-semibold">{c.user} </span>
                <span className="text-gray-300 text-[7px]">{c.text}</span>
              </div>
              <div className="flex flex-col items-center shrink-0">
                <span className="text-gray-400 text-[8px]">♥</span>
                <span className="text-gray-500 text-[6px]">{c.likes}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8 — Twitter thread (2 tweets) — middle left peeking */}
      <div className="absolute top-[42%] left-[-22px] rotate-[4deg] opacity-45">
        <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden w-56 shadow-2xl">
          <div className="p-3 border-b border-gray-800">
            <div className="flex gap-2">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-orange-500/50 shrink-0" />
                <div className="w-0.5 flex-1 bg-gray-700 mt-1" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-white text-[8px] font-bold">Lucas Bernard</span>
                  <span className="text-gray-500 text-[7px]">@lucas_b · 1j</span>
                </div>
                <p className="text-gray-200 text-[7px] leading-relaxed mt-0.5">
                  Thread sur Velona après 3 mois d'utilisation 🧵
                </p>
              </div>
            </div>
          </div>
          <div className="p-3">
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-orange-500/50 shrink-0" />
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-white text-[8px] font-bold">Lucas Bernard</span>
                </div>
                <p className="text-gray-200 text-[7px] leading-relaxed mt-0.5">
                  1/ Mon agent vocal répond à 95% des appels entrants. J'ai économisé 8h cette semaine.
                </p>
                <div className="flex gap-3 mt-1.5 text-[7px] text-gray-500">
                  <span>💬 34</span><span>↺ 112</span><span>♥ 847</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM ZONE ───────────────────────────────────────────────────── */}

      {/* 9 — YouTube Shorts phone — bottom right */}
      <div className="absolute bottom-[18%] right-4 rotate-[6deg] opacity-55">
        <div className="bg-black rounded-[26px] border border-gray-700 w-28 h-52 overflow-hidden shadow-2xl flex flex-col">
          {/* Shorts label */}
          <div className="px-3 py-2 flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-red-600 flex items-center justify-center">
              <div className="w-0 h-0 border-t-[3px] border-t-transparent border-l-[5px] border-l-white border-b-[3px] border-b-transparent ml-0.5" />
            </div>
            <span className="text-white text-[7px] font-bold">Shorts</span>
          </div>
          {/* Video */}
          <div className="flex-1 bg-gradient-to-b from-gray-900 to-gray-950 relative flex items-end pb-3 px-2">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/30 flex items-center justify-center">
                <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[9px] border-l-white/80 border-b-[5px] border-b-transparent ml-0.5" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="text-white text-[7px] font-bold">@velona_officiel</div>
              <div className="text-gray-300 text-[6px] leading-tight mt-0.5">
                Créez votre site en 2min avec l'IA #velona #ia
              </div>
            </div>
          </div>
          {/* Actions */}
          <div className="py-2 flex justify-around">
            {['♥\n18k', '💬\n943', '↗\n3.2k'].map((a, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-white text-[8px]">{a.split('\n')[0]}</span>
                <span className="text-gray-400 text-[6px]">{a.split('\n')[1]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 10 — Instagram Reels card — bottom center-right */}
      <div className="absolute bottom-[30%] right-[34%] rotate-[-4deg] opacity-50">
        <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden w-40 shadow-2xl">
          <div className="h-28 bg-gradient-to-br from-pink-900/40 to-purple-950 relative flex items-end p-2">
            <div className="absolute top-2 left-2 flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm border border-white/60" />
              <span className="text-white text-[6px] font-bold">Reels</span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-white/15 border border-white/30 flex items-center justify-center">
                <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[7px] border-l-white/80 border-b-[4px] border-b-transparent ml-0.5" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="text-white text-[6px] font-bold">@sophie_business</div>
            </div>
            <div className="absolute bottom-2 right-2 text-white text-[7px]">0:45</div>
          </div>
          <div className="px-2.5 py-2">
            <div className="flex gap-3">
              <span className="text-white text-[9px]">♥</span>
              <span className="text-white text-[9px]">💬</span>
              <span className="text-white text-[9px]">↗</span>
            </div>
            <div className="text-white text-[7px] font-bold mt-0.5">9 284 J'aime</div>
            <div className="text-gray-500 text-[6px]">87k vues</div>
          </div>
        </div>
      </div>

      {/* 11 — Viral stats card — bottom right corner */}
      <div className="absolute bottom-[6%] right-6 rotate-[-3deg] opacity-50">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-3 w-52 shadow-2xl">
          <div className="text-[8px] text-gray-400 uppercase tracking-wider mb-2">Performance ce mois</div>
          <div className="flex items-end gap-1 mb-3">
            <span className="text-white text-2xl font-extrabold">2.4M</span>
            <span className="text-success-DEFAULT text-[8px] mb-1 font-bold">vues totales</span>
          </div>
          {[
            { platform: 'TikTok',     views: '1.2M', color: '#69c9d0' },
            { platform: 'Instagram',  views: '840k',  color: '#e1306c' },
            { platform: 'YouTube',    views: '360k',  color: '#ff0000' },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-gray-800 last:border-0">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[7px] text-gray-300">{s.platform}</span>
              </div>
              <span className="text-[7px] font-bold text-white">{s.views}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 12 — Facebook story phone — bottom left peeking */}
      <div className="absolute bottom-[10%] left-[-15px] rotate-[5deg] opacity-42">
        <div className="bg-black rounded-[22px] border border-gray-700 w-20 h-40 overflow-hidden shadow-2xl">
          <div className="w-full h-full bg-gradient-to-b from-blue-900/80 to-indigo-950 flex flex-col justify-between p-2">
            <div className="flex gap-0.5">
              {[100, 40].map((w, i) => (
                <div key={i} className="flex-1 h-0.5 bg-gray-600 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border border-white" />
              <span className="text-white text-[6px] font-semibold">camille_rh</span>
            </div>
            <div className="flex-1 flex items-center justify-center px-1 mt-1">
              <div className="text-white text-[7px] text-center font-medium leading-tight">
                Velona gère mes 30 posts Instagram du mois 🤖
              </div>
            </div>
            <div className="h-4 rounded-full border border-gray-500 flex items-center px-1.5 mt-1">
              <span className="text-gray-400 text-[5px]">Répondre...</span>
            </div>
          </div>
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
