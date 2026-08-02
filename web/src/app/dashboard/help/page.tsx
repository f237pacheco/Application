'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

/* ── Contact addresses — easy to change later without touching the rest of
   this file: set NEXT_PUBLIC_SUPPORT_EMAIL / NEXT_PUBLIC_PARTNERSHIP_EMAIL
   in .env.local (documented in .env.local.example) and redeploy. Both
   currently fall back to the same placeholder address. ────────────────── */
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'f237pacheco@gmail.com';
const PARTNERSHIP_EMAIL = process.env.NEXT_PUBLIC_PARTNERSHIP_EMAIL || 'f237pacheco@gmail.com';

function buildMailto(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// A plain mailto: link silently does nothing if the browser has no
// registered mail client handler — the common case for anyone using Gmail
// (or any webmail) in the browser rather than a desktop mail app. Gmail's
// own compose URL always works since it's just a regular webpage.
function buildGmailWebUrl(email: string, subject: string, body: string): string {
  const params = new URLSearchParams({ view: 'cm', fs: '1', to: email, su: subject, body });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/* ── Icons — a small consistent line-icon set for this page ──────────────────── */

function IconHeadset({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 13v-1a8 8 0 0116 0v1" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="2.5" y="13" width="4" height="6" rx="1.6" stroke={color} strokeWidth="1.6" />
      <rect x="17.5" y="13" width="4" height="6" rx="1.6" stroke={color} strokeWidth="1.6" />
      <path d="M19.5 19.3c0 1.5-1.4 2.7-3.6 2.7H13" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconHandshake({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M2.5 11.5l4-3.2c.6-.5 1.5-.5 2 0l2.2 1.9M21.5 11.5l-4-3.2c-.6-.5-1.5-.5-2 0L9 13.7c-.6.5-.6 1.4 0 1.9.6.5 1.4.5 2 0l1.6-1.3" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 14.3l1.4 1.3c.6.5 1.4.5 2 0M13.5 12l1.7 1.5c.6.5 1.4.5 1.9 0" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 11.5V18M21.5 11.5V18" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconBook({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 4.5A1.5 1.5 0 015.5 3H11v18H5.5A1.5 1.5 0 014 19.5v-15z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 4.5A1.5 1.5 0 0018.5 3H13v18h5.5a1.5 1.5 0 001.5-1.5v-15z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconScale({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v18M7 21h10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 6L5 8l2.5 6a3 3 0 005 0L15 8l-3-2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M2.5 8L5 8l2.5 6M21.5 8L19 8l-2.5 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconShieldCheck({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2.5l7.5 3v5.7c0 4.9-3.2 8.9-7.5 10.3-4.3-1.4-7.5-5.4-7.5-10.3V5.5l7.5-3z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8.7 12.2l2.2 2.2 4.4-4.6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconFileText({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 2.5h8l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1v-17a1 1 0 011-1z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 2.5v4h4M8 12h8M8 16h8M8 8h3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconGoogle({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.5 12.23c0-.79-.07-1.54-.2-2.27H12v4.3h5.9a5.05 5.05 0 01-2.19 3.31v2.75h3.54c2.08-1.91 3.25-4.74 3.25-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.54-2.76c-.98.66-2.24 1.05-3.74 1.05-2.87 0-5.3-1.94-6.17-4.53H2.18v2.85A11 11 0 0012 23z" />
      <path fill="#FBBC05" d="M5.83 14.1a6.6 6.6 0 010-4.2V7.05H2.18a11 11 0 000 9.9l3.65-2.85z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 00-9.82 6.05l3.65 2.85C6.7 7.32 9.13 5.38 12 5.38z" />
    </svg>
  );
}

function IconMailOpen({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 8.5l8.4 6.2a1 1 0 001.2 0L21 8.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 19V8.6a1 1 0 01.42-.81l8-5.79a1 1 0 011.16 0l8 5.79a1 1 0 01.42.81V19a1 1 0 01-1 1H4a1 1 0 01-1-1z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function IconClipboard({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="6" y="4" width="12" height="17" rx="2" stroke={color} strokeWidth="1.6" />
      <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 11h6M9 15h6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconCheck({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconNoLock({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="10" width="16" height="10" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M7.5 10V7a4.5 4.5 0 018.35-2.3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 14v3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ── Header illustration — hand-built SVG, no external assets ────────────────── */

function HelpIllustration() {
  const center = { x: 130, y: 100 };
  const nodes = [
    { x: 34, y: 30, color: '#10B981', kind: 'shield' as const },
    { x: 216, y: 34, color: '#3B82F6', kind: 'mail' as const },
    { x: 220, y: 156, color: '#F59E0B', kind: 'doc' as const },
    { x: 32, y: 158, color: '#8B5CF6', kind: 'chat' as const },
  ];
  const iconPath: Record<(typeof nodes)[number]['kind'], string> = {
    shield: 'M0 -6.5L6 -4v5.2C6 4.7 3.3 7.7 0 8.7-3.3 7.7-6 4.7-6 1.2V-4l6-2.5z',
    mail: 'M-7-4.5h14a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H-7A1.5 1.5 0 01-8.5 3V-3A1.5 1.5 0 01-7-4.5zM-8 -3.5L0 2 8 -3.5',
    doc: 'M-5-7h7l3.5 3.5V7a1 1 0 01-1 1H-5a1 1 0 01-1-1V-6a1 1 0 011-1zM2-7v3.5h3.5M-3 1h6M-3 4h6',
    chat: 'M-7-4.5A2.5 2.5 0 01-4.5-7h9A2.5 2.5 0 017-4.5v4A2.5 2.5 0 014.5 2H-2l-3 2.6V2h-2A2.5 2.5 0 01-7-4.5z',
  };

  return (
    <svg viewBox="0 0 260 200" className="w-full h-auto max-w-sm mx-auto" role="img" aria-label="Illustration : centre d'aide Velona">
      {nodes.map((n, i) => (
        <motion.line
          key={i}
          x1={center.x} y1={center.y} x2={n.x} y2={n.y}
          stroke={n.color} strokeWidth="1.5" strokeDasharray="4 5" strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.45 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.25 + i * 0.12, ease: 'easeOut' }}
        />
      ))}

      {nodes.map((n, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.45 + i * 0.12 }}
        >
          <motion.circle
            cx={n.x} cy={n.y} r="20"
            fill={`${n.color}14`} stroke={`${n.color}45`} strokeWidth="1"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3.4, repeat: Infinity, delay: i * 0.35, ease: 'easeInOut' }}
          />
          <path d={iconPath[n.kind]} transform={`translate(${n.x} ${n.y})`} fill="none" stroke={n.color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </motion.g>
      ))}

      <motion.g
        initial={{ opacity: 0, scale: 0.6 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 210, damping: 16 }}
      >
        <circle cx={center.x} cy={center.y} r="30" fill="rgba(99,102,241,0.1)" stroke="#6366F1" strokeWidth="1.5" />
        <motion.circle
          cx={center.x} cy={center.y} r="37" fill="none" stroke="#818CF8" strokeWidth="1"
          animate={{ opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
        />
        <path d="M-4-3.5a4 4 0 117.6 1.8c-.7 1.2-2 1.7-2.5 2.9-.2.5-.2 1-.2 1.3M0 6.2v.1" stroke="#A5B4FC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" transform={`translate(${center.x} ${center.y - 1})`} fill="none" />
      </motion.g>
    </svg>
  );
}

/* ── Data ───────────────────────────────────────────────────────────────────── */

const CONTACT_CARDS = [
  {
    kind: 'support' as const,
    icon: IconHeadset,
    color: '#818CF8',
    glow: 'rgba(99,102,241,0.28)',
    iconBg: 'rgba(99,102,241,0.14)',
    label: 'Support client',
    desc: "Une question sur votre compte, un service, ou un souci technique ? Notre équipe vous répond directement.",
    badge: 'Réponse sous 48h',
    cta: 'Envoyer un email',
  },
  {
    kind: 'partnership' as const,
    icon: IconHandshake,
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.22)',
    iconBg: 'rgba(245,158,11,0.14)',
    label: 'Partenariats & Entreprises',
    desc: "Vous représentez une agence, un grand compte, ou souhaitez discuter d'un partenariat avec Velona ? Écrivez-nous.",
    badge: 'Réponse sous 48h',
    cta: 'Nous contacter',
  },
] as const;

const RESOURCES = [
  { icon: IconBook, color: '#818CF8', label: 'Documentation & Guides', desc: 'Tutoriels pas à pas pour chaque service', href: '#' },
  { icon: IconFileText, color: '#F59E0B', label: 'Conditions Générales de Vente', desc: 'Modalités d\'abonnement et de facturation', href: '#' },
  { icon: IconShieldCheck, color: '#10B981', label: 'Politique de confidentialité', desc: 'Comment nous protégeons vos données', href: '#' },
  { icon: IconScale, color: '#94A3B8', label: 'Mentions légales', desc: "Informations sur l'éditeur du service", href: '#' },
  { icon: IconFileText, color: '#818CF8', label: "Conditions d'utilisation", desc: "Règles d'usage de la plateforme", href: '#' },
] as const;

const COMMITMENTS = [
  { icon: IconShieldCheck, color: '#10B981', title: 'Données sécurisées', desc: 'Chiffrement SSL/TLS, hébergement fiable, aucune revente de vos données à des tiers.' },
  { icon: IconHeadset, color: '#818CF8', title: 'Support réactif', desc: 'Une équipe qui vous répond directement, sous 48h, sans robot ni file d\'attente.' },
  { icon: IconNoLock, color: '#F59E0B', title: 'Sans engagement', desc: 'Annulez à tout moment en un clic, sans frais caché ni pénalité.' },
] as const;

const FAQ_ITEMS = [
  {
    q: "Qu'est-ce que Velona ?",
    a: "Velona est une plateforme conçue pour aider les indépendants et petites entreprises à automatiser les tâches qui prennent le plus de temps au quotidien — gestion des rendez-vous, présence en ligne, communication client. La gestion des rendez-vous est dès aujourd'hui pleinement opérationnelle : vos clients réservent en ligne 24h/24 et vous pilotez tout depuis votre tableau de bord. Les autres outils (site web, agent vocal, montage vidéo, réseaux sociaux, analytics) rejoindront progressivement la plateforme au fur et à mesure de leur finalisation.",
  },
  {
    q: "Comment fonctionne l'essai gratuit ?",
    a: "Votre essai débute dès la création de votre compte et dure 3 jours complets, sans carte bancaire requise. Vous avez accès à l'ensemble des fonctionnalités disponibles pendant cette période. Vous pouvez passer à un plan payant à tout moment, ou laisser l'essai se terminer sans aucun engagement ni prélèvement automatique.",
  },
  {
    q: 'Comment fonctionne le système de réservation en ligne ?',
    a: "Une fois votre page de réservation configurée (horaires, durée des créneaux, informations sur votre activité), vos clients accèdent à un lien public unique où ils choisissent un créneau disponible et réservent en quelques secondes, sans avoir besoin de créer de compte. Vous recevez une notification par email à chaque nouvelle réservation, et votre client reçoit une confirmation automatique. Vous gérez l'ensemble de vos rendez-vous — modification, annulation, historique — directement depuis votre tableau de bord.",
  },
  {
    q: "Comment annuler mon abonnement ?",
    a: "Rendez-vous dans Compte → Facturation → Annuler l'abonnement. L'annulation est immédiate à valider et sans frais caché : votre accès reste actif jusqu'à la fin de la période déjà payée, puis votre abonnement ne sera pas reconduit. Vous pouvez également réactiver votre abonnement à tout moment avant la fin de cette période.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "La sécurité de vos données est une priorité. Toutes les communications sont chiffrées (SSL/TLS), vos données sont hébergées chez des fournisseurs reconnus pour leurs standards de sécurité, et nous ne les revendons ni ne les partageons jamais avec des tiers à des fins commerciales. L'accès à votre compte est protégé par une authentification sécurisée, et seules les personnes autorisées de votre équipe peuvent consulter vos informations.",
  },
  {
    q: 'Comment contacter le support ?',
    a: "L'équipe support est joignable directement par email via le bouton « Support client » en haut de cette page, ou à tout moment via le lien Aide présent dans votre tableau de bord. Décrivez votre demande le plus précisément possible (capture d'écran bienvenue si pertinent) : nous vous répondons sous 48h ouvrées.",
  },
] as const;

/* ── FaqItem ─────────────────────────────────────────────────────────────────── */

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', stiffness: 200, damping: 26, delay: Math.min(index, 6) * 0.04 }}
      className="rounded-xl overflow-hidden"
      style={{ border: open ? '1px solid rgba(99,102,241,0.35)' : '1px solid #27272A' }}
    >
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.99 }}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 group"
        style={{ background: open ? 'rgba(99,102,241,0.07)' : '#18181B' }}
      >
        <span className="text-sm font-semibold text-white leading-snug group-hover:text-violet-200" style={{ transition: 'color 0.2s' }}>
          {q}
        </span>
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{ background: open ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)', color: open ? '#a5b4fc' : '#6b7280' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </motion.div>
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <p className="text-sm text-gray-400 leading-relaxed px-5 pb-5 pt-1">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Contact modal — clicking a contact card opens this instead of a bare
   mailto: link, since mailto: silently does nothing for anyone without a
   desktop mail client registered (the common case for webmail/Gmail-in-
   browser users). Offers three ways to actually reach out. ────────────── */

interface ContactModalData {
  kind: 'support' | 'partnership';
  label: string;
  color: string;
  iconBg: string;
  icon: React.ComponentType<{ color: string }>;
  email: string;
  subject: string;
  body: string;
}

function ContactModal({ data, onClose }: { data: ContactModalData | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (data) setCopied(false); }, [data]);

  useEffect(() => {
    if (!data) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [data, onClose]);

  const handleCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (permissions, insecure context) — the
      // other two options still work, so just skip the visual feedback.
    }
  };

  if (!mounted) return null;

  const Icon = data?.icon;
  const gmailUrl = data ? buildGmailWebUrl(data.email, data.subject, data.body) : '#';
  const mailtoUrl = data ? buildMailto(data.email, data.subject, data.body) : '#';

  return createPortal(
    <AnimatePresence>
      {data && (
        <motion.div
          key="contact-modal-backdrop"
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
            className="relative w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: '#16161D', border: '1px solid #27272A', boxShadow: '0 30px 90px rgba(0,0,0,0.6)' }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center z-10"
              style={{ background: 'rgba(255,255,255,0.06)' }}
              aria-label="Fermer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>

            <div className="px-7 pt-8 pb-5 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: data.iconBg }}>
                {Icon && <Icon color={data.color} />}
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5">{data.label}</h3>
              <p className="text-sm text-gray-500">{data.email}</p>
            </div>

            <div className="px-5 pb-6 flex flex-col gap-2.5">
              <motion.a
                href={gmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                whileHover={{ borderColor: '#3F3F46' }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #27272A' }}
              >
                <span className="shrink-0"><IconGoogle /></span>
                <span className="flex-1 text-sm font-semibold text-white text-left">Ouvrir dans Gmail</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#6B7280' }}><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" /></svg>
              </motion.a>

              <motion.a
                href={mailtoUrl}
                onClick={onClose}
                whileHover={{ borderColor: '#3F3F46' }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #27272A' }}
              >
                <span className="shrink-0"><IconMailOpen color="#A1A1AA" /></span>
                <span className="flex-1 text-sm font-semibold text-white text-left">Ouvrir mon application mail</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#6B7280' }}><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" /></svg>
              </motion.a>

              <motion.button
                type="button"
                onClick={handleCopy}
                whileHover={{ borderColor: copied ? 'rgba(16,185,129,0.4)' : '#3F3F46' }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                style={{
                  background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                  border: copied ? '1px solid rgba(16,185,129,0.3)' : '1px solid #27272A',
                }}
              >
                <span className="shrink-0 w-[18px] h-[18px] flex items-center justify-center">
                  <AnimatePresence mode="wait" initial={false}>
                    {copied ? (
                      <motion.span key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}>
                        <IconCheck color="#34D399" size={16} />
                      </motion.span>
                    ) : (
                      <motion.span key="clip" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}>
                        <IconClipboard color="#A1A1AA" size={16} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span className="flex-1 text-sm font-semibold text-left" style={{ color: copied ? '#34D399' : '#fff' }}>
                  {copied ? '✓ Copié' : "Copier l'adresse email"}
                </span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────── */

export default function HelpPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [search, setSearch] = useState('');
  const [openContact, setOpenContact] = useState<'support' | 'partnership' | null>(null);

  const firstName = profile?.first_name ?? (user?.user_metadata?.full_name as string)?.split(' ')[0];

  const filtered = FAQ_ITEMS.filter(({ q, a }) => {
    if (!search.trim()) return true;
    const q2 = search.toLowerCase();
    return q.toLowerCase().includes(q2) || a.toLowerCase().includes(q2);
  });

  const contactContent: Record<'support' | 'partnership', { email: string; subject: string; body: string }> = {
    support: {
      email: SUPPORT_EMAIL,
      subject: firstName ? `Support Velona - ${firstName}` : 'Support Velona',
      body: "Bonjour,\n\nJ'ai besoin d'aide concernant :\n\n",
    },
    partnership: {
      email: PARTNERSHIP_EMAIL,
      subject: 'Partenariat Velona',
      body: "Bonjour,\n\nJe souhaite échanger au sujet d'un partenariat avec Velona.\n\n",
    },
  };

  const activeContactCard = CONTACT_CARDS.find((c) => c.kind === openContact);
  const contactModalData: ContactModalData | null = openContact && activeContactCard
    ? { kind: openContact, label: activeContactCard.label, color: activeContactCard.color, iconBg: activeContactCard.iconBg, icon: activeContactCard.icon, ...contactContent[openContact] }
    : null;

  return (
    <div className="relative">
      <div className="page-beam" />
      <div className="flex flex-col gap-12 pb-14">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-4"
        >
          <div className="flex flex-col items-center lg:items-start gap-5 text-center lg:text-left">
            <span
              className="text-xs font-semibold px-3.5 py-1.5 rounded-full uppercase tracking-wider"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.28)', color: '#a5b4fc' }}
            >
              Centre d&apos;aide
            </span>

            <div>
              <h1 className="text-4xl font-bold text-white leading-tight">
                Comment pouvons-nous vous aider ?
              </h1>
              <p className="text-sm text-gray-400 mt-3 max-w-md leading-relaxed">
                Une question ? Nous sommes là pour vous aider. Contactez-nous directement ou trouvez votre réponse ci-dessous.
              </p>
            </div>

            {/* Search bar */}
            <div className="relative w-full max-w-md mt-1">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-500">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une question..."
                className="w-full pl-12 pr-12 py-3.5 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none"
                style={{
                  background: '#18181B',
                  border: search ? '1px solid #6366F1' : '1px solid #27272A',
                  boxShadow: search ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label="Effacer la recherche"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              )}
            </div>

            {search && (
              <p className="text-xs text-gray-500 -mt-2">
                {filtered.length > 0
                  ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''} pour « ${search} »`
                  : `Aucun résultat pour « ${search} »`}
              </p>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
            className="hidden lg:block"
          >
            <HelpIllustration />
          </motion.div>
        </motion.section>

        {/* ── CONTACT ─────────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex flex-col gap-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #818CF8, #6366F1)' }} />
            <h2 className="text-xl font-bold text-white">Nous contacter</h2>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.35), transparent)' }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {CONTACT_CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.button
                  key={card.kind}
                  type="button"
                  onClick={() => setOpenContact(card.kind)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 180, damping: 24, delay: i * 0.1 }}
                  whileHover={{ y: -4, boxShadow: `0 20px 50px ${card.glow}`, borderColor: `${card.color}55` }}
                  whileTap={{ scale: 0.98 }}
                  className="relative flex flex-col gap-5 rounded-2xl p-6 overflow-hidden text-left"
                  style={{ background: '#18181B', border: '1px solid #27272A' }}
                >
                  <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${card.color}50, transparent)` }} />

                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.iconBg }}>
                      <Icon color={card.color} />
                    </div>
                    <span
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                      style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#6ee7b7' }}
                    >
                      {card.badge}
                    </span>
                  </div>

                  <div>
                    <p className="text-base font-bold text-white mb-1.5">{card.label}</p>
                    <p className="text-sm text-gray-400 leading-relaxed">{card.desc}</p>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-1">
                    <span className="text-sm font-semibold" style={{ color: card.color }}>
                      {card.cta}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: card.color, opacity: 0.7 }}>
                      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                    </svg>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        {/* ── RESSOURCES ──────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex flex-col gap-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #F59E0B, #FBBF24)' }} />
            <h2 className="text-xl font-bold text-white">Ressources & informations légales</h2>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.3), transparent)' }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RESOURCES.map((res, i) => {
              const Icon = res.icon;
              return (
                <motion.a
                  key={res.label}
                  href={res.href}
                  onClick={(e) => { if (res.href === '#') e.preventDefault(); }}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 180, damping: 24, delay: i * 0.06 }}
                  whileHover={{ y: -3, borderColor: '#3F3F46', boxShadow: '0 14px 36px rgba(0,0,0,0.28)' }}
                  whileTap={{ scale: 0.98 }}
                  className="relative flex items-center gap-4 rounded-2xl p-5 group"
                  style={{ background: '#18181B', border: '1px solid #27272A' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${res.color}1F` }}
                  >
                    <Icon color={res.color} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{res.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{res.desc}</p>
                  </div>

                  <motion.span
                    className="text-gray-500 shrink-0"
                    initial={{ opacity: 0, x: -4 }}
                    whileHover={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    →
                  </motion.span>
                </motion.a>
              );
            })}
          </div>
        </motion.section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex flex-col gap-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #10B981, #34D399)' }} />
            <h2 className="text-xl font-bold text-white">Questions fréquentes</h2>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}
            >
              {search.trim() ? filtered.length : FAQ_ITEMS.length}
            </span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.3), transparent)' }} />
          </div>

          {filtered.length > 0 ? (
            <div className="flex flex-col gap-2">
              {filtered.map((item, i) => (
                <FaqItem key={item.q} q={item.q} a={item.a} index={i} />
              ))}
            </div>
          ) : (
            <div
              className="py-14 text-center rounded-2xl"
              style={{ border: '1px dashed rgba(255,255,255,0.08)' }}
            >
              <p className="text-gray-500 text-sm">
                Aucun résultat pour <span className="text-white font-medium">« {search} »</span>
              </p>
              <p className="text-gray-600 text-xs mt-1.5">
                Essayez un autre mot-clé, ou contactez notre support directement ci-dessus.
              </p>
            </div>
          )}
        </motion.section>

        {/* ── NOS ENGAGEMENTS ─────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="rounded-2xl p-8 sm:p-10"
          style={{ background: '#131317', border: '1px solid #27272A' }}
        >
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-white">Nos engagements</h2>
            <p className="text-sm text-gray-500 mt-1.5">Ce sur quoi vous pouvez toujours compter avec Velona</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {COMMITMENTS.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 180, damping: 24, delay: i * 0.1 }}
                  className="flex flex-col items-center text-center gap-3"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${item.color}1A` }}>
                    <Icon color={item.color} />
                  </div>
                  <p className="text-sm font-bold text-white">{item.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-[220px]">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-700">
          Velona v1.0.0 — © {new Date().getFullYear()} Velona. Tous droits réservés.
        </p>

      </div>

      <ContactModal data={contactModalData} onClose={() => setOpenContact(null)} />
    </div>
  );
}
