'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useUsage } from '@/hooks/useUsage';
import { UsageBar } from '@/components/ui/UsageBar';
import { LimitWarning } from '@/components/ui/LimitWarning';
import { VerticalCutReveal } from '@/components/ui/vertical-cut-reveal';
import { SERVICES } from '@/lib/services';
import { clsx } from 'clsx';

/* ── Marquee cards data ────────────────────────────────────────────────────── */
const ROW1_CARDS = [
  {
    type: 'tweet',
    avatar: 'bg-sky-500/40',
    name: 'Julien Tech',
    handle: '@julien_tech · 2h',
    text: `Mon site professionnel créé en 2 minutes ✨ Impossible de croire que c'est de l'IA`,
    likes: '1.2k',
    rt: '380',
  },
  {
    type: 'stat',
    label: 'Revenus ce mois',
    value: '12 480€',
    change: '+24%',
    color: '#00b894',
    barWidth: '72%',
  },
  {
    type: 'site',
    url: 'cabinet-martin.velona.io',
    accent: '#6C5CE7',
  },
  {
    type: 'kpi',
    label: "RDV confirmés aujourd'hui",
    value: '18',
    sub: 'automatiquement',
    color: '#6C5CE7',
  },
  {
    type: 'tweet',
    avatar: 'bg-pink-500/40',
    name: 'Jade Coiffure',
    handle: '@coiffure_jade · 5h',
    text: 'Velona génère mes posts Instagram chaque semaine, je gagne 3h 🙌',
    likes: '847',
    rt: '156',
  },
  {
    type: 'video',
    title: 'Montage vidéo IA — créé en 45s',
    duration: '0:45',
    views: '3.2k vues',
  },
  {
    type: 'tweet',
    avatar: 'bg-emerald-500/40',
    name: 'Kiné Montpellier',
    handle: '@kine_mtp · 1j',
    text: 'Agent vocal gère 100% de mes appels. Incroyable, je ne rate plus aucun RDV.',
    likes: '632',
    rt: '91',
  },
  {
    type: 'kpi',
    label: 'Nouveaux abonnés Instagram',
    value: '+340',
    sub: 'ce mois · ↑ +28%',
    color: '#e1306c',
  },
] as const;

const ROW2_CARDS = [
  {
    type: 'site',
    url: 'resto-bella.velona.io',
    accent: '#f97316',
  },
  {
    type: 'tweet',
    avatar: 'bg-indigo-500/40',
    name: 'Entrepreneur FR',
    handle: '@entrepreneur_fr · 3h',
    text: `Email campaign : 64% d'ouverture. Record absolu pour notre agence 📈`,
    likes: '2.1k',
    rt: '478',
  },
  {
    type: 'stat',
    label: 'Croissance CA',
    value: '+38%',
    change: 'ce trimestre',
    color: '#6C5CE7',
    barWidth: '38%',
  },
  {
    type: 'tweet',
    avatar: 'bg-amber-500/40',
    name: 'Artisan Manu',
    handle: '@artisanat_manu · 6h',
    text: 'Site e-commerce en ligne en 2min. Premier achat 3h après 🎉',
    likes: '923',
    rt: '267',
  },
  {
    type: 'kpi',
    label: 'Trafic organique',
    value: '+28%',
    sub: 'vs mois précédent',
    color: '#0984e3',
  },
  {
    type: 'site',
    url: 'avocats-dubois.velona.io',
    accent: '#0984e3',
  },
  {
    type: 'tweet',
    avatar: 'bg-violet-500/40',
    name: 'Coach Émilie',
    handle: '@coach_emilie · 2j',
    text: 'Velona automatise mes réseaux, mon agenda, mes emails. Passée à 4j/semaine 💜',
    likes: '1.8k',
    rt: '412',
  },
  {
    type: 'kpi',
    label: 'Satisfaction client',
    value: '4.9/5',
    sub: '248 avis vérifiés',
    color: '#f59e0b',
  },
] as const;

type CardData = (typeof ROW1_CARDS)[number] | (typeof ROW2_CARDS)[number];

