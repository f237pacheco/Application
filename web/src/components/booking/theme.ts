// Shared "Stripe-style" design tokens for the booking system — warm,
// colorful, light. Used consistently across the public booking page, the
// settings page, and the appointments dashboard.

export const INK = '#1A1A2E'
export const MUTED = '#6B7280'
export const FAINT = '#9CA3AF'
export const BORDER = '#ECEAF5'
export const BORDER_STRONG = '#D9D6E8'
export const CARD = '#FFFFFF'
export const PAGE_BG = '#FDFCFF'

export const INDIGO = '#6366F1'
export const VIOLET = '#8B5CF6'
export const PINK = '#EC4899'
export const AMBER = '#F59E0B'

export const GRADIENT_BRAND = 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)'
export const GRADIENT_WARM = 'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)'

export const SHADOW_SOFT = '0 4px 24px rgba(99,102,241,0.08)'
export const SHADOW_MED = '0 12px 40px rgba(99,102,241,0.14)'
export const SHADOW_MODAL = '0 24px 64px rgba(26,26,46,0.2)'

// Functional status colors (kept conventional — green/red/amber carry real
// meaning and shouldn't be reassigned to the brand gradient).
export const SUCCESS = '#10B981'
export const SUCCESS_SOFT = '#ECFDF5'
export const SUCCESS_BORDER = '#A7F3D0'
export const DANGER = '#EF4444'
export const DANGER_TEXT = '#DC2626'
export const DANGER_SOFT = '#FEF2F2'
export const DANGER_BORDER = '#FECACA'
export const WARNING = '#F59E0B'
export const WARNING_SOFT = '#FFFBEB'
export const WARNING_BORDER = '#FDE68A'

// Per-section accent rotation — gives each card its own tint so the page
// has rhythm instead of one flat repeated color.
export type SectionTint = { accent: string; soft: string; border: string; gradient: string }
export const TINTS: Record<'indigo' | 'violet' | 'pink' | 'amber', SectionTint> = {
  indigo: { accent: '#6366F1', soft: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.18)', gradient: 'linear-gradient(135deg, #6366F1, #818CF8)' },
  violet: { accent: '#8B5CF6', soft: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.18)', gradient: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' },
  pink: { accent: '#EC4899', soft: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.18)', gradient: 'linear-gradient(135deg, #EC4899, #F472B6)' },
  amber: { accent: '#F59E0B', soft: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)', gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)' },
}
