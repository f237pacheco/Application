'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { IntroScreen } from '@/components/ui/IntroScreen';
import { AuroraScreen } from '@/components/ui/AuroraScreen';

type Phase = 'intro' | 'aurora' | 'routing';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  // Default to 'routing' until sessionStorage is checked on mount
  const [phase, setPhase] = useState<Phase>('routing');

  useEffect(() => {
    const seen = sessionStorage.getItem('velona_intro_seen');
    setPhase(seen ? 'routing' : 'intro');
  }, []);

  const handleIntroDone = () => {
    sessionStorage.setItem('velona_intro_seen', '1');
    setPhase('aurora');
  };

  // Navigate once the aurora screen is dismissed or skipped
  useEffect(() => {
    if (phase !== 'routing' || loading) return;
    if (user) {
      router.replace('/dashboard');
    } else {
      const lang = localStorage.getItem('velona_language');
      if (!lang) {
        router.replace('/language');
      } else {
        const onboarded = localStorage.getItem('velona_onboarded');
        router.replace(onboarded ? '/auth' : '/onboarding');
      }
    }
  }, [phase, user, loading, router]);

  if (phase === 'intro') return <IntroScreen onDone={handleIntroDone} />;
  if (phase === 'aurora') return <AuroraScreen />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
