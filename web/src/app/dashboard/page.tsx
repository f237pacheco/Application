'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useUsage } from '@/hooks/useUsage';
import { UsageBar } from '@/components/ui/UsageBar';
import { LimitWarning } from '@/components/ui/LimitWarning';
import { SERVICES } from '@/lib/services';

/* ── Marquee data ───────────────────────────────────────────────────────────── */
const ROW1_CARDS = [
  {
    type: 'tweet' as const,
    avatarBg: '#6C5CE7', avatarLetter: 'J',
    name: 'Julien Tech', handle: '@julien_tech · 2h',
    text: `Mon site pro créé en 2 minutes ✨ Impossible de croire que c'est de l'IA`,
    likes: '1.2k', rt: '380',
    service: { label: 'Site web IA', color: '#6C5CE7' },
  },
  {
    type: 'stat' as const,
    label: 'Revenus ce mois', value: '12 480€', change: '+24%', color: '#00b894', barWidth: '72%',
  },
  {
    type: 'site' as const, url: 'cabinet-martin.velona.io', accent: '#6C5CE7',
  },
  {
    type: 'kpi' as const,
    label: "RDV confirmés aujourd'hui", value: '18', sub: 'automatiquement', color: '#6C5CE7',
  },
  {
    type: 'tweet' as const,
    avatarBg: '#fd79a8', avatarLetter: 'J',
    name: 'Jade Coiffure', handle: '@coiffure_jade · 5h',
    text: 'Velona génère mes posts Instagram chaque semaine, je gagne 3h 🙌',
    likes: '847', rt: '156',
    service: { label: 'Réseaux sociaux', color: '#fd79a8' },
  },
  {
    type: 'video' as const,
    title: 'Montage vidéo IA — créé en 45s', duration: '0:45', views: '3.2k vues',
  },
  {
    type: 'tweet' as const,
    avatarBg: '#00b894', avatarLetter: 'K',
    name: 'Kiné Montpellier', handle: '@kine_mtp · 1j',
    text: 'Agent vocal gère 100% de mes appels. Incroyable, je ne rate plus aucun RDV.',
    likes: '632', rt: '91',
    service: { label: 'Agent vocal', color: '#00b894' },
  },
  {
    type: 'kpi' as const,
    label: 'Nouveaux abonnés Instagram', value: '+340', sub: 'ce mois · ↑ +28%', color: '#e1306c',
  },
] as const;

const ROW2_CARDS = [
  {
    type: 'site' as const, url: 'resto-bella.velona.io', accent: '#f97316',
  },
  {
    type: 'tweet' as const,
    avatarBg: '#6366f1', avatarLetter: 'E',
    name: 'Entrepreneur FR', handle: '@entrepreneur_fr · 3h',
    text: `Email campaign : 64% d'ouverture. Record absolu pour notre agence 📈`,
    likes: '2.1k', rt: '478',
    service: { label: 'Analytics', color: '#6366f1' },
  },
  {
    type: 'stat' as const,
    label: 'Croissance CA', value: '+38%', change: 'ce trimestre', color: '#6C5CE7', barWidth: '38%',
  },
  {
    type: 'tweet' as const,
    avatarBg: '#f59e0b', avatarLetter: 'M',
    name: 'Artisan Manu', handle: '@artisanat_manu · 6h',
    text: 'Site e-commerce en ligne en 2min. Premier achat 3h après 🎉',
    likes: '923', rt: '267',
    service: { label: 'Site web IA', color: '#6C5CE7' },
  },
  {
    type: 'kpi' as const,
    label: 'Trafic organique', value: '+28%', sub: 'vs mois précédent', color: '#0984e3',
  },
  {
    type: 'site' as const, url: 'avocats-dubois.velona.io', accent: '#0984e3',
  },
  {
    type: 'tweet' as const,
    avatarBg: '#a78bfa', avatarLetter: 'C',
    name: 'Coach Émilie', handle: '@coach_emilie · 2j',
    text: 'Velona automatise mes réseaux, mon agenda, mes emails. Passée à 4j/semaine 💜',
    likes: '1.8k', rt: '412',
    service: { label: 'Réseaux sociaux', color: '#fd79a8' },
  },
  {
    type: 'kpi' as const,
    label: 'Satisfaction client', value: '4.9/5', sub: '248 avis vérifiés', color: '#f59e0b',
  },
] as const;

type CardData = (typeof ROW1_CARDS)[number] | (typeof ROW2_CARDS)[number];