function MarqueeCard({ card }: { card: CardData }) {
  if (card.type === 'tweet') {
    return (
      <div className="flex-shrink-0 w-64 bg-gray-900/80 backdrop-blur border border-gray-700/50 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-2.5">
          <div className={clsx('w-7 h-7 rounded-full', card.avatar)} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{card.name}</p>
            <p className="text-[10px] text-gray-500">{card.handle}</p>
          </div>
          <span className="text-gray-600 text-xs font-bold shrink-0">✕</span>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">{card.text}</p>
        <div className="flex gap-4 mt-2.5 text-[10px] text-gray-500">
          <span>♥ {card.likes}</span>
          <span>↗ {card.rt}</span>
        </div>
      </div>
    );
  }

  if (card.type === 'stat') {
    return (
      <div className="flex-shrink-0 w-44 bg-gray-900/80 backdrop-blur border border-gray-700/50 rounded-2xl p-4 shadow-xl">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{card.label}</p>
        <p className="text-2xl font-extrabold text-white">{card.value}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] font-bold" style={{ color: card.color }}>↑ {card.change}</span>
        </div>
        <div className="mt-2 h-1 bg-gray-800 rounded-full">
          <div className="h-full rounded-full" style={{ width: card.barWidth, backgroundColor: card.color }} />
        </div>
      </div>
    );
  }

  if (card.type === 'site') {
    return (
      <div className="flex-shrink-0 w-52 bg-gray-900/80 backdrop-blur border border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
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
      <div className="flex-shrink-0 w-44 bg-gray-900/80 backdrop-blur border border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
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
      <div className="flex-shrink-0 w-44 bg-gray-900/80 backdrop-blur border border-gray-700/50 rounded-2xl p-4 shadow-xl">
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
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  ),
  voice_agent: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16c-2.47 0-4.52-1.8-4.93-4.15-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.09-.6-.39-1.14-1-1.14z"/>
    </svg>
  ),
  video_editing: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
    </svg>
  ),
  appointments: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/>
    </svg>
  ),
  social_media: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
    </svg>
  ),
  analytics: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
    </svg>
  ),
};

const SERVICE_META: Record<string, { color: string; glowColor: string; badge: string; badgeColor: string; desc: string; popularity: number }> = {
  website:       { color: '#6C5CE7', glowColor: 'rgba(108,92,231,0.4)',  badge: 'Populaire', badgeColor: 'bg-violet-500/20 text-violet-300',  desc: 'Créez votre site pro en quelques minutes avec IA',      popularity: 92 },
  voice_agent:   { color: '#e91e8c', glowColor: 'rgba(233,30,140,0.35)', badge: 'Populaire', badgeColor: 'bg-pink-500/20 text-pink-300',       desc: 'Agent vocal IA qui répond à vos appels 24h/7j',          popularity: 87 },
  video_editing: { color: '#06b6d4', glowColor: 'rgba(6,182,212,0.4)',   badge: 'Populaire', badgeColor: 'bg-cyan-500/20 text-cyan-300',       desc: 'Montage vidéo automatisé par intelligence artificielle', popularity: 78 },
  appointments:  { color: '#f97316', glowColor: 'rgba(249,115,22,0.35)', badge: 'Nouveau',   badgeColor: 'bg-orange-500/20 text-orange-300',   desc: 'Gérez vos rendez-vous sans effort grâce à l\'IA',        popularity: 65 },
  social_media:  { color: '#10b981', glowColor: 'rgba(16,185,129,0.35)', badge: 'Populaire', badgeColor: 'bg-emerald-500/20 text-emerald-300', desc: 'Automatisez vos réseaux sociaux avec IA',                popularity: 83 },
  analytics:     { color: '#6366f1', glowColor: 'rgba(99,102,241,0.4)',  badge: 'Nouveau',   badgeColor: 'bg-indigo-500/20 text-indigo-300',   desc: 'Analysez vos performances en temps réel',                popularity: 71 },
};

/* ────────────────────────────────────────────────────────────────────────── */

