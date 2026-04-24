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
  // null = not yet checked (avoid SSR flash)
  const [phase, setPhase] = useState<Phase | null>(null);

  useEffect(() => {
    const seen = sessionStorage.getItem('velona_intro_seen');
    setPhase(seen ? 'routing' : 'intro');
  }, []);

  const handleIntroDone = () => {
    sessionStorage.setItem('velona_intro_seen', '1');
    setPhase('aurora');
  };

  const handleAuroraDone = () => setPhase('routing');

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

  // Render nothing until sessionStorage has been read (prevents SSR flash)
  if (phase === null) return null;
  if (phase === 'intro') return <IntroScreen onDone={handleIntroDone} />;
  if (phase === 'aurora') return <AuroraScreen onDone={handleAuroraDone} />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
