'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useInView } from 'framer-motion';
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
      <div className="flex-shrink-0 w-68 backdrop-blur border border-white/[0.06] rounded-2xl p-4 shadow-xl" style={{ width: 272, background: '#18181B' }}>
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
      <div className="flex-shrink-0 w-44 backdrop-blur border border-white/[0.06] rounded-2xl p-4 shadow-xl" style={{ background: '#18181B' }}>
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
      <div className="flex-shrink-0 w-52 backdrop-blur border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl" style={{ background: '#18181B' }}>
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
      <div className="flex-shrink-0 w-44 backdrop-blur border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl" style={{ background: '#18181B' }}>
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
      <div className="flex-shrink-0 w-44 backdrop-blur border border-white/[0.06] rounded-2xl p-4 shadow-xl" style={{ background: '#18181B' }}>
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

/* ── Storytelling illustration — hand-built SVG, no external assets ──────────── */
function AutomationIllustration() {
  const nodes = [
    { x: 40, y: 40, color: '#10B981', icon: 'calendar' as const },
    { x: 260, y: 30, color: '#F59E0B', icon: 'chat' as const },
    { x: 270, y: 150, color: '#3B82F6', icon: 'chart' as const },
    { x: 40, y: 160, color: '#8B5CF6', icon: 'bolt' as const },
  ];
  const center = { x: 155, y: 95 };

  const iconPath: Record<(typeof nodes)[number]['icon'], string> = {
    calendar: 'M7 2v2M17 2v2M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
    chat: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z',
    chart: 'M3 3v18h18M18.7 8l-5.1 5.1-2.8-2.8L7 14',
    bolt: 'M13 2L3 14h7l-1 8 10-12h-7l1-8z',
  };

  return (
    <svg viewBox="0 0 310 195" className="w-full h-auto max-w-md mx-auto" role="img" aria-label="Illustration : Velona connecte vos outils métier">
      {/* connecting lines, drawn in */}
      {nodes.map((n, i) => (
        <motion.line
          key={i}
          x1={center.x} y1={center.y} x2={n.x + 18} y2={n.y + 18}
          stroke={n.color} strokeWidth="1.5" strokeDasharray="4 5" strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.5 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3 + i * 0.15, ease: 'easeOut' }}
        />
      ))}

      {/* satellite nodes */}
      {nodes.map((n, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.5 + i * 0.15 }}
        >
          <motion.circle
            cx={n.x + 18} cy={n.y + 18} r="19"
            fill={`${n.color}1A`} stroke={`${n.color}55`} strokeWidth="1"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
          />
          <path d={iconPath[n.icon]} transform={`translate(${n.x + 9.5} ${n.y + 9.5}) scale(0.7)`} fill="none" stroke={n.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </motion.g>
      ))}

      {/* central hub */}
      <motion.g
        initial={{ opacity: 0, scale: 0.6 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 220, damping: 16 }}
      >
        <circle
          cx={center.x} cy={center.y} r="34"
          fill="rgba(16,185,129,0.1)" stroke="#10B981" strokeWidth="1.5"
        />
        <motion.circle
          cx={center.x} cy={center.y} r="42" fill="none" stroke="#34D399" strokeWidth="1"
          animate={{ opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
        />
        <text x={center.x} y={center.y + 6} textAnchor="middle" fontSize="15" fontWeight="800" fill="#6EE7B7" fontFamily="inherit">V</text>
      </motion.g>
    </svg>
  );
}

/* ── Service card ───────────────────────────────────────────────────────────── */
function ServiceCard({ service, index }: { service: (typeof SERVICES)[number]; index: number }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const meta = SERVICE_META[service.id] ?? {
    color: '#6C5CE7', glowColor: 'rgba(108,92,231,0.4)',
    badge: 'Actif', badgeColor: '#a78bfa', badgeBg: 'rgba(108,92,231,0.15)',
    desc: '', popularity: 75, avgTime: '~4 min',
  };
  const isFeatured = service.id === 'appointments';

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 160, damping: 22, delay: index * 0.07 }}
      className="h-full"
    >
      <Link href={
        service.id === 'website' ? '/dashboard/services/website' :
        service.id === 'voice_agent' ? '/dashboard/services/voice' :
        service.id === 'video_editing' ? '/dashboard/services/video' :
        service.id === 'appointments' ? '/dashboard/services/booking' :
        service.id === 'social_media' ? '/dashboard/services/social' :
        service.id === 'analytics' ? '/dashboard/services/analytics' :
        `/services/${service.id}`
      } className="block h-full group">
        <motion.div
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          animate={hovered
            ? { y: -6, boxShadow: `0 24px 60px ${meta.glowColor}` }
            : { y: 0, boxShadow: isFeatured ? `0 6px 28px ${meta.glowColor}` : `0 4px 20px rgba(0,0,0,0.3)` }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="relative flex flex-col h-full rounded-xl p-5 overflow-hidden"
          style={{
            background: '#18181B',
            border: hovered ? '1px solid #3F3F46' : isFeatured ? `1px solid ${meta.color}55` : '1px solid #27272A',
            transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
            transition: 'border-color 0.15s, transform 0.15s',
          }}
        >
          {/* Top color bar */}
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: meta.color }} />

          {/* Header row: icon + badge */}
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#27272A' }}
            >
              <span style={{ color: meta.color }}>{SERVICE_ICONS[service.id]}</span>
            </div>

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
              className="w-full py-2.5 text-sm font-semibold text-center rounded-lg transition-all duration-150"
              style={{
                background: hovered ? '#4F46E5' : '#27272A',
                color: '#FAFAFA',
                border: hovered ? '1px solid #4F46E5' : '1px solid #3F3F46',
              }}
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

