// Thin-stroke SVG illustrations for a dark background — light/white line art
// with a single sparing color accent per illustration, no gradients or
// colorful fills. No external image assets.

export function EmptyCalendarIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <circle cx="48" cy="48" r="44" fill="#FFFFFF" fillOpacity="0.03" />
      <rect x="24" y="26" width="48" height="42" rx="10" fill="none" stroke="#FAFAFA" strokeOpacity="0.25" strokeWidth="2" />
      <line x1="24" y1="40" x2="72" y2="40" stroke="#FAFAFA" strokeOpacity="0.25" strokeWidth="2" />
      <line x1="34" y1="20" x2="34" y2="30" stroke="#FAFAFA" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
      <line x1="62" y1="20" x2="62" y2="30" stroke="#FAFAFA" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
      <circle cx="35" cy="50" r="2.5" fill="#9CA3AF" fillOpacity="0.4" />
      <circle cx="48" cy="50" r="2.5" fill="#10B981" />
      <circle cx="61" cy="50" r="2.5" fill="#9CA3AF" fillOpacity="0.4" />
      <circle cx="35" cy="60" r="2.5" fill="#9CA3AF" fillOpacity="0.4" />
      <circle cx="48" cy="60" r="2.5" fill="#9CA3AF" fillOpacity="0.4" />
      <circle cx="61" cy="60" r="2.5" fill="#F59E0B" />
    </svg>
  )
}

export function EmptyInboxIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <circle cx="48" cy="48" r="44" fill="#FFFFFF" fillOpacity="0.03" />
      <path d="M28 42l4-14a4 4 0 0 1 3.8-2.7h24.4a4 4 0 0 1 3.8 2.7l4 14" stroke="#FAFAFA" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 42h13l3.2 5h15.6l3.2-5h13v20a3 3 0 0 1-3 3H27a3 3 0 0 1-3-3V42z" fill="#FFFFFF" fillOpacity="0.04" stroke="#FAFAFA" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="70" cy="24" r="4" fill="#F59E0B" />
    </svg>
  )
}

export function SuccessBurstIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <circle cx="48" cy="48" r="44" fill="#10B981" fillOpacity="0.06" />
      <circle cx="48" cy="48" r="30" fill="#10B981" fillOpacity="0.12" />
      <circle cx="48" cy="48" r="20" fill="#10B981" />
      <path d="M38 48.5l7 7 14-15" stroke="#0A0A0F" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="22" r="2.5" fill="#F59E0B" />
      <circle cx="80" cy="30" r="2" fill="#3B82F6" />
      <circle cx="76" cy="72" r="2.5" fill="#10B981" />
      <circle cx="16" cy="70" r="2" fill="#9CA3AF" fillOpacity="0.5" />
    </svg>
  )
}

export function NotFoundIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <circle cx="48" cy="48" r="44" fill="#FFFFFF" fillOpacity="0.03" />
      <circle cx="40" cy="42" r="17" stroke="#FAFAFA" strokeOpacity="0.3" strokeWidth="2.5" fill="none" />
      <line x1="52" y1="54" x2="68" y2="70" stroke="#FAFAFA" strokeOpacity="0.3" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M33 42a7 7 0 0 1 7-7" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function OnboardingIllustration({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="54" fill="#FFFFFF" fillOpacity="0.03" />
      <rect x="30" y="34" width="60" height="52" rx="12" fill="#16161D" stroke="#FAFAFA" strokeOpacity="0.15" strokeWidth="2" />
      <rect x="38" y="46" width="30" height="6" rx="3" fill="#10B981" fillOpacity="0.7" />
      <rect x="38" y="58" width="44" height="5" rx="2.5" fill="#FAFAFA" fillOpacity="0.12" />
      <rect x="38" y="68" width="34" height="5" rx="2.5" fill="#FAFAFA" fillOpacity="0.12" />
      <circle cx="90" cy="30" r="5" fill="#F59E0B" />
      <circle cx="24" cy="80" r="4" fill="#3B82F6" />
      <circle cx="96" cy="80" r="3" fill="#10B981" />
    </svg>
  )
}