function ServiceCard({ service, index }: { service: (typeof SERVICES)[number]; index: number }) {
  const { t } = useTranslation();
  const { data: usage } = useUsage();
  const [isHovered, setIsHovered] = useState(false);
  const meta = SERVICE_META[service.id] ?? { color: '#6C5CE7', glowColor: 'rgba(108,92,231,0.4)', badge: 'Populaire', badgeColor: 'bg-violet-500/20 text-violet-300', desc: '', popularity: 80 };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 150, damping: 20, delay: index * 0.08 }}
    >
      <Link href={`/services/${service.id}`} className="block h-full">
        <motion.div
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          whileHover={{ y: -8, boxShadow: `0 20px 60px ${meta.glowColor}` }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative overflow-hidden rounded-2xl border border-gray-700 bg-gray-900/80 backdrop-blur-sm h-full flex flex-col"
          style={{ boxShadow: `0 4px 20px ${meta.glowColor.replace('0.4', '0.12').replace('0.35', '0.1')}` }}
        >
          <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)` }} />

          <span className={clsx('absolute top-3 right-3 text-[10px] font-bold px-2.5 py-0.5 rounded-full', meta.badgeColor)}>
            {meta.badge}
          </span>

          <div className="flex justify-center pt-8 pb-4">
            <motion.div
              animate={isHovered
                ? { boxShadow: `0 0 40px ${meta.glowColor}`, scale: 1.08 }
                : { boxShadow: `0 0 18px ${meta.glowColor.replace('0.4', '0.22').replace('0.35', '0.18')}`, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: `${meta.color}1A` }}
            >
              <span style={{ color: meta.color }}>{SERVICE_ICONS[service.id]}</span>
            </motion.div>
          </div>

          <h3 className="text-base font-bold text-white text-center px-4">
            {t(`${service.i18nKey}.name`)}
          </h3>

          <p className="text-xs text-gray-500 text-center px-5 mt-1.5 mb-4 leading-relaxed">
            {meta.desc}
          </p>

          <div className="mx-5 mb-5 mt-auto">
            <div className="flex justify-between text-[10px] text-gray-600 mb-1.5">
              <span>Popularité</span>
              <span>{meta.popularity}%</span>
            </div>
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: meta.color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${meta.popularity}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 + index * 0.08 }}
              />
            </div>
          </div>

          <AnimatePresence>
            {isHovered && (
              <motion.div
                key="particle"
                className="absolute bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full pointer-events-none z-20"
                style={{ backgroundColor: meta.color }}
                initial={{ y: 0, opacity: 0.9, scale: 1 }}
                animate={{ y: -90, opacity: 0, scale: 0.3 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </Link>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: usage, loading: usageLoading, isNearLimit } = useUsage();
  const [showAll, setShowAll] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const firstName = profile?.first_name
    ?? (user?.user_metadata?.full_name as string)?.split(' ')[0]
    ?? 'vous';

  const hasPlan = !!profile?.plan_key;
  const isEnterprise = profile?.plan_key === 'enterprise';

  const row1Doubled = [...ROW1_CARDS, ...ROW1_CARDS];
  const row2Doubled = [...ROW2_CARDS, ...ROW2_CARDS];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onMove = (e: MouseEvent) => {
      if (!spotlightRef.current) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spotlightRef.current.style.background = `radial-gradient(500px circle at ${x}px ${y}px, rgba(108,92,231,0.07), transparent 60%)`;
      spotlightRef.current.style.opacity = '1';
    };
    const onLeave = () => { if (spotlightRef.current) spotlightRef.current.style.opacity = '0'; };
    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', onLeave);
    return () => { container.removeEventListener('mousemove', onMove); container.removeEventListener('mouseleave', onLeave); };
  }, []);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-8">
      {/* Cursor spotlight */}
      <div ref={spotlightRef} className="pointer-events-none absolute inset-0 z-50 transition-opacity duration-300" style={{ opacity: 0 }} aria-hidden />

      {/* Decorative orbs + grid + floating points */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden>
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-[80px]" style={{ background: 'rgba(108,92,231,0.18)' }} />
        <div className="absolute top-[35%] -right-20 w-72 h-72 rounded-full blur-[80px]" style={{ background: 'rgba(99,102,241,0.13)' }} />
        <div className="absolute -bottom-16 left-[25%] w-64 h-64 rounded-full blur-[80px]" style={{ background: 'rgba(139,92,246,0.11)' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(108,92,231,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(108,92,231,0.05) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, rgba(108,92,231,0.025) 0px, rgba(108,92,231,0.025) 1px, transparent 0px, transparent 32px)' }} />
        {([
          { x: '8%', y: '6%', delay: 0, s: 3 }, { x: '84%', y: '12%', delay: 1.5, s: 2.5 },
          { x: '52%', y: '38%', delay: 0.8, s: 3.5 }, { x: '92%', y: '62%', delay: 2.2, s: 2 },
          { x: '16%', y: '75%', delay: 0.4, s: 3 }, { x: '70%', y: '88%', delay: 1.1, s: 2.5 },
        ] as const).map((d, i) => (
          <motion.div key={i} className="absolute rounded-full"
            style={{ left: d.x, top: d.y, width: d.s, height: d.s, background: 'rgba(108,92,231,0.65)' }}
            animate={{ y: [0, -20, 0], opacity: [0.3, 0.85, 0.3] }}
            transition={{ duration: 4 + i * 0.6, delay: d.delay, repeat: Infinity, ease: 'easeInOut' }} />
        ))}
      </div>

      {/* Hero */}
      <div className="relative z-10">
        <h1 className="text-3xl font-bold text-white mb-3">{t('home.welcome', { name: firstName })}</h1>
        <Link href="/checkout/plans">
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 text-violet-300 text-sm font-semibold cursor-pointer hover:bg-violet-500/15 transition-colors"
            animate={{ boxShadow: ['0 0 6px rgba(108,92,231,0.3)', '0 0 18px rgba(108,92,231,0.65)', '0 0 6px rgba(108,92,231,0.3)'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span>✦</span>
            <span>3 jours d&apos;essai gratuits</span>
          </motion.div>
        </Link>
      </div>

      <LimitWarning nearLimit={isNearLimit()} isEnterprise={isEnterprise} />

      {hasPlan && !isEnterprise && usage && !usageLoading && (
        <div className="relative z-10 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-white">{t('dashboard.usageThisMonth')}</h2>
            <span className="text-xs text-gray-500">Réinitialisé le 1er du mois</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SERVICES.map((s) => <UsageBar key={s.id} icon={s.icon} label={t(`${s.i18nKey}.name`)} used={usage.usage[s.id] ?? 0} limit={usage.limit} />)}
          </div>
        </div>
      )}

      {/* Service cards */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-white">Les plus utilisés</h2>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13 3.23 12.17 3.75 11.46 4.32C8.87 6.4 7.85 10.07 9.07 13.22C9.11 13.32 9.15 13.42 9.15 13.55C9.15 13.77 9 13.97 8.8 14.05C8.57 14.15 8.33 14.09 8.14 13.93C8.08 13.88 8.04 13.83 8 13.76C6.87 12.33 6.69 10.28 7.45 8.64C5.78 10 4.87 12.3 5 14.47C5.06 14.97 5.12 15.47 5.29 15.97C5.43 16.57 5.7 17.17 6 17.7C7.08 19.43 8.95 20.67 10.96 20.92C13.1 21.19 15.39 20.8 17.03 19.32C18.86 17.66 19.5 15 18.56 12.72L18.43 12.46C18.22 12 17.66 11.2 17.66 11.2Z" fill="#f97316" />
          </svg>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.slice(0, 3).map((service, index) => <ServiceCard key={service.id} service={service} index={index} />)}
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setShowAll((v) => !v)} className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors">
            <motion.svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              animate={{ rotate: showAll ? 180 : 0 }} transition={{ duration: 0.35, ease: 'easeInOut' }}>
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
            <motion.span className="text-sm font-medium"
              animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}>
              {showAll ? 'Voir moins' : 'Voir plus'}
            </motion.span>
          </button>
        </div>

        <AnimatePresence>
          {showAll && (
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {SERVICES.slice(3).map((service, i) => (
                <motion.div key={service.id}
                  initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                  transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}>
                  <ServiceCard service={service} index={i} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Marquee at bottom */}
      <section className="relative z-10 flex flex-col gap-4">
        <motion.h2 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-xl font-bold"
          style={{ background: 'linear-gradient(90deg, #a78bfa, #6C5CE7, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          <VerticalCutReveal staggerDuration={0.08} staggerFrom="first" transition={{ type: 'spring', stiffness: 200, damping: 22 }}>
            Découvrez ce que Velona génère déjà
          </VerticalCutReveal>
        </motion.h2>
        <div className="marquee-pause overflow-hidden">
          <div className="flex gap-3 marquee-left">{row1Doubled.map((card, i) => <MarqueeCard key={i} card={card} />)}</div>
        </div>
        <div className="marquee-pause overflow-hidden">
          <div className="flex gap-3 marquee-right">{row2Doubled.map((card, i) => <MarqueeCard key={i} card={card} />)}</div>
        </div>
        <p className="text-xs text-gray-600 text-center">
          <Link href="/dashboard/help" className="hover:text-gray-400 transition-colors underline underline-offset-2">
            Conditions générales d&apos;utilisation
          </Link>
        </p>
      </section>
    </div>
  );
}