/* ── Conversion sections data & components ────────────────────────────────────── */

function useCountUpValue(target: number, decimals = 0, duration = 1500) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    let raf: number;
    function tick(ts: number) {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Number((progress * target).toFixed(decimals)));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, decimals, duration]);
  return { ref, value };
}

const KEY_STATS = [
  { value: 12400, suffix: '+', label: 'créations IA', color: '#6366F1', spark: [30, 45, 38, 52, 48, 60, 55, 68] },
  { value: 98, suffix: '%', label: 'de satisfaction', color: '#10B981', spark: [70, 75, 72, 80, 78, 85, 82, 90] },
  { value: 3200, suffix: '+', label: 'entreprises', color: '#F59E0B', spark: [20, 28, 25, 35, 32, 42, 38, 48] },
  { value: 45000, suffix: 'h', label: 'économisées', color: '#EC4899', spark: [40, 48, 44, 55, 50, 62, 58, 70] },
];

function KeyStat({ stat }: { stat: typeof KEY_STATS[number] }) {
  const { ref, value } = useCountUpValue(stat.value);
  const max = Math.max(...stat.spark);
  return (
    <div ref={ref} className="flex-1 text-center px-4 py-4">
      <p className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">
        {value.toLocaleString('fr-FR')}{stat.suffix}
      </p>
      <p className="text-xs text-gray-500 mt-1.5 mb-3">{stat.label}</p>
      <div className="flex items-end justify-center gap-1 h-7">
        {stat.spark.map((v, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            whileInView={{ height: `${(v / max) * 100}%` }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.5, ease: 'easeOut' }}
            className="w-1.5 rounded-full"
            style={{ background: stat.color, opacity: 0.3 + (v / max) * 0.7 }}
          />
        ))}
      </div>
    </div>
  );
}

function BentoCard({ color, className = '', delay = 0, children }: { color: string; className?: string; delay?: number; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.45 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={{ y: hovered ? -4 : 0 }}
      className={`relative rounded-2xl p-5 overflow-hidden flex flex-col ${className}`}
      style={{
        background: '#18181B',
        border: hovered ? `1px solid ${color}` : '1px solid #27272A',
        boxShadow: hovered ? `0 16px 40px ${color}26` : 'none',
        transition: 'border-color 0.25s, box-shadow 0.25s',
      }}
    >
      {children}
    </motion.div>
  );
}

const TIME_SAVED_CHART = [
  { day: 'L', h: 32 },
  { day: 'M', h: 44 },
  { day: 'M', h: 38 },
  { day: 'J', h: 58 },
  { day: 'V', h: 50 },
  { day: 'S', h: 72 },
  { day: 'D', h: 64 },
];

function TimeSavedBlock() {
  const max = Math.max(...TIME_SAVED_CHART.map((d) => d.h));
  const growthPct = Math.round(((TIME_SAVED_CHART[TIME_SAVED_CHART.length - 1].h - TIME_SAVED_CHART[0].h) / TIME_SAVED_CHART[0].h) * 100);
  const { ref, value } = useCountUpValue(growthPct, 0, 1300);
  return (
    <BentoCard color="#10B981" delay={0} className="sm:col-span-2 lg:col-span-2 lg:row-span-2">
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(16,185,129,0.15)' }}>⏱️</div>
        <div ref={ref} className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399' }}>
          <span>↑</span>
          <span className="tabular-nums">+{value}%</span>
        </div>
      </div>
      <h3 className="text-lg font-bold text-white mb-1">15h économisées par semaine</h3>
      <p className="text-sm text-gray-400 leading-relaxed mb-5">Automatisez les tâches répétitives et concentrez-vous sur ce qui compte vraiment pour votre activité.</p>
      <div className="mt-auto flex items-end justify-between gap-2.5 px-1">
        {TIME_SAVED_CHART.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-2 flex-1">
            <div className="w-full rounded-md overflow-hidden flex items-end" style={{ height: 64, background: 'rgba(16,185,129,0.08)' }}>
              <motion.div
                className="w-full rounded-md"
                style={{ background: 'linear-gradient(180deg, #34D399, #10B981)' }}
                initial={{ height: 0 }}
                whileInView={{ height: `${(d.h / max) * 100}%` }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[10px] text-gray-500">{d.day}</span>
          </div>
        ))}
      </div>
    </BentoCard>
  );
}

