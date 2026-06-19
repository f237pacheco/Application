'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

// ─── Constants ────────────────────────────────────────────────────────────────

const NETWORKS = [
  { id: 'instagram', name: 'Instagram', icon: '📷', color: '#E1306C' },
  { id: 'tiktok',     name: 'TikTok',    icon: '🎵', color: '#69C9D0' },
  { id: 'linkedin',   name: 'LinkedIn',  icon: '💼', color: '#0A66C2' },
  { id: 'facebook',   name: 'Facebook',  icon: '👍', color: '#1877F2' },
  { id: 'twitter',    name: 'X',         icon: '✕',  color: '#71717A' },
]

const TONES = ['Professionnel', 'Décontracté', 'Humoristique', 'Inspirant']
const OBJECTIVES = ['Engagement', 'Vente', 'Notoriété']

const HASHTAGS = ['#nouveauté', '#innovation', '#tendance2026', '#mustsee', '#velona']

const VARIANTS = [
  { label: 'Direct & accrocheur', text: (s: string) => `🚀 ${s || 'Notre nouveauté'} est enfin là ! On a mis tout notre cœur pour vous offrir le meilleur. Foncez avant la rupture de stock 👇` },
  { label: 'Storytelling',        text: (s: string) => `Il y a 6 mois, on rêvait de ${s || 'ce projet'}. Aujourd\'hui, c\'est une réalité. Merci à notre communauté incroyable pour ce voyage ✨` },
  { label: 'Question engageante', text: (s: string) => `Et si ${s || 'votre quotidien'} changeait dès aujourd\'hui ? On a la solution. Dites-nous en commentaire ce qui vous bloque 👇` },
]

const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const SLOTS = ['Matin', 'Après-midi', 'Soir']

type Post = { id: number; day: number; slot: number; network: string; title: string }

const INITIAL_POSTS: Post[] = [
  { id: 1, day: 0, slot: 0, network: 'instagram', title: 'Post produit' },
  { id: 2, day: 1, slot: 2, network: 'tiktok',    title: 'Reel coulisses' },
  { id: 3, day: 3, slot: 1, network: 'linkedin',  title: 'Article expertise' },
  { id: 4, day: 4, slot: 0, network: 'facebook',  title: 'Promo weekend' },
  { id: 5, day: 5, slot: 2, network: 'instagram', title: 'Story récap' },
  { id: 6, day: 2, slot: 1, network: 'twitter',   title: 'Annonce produit' },
]

const HOURS = ['6h', '9h', '12h', '15h', '18h', '21h']
// 7 days x 6 hours, deterministic intensity 0-1
const HEATMAP: number[][] = [
  [0.1, 0.4, 0.5, 0.3, 0.6, 0.2],
  [0.1, 0.5, 0.6, 0.4, 0.95, 0.5],
  [0.1, 0.3, 0.5, 0.3, 0.5, 0.3],
  [0.1, 0.4, 0.55, 0.4, 0.65, 0.3],
  [0.15, 0.45, 0.5, 0.45, 0.7, 0.4],
  [0.2, 0.3, 0.4, 0.5, 0.6, 0.55],
  [0.15, 0.2, 0.3, 0.35, 0.45, 0.4],
]

const QUEUE = [
  { network: 'instagram', title: 'Lancement collection été',   date: '20 juin', time: '18:00', status: 'scheduled' as const },
  { network: 'tiktok',    title: 'Behind the scenes équipe',   date: '21 juin', time: '12:30', status: 'scheduled' as const },
  { network: 'linkedin',  title: 'Étude de cas client',        date: '22 juin', time: '09:00', status: 'draft' as const },
  { network: 'facebook',  title: 'Offre spéciale weekend',     date: '19 juin', time: '08:00', status: 'published' as const },
  { network: 'twitter',   title: 'Annonce fonctionnalité',     date: '23 juin', time: '15:00', status: 'scheduled' as const },
]

const ANALYTICS_BARS = [40, 65, 50, 80, 55, 90, 70]

const USE_CASES = [
  { icon: '🍽️', title: 'Restaurant',   example: '"Plat du jour" en story + reel TikTok des coulisses cuisine' },
  { icon: '🏋️', title: 'Coach sportif', example: 'Programme hebdo en carrousel Instagram + témoignages LinkedIn' },
  { icon: '🛍️', title: 'Boutique',     example: 'Nouveautés en post produit + promo flash sur Facebook' },
  { icon: '🎨', title: 'Artisan',      example: 'Process de création en reel + portfolio en carrousel' },
  { icon: '🌟', title: 'Influenceur',  example: 'Contenu quotidien multi-format planifié sur la semaine' },
]

