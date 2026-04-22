'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { IntroScreen } from '@/components/ui/IntroScreen';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  // Start as true (skip intro) until we've confirmed it's the first visit
  const [introPlayed, setIntroPlayed] = useState(true);

  useEffect(() => {
    const seen = sessionStorage.getItem('velona_intro_seen');
    if (!seen) setIntroPlayed(false); // first visit this session → show intro
  }, []);

  const handleIntroDone = () => {
    sessionStorage.setItem('velona_intro_seen', '1');
    setIntroPlayed(true);
  };

  // Navigate only after intro is done and auth is resolved
  useEffect(() => {
    if (!introPlayed || loading) return;
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
  }, [introPlayed, user, loading, router]);

  if (!introPlayed) {
    return <IntroScreen onDone={handleIntroDone} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
