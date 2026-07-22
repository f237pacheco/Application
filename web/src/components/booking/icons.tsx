// Shared line-icon set for the booking system — stroke-based (Feather/Lucide
// style), zero emoji anywhere. Every icon takes the same size/className props
// so they drop in interchangeably.

export type IconProps = { size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties }

const base = (size: number, strokeWidth: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function CalendarIcon({ size = 18, className, strokeWidth = 1.75, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className} style={style}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  )
}

export function ClockIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 16 14" />
    </svg>
  )
}

export function MapPinIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}

export function PhoneIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

export function MailIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2 6 12 13 22 6" />
    </svg>
  )
}

export function CreditCardIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  )
}

export function FileTextIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  )
}

export function SparklesIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z" />
      <path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
    </svg>
  )
}

export function ChevronLeftIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export function XIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function InfoIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="16" x2="12" y2="11" />
      <circle cx="12" cy="7.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function TrendingUpIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

export function UsersIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function ImageIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

export function UploadIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

export function DownloadIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export function TrashIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

export function LinkIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

export function MessageSquareIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export function EyeIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function ExternalLinkIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export function AlertCircleIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="12.5" />
      <circle cx="12" cy="16" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SearchIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export function ListIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

export function GridIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

export function StoreIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" />
      <path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
      <path d="M9 20v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6" />
    </svg>
  )
}

export function StarIcon({ size = 18, className, strokeWidth = 1.75, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size, strokeWidth)} className={className} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

export function ShieldCheckIcon({ size = 18, className, strokeWidth = 1.75, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className} style={style}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

export function ZapIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

export function CheckIcon({ size = 18, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function CheckCircleIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="8 12.5 10.5 15 16 9" />
    </svg>
  )
}

export function ArrowRightIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

export function ArrowLeftIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

export function RefreshIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

export function PlusIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function InboxIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}

export function SlidersIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  )
}
