'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Logo } from '@/components/ui/Logo';
import { clsx } from 'clsx';
import { useState } from 'react';

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  starter_individual:   { label: 'Starter',    color: 'bg-gray-700 text-gray-300' },
  starter_professional: { label: 'Starter Pro', color: 'bg-gray-700 text-gray-300' },
  pro_individual:       { label: 'Pro',         color: 'bg-primary-500/20 text-primary-300 border border-primary-500/30' },
  pro_professional:     { label: 'Pro',         color: 'bg-primary-500/20 text-primary-300 border border-primary-500/30' },
  enterprise:           { label: 'Enterprise',  color: 'bg-success-DEFAULT/20 text-success-DEFAULT border border-success-DEFAULT/30' },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const [signingOut, setSigningOut] = useState(false);

  const tabs = [
    { href: '/dashboard',          label: t('dashboard.myServices'), icon: '🚀' },
    { href: '/dashboard/history',  label: t('dashboard.history'),    icon: '🕐' },
    { href: '/dashboard/partner',  label: t('partner.title'),        icon: '🤝' },
    { href: '/dashboard/account',  label: t('dashboard.account'),    icon: '👤' },
    { href: '/dashboard/help',     label: t('dashboard.help'),       icon: '💬' },
  ];

  const planInfo = profile?.plan_key ? PLAN_LABELS[profile.plan_key as string] : null;
  const firstName = profile?.first_name ?? user?.email?.split('@')[0] ?? '';

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.replace('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur border-b border-gray-900">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Logo size="sm" />

          <div className="flex items-center gap-3">
            {planInfo ? (
              <span className={clsx('text-xs font-semibold px-3 py-1 rounded-full', planInfo.color)}>
                {planInfo.label}
              </span>
            ) : (
              <Link
                href="/plans?source=header"
                className="text-xs font-semibold px-3 py-1 rounded-full border border-gray-700 text-gray-400 hover:border-primary-500 hover:text-primary-300 transition-colors"
              >
                Choisir un plan
              </Link>
            )}

            {/* User avatar */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-500/30 border border-primary-500/50 flex items-center justify-center text-sm font-bold text-primary-300">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors hidden sm:block"
              >
                {signingOut ? '…' : `Déconnexion`}
              </button>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <nav className="max-w-5xl mx-auto px-6 flex gap-1 border-t border-gray-900/50">
          {tabs.map((tab) => {
            const isActive = tab.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary-500 text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
                )}
              >
                <span className="hidden sm:inline">{tab.icon}</span>
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}
