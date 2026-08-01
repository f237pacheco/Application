'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { createClient } from '@/lib/supabase/client';
import { getParisNow, toDateKey } from '@/lib/booking';
import { SERVICES, type ServiceId } from '@/lib/services';

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function greetingForHour(h: number): string {
  if (h < 6) return 'Bonsoir';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function useCountUp(target: number, duration = 1200, enabled = true) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled || !inView) return;
    let start: number | null = null;
    let raf: number;
    function tick(ts: number) {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - progress, 3)) * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration, enabled]);
  return { ref, value };
}

/* ── Service icons (kept from the previous version — good quality set) ───────── */
const SERVICE_ICONS: Record<ServiceId, React.ReactElement> = {
  website: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  ),
  voice_agent: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16c-2.47 0-4.52-1.8-4.93-4.15-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.09-.6-.39-1.14-1-1.14z"/>
    </svg>
  ),
  video_editing: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
    </svg>
  ),
  appointments: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/>
    </svg>
  ),
  social_media: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
    </svg>
  ),
  analytics: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
    </svg>
  ),
};

const SERVICE_HREF: Record<ServiceId, string> = {
  website: '/dashboard/services/website',
  voice_agent: '/dashboard/services/voice',
  video_editing: '/dashboard/services/video',
  appointments: '/dashboard/services/booking',
  social_media: '/dashboard/services/social',
  analytics: '/dashboard/services/analytics',
};

/* ── Click-to-open info popover — used for the small "?" hints ───────────────── */
function InfoTooltip({ text, align = 'left' }: { text: string; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors"
        style={{ background: 'rgba(255,255,255,0.07)', color: '#9CA3AF' }}
        aria-label="Aide"
      >
        i
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 top-6 w-56 rounded-xl p-3 text-xs leading-relaxed"
            style={{
              [align]: 0,
              background: '#1D1D26', color: '#E4E4E7',
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

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

/* ── Welcome modal ─────────────────────────────────────────────────────────── */
function WelcomeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ background: 'rgba(5,5,8,0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: '#16161D', border: '1px solid #27272A', boxShadow: '0 30px 90px rgba(0,0,0,0.6)' }}
          >
            <div className="relative px-7 pt-8 pb-6 text-center overflow-hidden" style={{ background: 'radial-gradient(ellipse 260px 140px at 50% -20px, rgba(16,185,129,0.18), transparent)' }}>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.06)' }}
                aria-label="Fermer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-black"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', boxShadow: '0 8px 28px rgba(16,185,129,0.4)' }}
              >
                V
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-2">Bienvenue sur Velona</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Velona rassemble vos outils métier au même endroit pour automatiser les tâches qui vous prennent du temps.
              </p>
            </div>

            <div className="px-7 py-6 flex flex-col gap-3">
              <div className="flex items-start gap-3 rounded-xl p-3.5" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7' }}>✓</span>
                <div>
                  <p className="text-sm font-semibold text-white">Gestion des RDV — prêt à l&apos;emploi</p>
                  <p className="text-xs text-gray-500 mt-0.5">Configurez votre page de réservation et laissez vos clients prendre rendez-vous seuls, 24h/24.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #27272A' }}>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm" style={{ background: 'rgba(255,255,255,0.06)', color: '#71717A' }}>⏳</span>
                <div>
                  <p className="text-sm font-semibold text-gray-300">Les 5 autres outils arrivent bientôt</p>
                  <p className="text-xs text-gray-500 mt-0.5">Site web, agent vocal, montage vidéo, réseaux sociaux et analytics sont en cours de finalisation — vous pouvez déjà les découvrir en avant-première.</p>
                </div>
              </div>
            </div>

            <div className="px-7 pb-7 flex flex-col gap-2.5">
              <Link
                href="/dashboard/services/booking"
                onClick={onClose}
                className="w-full py-3 rounded-xl text-sm font-bold text-center text-white transition-transform hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}
              >
                Configurer mes rendez-vous →
              </Link>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Explorer par moi-même
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ── Featured (RDV) service card ──────────────────────────────────────────── */
function FeaturedServiceCard({ bookingsThisMonth, last7Days, statsLoaded }: {
  bookingsThisMonth: number;
  last7Days: number[];
  statsLoaded: boolean;
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const { ref: countRef, value: countValue } = useCountUp(bookingsThisMonth, 1000, statsLoaded);
  const maxDay = Math.max(...last7Days, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 150, damping: 20 }}
    >
      <Link href="/dashboard/services/booking" className="block group">
        <motion.div
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          animate={hovered ? { y: -5 } : { y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="relative rounded-2xl p-6 sm:p-7 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #16161D 0%, #131A16 100%)',
            border: hovered ? '1px solid rgba(16,185,129,0.55)' : '1px solid rgba(16,185,129,0.28)',
            boxShadow: hovered ? '0 28px 70px rgba(16,185,129,0.28)' : '0 8px 32px rgba(16,185,129,0.1)',
            transition: 'border-color 0.25s, box-shadow 0.25s',
          }}
        >
          <motion.div
            className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%)' }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.14)', color: '#10B981' }}>
                  {SERVICE_ICONS.appointments}
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(16,185,129,0.18)', color: '#6EE7B7' }}>
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: '#34D399' }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />
                  Actif — prêt à l&apos;emploi
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">{t('services.appointments.name')}</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-5 max-w-lg">{t('services.appointments.description')}</p>

              <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 w-full max-w-xs" style={{ background: '#111117', color: '#fff' }}>
                <span className="flex-1 text-sm font-semibold text-center">Ouvrir la gestion des RDV</span>
                <motion.span animate={{ x: hovered ? 4 : 0 }} transition={{ duration: 0.2 }}>→</motion.span>
              </div>
            </div>

            <div className="lg:w-64 shrink-0 rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">RDV ce mois-ci</span>
                <InfoTooltip text="Nombre de rendez-vous reçus via votre page de réservation publique depuis le 1er du mois (hors annulations)." align="right" />
              </div>
              <p className="text-3xl font-extrabold" style={{ color: '#6EE7B7' }}>
                <span ref={countRef}>{statsLoaded ? countValue : '—'}</span>
              </p>
              <div className="flex items-end gap-1 h-8 mt-3">
                {last7Days.map((v, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{ background: '#10B981' }}
                    initial={{ height: 2 }}
                    whileInView={{ height: Math.max(2, (v / maxDay) * 32) }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-1.5">7 derniers jours</p>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

/* ── "Coming soon" service card ───────────────────────────────────────────── */
function UpcomingServiceCard({ service, index }: { service: (typeof SERVICES)[number]; index: number }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.1 + index * 0.06 }}
    >
      <Link href={SERVICE_HREF[service.id]} className="block h-full group">
        <motion.div
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          animate={hovered ? { y: -4 } : { y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="relative flex flex-col h-full rounded-xl p-5 overflow-hidden"
          style={{
            background: '#131317',
            border: hovered ? '1px solid #3F3F46' : '1px solid #27272A',
            opacity: hovered ? 1 : 0.82,
            transition: 'border-color 0.2s, opacity 0.2s',
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#1C1C22', color: '#71717A' }}>
              {SERVICE_ICONS[service.id]}
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.05)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
              Bientôt disponible
            </span>
          </div>

          <h3 className="text-sm font-semibold text-gray-200 mb-1.5">{t(`${service.i18nKey}.name`)}</h3>
          <p className="text-xs text-gray-500 leading-relaxed mb-4 flex-1">{t(`${service.i18nKey}.description`)}</p>

          <div className="flex items-center gap-1.5 mt-auto">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#52525B' }}
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.25, ease: 'easeInOut' }}
              />
            ))}
            <span className="text-[10px] text-gray-600 ml-1">En préparation</span>
          </div>

          {/* Hover explainer */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className="absolute left-4 right-4 bottom-4 rounded-lg px-3 py-2 text-[11px] font-medium text-center pointer-events-none"
                style={{ background: 'rgba(9,9,11,0.95)', color: '#D4D4D8', border: '1px solid #3F3F46' }}
              >
                Cet outil arrive prochainement — vous visualisez un aperçu
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Link>
    </motion.div>
  );
}