function NoSkillBlock() {
  return (
    <BentoCard color="#6366F1" delay={0.08}>
      <motion.div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3 relative"
        style={{ background: 'rgba(99,102,241,0.15)' }}
        animate={{ rotate: [0, -8, 8, 0] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
      >
        🪄
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute text-xs"
            style={{ top: -4 - i * 4, right: -4 - i * 3 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
          >
            ✨
          </motion.span>
        ))}
      </motion.div>
      <h3 className="text-sm font-bold text-white mb-1.5">Aucune compétence technique</h3>
      <p className="text-xs text-gray-500 leading-relaxed">Une interface simple, pensée pour les entrepreneurs.</p>
    </BentoCard>
  );
}

function RoiBlock() {
  return (
    <BentoCard color="#F59E0B" delay={0.16}>
      <motion.div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3"
        style={{ background: 'rgba(245,158,11,0.15)' }}
        initial={{ scale: 0.6, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
      >
        📈
      </motion.div>
      <h3 className="text-sm font-bold text-white mb-1.5">Rentabilisé rapidement</h3>
      <p className="text-xs text-gray-500 leading-relaxed">La plupart de nos utilisateurs amortissent leur abonnement dès les premières semaines grâce au temps gagné.</p>
    </BentoCard>
  );
}

function SixToolsBlock() {
  return (
    <BentoCard color="#8B5CF6" delay={0.24}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background: 'rgba(139,92,246,0.15)' }}>🧰</div>
      <h3 className="text-sm font-bold text-white mb-2.5">6 outils en 1</h3>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {SERVICES.map((s) => (
          <div
            key={s.id}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px]"
            style={{ background: `${(SERVICE_META[s.id]?.color ?? s.color)}1F`, color: SERVICE_META[s.id]?.color ?? s.color }}
          >
            {s.icon}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">Tout votre business piloté par l&apos;IA, au même endroit.</p>
    </BentoCard>
  );
}

function SupportBlock() {
  return (
    <BentoCard color="#06B6D4" delay={0.32}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(6,182,212,0.15)' }}>💬</div>
        <motion.span
          className="w-2 h-2 rounded-full"
          style={{ background: '#22D3EE' }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <h3 className="text-sm font-bold text-white mb-1.5">Support français 7j/7</h3>
      <p className="text-xs text-gray-500 leading-relaxed">Une équipe basée en France, disponible tous les jours.</p>
    </BentoCard>
  );
}

function ResultsTimerBlock() {
  const [cycle, setCycle] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDone(false);
    const fillTimer = setTimeout(() => setDone(true), 1800);
    const restartTimer = setTimeout(() => setCycle((c) => c + 1), 2500);
    return () => {
      clearTimeout(fillTimer);
      clearTimeout(restartTimer);
    };
  }, [cycle]);

  return (
    <BentoCard color="#EC4899" delay={0.4} className="sm:col-span-2 lg:col-span-4">
      <div className="flex items-center gap-5 w-full">
        <motion.div
          key={done ? 'done' : 'pending'}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: done ? 'rgba(16,185,129,0.15)' : 'rgba(236,72,153,0.15)' }}
        >
          {done ? '✓' : '⚡'}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h3 className="text-sm font-bold text-white">Résultats en minutes</h3>
            <span className="text-xs font-semibold shrink-0" style={{ color: done ? '#34D399' : '#F472B6' }}>
              {done ? 'Terminé ✓' : 'Génération en cours…'}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: '#27272A' }}>
            <motion.div
              key={cycle}
              className="h-full rounded-full"
              style={{ background: done ? 'linear-gradient(90deg, #34D399, #10B981)' : 'linear-gradient(90deg, #EC4899, #F472B6)', transition: 'background 0.3s' }}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.8, ease: 'easeInOut' }}
            />
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">Votre création prête en quelques minutes, pas en semaines.</p>
        </div>
      </div>
    </BentoCard>
  );
}

const HOW_STEPS = [
  { num: '1', icon: '🧩', title: 'Choisissez un outil IA', desc: 'Sélectionnez le service adapté à votre besoin parmi nos 6 outils : site, vidéo, agent vocal, RDV, réseaux ou analytics.' },
  { num: '2', icon: '✍️', title: 'Décrivez votre besoin', desc: "Quelques informations suffisent — votre activité, votre style, vos objectifs. L'IA s'occupe du reste, sans jargon technique." },
  { num: '3', icon: '🚀', title: 'Récupérez votre résultat en minutes', desc: "Site, vidéo, agent vocal ou rapport — généré, prêt à l'emploi et personnalisable en quelques clics." },
];

