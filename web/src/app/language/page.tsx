'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/ui/Logo';
import { locales, localeNames, localeFlags, isRtl, type Locale } from '@/lib/i18n/config';
import i18n from '@/lib/i18n/client';
import { clsx } from 'clsx';

export default function LanguagePage() {
  const router = useRouter();
  const { t } = useTranslation();

  const handleSelectLanguage = async (locale: Locale) => {
    // Change i18n language
    await i18n.changeLanguage(locale);
    // Persist choice
    localStorage.setItem('velona_language', locale);
    // Apply RTL if needed
    document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    // Navigate to onboarding
    router.push('/onboarding');
  };

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="mb-12 flex flex-col items-center gap-3">
        <Logo size="xl" />
        <p className="text-gray-400 text-center text-base max-w-xs">
          {t('language.subtitle')}
        </p>
      </div>

      {/* Language grid */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
        {locales.map((locale) => (
          <button
            key={locale}
            onClick={() => handleSelectLanguage(locale)}
            className={clsx(
              'flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-800',
              'bg-gray-900 hover:bg-gray-800 hover:border-primary-500',
              'transition-all duration-200 active:scale-95 group'
            )}
          >
            <span className="text-3xl leading-none select-none" role="img" aria-label={localeNames[locale]}>
              {localeFlags[locale]}
            </span>
            <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors">
              {localeNames[locale]}
            </span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-12 text-xs text-gray-600 text-center">
        Velona © {new Date().getFullYear()}
      </p>
    </main>
  );
}
