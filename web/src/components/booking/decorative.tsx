'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import { GRADIENT_BRAND, INDIGO, VIOLET, PINK, AMBER, INK } from './theme'

// ─── Mesh gradient background — large soft blurred color blobs in page
// corners, à la stripe.com. Fixed, pointer-events-none, low opacity. ──────────

export function MeshBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden style={{ zIndex: 0 }}>
      <div
        className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full"
        style={{ background: INDIGO, opacity: 0.10, filter: 'blur(110px)' }}
      />
      <div
        className="absolute -bottom-48 -right-32 w-[620px] h-[620px] rounded-full"
        style={{ background: PINK, opacity: 0.09, filter: 'blur(120px)' }}
      />
      <div
        className="absolute top-1/3 right-0 w-[380px] h-[380px] rounded-full"
        style={{ background: VIOLET, opacity: 0.07, filter: 'blur(100px)' }}
      />
      <div
        className="absolute bottom-1/4 left-0 w-[300px] h-[300px] rounded-full"
        style={{ background: AMBER, opacity: 0.06, filter: 'blur(90px)' }}
      />
    </div>
  )
}

// ─── Gradient icon badge — rounded container, gradient fill, white icon. ──────

export function GradientIconBadge({ icon, gradient = GRADIENT_BRAND, size = 40, radius = 12 }: { icon: React.ReactNode; gradient?: string; size?: number; radius?: number }) {
  return (
    <div
      className="flex items-center justify-center text-white shrink-0"
      style={{ width: size, height: size, borderRadius: radius, background: gradient, boxShadow: '0 4px 14px rgba(99,102,241,0.28)' }}
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

const CONFETTI_COLORS = [INDIGO, VIOLET, PINK, AMBER, '#10B981']

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

// ─── Gradient CTA button — shimmer sweep on hover, scale on tap. ──────────────

export function GradientButton({
  children, onClick, type = 'button', disabled, gradient = GRADIENT_BRAND, className = '', fullWidth = true,
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
      whileHover={disabled ? undefined : { scale: 1.015 }}
      className={`relative overflow-hidden rounded-xl font-bold text-sm text-white py-3 px-5 disabled:opacity-50 disabled:cursor-not-allowed ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{ background: gradient, boxShadow: disabled ? 'none' : '0 8px 24px rgba(99,102,241,0.32)' }}
    >
      {!disabled && (
        <motion.span
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)', backgroundSize: '200% 100%' }}
          animate={{ backgroundPosition: ['150% 0%', '-50% 0%'] }}
          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.4, ease: 'easeInOut' }}
        />
      )}
      <span className="relative inline-flex items-center justify-center gap-2 w-full">{children}</span>
    </motion.button>
  )
}

// ─── Toast notification system ─────────────────────────────────────────────────

export type ToastTone = 'success' | 'info' | 'error'
const TOAST_STYLES: Record<ToastTone, { bg: string; icon: string }> = {
  success: { bg: 'linear-gradient(135deg, #10B981, #059669)', icon: '✓' },
  info: { bg: GRADIENT_BRAND, icon: 'i' },
  error: { bg: 'linear-gradient(135deg, #EF4444, #DC2626)', icon: '!' },
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
          className="fixed bottom-6 left-1/2 z-[70] px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2.5 text-white"
          style={{ background: style.bg, boxShadow: '0 16px 40px rgba(26,26,46,0.25)' }}
        >
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0" style={{ background: 'rgba(255,255,255,0.25)' }}>{style.icon}</span>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Decorative background shapes for section headers (blobs + dot grid). ─────

export function SectionBlobs({ tint = INDIGO }: { tint?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl" aria-hidden>
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full" style={{ background: tint, opacity: 0.06, filter: 'blur(30px)' }} />
    </div>
  )
}

export function DotGrid({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none ${className}`}
      aria-hidden
      style={{
        backgroundImage: `radial-gradient(circle, ${INK}14 1px, transparent 1px)`,
        backgroundSize: '14px 14px',
      }}
    />
  )
}
