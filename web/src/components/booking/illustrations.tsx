// Small decorative SVG illustrations for empty/onboarding states — abstract,
// line-art, on-brand (emerald accent), no external image assets.

export function EmptyCalendarIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <circle cx="48" cy="48" r="44" fill="#10B981" fillOpacity="0.07" />
      <rect x="24" y="26" width="48" height="42" rx="8" fill="none" stroke="#10B981" strokeWidth="2" strokeOpacity="0.5" />
      <line x1="24" y1="38" x2="72" y2="38" stroke="#10B981" strokeWidth="2" strokeOpacity="0.5" />
      <line x1="34" y1="20" x2="34" y2="30" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="62" y1="20" x2="62" y2="30" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
      <circle cx="34" cy="48" r="2.5" fill="#10B981" fillOpacity="0.35" />
      <circle cx="44" cy="48" r="2.5" fill="#10B981" fillOpacity="0.35" />
      <circle cx="54" cy="48" r="2.5" fill="#10B981" fillOpacity="0.6" />
      <circle cx="64" cy="48" r="2.5" fill="#10B981" fillOpacity="0.35" />
      <circle cx="34" cy="58" r="2.5" fill="#10B981" fillOpacity="0.35" />
      <circle cx="44" cy="58" r="2.5" fill="#10B981" fillOpacity="0.6" />
      <circle cx="54" cy="58" r="2.5" fill="#10B981" fillOpacity="0.35" />
      <circle cx="64" cy="58" r="2.5" fill="#10B981" fillOpacity="0.35" />
    </svg>
  )
}

export function EmptyInboxIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <circle cx="48" cy="48" r="44" fill="#10B981" fillOpacity="0.07" />
      <path d="M28 42l4-14a4 4 0 0 1 3.8-2.7h24.4a4 4 0 0 1 3.8 2.7l4 14" stroke="#10B981" strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 42h13l3.2 5h15.6l3.2-5h13v20a3 3 0 0 1-3 3H27a3 3 0 0 1-3-3V42z" stroke="#10B981" strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SuccessBurstIllustration({ size = 88 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <circle cx="44" cy="44" r="40" fill="#10B981" fillOpacity="0.08" />
      <circle cx="44" cy="44" r="28" fill="#10B981" fillOpacity="0.12" />
      <circle cx="44" cy="44" r="19" fill="#10B981" />
      <path d="M35 44.5l6 6 12-13" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function NotFoundIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <circle cx="48" cy="48" r="44" fill="#94A3B8" fillOpacity="0.08" />
      <circle cx="40" cy="42" r="16" stroke="#94A3B8" strokeWidth="2.5" fill="none" />
      <line x1="51.5" y1="53.5" x2="66" y2="68" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="33" y1="42" x2="47" y2="42" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
