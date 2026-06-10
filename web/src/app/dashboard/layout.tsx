'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Logo } from '@/components/ui/Logo';
import { useState, useEffect, useRef } from 'react';

const PLAN_LABELS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  starter_individual:   { label: 'Starter',    bg: '#18181B', color: '#A1A1AA', border: '#3F3F46' },
  starter_professional: { label: 'Starter Pro', bg: '#18181B', color: '#A1A1AA', border: '#3F3F46' },
  pro_individual:       { label: 'Pro',         bg: '#1E1B4B', color: '#818CF8', border: '#3730A3' },
  pro_professional:     { label: 'Pro',         bg: '#1E1B4B', color: '#818CF8', border: '#3730A3' },
  enterprise:           { label: 'Enterprise',  bg: '#052E16', color: '#10B981', border: '#065F46' },
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
    <div className="min-h-screen flex flex-col" style={{ background: '#09090B' }}>
      <header
        className="sticky top-0 z-40 backdrop-blur border-b"
        style={{ background: 'rgba(9,9,11,0.92)', borderColor: '#18181B' }}
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-3 flex items-center justify-between gap-4">
          <Logo size="sm" />

          <div className="flex items-center gap-3">
            {planInfo ? (
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: planInfo.bg, color: planInfo.color, border: `1px solid ${planInfo.border}` }}
              >
                {planInfo.label}
              </span>
            ) : (
              <Link
                href="/plans?source=header"
                className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: '#F59E0B', color: '#000' }}
              >
                Choisir un plan
              </Link>
            )}

            {countdown && (
              <div
                className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full"
                style={{ background: '#18181B', border: '1px solid #27272A', color: '#71717A' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{countdown}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: '#4F46E5' }}
              >
                {firstName.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="text-xs hidden sm:block transition-colors"
                style={{ color: '#71717A' }}
              >
                {signingOut ? '…' : 'Déconnexion'}
              </button>
            </div>
          </div>
        </div>

        <nav
          className="max-w-[1400px] mx-auto px-6 lg:px-12 flex gap-0 border-t"
          style={{ borderColor: '#18181B' }}
        >
          {tabs.map((tab) => {
            const isActive = tab.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="px-4 py-3 text-sm font-medium border-b-2 transition-all duration-150 whitespace-nowrap"
                style={{
                  borderColor: isActive ? '#6366F1' : 'transparent',
                  color: isActive ? '#FAFAFA' : '#71717A',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 lg:px-12 py-8">
        {children}
      </main>
    </div>
  );
}