const ACCENT_GRADIENT = 'linear-gradient(90deg, #6366F1, #8B5CF6)';

const ACTION_TABS = [
  {
    id: 'website', label: 'Sites web', color: '#6C5CE7', href: '/dashboard/services/website',
    title: 'Un site professionnel en quelques minutes',
    benefits: ['Design moderne généré sur mesure', 'Hébergement inclus, en ligne immédiatement', 'Optimisé mobile et SEO dès le départ', 'Modifiable à tout moment sans code'],
  },
  {
    id: 'social', label: 'Réseaux sociaux', color: '#f97316', href: '/dashboard/services/social',
    title: "Vos réseaux sociaux gérés par l'IA",
    benefits: ['Visuels et légendes générés automatiquement', 'Planification multi-plateformes en un clic', 'Ton et style adaptés à votre marque', 'Suggestions de publication aux meilleurs horaires'],
  },
  {
    id: 'booking', label: 'Rendez-vous', color: '#10b981', href: '/dashboard/services/booking',
    title: 'Votre agenda, en pilote automatique',
    benefits: ['Réservation en ligne 24h/24', 'Rappels automatiques par SMS et email', 'Réduction drastique des absences', 'Synchronisation avec votre calendrier existant'],
  },
  {
    id: 'analytics', label: 'Analytics', color: '#6366f1', href: '/dashboard/services/analytics',
    title: 'Pilotez votre business avec des données claires',
    benefits: ['Tableaux de bord générés automatiquement', 'Rapports IA actionnables chaque semaine', 'Suivi des performances en temps réel', 'Recommandations personnalisées pour progresser'],
  },
];

