'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const FAQ_ITEMS = [
  {
    q: 'Qu\'est-ce que Velona ?',
    a: 'Velona est une plateforme de services IA pour les entreprises et les particuliers. Elle vous permet de créer des sites web, gérer des rendez-vous, monter des vidéos, automatiser vos réseaux sociaux et bien plus encore.',
  },
  {
    q: 'Comment fonctionne l\'essai gratuit ?',
    a: 'Chaque abonnement inclut 3 jours d\'essai gratuit. Vous n\'êtes débité qu\'après la période d\'essai. Vous pouvez annuler à tout moment depuis votre espace compte.',
  },
  {
    q: 'Quelle est la différence entre Starter et Pro ?',
    a: 'Le plan Starter inclut 2 services au choix avec 5 générations/mois. Le plan Pro débloque tous les services avec 30 générations/mois par service et un support prioritaire.',
  },
  {
    q: 'Comment annuler mon abonnement ?',
    a: 'Rendez-vous dans Compte → Gérer l\'abonnement pour accéder au portail de facturation Stripe où vous pouvez annuler à tout moment. L\'accès reste actif jusqu\'à la fin de la période payée.',
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Oui. Toutes les données sont chiffrées en transit (SSL/TLS) et au repos. Les paiements sont gérés par Stripe et PayPal — nous ne stockons jamais vos informations bancaires.',
  },
  {
    q: 'Le programme partenaire, comment ça marche ?',
    a: 'Partagez Velona sur vos réseaux ou votre blog et soumettez votre lien dans la section Partenaire. Après validation (24-48h), vous gagnez un mois offert ou un upgrade de plan.',
  },
  {
    q: 'Est-ce que Velona fonctionne sur mobile ?',
    a: 'Oui, l\'application mobile Velona est disponible sur iOS et Android. Vous pouvez accéder à tous vos services depuis votre smartphone.',
  },
  {
    q: 'Puis-je changer de plan à tout moment ?',
    a: 'Oui, vous pouvez upgrader ou downgrader votre plan depuis le portail de facturation accessible via Compte → Gérer l\'abonnement.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border-b border-gray-800 last:border-0 rounded-xl transition-colors"
      style={open ? { background: 'rgba(108,92,231,0.05)' } : undefined}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-2"
      >
        <div className="flex items-center justify-between py-4 gap-4">
          <span className="text-sm font-medium text-white">{q}</span>
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-gray-500 text-lg flex-shrink-0 inline-block"
          >
            +
          </motion.span>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden px-2"
          >
            <p className="text-sm text-gray-400 pb-4 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HelpPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = FAQ_ITEMS.filter(
    ({ q, a }) =>
      q.toLowerCase().includes(search.toLowerCase()) ||
      a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">{t('dashboard.help')}</h1>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none select-none">
          🔍
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une question..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-white text-sm placeholder-gray-600
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Contact */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Nous contacter
        </h2>
        <div className="flex flex-col gap-3">
          <a
            href="mailto:support@velona.io"
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors group"
          >
            <span className="text-2xl">✉️</span>
            <div>
              <p className="text-sm font-medium text-white group-hover:text-primary-300 transition-colors">
                support@velona.io
              </p>
              <p className="text-xs text-gray-500">Réponse sous 24h en semaine</p>
            </div>
          </a>

          <a
            href="mailto:hello@velona.io"
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors group"
          >
            <span className="text-2xl">💼</span>
            <div>
              <p className="text-sm font-medium text-white group-hover:text-primary-300 transition-colors">
                hello@velona.io
              </p>
              <p className="text-xs text-gray-500">Partenariats & entreprises</p>
            </div>
          </a>
        </div>
      </section>

      {/* Resources */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Ressources
        </h2>
        {[
          { icon: '📖', label: 'Documentation', sub: 'Guides et tutoriels' },
          { icon: '🔔', label: 'Status page', sub: 'État des services en temps réel' },
          { icon: '🔒', label: 'Politique de confidentialité', sub: 'Comment nous protégeons vos données' },
          { icon: '📋', label: 'Conditions d\'utilisation', sub: 'CGU et mentions légales' },
        ].map(({ icon, label, sub }) => (
          <motion.div
            key={label}
            whileHover={{ x: 4, backgroundColor: 'rgba(108,92,231,0.08)' }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-800 cursor-pointer group"
          >
            <span className="text-xl">{icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{label}</p>
              <p className="text-xs text-gray-500">{sub}</p>
            </div>
            <motion.span
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="text-primary-400 text-sm font-bold"
            >
              →
            </motion.span>
          </motion.div>
        ))}
      </section>

      {/* FAQ */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Questions fréquentes
        </h2>
        <div>
          {filtered.length > 0 ? (
            filtered.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))
          ) : (
            <p className="text-sm text-gray-600 py-4">Aucune question ne correspond à votre recherche.</p>
          )}
        </div>
      </section>

      {/* Urgency widget */}
      <section className="rounded-2xl p-6 flex flex-col gap-4 border border-violet-500/30 bg-gradient-to-br from-violet-900/50 to-indigo-900/30">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💬</span>
          <h2 className="text-lg font-bold text-white">Besoin d'aide urgente ?</h2>
        </div>
        <p className="text-sm text-gray-300">Notre équipe répond en moins de 48h</p>
        <a
          href="mailto:support@velona.io"
          className="inline-flex items-center justify-center px-5 py-3 rounded-xl font-bold text-white text-sm animate-pulse transition-all"
          style={{ background: 'linear-gradient(135deg, #6C5CE7, #4834d4)' }}
        >
          Contacter le support
        </a>
      </section>

      {/* Version */}
      <p className="text-center text-xs text-gray-700">Velona v1.0.0 — © {new Date().getFullYear()}</p>
    </div>
  );
}
