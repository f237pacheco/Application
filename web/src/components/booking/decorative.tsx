'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import { EMERALD, AMBER, RED, BLUE, INK } from './theme'

// ─── Ambient glow — a single, very soft radial glow behind ONE important
// element (not a page-wide mesh). Used sparingly, e.g. behind the hero logo
// or a confirmation checkmark. ──────────────────────────────────────────────

export function Glow({ color = EMERALD, size = 320, opacity = 0.12 }: { color?: string; size?: number; opacity?: number }) {
  return (
    <div
      className="absolute pointer-events-none"
      aria-hidden
      style={{
        width: size,
        height: size,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        background: color,
        opacity,
        filter: `blur(${size / 4}px)`,
        borderRadius: '50%',
      }}
    />
  )
}

// A near-imperceptible page backdrop — just enough to keep pure black from
// feeling flat, no color, no mesh.
export function PageBackdrop() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden style={{ zIndex: 0 }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 900px 500px at 50% -10%, rgba(255,255,255,0.03), transparent)' }} />
    </div>
  )
}

// Kept as a name for drop-in compatibility with earlier call sites — now a
// no-color backdrop instead of a colorful mesh.
export const MeshBackground = PageBackdrop

// ─── Icon badge — flat, discreet colored container (no gradients). ────────────

export function GradientIconBadge({ icon, gradient = EMERALD, size = 40, radius = 12 }: { icon: React.ReactNode; gradient?: string; size?: number; radius?: number }) {
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{ width: size, height: size, borderRadius: radius, background: `${gradient}1A`, color: gradient, border: `1px solid ${gradient}33` }}
    >
      {icon}
    </div>
  )
}

// ─── Animated counter — counts up from 0 to value on mount/change. ────────────

export function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const spring = useSpring(0, { stiffness: 90, damping: 20 })
  const display = useTransform(spring, (v) => Math.round(v).toString() + suffix)
  const [text, setText] = useState('0' + suffix)

  useEffect(() => { spring.set(value) }, [value, spring])
  useEffect(() => {
    const unsub = display.on('change', (v) => setText(v))
    return () => unsub()
  }, [display])

  return <span>{text}</span>
}

// ─── Confetti burst — small colored particles fired once, for success states. ─

const CONFETTI_COLORS = [EMERALD, AMBER, BLUE, '#34D399']

export function ConfettiBurst({ fire }: { fire: boolean }) {
  const particles = Array.from({ length: 24 }, (_, i) => i)
  return (
    <AnimatePresence>
      {fire && (
        <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 20 }}>
          {particles.map((i) => {
            const angle = (i / particles.length) * Math.PI * 2
            const distance = 70 + (i % 5) * 18
            const x = Math.cos(angle) * distance
            const y = Math.sin(angle) * distance
            const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
            const isCircle = i % 2 === 0
            return (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2"
                initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
                animate={{ x, y, opacity: 0, scale: 1, rotate: (i % 2 === 0 ? 1 : -1) * 180 }}
                transition={{ duration: 0.9 + (i % 3) * 0.15, ease: 'easeOut', delay: i * 0.008 }}
                style={{
                  width: isCircle ? 7 : 5,
                  height: isCircle ? 7 : 10,
                  background: color,
                  borderRadius: isCircle ? '50%' : 2,
                }}
              />
            )
          })}
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Primary CTA button — flat semantic color, subtle glow on hover. ──────────

export function GradientButton({
  children, onClick, type = 'button', disabled, gradient = EMERALD, className = '', fullWidth = true,
}: {
  children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean
  gradient?: string; className?: string; fullWidth?: boolean
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      whileHover={disabled ? undefined : { scale: 1.015, boxShadow: `0 8px 28px ${gradient}4D` }}
      className={`relative overflow-hidden rounded-xl font-bold text-sm py-3 px-5 disabled:opacity-40 disabled:cursor-not-allowed ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{ background: gradient, color: '#FFFFFF', boxShadow: disabled ? 'none' : `0 4px 16px ${gradient}33` }}
    >
      <span className="relative inline-flex items-center justify-center gap-2 w-full">{children}</span>
    </motion.button>
  )
}

// ─── Toast notification system ─────────────────────────────────────────────────

export type ToastTone = 'success' | 'info' | 'error'
const TOAST_STYLES: Record<ToastTone, { bg: string; fg: string; icon: string }> = {
  success: { bg: '#16161D', fg: EMERALD, icon: '✓' },
  info: { bg: '#16161D', fg: BLUE, icon: 'i' },
  error: { bg: '#16161D', fg: RED, icon: '!' },
}

export function Toast({ message, tone = 'success' }: { message: string; tone?: ToastTone }) {
  const style = TOAST_STYLES[tone]
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 24, x: '-50%', scale: 0.95 }}
          animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
          exit={{ opacity: 0, y: 12, x: '-50%', scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-6 left-1/2 z-[70] px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2.5"
          style={{ background: style.bg, color: INK, border: `1px solid ${style.fg}33`, boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}
        >
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0" style={{ background: `${style.fg}1A`, color: style.fg }}>{style.icon}</span>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Decorative background shapes for section headers (kept minimal). ─────────

export function SectionBlobs({ tint = EMERALD }: { tint?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl" aria-hidden>
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full" style={{ background: tint, opacity: 0.04, filter: 'blur(30px)' }} />
    </div>
  )
}

export function DotGrid({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none ${className}`}
      aria-hidden
      style={{
        backgroundImage: `radial-gradient(circle, ${INK}12 1px, transparent 1px)`,
        backgroundSize: '14px 14px',
      }}
    />
  )
}
