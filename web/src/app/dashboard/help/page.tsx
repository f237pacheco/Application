'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Data ───────────────────────────────────────────────────────────────────── */

const FAQ_ITEMS = [
  {
    q: "Qu'est-ce que Velona ?",
    a: "Velona est une plateforme IA tout-en-un qui automatise la création de sites web, la gestion des réseaux sociaux, le montage vidéo et bien plus. Économisez des heures de travail manuel chaque semaine.",
  },
  {
    q: "Comment fonctionne l'essai gratuit ?",
    a: "Votre essai de 3 jours démarre dès votre inscription, sans carte bancaire requise. Accédez à tous les services et annulez à tout moment sans frais.",
  },
  {
    q: "Quelle est la différence entre Starter et Pro ?",
    a: "Le plan Starter inclut 5 générations/mois et 2 services IA. Le plan Pro débloque 30 générations, tous les services, les statistiques avancées et le support prioritaire.",
  },
  {
    q: "Comment annuler mon abonnement ?",
    a: "Rendez-vous dans Compte → Facturation → Annuler l'abonnement. Votre accès reste actif jusqu'à la fin de la période payée.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Oui, toutes vos données sont chiffrées (SSL/TLS), hébergées en Europe et nous ne les revendons jamais à des tiers.",
  },
  {
    q: "Le programme partenaire, comment ça marche ?",
    a: "Partagez Velona sur vos réseaux avec votre code promo, soumettez le lien et recevez -15% sur votre prochain mois ou un mois offert après validation sous 48h.",
  },
  {
    q: "Est-ce que Velona fonctionne sur mobile ?",
    a: "Oui, Velona est entièrement responsive. Accédez à tous vos services depuis votre smartphone ou tablette.",
  },
] as const;

const CONTACT_CARDS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="22,6 12,13 2,6" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#6C5CE7',
    glow: 'rgba(108,92,231,0.4)',
    iconBg: 'rgba(108,92,231,0.18)',
    email: 'support@velona.io',
    label: 'Support client',
    badge: 'Réponse sous 48h',
    badgeColor: '#34d399',
    badgeBg: 'rgba(16,185,129,0.12)',
    badgeBorder: 'rgba(16,185,129,0.3)',
    cta: 'Envoyer un email →',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="7" width="20" height="14" rx="2" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="12" y1="12" x2="12" y2="17" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="9" y1="12" x2="15" y2="12" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    color: '#f97316',
    glow: 'rgba(249,115,22,0.4)',
    iconBg: 'rgba(249,115,22,0.15)',
    email: 'hello@velona.io',
    label: 'Partenariats & Entreprises',
    badge: 'Grands comptes & agences',
    badgeColor: '#fb923c',
    badgeBg: 'rgba(249,115,22,0.12)',
    badgeBorder: 'rgba(249,115,22,0.3)',
    cta: 'Nous contacter →',
  },
] as const;

const RESOURCES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>
      </svg>
    ),
    color: '#6C5CE7',
    label: 'Documentation',
    desc: 'Guides et tutoriels complets',
    href: '#',
    status: null,
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
      </svg>
    ),
    color: '#00b894',
    label: 'Status page',
    desc: 'État des services en temps réel',
    href: '#',
    status: 'Opérationnel',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
      </svg>
    ),
    color: '#0984e3',
    label: 'Politique de confidentialité',
    desc: 'Comment nous protégeons vos données',
    href: '#',
    status: null,
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
      </svg>
    ),
    color: '#6b7280',
    label: "Conditions d'utilisation",
    desc: 'CGU et mentions légales',
    href: '#',
    status: null,
  },
] as const;