function ActionMockup({ id, color }: { id: string; color: string }) {
  if (id === 'website') {
    return (
      <div className="rounded-xl overflow-hidden w-full" style={{ border: '1px solid #27272A' }}>
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: '#0D0D10' }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#EF4444' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F59E0B' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#10B981' }} />
        </div>
        {/* Site nav */}
        <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#15151A', borderBottom: '1px solid #27272A' }}>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            <div className="h-2 w-12 rounded" style={{ background: '#3F3F46' }} />
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-1.5 w-6 rounded" style={{ background: '#3F3F46' }} />)}
          </div>
        </div>
        {/* Hero */}
        <div className="h-16 w-full flex items-center px-4" style={{ background: `linear-gradient(135deg, ${color}, #8B5CF6)` }}>
          <div className="h-2 w-1/3 rounded bg-white/70" />
        </div>
        {/* Content blocks */}
        <div className="p-4 flex flex-col gap-2" style={{ background: '#0D0D10' }}>
          <div className="h-2.5 w-1/2 rounded" style={{ background: '#27272A' }} />
          <div className="h-2 w-full rounded" style={{ background: '#1F1F23' }} />
          <div className="h-2 w-5/6 rounded" style={{ background: '#1F1F23' }} />
          <div className="flex gap-2 mt-1.5">
            <div className="h-12 flex-1 rounded-lg" style={{ background: `${color}1F` }} />
            <div className="h-12 flex-1 rounded-lg" style={{ background: `${color}1F` }} />
          </div>
        </div>
      </div>
    );
  }
  if (id === 'social') {
    return (
      <div className="w-full max-w-[220px] mx-auto rounded-xl overflow-hidden" style={{ background: '#0D0D10', border: '1px solid #27272A' }}>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="w-7 h-7 rounded-full shrink-0" style={{ background: `linear-gradient(135deg, ${color}, #FBBF24)` }} />
          <div className="h-2 w-16 rounded" style={{ background: '#3F3F46' }} />
        </div>
        <div className="w-full aspect-square" style={{ background: `linear-gradient(135deg, ${color}55, #18181B 70%)` }} />
        <div className="flex items-center gap-3 px-3 py-2 text-sm" style={{ color }}>
          <span>♥</span><span>💬</span><span>↗</span>
        </div>
        <div className="px-3 pb-3 flex flex-col gap-1.5">
          <div className="h-2 w-3/4 rounded" style={{ background: '#27272A' }} />
          <div className="h-2 w-1/2 rounded" style={{ background: '#27272A' }} />
        </div>
      </div>
    );
  }
  if (id === 'booking') {
    return (
      <div className="rounded-xl p-4 w-full" style={{ background: '#0D0D10', border: '1px solid #27272A' }}>
        <div className="grid grid-cols-7 gap-1.5 mb-3">
          {[...Array(21)].map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-md"
              style={{ background: [4, 9, 13, 17].includes(i) ? color : '#27272A', opacity: [4, 9, 13, 17].includes(i) ? 1 : 0.5 }}
            />
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {['09:30 — Client A', '14:00 — Client B'].map((slot) => (
            <div key={slot} className="flex items-center justify-between rounded-lg px-2.5 py-1.5" style={{ background: '#15151A' }}>
              <span className="text-[10px] text-gray-400">{slot}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${color}26`, color }}>Confirmé</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl p-4 w-full flex flex-col gap-3" style={{ background: '#0D0D10', border: '1px solid #27272A' }}>
      <div className="flex gap-2">
        {[
          { label: 'Visites', value: '2 480' },
          { label: 'Conversions', value: '186' },
        ].map((kpi) => (
          <div key={kpi.label} className="flex-1 rounded-lg p-2.5" style={{ background: '#15151A' }}>
            <p className="text-sm font-bold text-white">{kpi.value}</p>
            <p className="text-[10px] text-gray-500">{kpi.label}</p>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-2 h-20">
        {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
          <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: `${color}${i === 5 ? 'FF' : '55'}` }} />
        ))}
      </div>
      <svg viewBox="0 0 200 36" className="w-full h-9" preserveAspectRatio="none">
        <polyline
          points="0,28 25,20 50,24 75,12 100,16 125,6 150,10 175,2 200,8"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function ActionTabs() {
  const [active, setActive] = useState(0);
  const tab = ACTION_TABS[active];

  const handleDragEnd = (_e: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -60 && active < ACTION_TABS.length - 1) setActive(active + 1);
    else if (info.offset.x > 60 && active > 0) setActive(active - 1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {ACTION_TABS.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setActive(i)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors relative"
            style={{
              background: active === i ? ACCENT_GRADIENT : '#18181B',
              color: active === i ? '#fff' : '#A1A1AA',
              border: active === i ? '1px solid #6366F1' : '1px solid #27272A',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={tab.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragEnd={handleDragEnd}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center touch-pan-y cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center justify-center rounded-2xl p-6" style={{ background: '#18181B', border: '1px solid #27272A' }}>
            <ActionMockup id={tab.id} color={tab.color} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-4">{tab.title}</h3>
            <ul className="flex flex-col gap-3 mb-6">
              {tab.benefits.map((b, i) => (
                <motion.li
                  key={b}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.3 }}
                  className="flex items-start gap-2.5 text-sm text-gray-300"
                >
                  <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: ACCENT_GRADIENT }}>✓</span>
                  {b}
                </motion.li>
              ))}
            </ul>
            <Link
              href={tab.href}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={{ background: ACCENT_GRADIENT }}
            >
              Essayer cet outil →
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>
      {/* Mobile swipe hint */}
      <p className="sm:hidden text-center text-[11px] text-gray-600">← Glissez pour changer d&apos;outil →</p>
    </div>
  );
}

const TESTIMONIALS = [
  {
    initial: 'S', avatarBg: '#6366F1', name: 'Sophie Marchand', role: 'Fondatrice, Boutique Sophie M.',
    quote: "Velona a complètement changé ma façon de travailler. En quelques minutes j'ai un site qui convertit mieux que celui que j'avais payé 2000€ à une agence. Mes clientes me disent que c'est devenu beaucoup plus simple de réserver et de commander en ligne.",
    metric: '+340% de leads',
  },
  {
    initial: 'K', avatarBg: '#10B981', name: 'Karim Belkacem', role: 'Coach sportif indépendant',
    quote: "Entre les RDV, les relances et les réseaux sociaux, je passais mes soirées sur l'administratif. Aujourd'hui tout est automatisé : mes clients réservent seuls, reçoivent leurs rappels, et mes posts Instagram partent sans que j'y touche.",
    metric: '12h économisées/semaine',
  },
  {
    initial: 'L', avatarBg: '#F59E0B', name: 'Léa Dubreuil', role: 'Gérante, Le Petit Cèdre (restaurant)',
    quote: "On hésitait à investir dans un outil IA, on pensait que ce serait compliqué. En réalité, en une semaine on avait notre nouveau site, nos réservations automatisées et nos réseaux gérés. Le bouche-à-oreille a fait le reste.",
    metric: 'CA x2 en 3 mois',
  },
];

const TRUSTED_LOGOS = [
  'Atelier Lumière', 'NovaFit Coaching', 'Le Petit Cèdre', 'Studio Marchand', 'Belkacem Conseil',
  'Dubreuil & Co', 'Maison Verte', 'Cabinet Horizon', 'Salon Éclat', 'Artisans Réunis',
];

function TestimonialCard({ tst, index }: { tst: typeof TESTIMONIALS[number]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const [hoverStar, setHoverStar] = useState<number | null>(null);
  const activeStars = hoverStar ?? 5;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.45 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={{ y: hovered ? -4 : 0 }}
      className="rounded-2xl p-6 flex flex-col"
      style={{
        background: '#18181B',
        border: hovered ? `1px solid ${tst.avatarBg}` : '1px solid #27272A',
        boxShadow: hovered ? `0 16px 40px ${tst.avatarBg}26` : 'none',
        transition: 'border-color 0.25s, box-shadow 0.25s',
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0" style={{ background: tst.avatarBg }}>
          {tst.initial}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-white truncate">{tst.name}</p>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(16,185,129,0.12)', color: '#6EE7B7' }}>
              Vérifié ✓
            </span>
          </div>
          <p className="text-xs text-gray-500">{tst.role}</p>
        </div>
      </div>
      <div className="flex gap-0.5 mb-3" onMouseLeave={() => setHoverStar(null)}>
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            onMouseEnter={() => setHoverStar(i + 1)}
            style={{ color: i < activeStars ? '#FBBF24' : '#3F3F46', cursor: 'pointer', transition: 'color 0.15s' }}
          >
            ★
          </span>
        ))}
      </div>
      <p className="text-sm text-gray-400 leading-relaxed flex-1 mb-4">&quot;{tst.quote}&quot;</p>
      <span className="inline-flex self-start items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#6EE7B7' }}>
        ✓ {tst.metric}
      </span>
    </motion.div>
  );
}

const BEFORE_POINTS = [
  'Des heures perdues sur chaque tâche',
  'Besoin de plusieurs outils coûteux',
  'Résultats amateurs',
  'Aucun support disponible',
  'Décisions prises à l\'aveugle',
];

const AFTER_POINTS = [
  'Tout automatisé en quelques minutes',
  'Un seul outil tout-en-un',
  'Qualité professionnelle',
  'Support français 7j/7',
  'Données et insights clairs',
];

const TRUST_BADGES = [
  { icon: '🔒', label: 'Données chiffrées & sécurisées' },
  { icon: '✓', label: 'Essai 3 jours sans carte' },
  { icon: '↩', label: 'Annulation en 1 clic' },
  { icon: '🇫🇷', label: 'Support français 7j/7' },
  { icon: '⚡', label: 'Résultats en minutes' },
];

const QUICK_FAQS = [
  { q: 'Est-ce que je peux essayer gratuitement ?', a: "Oui, vous bénéficiez de 3 jours d'essai gratuit, sans carte bancaire requise, pour tester l'ensemble des outils." },
  { q: 'Ai-je besoin de compétences techniques ?', a: 'Aucune. Velona est conçu pour les entrepreneurs, pas pour les développeurs — tout se fait en quelques clics.' },
  { q: 'Puis-je annuler à tout moment ?', a: "Oui, l'annulation se fait en un clic depuis votre espace, sans engagement ni frais cachés." },
  { q: 'Mes données sont-elles protégées ?', a: 'Toutes vos données sont chiffrées et hébergées de manière sécurisée. Vous seul y avez accès.' },
  { q: 'Combien de temps pour avoir un résultat ?', a: 'La plupart des outils génèrent un résultat exploitable en quelques minutes — un site, une vidéo ou un agent vocal prêt à l\'emploi.' },
];

function QuickFaqItem({ faq, index }: { faq: typeof QUICK_FAQS[number]; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      onClick={() => setOpen((v) => !v)}
      className="rounded-xl overflow-hidden cursor-pointer"
      style={{ border: open ? '1px solid #6366F1' : '1px solid #27272A', background: open ? 'rgba(99,102,241,0.06)' : '#18181B', transition: 'border-color 0.2s, background 0.2s' }}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-sm font-semibold text-white pr-4">{faq.q}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 text-gray-400 text-lg leading-none">+</motion.span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="a" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeInOut' }} className="overflow-hidden">
            <p className="px-5 pb-4 text-sm text-gray-400 leading-relaxed">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
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
    <div className="relative">
      {/* Top beam + dashboard glow */}
      <div className="page-beam" />
      <div className="dashboard-glow-top" />

      <div className="relative z-10 flex flex-col gap-10">

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
              <span className="text-white">
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
                      background: 'conic-gradient(from 0deg, #F59E0B 0%, #FCD34D 30%, #F97316 55%, #D97706 80%, #F59E0B 100%)',
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  />
                  <span className="relative z-10 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold" style={{ background: '#0A0A0F', color: '#F59E0B' }}>
                    <span>✦</span>
                    <span>3 jours d&apos;essai gratuits</span>
                    <span className="text-xs">→</span>
                  </span>
                </div>
              </Link>
            )}
          </div>

          {/* 3 metric cards — violet / cyan / orange */}
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
                    <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/>
                  </svg>
                ),
                value: servicesUsed,
                label: 'services utilisés',
                color: '#06b6d4',
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
                className="flex items-center gap-3 rounded-xl px-5 py-4 relative overflow-hidden transition-all duration-150"
                style={{
                  background: '#18181B',
                  border: `1px solid #27272A`,
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#27272A', color }}>
                  {icon}
                </div>
                <div>
                  <p className="text-xl font-bold text-white leading-none">{value}</p>
                  <p className="text-xs mt-1 text-zinc-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── QU'EST-CE QUE VELONA ────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative rounded-2xl p-7 sm:p-10 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
          style={{ background: '#131317', border: '1px solid #27272A' }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6EE7B7' }}>Qu&apos;est-ce que Velona ?</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2 mb-4 leading-snug">
              Votre business, épaulé par l&apos;intelligence artificielle
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed mb-3">
              Velona réunit les outils dont un entrepreneur a besoin au quotidien — agenda, site, communication, suivi — au même endroit, pensés pour fonctionner sans compétence technique.
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Aujourd&apos;hui, la gestion des rendez-vous est pleinement opérationnelle : vos clients réservent en ligne, vous gérez tout depuis votre tableau de bord. Les autres outils rejoindront la plateforme au fur et à mesure de leur finalisation.
            </p>
          </div>
          <AutomationIllustration />
        </motion.section>

        <LimitWarning nearLimit={isNearLimit()} isEnterprise={isEnterprise} />

        {hasPlan && !isEnterprise && usage && !usageLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="rounded-xl p-6"
            style={{ background: '#18181B', border: '1px solid #27272A' }}
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
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #6C5CE7, #06b6d4)' }} />
              <h2 className="text-xl font-bold text-white">Vos outils IA</h2>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: '#1E1B4B', color: '#818CF8', border: '1px solid #3730A3' }}>
              6 disponibles
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: '#1C1400', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
              ✦ Nouveau: Vidéo IA
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
                background: '#18181B',
                border: search ? '1px solid #6366F1' : '1px solid #27272A',
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
                style={{ background: '#18181B', border: '1px solid #27272A', color: '#71717A' }}
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

        {/* ── POURQUOI VELONA (BENTO) ───────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex flex-col gap-5"
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #10B981, #F59E0B)' }} />
            <h2 className="text-xl font-bold text-white">Pourquoi Velona</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:auto-rows-[150px]">
            <TimeSavedBlock />
            <NoSkillBlock />
            <RoiBlock />
            <SixToolsBlock />
            <SupportBlock />
            <ResultsTimerBlock />
          </div>
        </motion.section>

        {/* ── DÉCOUVREZ VELONA EN ACTION ────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex flex-col gap-5"
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #6C5CE7, #EC4899)' }} />
            <h2 className="text-xl font-bold text-white">Découvrez Velona en action</h2>
          </div>
          <ActionTabs />
        </motion.section>

        {/* ── COMMENT ÇA MARCHE ─────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex flex-col gap-5"
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #6366F1, #818CF8)' }} />
            <h2 className="text-xl font-bold text-white">Comment ça marche</h2>
          </div>
          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="hidden sm:block absolute top-9 left-[16.66%] right-[16.66%] h-px" style={{ background: '#27272A' }}>
              <motion.div
                className="h-px"
                style={{ background: 'linear-gradient(90deg, #6366F1, #818CF8)', transformOrigin: 'left' }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
            {HOW_STEPS.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.45 }}
                className="relative rounded-2xl p-6 text-center"
                style={{ background: '#18181B', border: '1px solid #27272A' }}
              >
                <span className="absolute top-3 right-4 text-3xl font-black" style={{ color: 'rgba(99,102,241,0.15)' }}>{s.num}</span>
                <motion.div
                  className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-xl mx-auto mb-3"
                  style={{ background: 'rgba(99,102,241,0.12)' }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
                >
                  {s.icon}
                </motion.div>
                <h3 className="text-sm font-bold text-white mb-1.5">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">{s.desc}</p>
                {i === 0 && (
                  <div className="flex justify-center gap-1.5">
                    {SERVICES.slice(0, 6).map((sv) => (
                      <span key={sv.id} className="w-6 h-6 rounded-md flex items-center justify-center text-[11px]" style={{ background: `${(SERVICE_META[sv.id]?.color ?? sv.color)}1F` }}>
                        {sv.icon}
                      </span>
                    ))}
                  </div>
                )}
                {i === 1 && (
                  <div className="flex items-center gap-1.5 mx-auto max-w-[160px] rounded-lg px-3 py-2" style={{ background: '#0D0D10', border: '1px solid #27272A' }}>
                    <span className="text-xs text-gray-500">Votre besoin...</span>
                    <motion.span
                      className="w-px h-3.5"
                      style={{ background: '#818CF8' }}
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                    />
                  </div>
                )}
                {i === 2 && (
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7' }}>✓</span>
                    <span className="text-xs text-gray-500">Prêt en ~3 min</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-500 mt-1">Aucune installation · Aucun engagement · Résultats immédiats</p>
        </motion.section>

        {/* ── CHIFFRES-CLÉS ──────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="rounded-2xl"
          style={{ background: '#0D0D10', border: '1px solid #27272A' }}
        >
          <div className="flex flex-col sm:flex-row items-stretch">
            {KEY_STATS.map((s, i) => (
              <div key={s.label} className="flex-1 flex items-center">
                {i > 0 && <div className="hidden sm:block w-px self-stretch my-3" style={{ background: '#27272A' }} />}
                <KeyStat stat={s} />
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── ILS NOUS FONT CONFIANCE ────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex flex-col gap-5"
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #F59E0B, #FBBF24)' }} />
            <h2 className="text-xl font-bold text-white">Ils nous font confiance</h2>
          </div>
          <div className="marquee-pause overflow-hidden">
            <div className="flex gap-8 marquee-left" style={{ animationDuration: '38s' }}>
              {[...TRUSTED_LOGOS, ...TRUSTED_LOGOS].map((name, i) => (
                <span key={i} className="text-sm font-semibold text-gray-600 whitespace-nowrap shrink-0">{name}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => <TestimonialCard key={t.name} tst={t} index={i} />)}
          </div>
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
        </motion.section>

        {/* ── AVANT / APRÈS ──────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex flex-col gap-5"
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #EF4444, #10B981)' }} />
            <h2 className="text-xl font-bold text-white">Avant / Après Velona</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl p-6"
              style={{ background: '#1A0E0E', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: '#FCA5A5' }}>
                <span>✕</span> Sans Velona
              </h3>
              <div className="flex flex-col gap-3">
                {BEFORE_POINTS.map((p) => (
                  <div key={p} className="flex items-start gap-2.5">
                    <span className="text-sm shrink-0" style={{ color: '#EF4444' }}>✕</span>
                    <span className="text-sm text-gray-400">{p}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl p-6"
              style={{ background: '#0E1A12', border: '1px solid rgba(16,185,129,0.25)' }}
            >
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: '#6EE7B7' }}>
                <span>✓</span> Avec Velona
              </h3>
              <div className="flex flex-col gap-3">
                {AFTER_POINTS.map((p) => (
                  <div key={p} className="flex items-start gap-2.5">
                    <span className="text-sm shrink-0" style={{ color: '#10B981' }}>✓</span>
                    <span className="text-sm text-gray-300">{p}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* ── GARANTIE & CONFIANCE ──────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 rounded-2xl py-6 px-4"
          style={{ background: '#0D0D10', border: '1px solid #27272A' }}
        >
          {TRUST_BADGES.map((b, i) => (
            <motion.div
              key={b.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-gray-300"
              style={{ background: '#18181B', border: '1px solid #27272A' }}
            >
              <span>{b.icon}</span>{b.label}
            </motion.div>
          ))}
        </motion.section>

        {/* ── FAQ RAPIDE ─────────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex flex-col gap-5"
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #6366F1, #818CF8)' }} />
            <h2 className="text-xl font-bold text-white">Questions fréquentes</h2>
          </div>
          <div className="flex flex-col gap-3 max-w-2xl mx-auto w-full">
            {QUICK_FAQS.map((faq, i) => <QuickFaqItem key={faq.q} faq={faq} index={i} />)}
          </div>
        </motion.section>

        {/* ── CTA FINAL ──────────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative text-center rounded-2xl p-10 sm:p-14 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1E1B4B, #0D0D10)', border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 0 80px rgba(99,102,241,0.15)' }}
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">Prêt à automatiser votre business ?</h2>
          <p className="text-gray-400 text-base mb-7">Rejoignez 3 200+ entrepreneurs qui gagnent du temps chaque jour.</p>
          <Link
            href="/checkout/plans"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold text-white transition-all hover:opacity-90"
            style={{ background: '#F59E0B', boxShadow: '0 4px 30px rgba(245,158,11,0.4)' }}
          >
            Commencer gratuitement →
          </Link>
          <p className="text-gray-600 text-xs mt-5">Sans carte bancaire · Annulation en 1 clic · Résultats en minutes</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="text-xs text-gray-500">🔥 47 personnes ont rejoint cette semaine</span>
          </div>
        </motion.section>

        <p className="text-center text-xs text-gray-700">
          <Link href="/dashboard/help" className="hover:text-gray-500 transition-colors underline underline-offset-2">
            Conditions générales d&apos;utilisation
          </Link>
        </p>

      </div>
    </div>
  );
}
