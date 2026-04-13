'use client';

import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Logo';

// Placeholder — fully built in Phase 3 (Screen 4)
export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const firstName = (user?.user_metadata?.full_name as string)?.split(' ')[0] ?? 'utilisateur';

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <Logo size="lg" className="mb-6" />
      <h1 className="text-2xl font-bold text-white text-center mb-2">
        {t('home.welcome', { name: firstName })}
      </h1>
      <p className="text-gray-500 text-sm">Dashboard — Phase 3 à venir</p>
    </main>
  );
}
