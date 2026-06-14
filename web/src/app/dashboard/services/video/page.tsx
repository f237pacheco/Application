'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import Link from 'next/link'

// ─── Constants ────────────────────────────────────────────────────────────────

const FORMATS = [
  { id: 'youtube', label: 'YouTube', ratio: '16:9', icon: '▶', w: 64, h: 36 },
  { id: 'tiktok',  label: 'TikTok / Reels', ratio: '9:16', icon: '♪', w: 36, h: 64 },
  { id: 'square',  label: 'Carré', ratio: '1:1', icon: '⊞', w: 48, h: 48 },
]

const STYLES_VIDEO = [
  { id: 'dynamic',     label: 'Dynamique',     desc: 'Cuts rapides, énergie, musique punchée' },
  { id: 'cinematic',   label: 'Cinématique',   desc: 'Plans larges, couleurs étalonnées, slow-mo' },
  { id: 'vlog',        label: 'Vlog',          desc: 'Naturel, jump cuts, textes à l\'écran' },
]

const FAKE_CLIPS = [
  { name: 'clip_001.mp4', dur: '0:32', color: '#8B5CF6' },
  { name: 'clip_002.mp4', dur: '1:04', color: '#6D28D9' },
  { name: 'clip_003.mp4', dur: '0:18', color: '#7C3AED' },
  { name: 'clip_004.mp4', dur: '0:47', color: '#5B21B6' },
]

const EDITING_STEPS = [
  { label: 'Analyse des clips…',                duration: 900  },
  { label: 'Détection des meilleurs moments…',  duration: 1200 },
  { label: 'Ajout des sous-titres…',            duration: 1000 },
  { label: 'Synchronisation musique…',          duration: 1100 },
  { label: 'Export final…',                     duration: 800  },
]

const TIMELINE_CLIPS = [
  { label: 'Clip 1', width: 120, color: '#8B5CF6', start: 0   },
  { label: 'Clip 2', width: 180, color: '#6D28D9', start: 124 },
  { label: 'Clip 3', width: 80,  color: '#7C3AED', start: 308 },
  { label: 'Clip 4', width: 150, color: '#5B21B6', start: 392 },
]

// audio bar heights (px) for the waveform — deterministic
const WAVE_HEIGHTS = [6,14,8,18,12,22,10,16,8,20,14,10,18,6,24,12,8,16,10,20,14,8,18,12,22,6,16,10,20,14,8,18]

const SUBTITLE_BLOCKS = [
  { label: '"Bienvenue sur…"', start: 0,   width: 110 },
  { label: '"Aujourd\'hui…"',  start: 124, width: 90  },
  { label: '"N\'oubliez pas…"',start: 250, width: 120 },
  { label: '"À bientôt !"',    start: 392, width: 80  },
]

const GALLERY_ITEMS = [
  { aspect: '16:9', title: 'Présentation produit',  views: '12K',  dur: '2:34', gradient: 'from-violet-700 to-purple-900' },
  { aspect: '9:16', title: 'Reel immobilier',        views: '34K',  dur: '0:45', gradient: 'from-purple-600 to-indigo-900' },
  { aspect: '9:16', title: 'Tuto cuisine',           views: '8.2K', dur: '1:12', gradient: 'from-violet-800 to-fuchsia-900' },
  { aspect: '16:9', title: 'Aftermovie événement',   views: '21K',  dur: '3:07', gradient: 'from-indigo-700 to-violet-900' },
  { aspect: '9:16', title: 'Témoignage client',      views: '5.6K', dur: '0:58', gradient: 'from-purple-700 to-violet-900' },
  { aspect: '16:9', title: 'Démo logiciel',          views: '9.1K', dur: '1:45', gradient: 'from-violet-600 to-purple-800' },
]