/* ── Getting-started nudge (shown only if RDV isn't configured yet) ──────────── */
function GettingStartedNudge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut', delay: 0.15 }}
      className="relative flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl p-5 sm:p-6 overflow-hidden"
      style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)' }}
    >
      <motion.div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.6), transparent)' }}
      />
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: 'rgba(16,185,129,0.15)' }}>
        👋
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">Commencez ici : configurez votre page de réservation</p>
        <p className="text-xs text-gray-400 mt-0.5">Ajoutez vos horaires et votre activité pour que vos clients puissent réserver en ligne — ça prend 2 minutes.</p>
      </div>
      <Link
        href="/dashboard/services/booking"
        className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
        style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
      >
        Configurer →
      </Link>
    </motion.div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────── */

interface BookingStatRow { booking_date: string; status: string }
interface SubscriptionInfo { plan_key: string; status: string; trial_end: string | null }

const PLAN_LABELS: Record<string, string> = {
  starter_individual: 'Starter', starter_professional: 'Starter Pro',
  pro_individual: 'Pro', pro_professional: 'Pro', enterprise: 'Enterprise',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [greeting, setGreeting] = useState('');
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  const [bookingConfigured, setBookingConfigured] = useState<boolean | null>(null);
  const [bookingStats, setBookingStats] = useState<BookingStatRow[]>([]);
  const [bookingStatsLoaded, setBookingStatsLoaded] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  const firstName = profile?.first_name
    ?? (user?.user_metadata?.full_name as string)?.split(' ')[0]
    ?? 'vous';

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  /* Real check: has this pro configured their booking page yet? */
  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('booking_settings').select('slug').eq('user_id', user.id).maybeSingle();
      if (error) { console.error('[dashboard] échec de vérification de la config RDV', error); setBookingConfigured(false); return; }
      setBookingConfigured(!!data?.slug);
    };
    load();
  }, [user?.id]);

  /* Real bookings, for the featured card's stats */
  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('bookings').select('booking_date, status').eq('user_id', user.id);
      if (error) { console.error('[dashboard] échec du chargement des statistiques de RDV', error); setBookingStatsLoaded(true); return; }
      setBookingStats((data ?? []) as BookingStatRow[]);
      setBookingStatsLoaded(true);
    };
    load();
  }, [user?.id]);

  /* Real subscription, for the trial/plan chip */
  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('subscriptions')
        .select('plan_key, status, trial_end')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setSubscription(data as SubscriptionInfo);
    };
    load();
  }, [user?.id]);

  const activeBookings = useMemo(() => bookingStats.filter((b) => b.status !== 'cancelled'), [bookingStats]);
  const bookingsThisMonth = useMemo(() => {
    const now = getParisNow();
    const prefix = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    return activeBookings.filter((b) => b.booking_date.startsWith(prefix)).length;
  }, [activeBookings]);
  const last7Days = useMemo(() => {
    const counts = new Map<string, number>();
    activeBookings.forEach((b) => counts.set(b.booking_date, (counts.get(b.booking_date) ?? 0) + 1));
    const today = getParisNow();
    return [...Array(7)].map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return counts.get(toDateKey(d)) ?? 0;
    });
  }, [activeBookings]);

  const trialDaysLeft = subscription?.status === 'trialing' && subscription.trial_end
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / 86_400_000))
    : null;
  const planLabel = subscription ? (PLAN_LABELS[subscription.plan_key] ?? subscription.plan_key) : null;

  const upcomingServices = SERVICES.filter((s) => s.id !== 'appointments');

  return (
    <div className="relative">
      <div className="page-beam" />
      <div className="dashboard-glow-top" />

      {/* Subtle floating decorative orbs — consistent dark theme, low-key */}
      <motion.div
        aria-hidden
        className="absolute top-40 -left-20 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.05), transparent 70%)', filter: 'blur(20px)' }}
        animate={{ y: [0, 24, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute top-96 -right-24 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.04), transparent 70%)', filter: 'blur(20px)' }}
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      <div className="relative z-10 flex flex-col gap-10">

        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="text-sm text-gray-500 font-medium"
          >
            {greeting}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.06 }}
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
          >
            <div>
              <h1 className="text-4xl font-bold text-white leading-tight">{firstName}</h1>
              <p className="text-sm text-gray-500 mt-2 max-w-md">Automatisez votre business, un outil à la fois.</p>
            </div>
            <motion.button
              onClick={() => setWelcomeOpen(true)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-300 hover:text-white transition-colors"
              style={{ border: '1px solid #27272A', background: '#18181B' }}
            >
              <span>✨</span> Découvrir l&apos;application
            </motion.button>
          </motion.div>

          {/* Real stat chips */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.12 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {[
              {
                icon: '📅', color: '#10B981',
                value: bookingStatsLoaded ? bookingsThisMonth : '—',
                label: 'RDV ce mois-ci',
              },
              {
                icon: '⏳', color: '#F59E0B',
                value: trialDaysLeft !== null ? `${trialDaysLeft}j` : (planLabel ?? 'Aucun plan'),
                label: trialDaysLeft !== null ? "restants sur l'essai" : 'plan actuel',
              },
              {
                icon: '🧰', color: '#3B82F6',
                value: '1 / 6',
                label: 'outils actifs',
                tooltip: 'Seule la gestion des RDV est pleinement fonctionnelle pour le moment. Les 5 autres outils sont en cours de finalisation.',
              },
            ].map((chip) => (
              <div key={chip.label} className="flex items-center gap-3 rounded-xl px-5 py-4" style={{ background: '#18181B', border: '1px solid #27272A' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base" style={{ background: '#27272A' }}>
                  {chip.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-white leading-none" style={{ color: chip.color }}>{chip.value}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <p className="text-xs text-zinc-500">{chip.label}</p>
                    {chip.tooltip && <InfoTooltip text={chip.tooltip} />}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── GETTING STARTED NUDGE ────────────────────────────────────────── */}
        {bookingConfigured === false && <GettingStartedNudge />}

        {/* ── STORYTELLING ──────────────────────────────────────────────────── */}
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

        {/* ── SERVICES ──────────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex flex-col gap-5"
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #10B981, #3B82F6)' }} />
            <h2 className="text-xl font-bold text-white">Mes services</h2>
          </div>

          <FeaturedServiceCard bookingsThisMonth={bookingsThisMonth} last7Days={last7Days} statsLoaded={bookingStatsLoaded} />

          <div className="flex items-center gap-2 mt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">À venir</p>
            <InfoTooltip text="Ces outils sont en cours de développement. Vous pouvez déjà les découvrir en avant-première, mais ils ne sont pas encore prêts pour un usage réel." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcomingServices.map((service, i) => (
              <UpcomingServiceCard key={service.id} service={service} index={i} />
            ))}
          </div>
        </motion.section>

      </div>

      <WelcomeModal open={welcomeOpen} onClose={() => setWelcomeOpen(false)} />
    </div>
  );
}