const FEATURES = [
  { icon: '🎨', title: 'Génération de visuels',        desc: 'Images et carrousels générés automatiquement par l\'IA.',     tooltip: 'Styles personnalisables : photo, illustration, 3D. Formats adaptés à chaque réseau.' },
  { icon: '#️⃣', title: 'Hashtags optimisés',           desc: 'Suggestions basées sur les tendances de votre secteur.',     tooltip: 'Analyse en temps réel des hashtags performants. Mix volume élevé / niche pour la portée.' },
  { icon: '🌐', title: 'Multi-réseaux',                 desc: 'Un seul post, adapté automatiquement à chaque plateforme.',  tooltip: 'Formats, longueurs et tons ajustés automatiquement pour Instagram, TikTok, LinkedIn, etc.' },
  { icon: '⏱️', title: 'Meilleur timing',               desc: 'L\'IA détermine l\'heure optimale de publication.',          tooltip: 'Basé sur l\'historique d\'engagement de votre audience et les benchmarks du secteur.' },
  { icon: '💬', title: 'Réponses auto aux commentaires', desc: 'L\'IA répond aux commentaires fréquents pour vous.',         tooltip: 'Détection du ton et de l\'intention. Escalade vers vous pour les cas sensibles.' },
  { icon: '📊', title: 'Analytics détaillés',           desc: 'Impressions, engagement, conversions — en un tableau.',      tooltip: 'Comparaison multi-réseaux, export PDF, alertes de performance automatiques.' },
  { icon: '♻️', title: 'Recyclage de contenu',          desc: 'Transformez un post en plusieurs formats automatiquement.',  tooltip: 'Un article devient un carrousel, un reel et un post LinkedIn en un clic.' },
  { icon: '🗓️', title: 'Calendrier éditorial',          desc: 'Planifiez des semaines de contenu en avance.',               tooltip: 'Vue mensuelle, templates récurrents, rappels de validation pour votre équipe.' },
]

const FAQS = [
  { q: 'Quels réseaux sociaux puis-je connecter ?',                    a: 'Instagram, TikTok, LinkedIn, Facebook et X (Twitter) sont supportés nativement. D\'autres réseaux comme Pinterest et YouTube Shorts arrivent prochainement.' },
  { q: 'L\'IA publie-t-elle automatiquement sans validation ?',        a: 'Par défaut, chaque post généré reste en brouillon jusqu\'à votre validation. Vous pouvez activer la publication automatique pour les comptes de confiance.' },
  { q: 'Comment l\'IA détermine le meilleur moment pour publier ?',    a: 'Elle analyse l\'historique d\'engagement de votre audience (heures actives, jours de la semaine) combiné aux benchmarks de votre secteur d\'activité.' },
  { q: 'Puis-je modifier les visuels générés par l\'IA ?',             a: 'Oui, chaque visuel est éditable via notre éditeur intégré : recadrage, texte, filtres, logo. Vous pouvez aussi régénérer une variante en un clic.' },
  { q: 'Les réponses automatiques aux commentaires sont-elles fiables ?', a: 'L\'IA répond aux questions fréquentes et messages positifs avec un taux de pertinence de 94%. Les commentaires sensibles ou négatifs vous sont automatiquement signalés.' },
]

// ─── Hero post stack ────────────────────────────────────────────────────────────

