'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { ServiceMockup } from '@/components/screens/ServiceMockup';
import { SERVICES } from '@/lib/services';
import { clsx } from 'clsx';

interface Profile {
  first_name: string;
  account_type: string;
  plan_key?: string;
}

const PLAN_LABELS: Record<string, string> = {
  starter_individual: 'Starter',
  starter_professional: 'Starter Pro',
  pro_individual: 'Pro',
  pro_professional: 'Pro',
  enterprise: 'Enterprise',
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user, session, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => setProfile(data))
      .catch(() => null);
  }, [session]);

  const firstName =
    profile?.first_name ??
    (user?.user_metadata?.full_name as string)?.split(' ')[0] ??
    'vous';

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-900 px-6 py-4 flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          {profile?.plan_key && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
              {PLAN_LABELS[profile.plan_key] ?? profile.plan_key}
            </span>
          )}
          {!profile?.plan_key && (
            <Link href="/plans?source=upgrade">
              <Button variant="outline" size="sm" label={t('dashboard.upgradePlan')} />
            </Link>
          )}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {signingOut ? '…' : user?.email?.split('@')[0]}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-10 pb-6 max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-white mb-1">
          {t('home.welcome', { name: firstName })}
        </h1>
        <p className="text-gray-400 text-base">{t('home.services')}</p>
      </section>

      {/* Services grid */}
      <section className="flex-1 px-6 pb-16 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((service) => (
            <Link
              key={service.id}
              href={`/services/${service.id}`}
              className={clsx(
                'group relative overflow-hidden rounded-2xl border border-gray-800',
                'bg-gradient-to-br',
                service.bgGradient,
                'hover:border-gray-600 hover:shadow-xl hover:shadow-black/30',
                'transition-all duration-300 cursor-pointer active:scale-[0.98]'
              )}
            >
              {/* Header */}
              <div className="p-5 pb-3 flex items-center gap-3">
                <span className="text-3xl">{service.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-white leading-snug">
                    {t(`${service.i18nKey}.name`)}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                    {t(`${service.i18nKey}.description`)}
                  </p>
                </div>
              </div>

              {/* Mockup preview */}
              <div className="mx-4 mb-4 h-32 overflow-hidden rounded-lg">
                <ServiceMockup
                  serviceId={service.id}
                  accentColor={service.accentColor}
                />
              </div>

              {/* Arrow */}
              <div
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-sm"
                style={{ color: service.accentColor }}
              >
                →
              </div>
            </Link>
          ))}
        </div>

        {/* Add service CTA */}
        {profile?.plan_key?.startsWith('starter') && (
          <div className="mt-8 p-5 rounded-2xl border border-dashed border-gray-700 bg-gray-900/50 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{t('dashboard.addService')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('dashboard.upgradePlan')}</p>
            </div>
            <Link href="/plans?source=upgrade">
              <Button variant="primary" size="sm" label="Passer au Pro" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