function MarqueeCard({ card }: { card: CardData }) {
  if (card.type === 'tweet') {
    return (
      <div className="flex-shrink-0 w-68 bg-gray-900/80 backdrop-blur border border-white/[0.06] rounded-2xl p-4 shadow-xl" style={{ width: 272 }}>
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: card.avatarBg }}>
            {card.avatarLetter}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{card.name}</p>
            <p className="text-[10px] text-gray-500">{card.handle}</p>
          </div>
          <span className="text-gray-600 text-xs font-bold shrink-0">✕</span>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed mb-3">{card.text}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-[10px] text-gray-500">
            <span>♥ {card.likes}</span>
            <span>↗ {card.rt}</span>
          </div>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${card.service.color}22`, color: card.service.color }}>
            {card.service.label}
          </span>
        </div>
      </div>
    );
  }
  if (card.type === 'stat') {
    return (
      <div className="flex-shrink-0 w-44 bg-gray-900/80 backdrop-blur border border-white/[0.06] rounded-2xl p-4 shadow-xl">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{card.label}</p>
        <p className="text-2xl font-extrabold text-white">{card.value}</p>
        <p className="text-[10px] font-bold mt-1" style={{ color: card.color }}>↑ {card.change}</p>
        <div className="mt-2 h-1 bg-gray-800 rounded-full">
          <div className="h-full rounded-full" style={{ width: card.barWidth, backgroundColor: card.color }} />
        </div>
      </div>
    );
  }
  if (card.type === 'site') {
    return (
      <div className="flex-shrink-0 w-52 bg-gray-900/80 backdrop-blur border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-gray-700/50 px-3 py-1.5 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <div className="flex-1 bg-gray-600/50 rounded px-2 py-0.5 ml-1">
            <p className="text-[8px] text-gray-400 truncate">{card.url}</p>
          </div>
        </div>
        <div className="p-3 space-y-2">
          <div className="h-10 rounded-lg" style={{ background: `linear-gradient(135deg, ${card.accent}22, ${card.accent}08)` }} />
          <div className="grid grid-cols-3 gap-1">
            {[...Array(3)].map((_, i) => <div key={i} className="h-6 bg-gray-700/50 rounded" />)}
          </div>
          <div className="space-y-1">
            {[85, 65, 45].map((w, i) => <div key={i} className="h-1 bg-gray-700/50 rounded" style={{ width: `${w}%` }} />)}
          </div>
        </div>
      </div>
    );
  }
  if (card.type === 'video') {
    return (
      <div className="flex-shrink-0 w-44 bg-gray-900/80 backdrop-blur border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
        <div className="h-24 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
          <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
            <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[12px] border-l-white border-b-[6px] border-b-transparent ml-1" />
          </div>
          <div className="absolute bottom-1.5 right-1.5 bg-black/80 rounded px-1.5 py-0.5">
            <span className="text-white text-[8px]">{card.duration}</span>
          </div>
        </div>
        <div className="p-3">
          <p className="text-[9px] text-white font-semibold leading-tight">{card.title}</p>
          <p className="text-[8px] text-gray-500 mt-0.5">Velona Video · {card.views}</p>
        </div>
      </div>
    );
  }
  if (card.type === 'kpi') {
    return (
      <div className="flex-shrink-0 w-44 bg-gray-900/80 backdrop-blur border border-white/[0.06] rounded-2xl p-4 shadow-xl">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{card.label}</p>
        <p className="text-2xl font-extrabold text-white">{card.value}</p>
        <p className="text-xs mt-0.5" style={{ color: card.color }}>{card.sub}</p>
      </div>
    );
  }
  return null;
}

/* ── Service config ─────────────────────────────────────────────────────────── */
const SERVICE_ICONS: Record<string, React.ReactElement> = {
  website: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  ),
  voice_agent: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16c-2.47 0-4.52-1.8-4.93-4.15-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.09-.6-.39-1.14-1-1.14z"/>
    </svg>
  ),
  video_editing: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
    </svg>
  ),
  appointments: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/>
    </svg>
  ),
  social_media: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
    </svg>
  ),
  analytics: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
    </svg>
  ),
};

const SERVICE_META: Record<string, {
  color: string; glowColor: string;
  badge: string; badgeColor: string; badgeBg: string;
  desc: string; popularity: number; avgTime: string;
}> = {
  website: {
    color: '#6C5CE7', glowColor: 'rgba(108,92,231,0.45)',
    badge: 'Populaire', badgeColor: '#a78bfa', badgeBg: 'rgba(108,92,231,0.15)',
    desc: 'Générez un site professionnel complet en 2 minutes. Design moderne, hébergé et prêt à partager.',
    popularity: 92, avgTime: '~3 min',
  },
  voice_agent: {
    color: '#e91e8c', glowColor: 'rgba(233,30,140,0.4)',
    badge: 'Beta', badgeColor: '#fb923c', badgeBg: 'rgba(249,115,22,0.15)',
    desc: 'Créez un agent téléphonique qui répond à vos clients 24h/24 avec une voix naturelle.',
    popularity: 87, avgTime: '~5 min',
  },
  video_editing: {
    color: '#06b6d4', glowColor: 'rgba(6,182,212,0.4)',
    badge: 'Nouveau', badgeColor: '#67e8f9', badgeBg: 'rgba(6,182,212,0.15)',
    desc: 'Transformez vos clips bruts en vidéos montées professionnellement en quelques clics.',
    popularity: 78, avgTime: '~8 min',
  },
  appointments: {
    color: '#10b981', glowColor: 'rgba(16,185,129,0.4)',
    badge: 'Actif', badgeColor: '#6ee7b7', badgeBg: 'rgba(16,185,129,0.15)',
    desc: 'Automatisez votre agenda — confirmations, rappels et suivi client sans effort.',
    popularity: 71, avgTime: '~2 min',
  },
  social_media: {
    color: '#f97316', glowColor: 'rgba(249,115,22,0.4)',
    badge: 'Populaire', badgeColor: '#fdba74', badgeBg: 'rgba(249,115,22,0.15)',
    desc: 'Planifiez et publiez du contenu optimisé sur tous vos réseaux simultanément.',
    popularity: 84, avgTime: '~4 min',
  },
  analytics: {
    color: '#6366f1', glowColor: 'rgba(99,102,241,0.4)',
    badge: 'Pro', badgeColor: '#a5b4fc', badgeBg: 'rgba(99,102,241,0.15)',
    desc: 'Visualisez vos performances et recevez des rapports IA actionnables chaque semaine.',
    popularity: 69, avgTime: '~6 min',
  },
};

/* ── Service card ───────────────────────────────────────────────────────────── */
function ServiceCard({ service, index }: { service: (typeof SERVICES)[number]; index: number }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const meta = SERVICE_META[service.id] ?? {
    color: '#6C5CE7', glowColor: 'rgba(108,92,231,0.4)',
    badge: 'Actif', badgeColor: '#a78bfa', badgeBg: 'rgba(108,92,231,0.15)',
    desc: '', popularity: 75, avgTime: '~4 min',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 160, damping: 22, delay: index * 0.07 }}
      className="h-full"
    >
      <Link href={`/services/${service.id}`} className="block h-full group">
        <motion.div
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          animate={hovered
            ? { y: -6, boxShadow: `0 24px 60px ${meta.glowColor}` }
            : { y: 0, boxShadow: `0 4px 20px rgba(0,0,0,0.3)` }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="relative flex flex-col h-full rounded-2xl p-5 overflow-hidden"
          style={{
            background: 'rgba(15,12,36,0.85)',
            backdropFilter: 'blur(12px)',
            border: hovered ? '1px solid rgba(108,92,231,0.5)' : '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Top gradient line */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${meta.color}80, transparent)` }} />

          {/* Header row: icon + badge */}
          <div className="flex items-start justify-between mb-4">
            <motion.div
              animate={hovered
                ? { boxShadow: `0 0 28px ${meta.glowColor}`, scale: 1.06 }
                : { boxShadow: `0 0 12px ${meta.glowColor.replace('0.4', '0.2').replace('0.45', '0.2')}`, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${meta.color}30, ${meta.color}18)` }}
            >
              <span style={{ color: meta.color }}>{SERVICE_ICONS[service.id]}</span>
            </motion.div>

            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full mt-0.5"
              style={{ background: meta.badgeBg, color: meta.badgeColor }}
            >
              {meta.badge}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold text-white mb-1.5">
            {t(`${service.i18nKey}.name`)}
          </h3>

          {/* Description */}
          <p className="text-xs text-gray-400 leading-relaxed mb-4 flex-1">
            {meta.desc}
          </p>

          {/* Popularity bar */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] text-gray-600">Popularité</span>
              <span className="text-[10px] font-semibold" style={{ color: meta.color }}>{meta.popularity}%</span>
            </div>
            <div className="h-1 bg-gray-800/80 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: meta.color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${meta.popularity}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 + index * 0.07 }}
              />
            </div>
          </div>

          {/* Avg time */}
          <p className="text-[10px] text-gray-600 mb-4">
            <span className="text-gray-500">{meta.avgTime}</span> par session
          </p>

          {/* Launch button */}
          <div className="relative overflow-hidden rounded-xl">
            <div
              className="w-full py-2.5 text-sm font-semibold text-white text-center rounded-xl"
              style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)` }}
            >
              Lancer →
            </div>
            {/* Shimmer overlay on hover */}
            <span
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
                transform: hovered ? 'translateX(100%)' : 'translateX(-100%)',
                transition: 'transform 0.6s ease-in-out',
              }}
            />
          </div>

          {/* Hover particle */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                key="particle"
                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full pointer-events-none z-20"
                style={{ backgroundColor: meta.color }}
                initial={{ y: 0, opacity: 0.9 }}
                animate={{ y: -80, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </Link>
    </motion.div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: usage, loading: usageLoading, isNearLimit } = useUsage();
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const [greeting, setGreeting] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const firstName = profile?.first_name
    ?? (user?.user_metadata?.full_name as string)?.split(' ')[0]
    ?? 'vous';

  const hasPlan = !!profile?.plan_key;
  const isEnterprise = profile?.plan_key === 'enterprise';

  const totalUsage = usage ? Object.values(usage.usage).reduce((a, b) => a + b, 0) : 0;
  const servicesUsed = usage ? Object.values(usage.usage).filter((v) => v > 0).length : 0;

  const row1Doubled = [...ROW1_CARDS, ...ROW1_CARDS];
  const row2Doubled = [...ROW2_CARDS, ...ROW2_CARDS];

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Bonne matinée ☀️' : h < 18 ? 'Bon après-midi' : 'Bonne soirée 🌙');
  }, []);

  // Cursor spotlight
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      if (!spotlightRef.current) return;
      const rect = el.getBoundingClientRect();
      spotlightRef.current.style.background = `radial-gradient(400px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(108,92,231,0.12), transparent 60%)`;
      spotlightRef.current.style.opacity = '1';
    };
    const onLeave = () => { if (spotlightRef.current) spotlightRef.current.style.opacity = '0'; };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, []);

  // Filtered services for search
  const visibleServices = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return SERVICES.filter((s) =>
        t(`${s.i18nKey}.name`).toLowerCase().includes(q) ||
        (SERVICE_META[s.id]?.desc ?? '').toLowerCase().includes(q)
      );
    }
    return showAll ? SERVICES : SERVICES.slice(0, 3);
  }, [search, showAll, t]);

  const isSearching = !!search.trim();

  return (
    <div ref={containerRef} className="relative">
      {/* Cursor spotlight */}
      <div ref={spotlightRef} className="pointer-events-none absolute inset-0 z-50 transition-opacity duration-300 rounded-3xl" style={{ opacity: 0 }} aria-hidden />

      {/* Slow-moving background orbs */}
      <div className="pointer-events-none select-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden>
        <motion.div
          className="absolute rounded-full"
          style={{ top: '-15%', left: '-10%', width: 560, height: 560, background: 'radial-gradient(circle, rgba(108,92,231,0.14) 0%, transparent 70%)' }}
          animate={{ x: [0, 50, -20, 0], y: [0, -40, 20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{ top: '35%', right: '-12%', width: 480, height: 480, background: 'radial-gradient(circle, rgba(99,102,241,0.11) 0%, transparent 70%)' }}
          animate={{ x: [0, -40, 20, 0], y: [0, 50, -30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{ bottom: '-8%', left: '30%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)' }}
          animate={{ x: [0, 30, -10, 0], y: [0, -30, 40, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Subtle grid */}
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        {/* Floating dots */}
        {([
          { x: '7%', y: '5%', d: 0, s: 3 }, { x: '85%', y: '11%', d: 1.5, s: 2.5 },
          { x: '52%', y: '36%', d: 0.8, s: 3.5 }, { x: '91%', y: '60%', d: 2.2, s: 2 },
          { x: '15%', y: '72%', d: 0.4, s: 3 }, { x: '68%', y: '85%', d: 1.1, s: 2.5 },
        ] as const).map((p, i) => (
          <motion.div key={i} className="absolute rounded-full"
            style={{ left: p.x, top: p.y, width: p.s, height: p.s, background: 'rgba(108,92,231,0.65)' }}
            animate={{ y: [0, -18, 0], opacity: [0.25, 0.8, 0.25] }}
            transition={{ duration: 4 + i * 0.5, delay: p.d, repeat: Infinity, ease: 'easeInOut' }} />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-10 px-0 lg:px-2">

        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col gap-4"
        >
          {/* Greeting */}
          {greeting && (
            <p className="text-sm text-gray-500 font-medium">{greeting}</p>
          )}

          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Bienvenue{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #a78bfa 0%, #6C5CE7 25%, #e879f9 50%, #6C5CE7 75%, #a78bfa 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'name-shimmer 3s linear infinite',
                }}
              >
                {firstName}
              </span>
            </h1>

            {/* Rotating border trial pill */}
            {!hasPlan && (
              <Link href="/checkout/plans">
                <div className="relative inline-block rounded-full overflow-hidden p-[1.5px] cursor-pointer shrink-0">
                  <motion.span
                    aria-hidden
                    className="block absolute"
                    style={{
                      width: '300%',
                      height: '300%',
                      top: '-100%',
                      left: '-100%',
                      background: 'conic-gradient(from 0deg, #6C5CE7 0%, #a78bfa 30%, #e879f9 55%, #4834d4 80%, #6C5CE7 100%)',
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  />
                  <span className="relative z-10 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: '#0c0a24' }}>
                    <span className="text-violet-300">✦</span>
                    <span>3 jours d&apos;essai gratuits</span>
                    <span className="text-violet-400 text-xs">→</span>
                  </span>
                </div>
              </Link>
            )}
          </div>

          {/* 3 metric glassmorphism cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            {[
              {
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                ),
                value: totalUsage,
                label: 'créations ce mois',
                color: '#6C5CE7',
              },
              {
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ),
                value: servicesUsed,
                label: 'services utilisés',
                color: '#10b981',
              },
              {
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
                  </svg>
                ),
                value: '3j',
                label: 'restants sur l\'essai',
                color: '#f97316',
              },
            ].map(({ icon, value, label, color }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl px-5 py-4"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}22`, color }}>
                  {icon}
                </div>
                <div>
                  <p className="text-xl font-bold text-white leading-none">{value}</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <LimitWarning nearLimit={isNearLimit()} isEnterprise={isEnterprise} />

        {hasPlan && !isEnterprise && usage && !usageLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="bg-gray-900/60 border border-white/[0.06] rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-white">{t('dashboard.usageThisMonth')}</h2>
              <span className="text-xs text-gray-600">Réinitialisé le 1er du mois</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SERVICES.map((s) => <UsageBar key={s.id} icon={s.icon} label={t(`${s.i18nKey}.name`)} used={usage.usage[s.id] ?? 0} limit={usage.limit} />)}
            </div>
          </motion.div>
        )}

        {/* ── SERVICES SECTION ──────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex flex-col gap-5"
        >
          {/* Section header */}
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Vos outils IA</h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(108,92,231,0.18)', color: '#a78bfa' }}>
              6 disponibles
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-500">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un service..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 transition-all focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(8px)',
                border: search ? '1px solid rgba(108,92,231,0.5)' : '1px solid rgba(255,255,255,0.07)',
                boxShadow: search ? '0 0 0 3px rgba(108,92,231,0.1)' : 'none',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            )}
          </div>

          {/* Service grid */}
          {visibleServices.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm">
              Aucun service ne correspond à &quot;{search}&quot;
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="sync">
                {visibleServices.map((service, i) => (
                  <ServiceCard key={service.id} service={service} index={i} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Show more / less toggle — hidden while searching */}
          {!isSearching && (
            <div className="flex justify-center mt-2">
              <button
                onClick={() => setShowAll((v) => !v)}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <motion.svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none"
                  animate={{ rotate: showAll ? 180 : 0 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                >
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </motion.svg>
                <span>{showAll ? 'Réduire' : 'Voir tous les services'}</span>
              </button>
            </div>
          )}
        </motion.section>

        {/* ── MARQUEE ────────────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col gap-4"
        >
          {/* Section title with live dot */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <motion.span
                className="w-2 h-2 rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Live</span>
            </div>
            <h2 className="text-xl font-bold text-white">Ils utilisent déjà Velona</h2>
          </div>

          {/* Row 1 — scroll left */}
          <div className="marquee-pause overflow-hidden">
            <div className="flex gap-3 marquee-left" style={{ animationDuration: '50s' }}>
              {row1Doubled.map((card, i) => <MarqueeCard key={i} card={card as CardData} />)}
            </div>
          </div>

          {/* Row 2 — scroll right */}
          <div className="marquee-pause overflow-hidden">
            <div className="flex gap-3 marquee-right" style={{ animationDuration: '50s' }}>
              {row2Doubled.map((card, i) => <MarqueeCard key={i} card={card as CardData} />)}
            </div>
          </div>

          <p className="text-center text-xs text-gray-700 mt-2">
            <Link href="/dashboard/help" className="hover:text-gray-500 transition-colors underline underline-offset-2">
              Conditions générales d&apos;utilisation
            </Link>
          </p>
        </motion.section>

      </div>
    </div>
  );
}
