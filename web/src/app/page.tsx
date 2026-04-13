'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        const lang = localStorage.getItem('velona_language');
        if (!lang) {
          router.replace('/language');
        } else {
          const onboarded = localStorage.getItem('velona_onboarded');
          if (!onboarded) {
            router.replace('/onboarding');
          } else {
            router.replace('/auth');
          }
        }
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