const FEATURES = [
  { icon: '💬', title: 'Sous-titres automatiques', desc: 'Transcription et incrustation synchronisée au mot près.',         tooltip: '99 langues. Choix du style (position, police, couleur). Export SRT inclus.' },
  { icon: '✂️', title: 'Recadrage intelligent',    desc: 'L\'IA suit le sujet et adapte le cadre au format cible.',          tooltip: 'Tracking visage/objet. Recadrage pour 16:9 → 9:16 sans perte de sujet.' },
  { icon: '🔇', title: 'Suppression silences',     desc: 'Retire automatiquement les blancs et hésitations.',                tooltip: 'Gain de temps moyen : −35% de durée. Seuil configurable (0.3s–2s).' },
  { icon: '🎵', title: 'Musique libre de droits',  desc: 'Bibliothèque de 50 000 titres synchronisés aux temps forts.',      tooltip: 'IA musicale qui adapte la durée du morceau exactement à votre vidéo.' },
  { icon: '📦', title: 'Multi-format export',       desc: 'YouTube, Instagram, TikTok, LinkedIn — un clic, tous les formats.', tooltip: 'Résolutions : 4K/1080p/720p. Codecs H.264/H.265/AV1. Compression optimisée.' },
  { icon: '🎨', title: 'Templates premium',        desc: 'Intros, outros, lower thirds et overlays professionnels.',         tooltip: '200+ templates catégorisés par secteur. Personnalisables couleur/logo.' },
]

const FAQS = [
  { q: 'Quels formats de fichiers puis-je uploader ?',         a: 'MP4, MOV, AVI, MKV, WebM — pratiquement tous les formats vidéo courants. Taille max par clip : 2 Go. Vous pouvez envoyer jusqu\'à 20 clips en une session.' },
  { q: 'L\'IA peut-elle monter des vidéos longues ?',         a: 'Oui, jusqu\'à 3h de rushes bruts en entrée. L\'IA sélectionne automatiquement les meilleurs moments selon la durée cible que vous définissez (30s, 1min, 5min…).' },
  { q: 'Comment fonctionne la détection des meilleurs moments ?', a: 'L\'IA analyse le mouvement, la qualité audio, le niveau d\'exposition et la présence de visages pour scorer chaque segment. Vous pouvez ajuster les pondérations.' },
  { q: 'Puis-je modifier le montage manuellement ?',           a: 'Oui. Après génération, vous accédez à un éditeur timeline simplifié pour déplacer des clips, retoucher les sous-titres et changer la musique.' },
  { q: 'Les vidéos générées contiennent-elles un watermark ?', a: 'Non, à partir du plan Starter. Toutes les vidéos exportées sont libres de tout watermark Velona. Le plan Enterprise inclut aussi la suppression des métadonnées.' },
]

// ─── VideoPlayer Mockup ────────────────────────────────────────────────────────

