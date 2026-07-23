// Colorful gradient SVG illustrations — abstract, on-brand (indigo → violet
// → pink), no external image assets. Each defines its own <linearGradient>
// with a unique id (via useId, so server/client stay in sync and multiple
// instances never collide).

import { useId } from 'react'

function useGradId(prefix: string) {
  const id = useId()
  return `${prefix}-${id.replace(/:/g, '')}`
}

export function EmptyCalendarIllustration({ size = 96 }: { size?: number }) {
  const g = useGradId('cal')
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="44" fill={`url(#${g})`} fillOpacity="0.08" />
      <rect x="24" y="26" width="48" height="42" rx="10" fill="none" stroke={`url(#${g})`} strokeWidth="2.5" />
      <line x1="24" y1="40" x2="72" y2="40" stroke={`url(#${g})`} strokeWidth="2.5" />
      <line x1="34" y1="20" x2="34" y2="30" stroke={`url(#${g})`} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="62" y1="20" x2="62" y2="30" stroke={`url(#${g})`} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="35" cy="50" r="3" fill="#8B5CF6" fillOpacity="0.55" />
      <circle cx="48" cy="50" r="3" fill="#EC4899" fillOpacity="0.75" />
      <circle cx="61" cy="50" r="3" fill="#6366F1" fillOpacity="0.55" />
      <circle cx="35" cy="60" r="3" fill="#6366F1" fillOpacity="0.4" />
      <circle cx="48" cy="60" r="3" fill="#8B5CF6" fillOpacity="0.4" />
      <circle cx="61" cy="60" r="3" fill="#F59E0B" fillOpacity="0.6" />
    </svg>
  )
}

export function EmptyInboxIllustration({ size = 96 }: { size?: number }) {
  const g = useGradId('inbox')
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="44" fill={`url(#${g})`} fillOpacity="0.08" />
      <path d="M28 42l4-14a4 4 0 0 1 3.8-2.7h24.4a4 4 0 0 1 3.8 2.7l4 14" stroke={`url(#${g})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 42h13l3.2 5h15.6l3.2-5h13v20a3 3 0 0 1-3 3H27a3 3 0 0 1-3-3V42z" fill={`url(#${g})`} fillOpacity="0.12" stroke={`url(#${g})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="70" cy="24" r="4" fill="#F59E0B" />
    </svg>
  )
}

export function SuccessBurstIllustration({ size = 96 }: { size?: number }) {
  const g = useGradId('success')
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="44" fill={`url(#${g})`} fillOpacity="0.1" />
      <circle cx="48" cy="48" r="30" fill={`url(#${g})`} fillOpacity="0.16" />
      <circle cx="48" cy="48" r="20" fill={`url(#${g})`} />
      <path d="M38 48.5l7 7 14-15" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="22" r="3" fill="#F59E0B" />
      <circle cx="80" cy="30" r="2.5" fill="#EC4899" />
      <circle cx="76" cy="72" r="3" fill="#6366F1" />
      <circle cx="16" cy="70" r="2.5" fill="#8B5CF6" />
    </svg>
  )
}

export function NotFoundIllustration({ size = 96 }: { size?: number }) {
  const g = useGradId('notfound')
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="44" fill={`url(#${g})`} fillOpacity="0.08" />
      <circle cx="40" cy="42" r="17" stroke={`url(#${g})`} strokeWidth="3" fill="none" />
      <line x1="52" y1="54" x2="68" y2="70" stroke={`url(#${g})`} strokeWidth="3" strokeLinecap="round" />
      <path d="M33 42a7 7 0 0 1 7-7" stroke={`url(#${g})`} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.5" />
    </svg>
  )
}

export function OnboardingIllustration({ size = 120 }: { size?: number }) {
  const g = useGradId('onboarding')
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill={`url(#${g})`} fillOpacity="0.08" />
      <rect x="30" y="34" width="60" height="52" rx="12" fill="#FFFFFF" stroke={`url(#${g})`} strokeWidth="2.5" />
      <rect x="38" y="46" width="30" height="6" rx="3" fill={`url(#${g})`} fillOpacity="0.5" />
      <rect x="38" y="58" width="44" height="5" rx="2.5" fill="#E5E7EB" />
      <rect x="38" y="68" width="34" height="5" rx="2.5" fill="#E5E7EB" />
      <circle cx="90" cy="30" r="6" fill="#F59E0B" />
      <circle cx="24" cy="80" r="5" fill="#EC4899" />
      <circle cx="96" cy="80" r="4" fill="#6366F1" />
    </svg>
  )
}
