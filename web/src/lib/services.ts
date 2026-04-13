export type ServiceId =
  | 'website'
  | 'voice_agent'
  | 'video_editing'
  | 'appointments'
  | 'social_media'
  | 'analytics';

export interface ServiceConfig {
  id: ServiceId;
  icon: string;
  color: string;
  bgGradient: string;
  accentColor: string;
  i18nKey: string;
}

export const SERVICES: ServiceConfig[] = [
  {
    id: 'website',
    icon: '🌐',
    color: '#6C5CE7',
    bgGradient: 'from-violet-900/40 to-violet-950/60',
    accentColor: '#a78bfa',
    i18nKey: 'services.website',
  },
  {
    id: 'voice_agent',
    icon: '📞',
    color: '#00B894',
    bgGradient: 'from-emerald-900/40 to-emerald-950/60',
    accentColor: '#34d399',
    i18nKey: 'services.voiceAgent',
  },
  {
    id: 'video_editing',
    icon: '🎬',
    color: '#e17055',
    bgGradient: 'from-orange-900/40 to-orange-950/60',
    accentColor: '#fb923c',
    i18nKey: 'services.videoEditing',
  },
  {
    id: 'appointments',
    icon: '📅',
    color: '#0984e3',
    bgGradient: 'from-blue-900/40 to-blue-950/60',
    accentColor: '#60a5fa',
    i18nKey: 'services.appointments',
  },
  {
    id: 'social_media',
    icon: '📱',
    color: '#fd79a8',
    bgGradient: 'from-pink-900/40 to-pink-950/60',
    accentColor: '#f472b6',
    i18nKey: 'services.socialMedia',
  },
  {
    id: 'analytics',
    icon: '📊',
    color: '#fdcb6e',
    bgGradient: 'from-yellow-900/40 to-yellow-950/60',
    accentColor: '#fbbf24',
    i18nKey: 'services.analytics',
  },
];

export function getService(id: ServiceId): ServiceConfig | undefined {
  return SERVICES.find((s) => s.id === id);
}
