'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Logo } from '@/components/ui/Logo';
import { clsx } from 'clsx';
import { useState, useEffect, useRef } from 'react';

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  starter_individual:   { label: 'Starter',    color: 'bg-gray-700 text-gray-300' },
  starter_professional: { label: 'Starter Pro', color: 'bg-gray-700 text-gray-300' },
  pro_individual:       { label: 'Pro',         color: 'bg-primary-500/20 text-primary-300 border border-primary-500/30' },
  pro_professional:     { label: 'Pro',         color: 'bg-primary-500/20 text-primary-300 border border-primary-500/30' },
  enterprise:           { label: 'Enterprise',  color: 'bg-success-DEFAULT/20 text-success-DEFAULT border border-success-DEFAULT/30' },
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0j 0h 0m 0s';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}j ${hours}h ${minutes}m ${seconds}s`;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const [signingOut, setSigningOut] = useState(false);
  const [countdown, setCountdown] = useState('');
  const expiryRef = useRef<number | null>(null);

  useEffect(() => {
    expiryRef.current = Date.now() + 3 * 24 * 60 * 60 * 1000;
    const tick = () => {
      if (expiryRef.current !== null) {
        setCountdown(formatCountdown(expiryRef.current - Date.now()));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const tabs = [
    { href: '/dashboard',          label: t('dashboard.myServices') },
    { href: '/dashboard/history',  label: t('dashboard.history') },
    { href: '/dashboard/partner',  label: t('partner.title') },
    { href: '/dashboard/account',  label: t('dashboard.account') },
    { href: '/dashboard/help',     label: t('dashboard.help') },
  ];

  const planInfo = profile?.plan_key ? PLAN_LABELS[profile.plan_key as string] : null;
  const firstName = profile?.first_name ?? user?.email?.split('@')[0] ?? '';

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.replace('/auth');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="sticky top-0 z-40 backdrop-blur-xl border-b"
        style={{ background: 'rgba(3,7,18,0.85)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
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
                className="pulse-glow text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 transition-opacity"
              >
                Choisir un plan
              </Link>
            )}

            {countdown && (
              <div className="flex items-center gap-1.5 text-xs font-mono text-red-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{countdown}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-violet-500/20">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors hidden sm:block"
              >
                {signingOut ? '…' : 'Déconnexion'}
              </button>
            </div>
          </div>
        </div>

        <nav className="max-w-5xl mx-auto px-6 flex gap-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {tabs.map((tab) => {
            const isActive = tab.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-primary-500 text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}
