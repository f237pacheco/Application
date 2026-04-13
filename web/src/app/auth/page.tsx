'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/hooks/useAuth';

export default function AuthPage() {
  const { t } = useTranslation();
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch {
      setError(t('auth.errors.googleFailed'));
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-8">
        <BackButton href="/onboarding" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <Logo size="lg" className="mb-10" />

        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="bg-gray-900 rounded-3xl border border-gray-800 p-8 flex flex-col gap-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2">
                {t('auth.title')}
              </h1>
              <p className="text-gray-400 text-sm">
                {t('auth.subtitle')}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Google button */}
            <Button
              onClick={handleGoogleSignIn}
              loading={loading}
              fullWidth
              size="lg"
              className="bg-white hover:bg-gray-100 text-gray-900 gap-3"
            >
              {!loading && (
                <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
                  <path fill="#4285F4" d="M46.145 24.5c0-1.634-.146-3.206-.418-4.714H24v8.921h12.418c-.536 2.891-2.163 5.34-4.609 6.98v5.806h7.463c4.363-4.019 6.873-9.935 6.873-16.993z" />
                  <path fill="#34A853" d="M24 47c6.237 0 11.463-2.067 15.272-5.607l-7.463-5.806c-2.067 1.381-4.713 2.2-7.809 2.2-6.003 0-11.086-4.055-12.899-9.5H3.455v5.991C7.246 41.837 15.007 47 24 47z" />
                  <path fill="#FBBC05" d="M11.101 28.287A14.355 14.355 0 0 1 10.364 24c0-1.495.255-2.945.737-4.287v-5.991H3.455A23.993 23.993 0 0 0 0 24c0 3.877.927 7.546 2.564 10.787l8.537-6.5z" />
                  <path fill="#EA4335" d="M24 9.5c3.382 0 6.418 1.163 8.809 3.446l6.6-6.6C35.454 2.582 30.227 0 24 0 15.007 0 7.246 5.163 3.455 13.213l8.646 6.5C13.914 13.555 18.997 9.5 24 9.5z" />
                </svg>
              )}
              {t('auth.googleBtn')}
            </Button>

            {/* Terms */}
            <p className="text-xs text-gray-600 text-center leading-relaxed">
              {t('auth.terms')}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
