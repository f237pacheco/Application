'use client';

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { defaultLocale, locales } from './config';

const i18nInstance = i18next
  .createInstance()
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`../../../public/locales/${language}/${namespace}.json`)
    )
  );

i18nInstance.init({
  lng: typeof window !== 'undefined'
    ? localStorage.getItem('velona_language') ?? undefined
    : undefined,
  fallbackLng: defaultLocale,
  supportedLngs: locales,
  defaultNS: 'common',
  detection: {
    order: ['localStorage', 'navigator'],
    lookupLocalStorage: 'velona_language',
    caches: ['localStorage'],
  },
  interpolation: { escapeValue: false },
});

export default i18nInstance;