function VideoPlayerMockup() {
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setPlaying(true), 1200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="relative mx-auto rounded-xl overflow-hidden"
      style={{ width: '100%', maxWidth: 380, aspectRatio: '16/9', background: '#18181B', border: '1px solid #27272A', boxShadow: '0 0 60px rgba(139,92,246,0.15)' }}
    >
      {/* Fake video gradient */}
      <motion.div
        className="absolute inset-0"
        animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        style={{ background: 'linear-gradient(135deg, #1e1030, #3b1d6e, #1e1030, #2d1660)', backgroundSize: '300% 300%' }}
      />

      {/* Scene elements */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}
        >
          <motion.button
            onClick={() => setPlaying((v) => !v)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: playing ? 'rgba(139,92,246,0.4)' : '#8B5CF6', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}
          >
            <AnimatePresence mode="wait">
              {playing ? (
                <motion.div key="pause" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex gap-1">
                  <div className="w-1.5 h-5 rounded-sm bg-white" />
                  <div className="w-1.5 h-5 rounded-sm bg-white" />
                </motion.div>
              ) : (
                <motion.div key="play" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
                    <path d="M2 1l13 8-13 8V1z" fill="white" />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </div>

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
        {/* Progress */}
        <div className="h-0.5 rounded-full mb-2 relative" style={{ background: '#3F3F46' }}>
          {playing && (
            <motion.div
              className="h-full rounded-full"
              style={{ background: '#8B5CF6' }}
              initial={{ width: '0%' }}
              animate={{ width: ['0%', '100%'] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </div>
        <div className="flex items-center justify-between text-[9px] text-gray-400 font-mono">
          <span>{playing ? '0:12' : '0:00'}</span>
          <span>2:34</span>
        </div>
      </div>

      {/* Top overlay: "AI EDITED" badge */}
      <div className="absolute top-2 left-2">
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#8B5CF6', color: '#fff' }}>
          ✦ IA montée
        </span>
      </div>
    </div>
  )
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

type UploadState = 'idle' | 'uploading' | 'ready'

function UploadZone({ onReady }: { onReady: () => void }) {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  const startUpload = useCallback(() => {
    if (uploadState !== 'idle') return
    setUploadState('uploading')
    let p = 0
    const t = setInterval(() => {
      p += 3 + Math.floor(p / 10)
      if (p >= 100) { p = 100; clearInterval(t); setTimeout(() => { setUploadState('ready'); onReady() }, 300) }
      setProgress(p)
    }, 80)
  }, [uploadState, onReady])

  if (uploadState === 'ready') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-3">
        {FAKE_CLIPS.map((clip, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className="relative rounded-xl overflow-hidden"
            style={{ width: 120, height: 72, background: '#09090B', border: '1px solid #3F3F46' }}
          >
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${clip.color}44, ${clip.color}11)` }} />
            <div className="absolute bottom-1 right-1 text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.7)', color: '#A1A1AA' }}>{clip.dur}</div>
            <div className="absolute top-1 left-1 text-[9px] text-gray-500 truncate" style={{ maxWidth: 90 }}>{clip.name}</div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.3)' }}>
              <svg width="8" height="10" viewBox="0 0 8 10" fill="none"><path d="M1 1l6 4-6 4V1z" fill="#A78BFA" /></svg>
            </div>
          </motion.div>
        ))}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={() => { setUploadState('idle'); setProgress(0) }}
          className="w-[120px] h-[72px] rounded-xl flex flex-col items-center justify-center gap-1 text-[10px]"
          style={{ border: '1px dashed #3F3F46', color: '#52525B' }}
        >
          <span className="text-lg">+</span>
          Ajouter
        </motion.button>
      </motion.div>
    )
  }

  return (
    <motion.div
      onMouseEnter={() => uploadState === 'idle' && setDragOver(true)}
      onMouseLeave={() => setDragOver(false)}
      onClick={startUpload}
      animate={{ borderColor: dragOver ? '#8B5CF6' : '#3F3F46', background: dragOver ? 'rgba(139,92,246,0.04)' : 'transparent' }}
      transition={{ duration: 0.15 }}
      className="rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-4 py-12 px-6 text-center"
      style={{ border: '2px dashed #3F3F46' }}
    >
      {uploadState === 'idle' ? (
        <>
          <motion.div
            animate={{ y: dragOver ? -6 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}
          >
            <motion.span
              animate={{ y: dragOver ? [-2, 2, -2] : 0 }}
              transition={{ duration: 1, repeat: dragOver ? Infinity : 0 }}
              className="text-2xl"
            >
              📁
            </motion.span>
          </motion.div>
          <div>
            <p className="text-white font-semibold mb-1">Glissez vos clips ici</p>
            <p className="text-gray-500 text-sm">ou <span style={{ color: '#8B5CF6' }}>cliquez pour parcourir</span></p>
            <p className="text-gray-600 text-xs mt-2">MP4, MOV, AVI · Max 2 Go par clip · Jusqu&apos;à 20 clips</p>
          </div>
        </>
      ) : (
        <div className="w-full max-w-xs">
          <p className="text-white text-sm font-semibold mb-3">Envoi des clips en cours…</p>
          <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: '#27272A' }}>
            <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)', width: `${progress}%` }} />
          </div>
          <p className="text-gray-500 text-xs font-mono">{progress}%</p>
        </div>
      )}
    </motion.div>
  )
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function VideoTimeline() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: false })
  const TOTAL_W = 560

  return (
    <div ref={ref} className="rounded-2xl overflow-hidden" style={{ background: '#18181B', border: '1px solid #27272A' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#27272A', borderBottom: '1px solid #3F3F46' }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#EF4444' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#F59E0B' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#22C55E' }} />
        </div>
        <span className="text-xs text-gray-400 font-medium">Timeline — Velona Video Editor</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-gray-500">00:00</span>
          <div className="w-px h-3 bg-gray-700" />
          <span className="text-[9px] font-mono text-gray-500">02:34</span>
        </div>
      </div>

      <div className="p-4 overflow-x-auto">
        {/* Ruler */}
        <div className="flex mb-3 ml-20" style={{ width: TOTAL_W }}>
          {[0, 30, 60, 90, 120, 150].map((s) => (
            <div key={s} className="flex-1 text-[9px] font-mono text-gray-600">{`0:${String(s % 60).padStart(2,'0')}`}</div>
          ))}
        </div>

        <div className="relative" style={{ minWidth: TOTAL_W + 80 }}>
          {/* Playhead */}
          {inView && (
            <motion.div
              className="absolute top-0 bottom-0 w-px z-10 pointer-events-none"
              style={{ background: '#8B5CF6', left: 80 }}
              animate={{ left: [80, TOTAL_W + 80, 80] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <div className="w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-0.5" style={{ background: '#8B5CF6' }} />
            </motion.div>
          )}

          {/* Video track */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-16 shrink-0 text-right">
              <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Vidéo</span>
            </div>
            <div className="relative h-12 rounded-lg overflow-hidden" style={{ width: TOTAL_W, background: '#09090B', border: '1px solid #27272A' }}>
              {TIMELINE_CLIPS.map((clip, i) => (
                <div
                  key={i}
                  className="absolute top-1 bottom-1 rounded-md flex items-center px-2 overflow-hidden"
                  style={{ left: clip.start, width: clip.width, background: `${clip.color}33`, border: `1px solid ${clip.color}66` }}
                >
                  {/* Fake thumbnail lines */}
                  <div className="flex gap-0.5 absolute inset-1 opacity-30">
                    {Array.from({ length: Math.floor(clip.width / 18) }).map((_, j) => (
                      <div key={j} className="flex-1 rounded-sm" style={{ background: clip.color }} />
                    ))}
                  </div>
                  <span className="text-[9px] font-semibold relative z-10" style={{ color: '#A78BFA' }}>{clip.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Audio track */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-16 shrink-0 text-right">
              <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Audio</span>
            </div>
            <div className="relative h-12 rounded-lg overflow-hidden flex items-end px-2 gap-px" style={{ width: TOTAL_W, background: '#09090B', border: '1px solid #27272A' }}>
              {WAVE_HEIGHTS.map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}px`, background: '#6D28D9', opacity: 0.7 }} />
              ))}
              <div className="absolute inset-0 rounded-lg" style={{ background: 'linear-gradient(90deg, rgba(109,40,217,0.15), rgba(139,92,246,0.05) 50%, rgba(109,40,217,0.15))' }} />
            </div>
          </div>

          {/* Subtitles track */}
          <div className="flex items-center gap-3">
            <div className="w-16 shrink-0 text-right">
              <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Sous-titres</span>
            </div>
            <div className="relative h-8 rounded-lg overflow-hidden" style={{ width: TOTAL_W, background: '#09090B', border: '1px solid #27272A' }}>
              {SUBTITLE_BLOCKS.map((b, i) => (
                <div
                  key={i}
                  className="absolute top-1 bottom-1 rounded flex items-center px-2"
                  style={{ left: b.start, width: b.width, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)' }}
                >
                  <span className="text-[8px] font-medium truncate" style={{ color: '#C4B5FD' }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 ml-20">
          {[
            { color: '#8B5CF6', label: 'Piste vidéo — clips assemblés par l\'IA' },
            { color: '#6D28D9', label: 'Piste audio — musique synchronisée' },
            { color: '#A78BFA', label: 'Piste sous-titres — texte auto-généré' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
              <span className="text-[9px] text-gray-600">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Editing Modal ─────────────────────────────────────────────────────────────

function EditingModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let elapsed = 0
    const total = EDITING_STEPS.reduce((a, s) => a + s.duration, 0)
    const tick = setInterval(() => {
      elapsed += 50
      setProgress(Math.min(Math.round((elapsed / total) * 100), 100))
      let cum = 0
      for (let i = 0; i < EDITING_STEPS.length; i++) {
        cum += EDITING_STEPS[i].duration
        if (elapsed < cum) { setStep(i); break }
        setStep(i)
      }
      if (elapsed >= total) { clearInterval(tick); setTimeout(() => setDone(true), 300) }
    }, 50)
    return () => clearInterval(tick)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: '#18181B', border: '1px solid #27272A' }}
      >
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div key="loading" exit={{ opacity: 0 }} className="flex flex-col items-center">
              {/* Film reel animation */}
              <div className="relative w-20 h-20 flex items-center justify-center mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full flex items-center justify-center text-4xl"
                  style={{ border: '2px dashed rgba(139,92,246,0.3)' }}
                >
                </motion.div>
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)' }}>
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-2xl"
                  >
                    🎬
                  </motion.span>
                </div>
                {/* Orbiting frame holes */}
                {[0, 72, 144, 216, 288].map((deg) => (
                  <motion.div
                    key={deg}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="absolute"
                    style={{ transformOrigin: '40px 40px', transform: `rotate(${deg}deg) translateY(-32px)` }}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(139,92,246,0.5)' }} />
                  </motion.div>
                ))}
              </div>

              <h3 className="text-white font-bold text-lg mb-1 text-center">Montage en cours</h3>
              <p className="text-gray-500 text-sm mb-6 text-center">L&apos;IA assemble votre vidéo…</p>

              <div className="w-full mb-5">
                <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                  <span>Progression</span>
                  <span className="font-mono font-semibold" style={{ color: '#8B5CF6' }}>{progress}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#27272A' }}>
                  <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', width: `${progress}%` }} transition={{ duration: 0.08 }} />
                </div>
              </div>

              <div className="w-full flex flex-col gap-2.5">
                {EDITING_STEPS.map((s, i) => {
                  const isDone = i < step
                  const isActive = i === step
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                        {isDone ? (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#8B5CF6' }}>
                            <svg width="7" height="5" viewBox="0 0 7 5" fill="none"><path d="M1 2.5l1.5 1.5L6 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </motion.div>
                        ) : isActive ? (
                          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="w-4 h-4 rounded-full border-2" style={{ borderColor: '#8B5CF6' }} />
                        ) : (
                          <div className="w-4 h-4 rounded-full border" style={{ borderColor: '#3F3F46' }} />
                        )}
                      </div>
                      <span className="text-xs" style={{ color: isDone ? '#DDD6FE' : isActive ? '#C4B5FD' : '#52525B' }}>{s.label}</span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.35)' }}
              >
                <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
                  <path d="M2 10l6.5 6.5L24 2" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
              <h3 className="text-white font-extrabold text-xl mb-1.5">✓ Votre vidéo est prête !</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">Votre vidéo montée est disponible. Prévisualisez, retouchez et exportez en un clic.</p>
              <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-bold text-white mb-2.5 hover:opacity-90 transition-opacity" style={{ background: '#8B5CF6', boxShadow: '0 4px 20px rgba(139,92,246,0.3)' }}>
                Voir ma vidéo →
              </button>
              <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#27272A', color: '#71717A', border: '1px solid #3F3F46' }}>
                Générer une variante
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ─── Before / After Slider ────────────────────────────────────────────────────

function BeforeAfterSlider() {
  const [pos, setPos] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const updatePos = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const p = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100))
    setPos(p)
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (dragging.current) updatePos(e.clientX) }
    const onUp = () => { dragging.current = false }
    const onTouchMove = (e: TouchEvent) => { if (dragging.current) updatePos(e.touches[0].clientX) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onTouchMove)
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [updatePos])

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden select-none cursor-ew-resize"
      style={{ aspectRatio: '16/9', background: '#18181B', border: '1px solid #27272A' }}
      onMouseDown={(e) => { dragging.current = true; updatePos(e.clientX) }}
      onTouchStart={(e) => { dragging.current = true; updatePos(e.touches[0].clientX) }}
    >
      {/* After (right side — full) */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2d1660, #4c1d95, #1e1030)' }}>
        <div className="text-center">
          <div className="text-5xl mb-2">🎬</div>
          <p className="text-white font-semibold text-sm">Monté par IA</p>
          <p className="text-purple-300 text-xs mt-1">Sous-titres · Musique · Transitions</p>
        </div>
        <div className="absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#8B5CF6', color: '#fff' }}>APRÈS</div>
      </div>

      {/* Before (left side — clipped) */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)`, background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a, #111)' }}
      >
        <div className="text-center opacity-60">
          <div className="text-5xl mb-2 grayscale">📹</div>
          <p className="text-gray-400 font-semibold text-sm">Clip brut</p>
          <p className="text-gray-600 text-xs mt-1">Non monté · Silences · Sans musique</p>
        </div>
        <div className="absolute top-3 left-3 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#27272A', color: '#71717A' }}>AVANT</div>
      </div>

      {/* Divider */}
      <div className="absolute inset-y-0 flex items-center z-10 pointer-events-none" style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}>
        <div className="w-px h-full" style={{ background: '#8B5CF6' }} />
        <div className="absolute w-8 h-8 rounded-full flex items-center justify-center shadow-lg" style={{ background: '#8B5CF6', border: '2px solid #fff', boxShadow: '0 0 20px rgba(139,92,246,0.5)' }}>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
            <path d="M1 5h12M4 2l-3 3 3 3M10 2l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

function VideoGallery() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, #09090B, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none" style={{ background: 'linear-gradient(270deg, #09090B, transparent)' }} />
      <div className="overflow-hidden">
        <div className="flex gap-4 pb-2" style={{ animation: 'scroll-left 38s linear infinite', width: 'max-content' }}>
          {[...GALLERY_ITEMS, ...GALLERY_ITEMS].map((item, i) => (
            <div
              key={i}
              className="shrink-0 rounded-xl overflow-hidden group"
              style={
                item.aspect === '9:16'
                  ? { width: 120, height: 214, background: '#18181B', border: '1px solid #27272A' }
                  : { width: 220, height: 124, background: '#18181B', border: '1px solid #27272A' }
              }
            >
              {/* Gradient bg */}
              <div className={`w-full h-full relative bg-gradient-to-br ${item.gradient} flex flex-col items-center justify-center`}>
                {/* Play overlay */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ background: 'rgba(139,92,246,0.4)', border: '1px solid rgba(139,92,246,0.6)' }}>
                  <svg width="10" height="12" viewBox="0 0 10 12" fill="none"><path d="M1 1l8 5-8 5V1z" fill="white" /></svg>
                </div>
                <p className="text-white text-[10px] font-semibold text-center px-2 leading-tight">{item.title}</p>
                {/* Bottom bar */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1.5" style={{ background: 'rgba(0,0,0,0.6)' }}>
                  <span className="text-[8px] font-mono text-gray-400">{item.dur}</span>
                  <span className="text-[8px] text-gray-400">👁 {item.views}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Feature card ─────────────────────────────────────────────────────────────

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
            style={{ background: '#09090B', border: '1px solid #8B5CF6', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
          >
            {feature.tooltip}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────

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
      style={{ border: open ? '1px solid rgba(139,92,246,0.35)' : '1px solid #27272A', background: open ? 'rgba(139,92,246,0.06)' : '#18181B', transition: 'border-color 0.2s, background 0.2s' }}
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
    <label className="flex items-center justify-between cursor-pointer py-2.5 border-b" style={{ borderColor: '#1F1F23' }}>
      <span className="text-sm text-gray-300">{label}</span>
      <div onClick={onToggle} className="relative w-9 h-5 rounded-full transition-colors duration-200" style={{ background: enabled ? '#8B5CF6' : '#3F3F46' }}>
        <motion.div animate={{ x: enabled ? 16 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute top-0.5 w-4 h-4 rounded-full" style={{ background: '#FAFAFA' }} />
      </div>
    </label>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function VideoServicePage() {
  const [uploaded, setUploaded] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [toggles, setToggles] = useState({ subtitles: true, music: true, transitions: true, silence: false })
  const [showModal, setShowModal] = useState(false)
  const [hoveredCta, setHoveredCta] = useState(false)

  const canEdit = uploaded && !!selectedFormat && !!selectedStyle

  return (
    <div className="relative min-h-screen" style={{ background: '#09090B' }}>
      {/* Violet beam */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10"
        style={{ background: 'linear-gradient(90deg, transparent 5%, #8B5CF6 35%, #A78BFA 65%, transparent 95%)' }}
      />

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-150">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Retour aux services
          </Link>
        </motion.div>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5" style={{ background: 'rgba(139,92,246,0.12)', color: '#C4B5FD', border: '1px solid rgba(139,92,246,0.25)' }}>
              <span className="text-xs">✦</span>
              Montage vidéo IA
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
              Transformez vos clips bruts en{' '}
              <span style={{ color: '#8B5CF6' }}>vidéos pro</span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed mb-8">
              Uploadez vos rushs, notre IA monte, sous-titre et optimise automatiquement pour chaque plateforme.
            </p>
            <div className="flex flex-wrap gap-6">
              {[{ value: '3 min', label: 'temps de montage' }, { value: '100%', label: 'sous-titres auto' }, { value: '6 formats', label: 'multi-plateforme' }].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-extrabold" style={{ color: '#8B5CF6' }}>{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
            <VideoPlayerMockup />
          </motion.div>
        </div>

        {/* ── Upload + Config ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-6 rounded-2xl p-6 sm:p-7"
          style={{ background: '#18181B', border: '1px solid #27272A' }}
        >
          <h2 className="text-xl font-bold text-white mb-1">Vos rushs</h2>
          <p className="text-gray-500 text-sm mb-5">Uploadez vos clips bruts pour lancer le montage IA.</p>
          <UploadZone onReady={() => setUploaded(true)} />
        </motion.div>

        <AnimatePresence>
          {uploaded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-16 overflow-hidden"
            >
              <div className="rounded-2xl p-6 sm:p-7" style={{ background: '#18181B', border: '1px solid #27272A' }}>
                <h3 className="text-lg font-bold text-white mb-5">Configuration du montage</h3>

                {/* Format */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-gray-400 mb-3">Format de sortie *</label>
                  <div className="flex flex-wrap gap-3">
                    {FORMATS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFormat(f.id)}
                        className="flex flex-col items-center gap-2 px-5 py-4 rounded-xl transition-all duration-150"
                        style={{ background: selectedFormat === f.id ? 'rgba(139,92,246,0.1)' : '#09090B', border: selectedFormat === f.id ? '1px solid #8B5CF6' : '1px solid #27272A' }}
                      >
                        <div className="rounded-sm" style={{ width: f.w / 3, height: f.h / 3, background: selectedFormat === f.id ? 'rgba(139,92,246,0.4)' : '#27272A', border: '1px solid #3F3F46' }} />
                        <span className="text-xs font-bold" style={{ color: selectedFormat === f.id ? '#C4B5FD' : '#71717A' }}>{f.label}</span>
                        <span className="text-[9px]" style={{ color: '#52525B' }}>{f.ratio}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-gray-400 mb-3">Style de montage *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {STYLES_VIDEO.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStyle(s.id)}
                        className="text-left rounded-xl p-4 transition-all duration-150"
                        style={{ background: selectedStyle === s.id ? 'rgba(139,92,246,0.08)' : '#09090B', border: selectedStyle === s.id ? '1px solid #8B5CF6' : '1px solid #27272A' }}
                      >
                        <div className="text-sm font-bold mb-1" style={{ color: selectedStyle === s.id ? '#C4B5FD' : '#FAFAFA' }}>{s.label}</div>
                        <div className="text-[10px] text-gray-500 leading-snug">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-gray-400 mb-2">Options</label>
                  <Toggle enabled={toggles.subtitles}   onToggle={() => setToggles((t) => ({ ...t, subtitles: !t.subtitles }))}     label="Sous-titres automatiques" />
                  <Toggle enabled={toggles.music}       onToggle={() => setToggles((t) => ({ ...t, music: !t.music }))}             label="Musique de fond IA" />
                  <Toggle enabled={toggles.transitions} onToggle={() => setToggles((t) => ({ ...t, transitions: !t.transitions }))} label="Transitions automatiques" />
                  <Toggle enabled={toggles.silence}     onToggle={() => setToggles((t) => ({ ...t, silence: !t.silence }))}         label="Suppression des silences" />
                </div>

                {/* CTA */}
                <div className="relative overflow-hidden rounded-xl">
                  <button
                    disabled={!canEdit}
                    onClick={() => canEdit && setShowModal(true)}
                    onMouseEnter={() => setHoveredCta(true)}
                    onMouseLeave={() => setHoveredCta(false)}
                    className="w-full py-4 rounded-xl text-sm font-bold transition-all duration-200"
                    style={{
                      background: canEdit ? '#8B5CF6' : '#1C1C1F',
                      color: canEdit ? '#fff' : '#52525B',
                      boxShadow: canEdit && hoveredCta ? '0 8px 30px rgba(139,92,246,0.4)' : canEdit ? '0 4px 20px rgba(139,92,246,0.25)' : 'none',
                      cursor: canEdit ? 'pointer' : 'not-allowed',
                      transform: canEdit && hoveredCta ? 'translateY(-1px)' : 'translateY(0)',
                      border: canEdit ? 'none' : '1px solid #27272A',
                    }}
                  >
                    {canEdit ? '🎬 Monter ma vidéo →' : 'Choisissez un format et un style pour continuer'}
                  </button>
                  {canEdit && (
                    <span className="absolute inset-0 rounded-xl pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)', transform: hoveredCta ? 'translateX(100%)' : 'translateX(-100%)', transition: 'transform 0.6s ease-in-out' }} />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Timeline ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Comment l&apos;IA assemble votre vidéo</h2>
            <p className="text-gray-500 text-sm">La timeline ci-dessous illustre le montage produit automatiquement.</p>
          </div>
          <VideoTimeline />
        </motion.div>

        {/* ── Before / After ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Avant / Après</h2>
            <p className="text-gray-500 text-sm">Glissez la poignée pour comparer le clip brut et la version montée.</p>
          </div>
          <div className="max-w-2xl mx-auto">
            <BeforeAfterSlider />
          </div>
        </motion.div>

        {/* ── How it works ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Comment ça marche</h2>
            <p className="text-gray-500 text-sm">Du rush brut à la vidéo publiée — en 4 étapes.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: '01', icon: '📤', title: 'Uploadez vos rushs',          desc: 'Glissez vos clips bruts — MP4, MOV, AVI. L\'IA accepte jusqu\'à 3h de footage.' },
              { step: '02', icon: '⚙️',  title: 'Choisissez le format',        desc: 'YouTube 16:9, TikTok 9:16, carré Instagram. Un clic pour chaque destination.' },
              { step: '03', icon: '🤖', title: 'L\'IA monte automatiquement',  desc: 'Sélection des meilleurs moments, sous-titres, musique, transitions — tout automatique.' },
              { step: '04', icon: '🚀', title: 'Téléchargez et publiez',       desc: 'Vidéo HD prête à uploader. Export direct vers YouTube, TikTok, Instagram.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="relative rounded-xl p-5"
                style={{ background: '#18181B', border: '1px solid #27272A' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-3xl font-black tabular-nums" style={{ color: 'rgba(139,92,246,0.15)', lineHeight: 1 }}>{item.step}</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2.5 -translate-y-1/2 text-gray-700 z-10 text-xs">→</div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Gallery ───────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Vidéos générées par notre IA</h2>
            <p className="text-gray-500 text-sm">Exemples réels — montés entièrement par Velona.</p>
          </div>
          <VideoGallery />
        </motion.div>

        {/* ── Features ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Tout ce que l&apos;IA fait pour vous</h2>
            <p className="text-gray-500 text-sm">Survolez pour les détails techniques.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => <FeatureCard key={i} feature={f} />)}
          </div>
        </motion.div>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Questions fréquentes</h2>
          </div>
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            {FAQS.map((faq, i) => <FAQItem key={i} faq={faq} index={i} />)}
          </div>
        </motion.div>

        {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center rounded-2xl p-10 mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(109,40,217,0.05))', border: '1px solid rgba(139,92,246,0.2)' }}
        >
          <h2 className="text-2xl font-extrabold text-white mb-2">Prêt à monter votre première vidéo ?</h2>
          <p className="text-gray-400 text-sm mb-6">Rejoignez 8 600+ créateurs qui utilisent Velona Video.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: '#8B5CF6', boxShadow: '0 4px 20px rgba(139,92,246,0.3)' }}
          >
            🎬 Commencer gratuitement
          </button>
          <p className="text-gray-600 text-xs mt-4">Essai 3 jours · Aucune carte bancaire · Export HD illimité</p>
        </motion.div>

      </div>

      <AnimatePresence>
        {showModal && <EditingModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  )
}