/* ── FaqItem ─────────────────────────────────────────────────────────────────── */

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 200, damping: 26, delay: index * 0.05 }}
      className="rounded-xl overflow-hidden"
      style={{ border: open ? '1px solid rgba(99,102,241,0.35)' : '1px solid #27272A' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 group"
        style={{ background: open ? 'rgba(99,102,241,0.08)' : '#18181B' }}
      >
        <span className="text-sm font-semibold text-white leading-snug group-hover:text-violet-200" style={{ transition: 'color 0.2s' }}>
          {q}
        </span>
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{ background: open ? 'rgba(108,92,231,0.3)' : 'rgba(255,255,255,0.08)', color: open ? '#a78bfa' : '#6b7280' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </motion.div>
      </button>

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

/* ── Page ───────────────────────────────────────────────────────────────────── */

export default function HelpPage() {
  const [search, setSearch] = useState('');

  const filtered = FAQ_ITEMS.filter(({ q, a }) => {
    if (!search.trim()) return true;
    const q2 = search.toLowerCase();
    return q.toLowerCase().includes(q2) || a.toLowerCase().includes(q2);
  });

  return (
    <div className="relative">
      <div className="page-beam" />
      <div className="flex flex-col gap-10 pb-12">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center gap-5 text-center pt-4"
        >
          <span
            className="text-xs font-semibold px-3.5 py-1.5 rounded-full"
            style={{ background: 'rgba(108,92,231,0.15)', border: '1px solid rgba(108,92,231,0.3)', color: '#a78bfa' }}
          >
            💬 Support & Aide
          </span>

          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Comment pouvons-nous vous aider ?
            </h1>
            <p className="text-sm text-gray-400 mt-2 max-w-lg mx-auto leading-relaxed">
              Notre équipe répond en moins de 48h — parcourez nos ressources pour une réponse immédiate
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full max-w-xl mt-1">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
                boxShadow: search ? '0 0 0 3px rgba(99,102,241,0.08)' : 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
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
            <h2 className="text-xl font-bold text-white">Nous contacter</h2>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(108,92,231,0.4), transparent)' }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {CONTACT_CARDS.map((card, i) => (
              <motion.a
                key={card.email}
                href={`mailto:${card.email}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 180, damping: 24, delay: i * 0.1 }}
                whileHover={{ y: -4, boxShadow: `0 20px 50px ${card.glow}` }}
                className="relative flex flex-col gap-4 rounded-2xl p-6 overflow-hidden group"
                style={{ background: '#18181B', border: '1px solid #27272A' }}
              >
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${card.color}60, transparent)` }} />

                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.iconBg }}>
                    {card.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 font-medium mb-0.5">{card.label}</p>
                    <p className="text-base font-bold" style={{ color: card.color }}>{card.email}</p>
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-2"
                      style={{ background: card.badgeBg, border: `1px solid ${card.badgeBorder}`, color: card.badgeColor }}
                    >
                      {card.badge}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: card.color }}>
                    {card.cta}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: card.color, opacity: 0.6 }}>
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                  </svg>
                </div>
              </motion.a>
            ))}
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
            <h2 className="text-xl font-bold text-white">Questions fréquentes</h2>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(108,92,231,0.18)', color: '#a78bfa' }}
            >
              {FAQ_ITEMS.length}
            </span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(108,92,231,0.4), transparent)' }} />
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
                Essayez un autre mot-clé ou contactez notre support directement
              </p>
            </div>
          )}
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
            <h2 className="text-xl font-bold text-white">Ressources</h2>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(108,92,231,0.4), transparent)' }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RESOURCES.map((res, i) => (
              <motion.a
                key={res.label}
                href={res.href}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 180, damping: 24, delay: i * 0.08 }}
                whileHover={{ y: -3, boxShadow: `0 16px 40px rgba(0,0,0,0.3)` }}
                className="relative flex items-center gap-4 rounded-2xl p-5 group"
                style={{ background: '#18181B', border: '1px solid #27272A' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${res.color}22`, color: res.color }}
                >
                  {res.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{res.label}</p>
                    {res.status && (
                      <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.14)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                        <motion.span
                          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        {res.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{res.desc}</p>
                </div>

                <span
                  className="text-gray-600 group-hover:text-gray-300 shrink-0"
                  style={{ transition: 'color 0.2s, opacity 0.2s', opacity: 0 }}
                  ref={(el) => {
                    if (el) {
                      el.style.opacity = '0';
                    }
                  }}
                >
                  →
                </span>
                <motion.span
                  className="absolute right-5 text-gray-400 shrink-0"
                  initial={{ opacity: 0, x: -4 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ pointerEvents: 'none' }}
                >
                  →
                </motion.span>
              </motion.a>
            ))}
          </div>
        </motion.section>

        {/* ── URGENCY WIDGET ──────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(16px)' }}
        >
          {/* Decorative glow */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)' }} />

          <div className="flex items-center gap-5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Besoin d&apos;aide urgente ?</h2>
              <p className="text-sm text-violet-200 mt-0.5">Notre équipe répond en moins de 48h — nous sommes là pour vous</p>
            </div>
          </div>

          <motion.a
            href="mailto:support@velona.io"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="relative overflow-hidden px-6 py-3 rounded-xl text-sm font-bold shrink-0 group"
            style={{ background: '#F59E0B', color: '#000', boxShadow: '0 8px 28px rgba(245,158,11,0.3)' }}
          >
            <span className="relative z-10">Contacter le support</span>
            <span
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(108,92,231,0.15), transparent)' }}
            />
          </motion.a>
        </motion.section>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-700 -mt-4">
          Velona v1.0.0 — © {new Date().getFullYear()} Velona. Tous droits réservés.
        </p>

      </div>
    </div>
  );
}
