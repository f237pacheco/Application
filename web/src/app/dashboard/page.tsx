'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useUsage } from '@/hooks/useUsage';
import { ServiceMockup } from '@/components/screens/ServiceMockup';
import { UsageBar } from '@/components/ui/UsageBar';
import { LimitWarning } from '@/components/ui/LimitWarning';
import { Button } from '@/components/ui/Button';
import { SERVICES } from '@/lib/services';
import { clsx } from 'clsx';

/* ── Floating background elements ─────────────────────────────────────────── */
function FloatingBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      {/* Calendar card — top right */}
      <div className="absolute top-6 right-[-20px] rotate-[3deg] opacity-[0.13]">
        <div className="bg-gray-800 border border-gray-600 rounded-2xl p-4 w-52 shadow-xl">
          <div className="text-[10px] text-primary-400 font-semibold uppercase tracking-wider mb-2">Mercredi 14 mai 2026</div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-1 h-8 rounded-full bg-primary-500" />
            <div>
              <div className="text-white text-xs font-bold">Client</div>
              <div className="text-gray-300 text-xs">13h00 → 14h00</div>
            </div>
          </div>
          <div className="text-[10px] text-success-DEFAULT mt-2">✓ Confirmation envoyée</div>
          <div className="mt-3 grid grid-cols-7 gap-0.5">
            {['L','M','M','J','V','S','D'].map((d) => (
              <div key={d} className="text-center text-[8px] text-gray-500">{d}</div>
            ))}
            {Array.from({ length: 31 }, (_, i) => (
              <div
                key={i}
                className={clsx(
                  'text-center text-[9px] rounded py-0.5',
                  i === 13 ? 'bg-primary-500 text-white font-bold' : 'text-gray-400'
                )}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TikTok phone mockup — top center-left */}
      <div className="absolute top-[-10px] left-[38%] rotate-[-5deg] opacity-[0.11]">
        <div className="bg-black border border-gray-600 rounded-[20px] w-[72px] h-[140px] overflow-hidden flex flex-col">
          <div className="flex-1 bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center gap-1 p-2">
            <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[9px] border-l-white border-b-[5px] border-b-transparent ml-0.5" />
            </div>
            <div className="text-white text-[7px] font-bold text-center leading-tight">@velona_app</div>
          </div>
          <div className="bg-black px-1.5 py-1">
            <div className="text-gray-300 text-[6px] leading-tight">L'IA qui crée votre site en 2min</div>
            <div className="flex gap-2 mt-0.5">
              <span className="text-[6px] text-gray-400">♥ 4.2k</span>
              <span className="text-[6px] text-gray-400">↗ 312</span>
            </div>
          </div>
        </div>
      </div>

      {/* Website preview — middle left */}
      <div className="absolute top-[35%] left-[-30px] rotate-[-2deg] opacity-[0.11]">
        <div className="bg-gray-900 border border-gray-600 rounded-xl overflow-hidden w-56 shadow-xl">
          <div className="bg-gray-700 px-3 py-2 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <div className="flex-1 bg-gray-600 rounded px-2 py-0.5 ml-2">
              <div className="text-[7px] text-gray-400">cabinet-martin.velona.io</div>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="h-12 bg-gradient-to-r from-primary-500/20 to-primary-500/5 rounded-lg flex items-center px-3">
              <div className="space-y-1">
                <div className="w-20 h-1.5 bg-white/30 rounded" />
                <div className="w-14 h-1 bg-white/20 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-700 rounded-lg" />
              ))}
            </div>
            <div className="space-y-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-1.5 bg-gray-700 rounded" style={{ width: `${[90, 75, 55][i]}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics card — bottom right */}
      <div className="absolute bottom-12 right-[-10px] rotate-[4deg] opacity-[0.12]">
        <div className="bg-gray-900 border border-gray-600 rounded-xl p-4 w-44 shadow-xl">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Trafic mensuel</div>
          <div className="text-white text-xl font-bold mb-0.5">+38%</div>
          <div className="text-success-DEFAULT text-[9px] mb-3">vs mois précédent</div>
          <div className="flex items-end gap-1 h-12">
            {[3, 5, 4, 7, 5, 8, 9, 7, 10, 9, 11, 12].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{ height: `${h * 4}px`, backgroundColor: i >= 9 ? '#6C5CE7' : '#374151' }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[7px] text-gray-600">Jan</span>
            <span className="text-[7px] text-gray-600">Déc</span>
          </div>
        </div>
      </div>

      {/* Social media post mockup — bottom left */}
      <div className="absolute bottom-0 left-[20%] rotate-[2deg] opacity-[0.10]">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 w-52">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-primary-500/50" />
            <div>
              <div className="text-[9px] text-white font-semibold">Marie D.</div>
              <div className="text-[8px] text-gray-500">@mariedupont · 2h</div>
            </div>
          </div>
          <div className="text-[9px] text-gray-300 leading-relaxed">
            L'agent vocal @Velona_app répond à tous nos appels maintenant. 3h/semaine économisées 🙌
          </div>
          <div className="flex gap-3 mt-2">
            <span className="text-[8px] text-gray-500">47 RT</span>
            <span className="text-[8px] text-gray-500">286 ♥</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: usage, loading: usageLoading, isNearLimit } = useUsage();

  const firstName = profile?.first_name
    ?? (user?.user_metadata?.full_name as string)?.split(' ')[0]
    ?? 'vous';

  const hasPlan = !!profile?.plan_key;
  const isEnterprise = profile?.plan_key === 'enterprise';
  const isStarter = profile?.plan_key?.startsWith('starter');

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">
          {t('home.welcome', { name: firstName })}
        </h1>
        <p className="text-gray-400">{t('home.services')}</p>
      </div>

      <LimitWarning nearLimit={isNearLimit()} isEnterprise={isEnterprise} />

      {/* Usage summary */}
      {hasPlan && !isEnterprise && usage && !usageLoading && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-white">{t('dashboard.usageThisMonth')}</h2>
            <span className="text-xs text-gray-500">Réinitialisé le 1er du mois</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SERVICES.map((s) => (
              <UsageBar
                key={s.id}
                icon={s.icon}
                label={t(`${s.i18nKey}.name`)}
                used={usage.usage[s.id] ?? 0}
                limit={usage.limit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Service cards — with floating background */}
      <div className="relative">
        <FloatingBackground />

        <div className="relative z-10">
          <h2 className="text-lg font-semibold text-white mb-4">{t('dashboard.activeServices')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map((service) => (
              <Link
                key={service.id}
                href={`/services/${service.id}`}
                className={clsx(
                  'group relative overflow-hidden rounded-2xl border',
                  'border-gray-700 bg-gray-900/80 backdrop-blur-sm',
                  'hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/10',
                  'transition-all duration-300 active:scale-[0.98]'
                )}
              >
                {/* Accent top bar */}
                <div
                  className="h-0.5 w-full opacity-60"
                  style={{ backgroundColor: service.accentColor }}
                />

                <div className="p-5 pb-3 flex items-center gap-3">
                  <span className="text-3xl">{service.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white leading-snug">
                      {t(`${service.i18nKey}.name`)}
                    </h3>
                    {usage && usage.limit !== null && (
                      <p className="text-xs mt-0.5" style={{ color: service.accentColor }}>
                        {usage.usage[service.id] ?? 0}/{usage.limit} utilisations
                      </p>
                    )}
                  </div>
                </div>

                <div className="mx-4 mb-4 h-28 overflow-hidden rounded-lg border border-gray-700/50">
                  <ServiceMockup serviceId={service.id} accentColor={service.accentColor} />
                </div>

                <div
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
                  style={{ color: service.accentColor }}
                >
                  →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Upgrade CTA */}
      {(isStarter || !hasPlan) && (
        <div className="p-5 rounded-2xl border border-dashed border-gray-700 bg-gray-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">{t('dashboard.addService')}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t('dashboard.upgradePlan')}</p>
          </div>
          <Link href="/plans?source=dashboard">
            <Button variant="primary" size="sm">Passer au Pro →</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
