'use client';

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n/client';
import { isRtl, type Locale } from '@/lib/i18n/config';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    i18n.on('initialized', () => setReady(true));
    if (i18n.isInitialized) setReady(true);

    // Apply RTL direction when language changes
    const handleLangChange = (lng: string) => {
      document.documentElement.lang = lng;
      document.documentElement.dir = isRtl(lng as Locale) ? 'rtl' : 'ltr';
    };
    i18n.on('languageChanged', handleLangChange);
    if (i18n.language) handleLangChange(i18n.language);

    return () => {
      i18n.off('languageChanged', handleLangChange);
    };
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
