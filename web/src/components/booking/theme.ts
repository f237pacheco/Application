// Shared design tokens for the booking system — dark, sober, premium
// (Linear/Vercel/Raycast register). Color is used sparingly, only to carry
// meaning, never as decoration.

export const PAGE_BG = '#0A0A0F'
export const SECTION_BG = '#111117'
export const CARD = '#16161D'
export const BORDER = 'rgba(255,255,255,0.06)'
export const BORDER_HOVER = 'rgba(255,255,255,0.12)'

export const INK = '#FAFAFA'
export const MUTED = '#9CA3AF'
export const FAINT = '#6B7280'

export const SHADOW_SOFT = '0 4px 24px rgba(0,0,0,0.35)'
export const SHADOW_MODAL = '0 24px 64px rgba(0,0,0,0.6)'

// Semantic accents — the only color in the interface, used with restraint
// and always tied to meaning, never as brand decoration.
export const AMBER = '#F59E0B'      // important actions, urgency
export const AMBER_SOFT = 'rgba(245,158,11,0.1)'
export const AMBER_BORDER = 'rgba(245,158,11,0.25)'

export const EMERALD = '#10B981'    // confirmations, positive status
export const EMERALD_SOFT = 'rgba(16,185,129,0.1)'
export const EMERALD_BORDER = 'rgba(16,185,129,0.25)'

export const RED = '#EF4444'        // alerts, cancellations, errors
export const RED_SOFT = 'rgba(239,68,68,0.1)'
export const RED_BORDER = 'rgba(239,68,68,0.25)'

export const BLUE = '#3B82F6'       // informational
export const BLUE_SOFT = 'rgba(59,130,246,0.1)'
export const BLUE_BORDER = 'rgba(59,130,246,0.25)'

// Back-compat aliases used by a few older call sites.
export const INDIGO = BLUE
export const VIOLET = AMBER
export const PINK = RED
export const SUCCESS = EMERALD
export const SUCCESS_SOFT = EMERALD_SOFT
export const DANGER_TEXT = '#F87171'
export const DANGER_SOFT = RED_SOFT
export const BORDER_STRONG = BORDER_HOVER
export const GRADIENT_BRAND = EMERALD // primary CTA color (flat, not a gradient)
export const GRADIENT_WARM = AMBER

export type SectionTint = { accent: string; soft: string; border: string; gradient: string }
export const TINTS: Record<'indigo' | 'violet' | 'pink' | 'amber', SectionTint> = {
  indigo: { accent: BLUE, soft: BLUE_SOFT, border: BLUE_BORDER, gradient: BLUE },
  violet: { accent: AMBER, soft: AMBER_SOFT, border: AMBER_BORDER, gradient: AMBER },
  pink: { accent: RED, soft: RED_SOFT, border: RED_BORDER, gradient: RED },
  amber: { accent: EMERALD, soft: EMERALD_SOFT, border: EMERALD_BORDER, gradient: EMERALD },
}