function PostStack() {
  const cards = [
    { network: 'Instagram', color: '#E1306C', icon: '📷' },
    { network: 'TikTok',    color: '#69C9D0', icon: '🎵' },
    { network: 'LinkedIn',  color: '#0A66C2', icon: '💼' },
  ]
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % cards.length), 2400)
    return () => clearInterval(t)
  }, [cards.length])

  return (
    <div className="relative mx-auto" style={{ width: 240, height: 300 }}>
      {cards.map((card, i) => {
        const offset = (i - active + cards.length) % cards.length
        return (
          <motion.div
            key={card.network}
            className="absolute inset-0 rounded-2xl p-5 flex flex-col"
            animate={{
              rotate: offset === 0 ? 0 : offset === 1 ? 6 : -6,
              y: offset === 0 ? 0 : offset === 1 ? 14 : 28,
              scale: offset === 0 ? 1 : offset === 1 ? 0.95 : 0.9,
              zIndex: cards.length - offset,
              opacity: offset === 2 ? 0.5 : 1,
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            style={{ background: '#18181B', border: '1px solid #27272A', boxShadow: offset === 0 ? '0 20px 50px rgba(245,158,11,0.15)' : 'none' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs" style={{ background: `${card.color}33` }}>{card.icon}</div>
              <span className="text-xs font-bold text-white">{card.network}</span>
            </div>
            <div className="flex-1 rounded-xl mb-3" style={{ background: `linear-gradient(135deg, ${card.color}55, ${card.color}11)` }} />
            <div className="flex gap-3 text-xs" style={{ color: '#71717A' }}>
              <span>❤️ 2.4K</span>
              <span>💬 186</span>
              <span>↗ 92</span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Network connect cards ─────────────────────────────────────────────────────

function NetworkConnectRow({ connected, onToggle }: { connected: Record<string, boolean>; onToggle: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {NETWORKS.map((n) => {
        const isConnected = connected[n.id]
        return (
          <button
            key={n.id}
            onClick={() => onToggle(n.id)}
            className="flex flex-col items-center gap-2 rounded-xl p-4 transition-all duration-150"
            style={{ background: isConnected ? `${n.color}11` : '#18181B', border: isConnected ? `1px solid ${n.color}66` : '1px solid #27272A' }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-base" style={{ background: `${n.color}22` }}>{n.icon}</div>
            <span className="text-xs font-semibold text-white">{n.name}</span>
            <AnimatePresence mode="wait">
              {isConnected ? (
                <motion.span key="on" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-[10px] font-bold flex items-center gap-1" style={{ color: '#34D399' }}>
                  ✓ Connecté
                </motion.span>
              ) : (
                <motion.span key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#27272A', color: '#71717A' }}>
                  Connecter
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )
      })}
    </div>
  )
}

// ─── Live preview ──────────────────────────────────────────────────────────────

function PostPreview({ network, caption, hashtagsShown, imageRevealed }: {
  network: string; caption: string; hashtagsShown: number; imageRevealed: boolean
}) {
  const net = NETWORKS.find((n) => n.id === network) ?? NETWORKS[0]
  const isVertical = network === 'tiktok'

  return (
    <div className="rounded-2xl overflow-hidden mx-auto" style={{ maxWidth: 300, background: '#18181B', border: '1px solid #27272A' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid #27272A' }}>
        <div className="w-7 h-7 rounded-full" style={{ background: `linear-gradient(135deg, ${net.color}, #F59E0B)` }} />
        <div className="flex-1">
          <p className="text-xs font-bold text-white">votre_marque</p>
          <p className="text-[9px] text-gray-500">Sponsorisé · {net.name}</p>
        </div>
        <span className="text-sm" style={{ color: net.color }}>{net.icon}</span>
      </div>

      {/* Media */}
      <div className="relative" style={{ aspectRatio: isVertical ? '9/16' : '1/1', background: '#09090B' }}>
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: imageRevealed ? 1 : 0 }}
          transition={{ duration: 0.6 }}
          style={{ background: 'linear-gradient(135deg, #F59E0B33, #D9770633, #92400E22)' }}
        />
        {!imageRevealed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }} className="text-2xl">🖼️</motion.div>
          </div>
        )}
        {imageRevealed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl opacity-40">✨</span>
          </div>
        )}
        {isVertical && imageRevealed && (
          <div className="absolute right-2 bottom-12 flex flex-col gap-3 items-center text-white">
            <span className="text-lg">❤️</span>
            <span className="text-lg">💬</span>
            <span className="text-lg">↗</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isVertical && (
        <div className="flex items-center gap-3 px-3 py-2 text-base">
          <span>❤️</span><span>💬</span><span>↗</span>
        </div>
      )}

      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line min-h-[32px]">
          <span className="font-bold text-white">votre_marque </span>
          {caption}
          {caption.length > 0 && <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>▌</motion.span>}
        </p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {HASHTAGS.slice(0, hashtagsShown).map((h, i) => (
            <motion.span key={h} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="text-[10px]" style={{ color: '#FCD34D' }}>
              {h}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Generation modal / typing logic hook is inline in main component ────────

// ─── Weekly calendar ────────────────────────────────────────────────────────────

function WeeklyCalendar({ posts, setPosts, onEmptyClick }: {
  posts: Post[]; setPosts: (p: Post[]) => void; onEmptyClick: (day: number, slot: number) => void
}) {
  const getPost = (day: number, slot: number) => posts.find((p) => p.day === day && p.slot === slot)

  const handleDrop = useCallback((day: number, slot: number, e: React.DragEvent) => {
    e.preventDefault()
    const id = Number(e.dataTransfer.getData('text/plain'))
    if (getPost(day, slot)) return
    setPosts(posts.map((p) => (p.id === id ? { ...p, day, slot } : p)))
  }, [posts, setPosts])

  return (
    <div className="rounded-2xl p-4 sm:p-5 overflow-x-auto" style={{ background: '#18181B', border: '1px solid #27272A' }}>
      <div className="grid gap-2" style={{ gridTemplateColumns: `70px repeat(7, minmax(90px, 1fr))`, minWidth: 700 }}>
        <div />
        {WEEK_DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-bold text-gray-400 pb-2">{d}</div>
        ))}

        {SLOTS.map((slotLabel, slotIdx) => (
          <div key={slotLabel} className="contents">
            <div className="flex items-center justify-end pr-2 text-[10px] font-semibold text-gray-500">{slotLabel}</div>
            {WEEK_DAYS.map((_, dayIdx) => {
              const post = getPost(dayIdx, slotIdx)
              const net = post ? NETWORKS.find((n) => n.id === post.network) : null
              return (
                <div
                  key={dayIdx}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(dayIdx, slotIdx, e)}
                  onClick={() => !post && onEmptyClick(dayIdx, slotIdx)}
                  className="rounded-lg flex items-center justify-center"
                  style={{ minHeight: 56, background: post ? 'transparent' : 'rgba(255,255,255,0.02)', border: post ? 'none' : '1px dashed #27272A', cursor: post ? 'default' : 'pointer' }}
                >
                  {post && net && (
                    <motion.div
                      draggable
                      onDragStart={(e) => (e as unknown as React.DragEvent).dataTransfer.setData('text/plain', String(post.id))}
                      whileHover={{ scale: 1.03 }}
                      whileDrag={{ scale: 1.05, opacity: 0.7 }}
                      className="w-full h-full rounded-lg p-2 cursor-grab flex flex-col gap-1"
                      style={{ background: `${net.color}1A`, border: `1px solid ${net.color}55` }}
                    >
                      <span className="text-[10px]" style={{ color: net.color }}>{net.icon} {net.name}</span>
                      <span className="text-[9px] text-gray-400 truncate">{post.title}</span>
                    </motion.div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4" style={{ borderTop: '1px solid #27272A' }}>
        {NETWORKS.map((n) => (
          <div key={n.id} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: n.color }} />
            <span className="text-[10px] text-gray-500">{n.name}</span>
          </div>
        ))}
        <span className="text-[10px] text-gray-600 ml-auto">💡 Glissez un post pour le replanifier</span>
      </div>
    </div>
  )
}

// ─── Schedule modal ─────────────────────────────────────────────────────────────

function ScheduleModal({ day, slot, onClose }: { day: number; slot: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-sm rounded-2xl p-7"
        style={{ background: '#18181B', border: '1px solid #27272A' }}
      >
        <h3 className="text-white font-bold text-lg mb-1">Planifier un post</h3>
        <p className="text-sm text-gray-400 mb-5">{WEEK_DAYS[day]} · {SLOTS[slot]}</p>

        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium mb-5" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#FCD34D' }}>
          🤖 Suggestion IA : ce créneau a un taux d&apos;engagement 38% supérieur à la moyenne pour votre audience.
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <select className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none" style={{ background: '#09090B', border: '1px solid #27272A', color: '#FAFAFA' }}>
            <option>Choisir un post brouillon…</option>
            <option>Lancement collection été</option>
            <option>Behind the scenes équipe</option>
          </select>
          <div className="flex gap-2">
            {NETWORKS.slice(0, 3).map((n) => (
              <span key={n.id} className="text-xs px-2.5 py-1.5 rounded-lg" style={{ background: `${n.color}1A`, color: n.color, border: `1px solid ${n.color}44` }}>{n.icon} {n.name}</span>
            ))}
          </div>
        </div>

        <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity" style={{ background: '#F59E0B', boxShadow: '0 4px 20px rgba(245,158,11,0.3)' }}>
          Planifier le post
        </button>
        <button onClick={onClose} className="w-full py-2.5 mt-2 rounded-xl text-xs font-medium" style={{ color: '#52525B' }}>Annuler</button>
      </motion.div>
    </div>
  )
}

// ─── Timing heatmap ─────────────────────────────────────────────────────────────

function TimingHeatmap() {
  return (
    <div className="rounded-2xl p-5 sm:p-6" style={{ background: '#18181B', border: '1px solid #27272A' }}>
      <div className="overflow-x-auto">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `50px repeat(7, minmax(36px, 1fr))`, minWidth: 460 }}>
          <div />
          {WEEK_DAYS.map((d) => <div key={d} className="text-center text-[10px] font-semibold text-gray-500">{d}</div>)}

          {HOURS.map((hour, hIdx) => (
            <div key={hour} className="contents">
              <div className="flex items-center text-[10px] font-mono text-gray-500">{hour}</div>
              {WEEK_DAYS.map((_, dIdx) => {
                const intensity = HEATMAP[dIdx][hIdx]
                const isPeak = dIdx === 1 && hIdx === 4
                return (
                  <motion.div
                    key={dIdx}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: (dIdx * 6 + hIdx) * 0.01 }}
                    className="aspect-square rounded-md relative"
                    style={{ background: `rgba(245,158,11,${intensity})`, border: isPeak ? '1px solid #FCD34D' : 'none' }}
                  >
                    {isPeak && (
                      <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 rounded-md" style={{ border: '1px solid #FCD34D' }} />
                    )}
                  </motion.div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-5 px-3 py-2.5 rounded-xl text-xs font-semibold" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#FCD34D' }}>
        📈 Meilleur moment : Mardi 18h–20h
      </div>
    </div>
  )
}

// ─── Publish modal ──────────────────────────────────────────────────────────────

function PublishModal({ onClose }: { onClose: () => void }) {
  const targets = NETWORKS.slice(0, 3)
  const [doneIdx, setDoneIdx] = useState(-1)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    targets.forEach((_, i) => {
      setTimeout(() => setDoneIdx(i), 700 + i * 700)
    })
    setTimeout(() => setFinished(true), 700 + targets.length * 700 + 400)
  }, [targets.length])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: '#18181B', border: '1px solid #27272A' }}
      >
        <AnimatePresence mode="wait">
          {!finished ? (
            <motion.div key="loading" exit={{ opacity: 0 }}>
              <h3 className="text-white font-bold text-lg mb-1 text-center">Publication en cours</h3>
              <p className="text-gray-500 text-sm mb-6 text-center">Diffusion sur vos réseaux connectés…</p>
              <div className="flex flex-col gap-3">
                {targets.map((n, i) => {
                  const isDone = i <= doneIdx
                  return (
                    <div key={n.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: isDone ? `${n.color}14` : '#09090B', border: isDone ? `1px solid ${n.color}55` : '1px solid #27272A' }}>
                      <motion.div
                        animate={isDone ? { scale: [1, 1.15, 1] } : {}}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                        style={{ background: `${n.color}33` }}
                      >
                        {n.icon}
                      </motion.div>
                      <span className="text-sm flex-1" style={{ color: isDone ? '#FAFAFA' : '#71717A' }}>Publication sur {n.name}…</span>
                      {isDone && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ color: '#34D399' }} className="text-sm font-bold">✓</motion.span>
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)' }}>
                <svg width="26" height="20" viewBox="0 0 26 20" fill="none"><path d="M2 10l6.5 6.5L24 2" stroke="#FCD34D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </motion.div>
              <h3 className="text-white font-extrabold text-xl mb-1.5">✓ Publié sur {targets.length} réseaux !</h3>
              <p className="text-gray-400 text-sm mb-6">Votre post est maintenant visible par votre audience.</p>
              <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity" style={{ background: '#F59E0B', boxShadow: '0 4px 20px rgba(245,158,11,0.3)' }}>
                Voir les statistiques
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ─── Feature card / FAQ item (shared pattern) ──────────────────────────────────

function FeatureCard({ feature }: { feature: typeof FEATURES[0] }) {
  const [tooltip, setTooltip] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="relative rounded-xl p-4"
      style={{ background: '#18181B', border: '1px solid #27272A' }}
      onMouseEnter={() => setTooltip(true)}
      onMouseLeave={() => setTooltip(false)}
    >
      <div className="text-xl mb-2">{feature.icon}</div>
      <h4 className="text-sm font-bold text-white mb-1">{feature.title}</h4>
      <p className="text-xs text-gray-500 leading-relaxed">{feature.desc}</p>
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full left-0 right-0 mb-2 p-3 rounded-xl text-xs text-gray-300 z-20 leading-relaxed"
            style={{ background: '#09090B', border: '1px solid #F59E0B', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
          >
            {feature.tooltip}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function FAQItem({ faq, index }: { faq: typeof FAQS[0]; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      onClick={() => setOpen((v) => !v)}
      className="rounded-xl overflow-hidden cursor-pointer"
      style={{ border: open ? '1px solid rgba(245,158,11,0.35)' : '1px solid #27272A', background: open ? 'rgba(245,158,11,0.06)' : '#18181B', transition: 'border-color 0.2s, background 0.2s' }}
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
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ enabled, onToggle, label }: { enabled: boolean; onToggle: () => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-2">
      <span className="text-sm text-gray-300">{label}</span>
      <div onClick={onToggle} className="relative w-9 h-5 rounded-full transition-colors duration-200" style={{ background: enabled ? '#F59E0B' : '#3F3F46' }}>
        <motion.div animate={{ x: enabled ? 16 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute top-0.5 w-4 h-4 rounded-full" style={{ background: '#FAFAFA' }} />
      </div>
    </label>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function SocialServicePage() {
  const [connected, setConnected] = useState<Record<string, boolean>>({ instagram: true, facebook: true })
  const [subject, setSubject] = useState('')
  const [tone, setTone] = useState('')
  const [objective, setObjective] = useState('')
  const [targetNetworks, setTargetNetworks] = useState<string[]>(['instagram'])
  const [genVisual, setGenVisual] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [caption, setCaption] = useState('')
  const [hashtagsShown, setHashtagsShown] = useState(0)
  const [imageRevealed, setImageRevealed] = useState(false)
  const [genDone, setGenDone] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null)

  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS)
  const [scheduleSlot, setScheduleSlot] = useState<{ day: number; slot: number } | null>(null)
  const [showPublish, setShowPublish] = useState(false)

  const previewNetwork = targetNetworks[0] ?? 'instagram'
  const canGenerate = subject.trim().length > 0 && !!tone && !!objective && targetNetworks.length > 0

  const toggleNetwork = (id: string) => {
    setTargetNetworks((prev) => (prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]))
  }

  const handleGenerate = () => {
    if (!canGenerate || generating) return
    setGenerating(true)
    setGenDone(false)
    setCaption('')
    setHashtagsShown(0)
    setImageRevealed(false)
    setSelectedVariant(null)

    const fullCaption = VARIANTS[0].text(subject)

    setTimeout(() => setImageRevealed(true), 400)

    setTimeout(() => {
      let i = 0
      const typeTimer = setInterval(() => {
        i += 2
        setCaption(fullCaption.slice(0, i))
        if (i >= fullCaption.length) {
          clearInterval(typeTimer)
          let h = 0
          const hashTimer = setInterval(() => {
            h += 1
            setHashtagsShown(h)
            if (h >= HASHTAGS.length) {
              clearInterval(hashTimer)
              setTimeout(() => { setGenerating(false); setGenDone(true) }, 300)
            }
          }, 200)
        }
      }, 18)
    }, 900)
  }

  return (
    <div className="relative min-h-screen" style={{ background: '#09090B' }}>
      {/* Amber beam */}
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10" style={{ background: 'linear-gradient(90deg, transparent 5%, #F59E0B 35%, #FBBF24 65%, transparent 95%)' }} />

      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-150">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Retour aux services
          </Link>
        </motion.div>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5" style={{ background: 'rgba(245,158,11,0.12)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.25)' }}>
              <span className="text-xs">✦</span>
              Gestion réseaux sociaux IA
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
              Créez et planifiez votre contenu sur{' '}
              <span style={{ color: '#F59E0B' }}>tous vos réseaux</span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed mb-8">
              L&apos;IA génère vos posts, visuels et légendes, puis les publie automatiquement au meilleur moment.
            </p>
            <div className="flex flex-wrap gap-6">
              {[{ value: '5', label: 'réseaux connectés' }, { value: '∞', label: 'posts illimités' }, { value: 'IA', label: 'meilleur timing' }].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-extrabold" style={{ color: '#F59E0B' }}>{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
            <PostStack />
          </motion.div>
        </div>

        {/* ── Network connections ───────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-16">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white mb-1">Connectez vos réseaux</h2>
            <p className="text-gray-500 text-sm">Liez vos comptes pour publier et planifier directement depuis Velona.</p>
          </div>
          <NetworkConnectRow connected={connected} onToggle={(id) => setConnected((c) => ({ ...c, [id]: !c[id] }))} />
        </motion.div>

        {/* ── PARTIE 1 : Générateur de post IA ──────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-16">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#F59E0B' }}>Partie 1</span>
            <h2 className="text-2xl font-bold text-white mt-1 mb-1">Générateur de post IA</h2>
            <p className="text-gray-500 text-sm">Décrivez votre idée, l&apos;IA s&apos;occupe du reste.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Config */}
            <div className="rounded-2xl p-5 sm:p-6 flex flex-col gap-4" style={{ background: '#18181B', border: '1px solid #27272A' }}>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Sujet du post *</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex : Lancement de notre nouvelle collection"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                  style={{ background: '#09090B', border: subject ? '1px solid #F59E0B' : '1px solid #27272A' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Ton</label>
                  <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none cursor-pointer" style={{ background: '#09090B', border: tone ? '1px solid #F59E0B' : '1px solid #27272A', color: tone ? '#FAFAFA' : '#52525B' }}>
                    <option value="">Choisir…</option>
                    {TONES.map((t) => <option key={t} value={t} style={{ background: '#18181B' }}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Objectif</label>
                  <select value={objective} onChange={(e) => setObjective(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none cursor-pointer" style={{ background: '#09090B', border: objective ? '1px solid #F59E0B' : '1px solid #27272A', color: objective ? '#FAFAFA' : '#52525B' }}>
                    <option value="">Choisir…</option>
                    {OBJECTIVES.map((o) => <option key={o} value={o} style={{ background: '#18181B' }}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Réseaux cibles</label>
                <div className="flex flex-wrap gap-2">
                  {NETWORKS.map((n) => {
                    const selected = targetNetworks.includes(n.id)
                    return (
                      <button
                        key={n.id}
                        onClick={() => toggleNetwork(n.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: selected ? `${n.color}1A` : '#09090B', border: selected ? `1px solid ${n.color}66` : '1px solid #27272A', color: selected ? n.color : '#71717A' }}
                      >
                        {n.icon} {n.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <Toggle enabled={genVisual} onToggle={() => setGenVisual((v) => !v)} label="Générer un visuel" />

              <div className="relative overflow-hidden rounded-xl mt-1">
                <button
                  disabled={!canGenerate || generating}
                  onClick={handleGenerate}
                  className="w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-200"
                  style={{
                    background: canGenerate ? '#F59E0B' : '#1C1C1F',
                    color: canGenerate ? '#000' : '#52525B',
                    boxShadow: canGenerate ? '0 4px 20px rgba(245,158,11,0.3)' : 'none',
                    cursor: canGenerate && !generating ? 'pointer' : 'not-allowed',
                    border: canGenerate ? 'none' : '1px solid #27272A',
                  }}
                >
                  {generating ? '✨ Génération en cours…' : canGenerate ? '✨ Générer le post →' : 'Complétez les champs pour générer'}
                </button>
              </div>
            </div>

            {/* Live preview */}
            <div className="rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center" style={{ background: '#18181B', border: '1px solid #27272A' }}>
              <p className="text-xs font-semibold text-gray-500 mb-4 self-start">Aperçu en direct</p>
              <PostPreview network={previewNetwork} caption={caption} hashtagsShown={hashtagsShown} imageRevealed={imageRevealed} />
            </div>
          </div>

          {/* Variants */}
          <AnimatePresence>
            {genDone && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4 }} className="overflow-hidden mt-6">
                <p className="text-sm font-bold text-white mb-3">Choisissez une variante de légende</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {VARIANTS.map((v, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-4 flex flex-col"
                      style={{ background: selectedVariant === i ? 'rgba(245,158,11,0.08)' : '#09090B', border: selectedVariant === i ? '1px solid #F59E0B' : '1px solid #27272A' }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: '#FCD34D' }}>{v.label}</span>
                      <p className="text-xs text-gray-400 leading-relaxed mb-3 flex-1">{v.text(subject)}</p>
                      <button
                        onClick={() => setSelectedVariant(i)}
                        className="text-xs font-semibold py-1.5 rounded-lg"
                        style={{ background: selectedVariant === i ? '#F59E0B' : '#27272A', color: selectedVariant === i ? '#000' : '#A1A1AA' }}
                      >
                        {selectedVariant === i ? '✓ Sélectionnée' : 'Utiliser celle-ci'}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── PARTIE 2 : Calendrier de planification ────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-16">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#F59E0B' }}>Partie 2</span>
            <h2 className="text-2xl font-bold text-white mt-1 mb-1">Calendrier de planification</h2>
            <p className="text-gray-500 text-sm">Glissez vos posts pour les replanifier, ou cliquez sur un créneau vide.</p>
          </div>
          <WeeklyCalendar posts={posts} setPosts={setPosts} onEmptyClick={(day, slot) => setScheduleSlot({ day, slot })} />
        </motion.div>

        {/* ── Timing heatmap ─────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-16">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Le meilleur moment pour publier</h2>
            <p className="text-gray-500 text-sm">Heatmap d&apos;engagement basée sur votre audience.</p>
          </div>
          <TimingHeatmap />
        </motion.div>

        {/* ── Publishing queue ──────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">File d&apos;attente de publication</h2>
              <p className="text-gray-500 text-sm">Vos prochains posts, prêts à partir.</p>
            </div>
            <button onClick={() => setShowPublish(true)} className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold text-black" style={{ background: '#F59E0B', boxShadow: '0 4px 16px rgba(245,158,11,0.25)' }}>
              🚀 Publier maintenant
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#18181B', border: '1px solid #27272A' }}>
            {QUEUE.map((item, i) => {
              const net = NETWORKS.find((n) => n.id === item.network)!
              const statusMeta = item.status === 'published'
                ? { label: 'Publié', bg: 'rgba(16,185,129,0.12)', color: '#34D399' }
                : item.status === 'scheduled'
                ? { label: 'Programmé', bg: 'rgba(245,158,11,0.12)', color: '#FCD34D' }
                : { label: 'Brouillon', bg: '#27272A', color: '#A1A1AA' }
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid #27272A' }}
                >
                  <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-sm" style={{ background: `${net.color}22` }}>{net.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">{net.name} · {item.date} à {item.time}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0" style={{ background: statusMeta.bg, color: statusMeta.color }}>{statusMeta.label}</span>
                  <button className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: '#27272A', color: '#A1A1AA' }}>Modifier</button>
                  <button className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: '#27272A', color: '#71717A' }}>Suppr.</button>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* ── Analytics mini ────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-16">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Vos performances</h2>
            <p className="text-gray-500 text-sm">Aperçu des 7 derniers jours.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            {[{ label: 'Impressions', value: '284K', delta: '+18%' }, { label: 'Taux d\'engagement', value: '6.4%', delta: '+2.1pt' }, { label: 'Nouveaux abonnés', value: '+1 240', delta: '+12%' }].map((s) => (
              <div key={s.label} className="rounded-xl p-5" style={{ background: '#18181B', border: '1px solid #27272A' }}>
                <p className="text-xs text-gray-500 mb-1.5">{s.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-white">{s.value}</span>
                  <span className="text-xs font-semibold" style={{ color: '#34D399' }}>{s.delta}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-5 sm:p-6" style={{ background: '#18181B', border: '1px solid #27272A' }}>
            <p className="text-xs font-semibold text-gray-500 mb-4">Engagement quotidien</p>
            <div className="flex items-end gap-3" style={{ height: 100 }}>
              {ANALYTICS_BARS.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.06, ease: 'easeOut' }}
                    className="w-full rounded-t-md"
                    style={{ background: 'linear-gradient(180deg, #FBBF24, #F59E0B)' }}
                  />
                  <span className="text-[9px] text-gray-600">{WEEK_DAYS[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── How it works ──────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Comment ça marche</h2>
            <p className="text-gray-500 text-sm">De la connexion à la publication automatique.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: '01', icon: '🔗', title: 'Connectez vos réseaux',     desc: 'Instagram, TikTok, LinkedIn, Facebook, X — en quelques clics.' },
              { step: '02', icon: '✨', title: 'L\'IA génère vos posts',     desc: 'Légendes, hashtags et visuels adaptés à chaque plateforme.' },
              { step: '03', icon: '🗓️', title: 'Planifiez ou publiez',      desc: 'Au meilleur moment suggéré par l\'IA, ou instantanément.' },
              { step: '04', icon: '📊', title: 'Suivez vos performances',   desc: 'Impressions, engagement et croissance en un coup d\'œil.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }} className="relative rounded-xl p-5" style={{ background: '#18181B', border: '1px solid #27272A' }}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-3xl font-black tabular-nums" style={{ color: 'rgba(245,158,11,0.15)', lineHeight: 1 }}>{item.step}</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                {i < 3 && <div className="hidden lg:block absolute top-1/2 -right-2.5 -translate-y-1/2 text-gray-700 z-10 text-xs">→</div>}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Use cases ─────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-16">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Adapté à votre activité</h2>
            <p className="text-gray-500 text-sm">Quel que soit votre secteur, l&apos;IA s&apos;adapte à votre ton.</p>
          </div>
          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, #09090B, transparent)' }} />
            <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none" style={{ background: 'linear-gradient(270deg, #09090B, transparent)' }} />
            <div className="overflow-hidden">
              <div className="flex gap-4" style={{ animation: 'scroll-left 34s linear infinite', width: 'max-content' }}>
                {[...USE_CASES, ...USE_CASES].map((uc, i) => (
                  <div key={i} className="shrink-0 w-60 rounded-xl p-4" style={{ background: '#18181B', border: '1px solid #27272A' }}>
                    <div className="text-3xl mb-3">{uc.icon}</div>
                    <h4 className="text-sm font-bold text-white mb-1.5">{uc.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed italic">{uc.example}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Features ──────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Tout ce qu&apos;il vous faut</h2>
            <p className="text-gray-500 text-sm">Survolez pour en savoir plus.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => <FeatureCard key={i} feature={f} />)}
          </div>
        </motion.div>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Questions fréquentes</h2>
          </div>
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            {FAQS.map((faq, i) => <FAQItem key={i} faq={faq} index={i} />)}
          </div>
        </motion.div>

        {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          className="text-center rounded-2xl p-10 mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.04))', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <h2 className="text-2xl font-extrabold text-white mb-2">Prêt à automatiser vos réseaux sociaux ?</h2>
          <p className="text-gray-400 text-sm mb-6">Rejoignez 9 400+ marques qui publient avec Velona Social.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-black transition-all hover:opacity-90"
            style={{ background: '#F59E0B', boxShadow: '0 4px 20px rgba(245,158,11,0.3)' }}
          >
            ✨ Commencer gratuitement
          </button>
          <p className="text-gray-600 text-xs mt-4">Essai 3 jours · Aucune carte bancaire requise · 5 réseaux inclus</p>
        </motion.div>

      </div>

      <AnimatePresence>
        {scheduleSlot && <ScheduleModal day={scheduleSlot.day} slot={scheduleSlot.slot} onClose={() => setScheduleSlot(null)} />}
        {showPublish && <PublishModal onClose={() => setShowPublish(false)} />}
      </AnimatePresence>
    </div>
  )
}
