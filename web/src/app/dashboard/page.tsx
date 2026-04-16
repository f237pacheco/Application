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

      {/* Limit warning */}
      <LimitWarning
        nearLimit={isNearLimit()}
        isEnterprise={isEnterprise}
      />

      {/* Usage summary — shown only when subscribed */}
      {hasPlan && !isEnterprise && usage && !usageLoading && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-white">
              {t('dashboard.usageThisMonth')}
            </h2>
            <span className="text-xs text-gray-500">
              Réinitialisé le 1er du mois
            </span>
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

      {/* Service cards grid */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">{t('dashboard.activeServices')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((service) => (
            <Link
              key={service.id}
              href={`/services/${service.id}`}
              className={clsx(
                'group relative overflow-hidden rounded-2xl border border-gray-800',
                `bg-gradient-to-br ${service.bgGradient}`,
                'hover:border-gray-600 hover:shadow-xl hover:shadow-black/30',
                'transition-all duration-300 active:scale-[0.98]'
              )}
            >
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

              <div className="mx-4 mb-4 h-28 overflow-hidden rounded-lg">
                <ServiceMockup serviceId={service.id} accentColor={service.accentColor} />
              </div>

              <div
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                style={{ color: service.accentColor }}
              >
                →
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Upgrade CTA for starter or no plan */}
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
