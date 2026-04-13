import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { defaultLocale, locales } from './config';

const i18nInstance = i18next
  .createInstance()
  .use(initReactI18next)
  .use(
    resourcesToBackend((language: string, namespace: string) => {
      const translations: Record<string, Record<string, unknown>> = {
        fr: { common: require('../../../assets/locales/fr/common.json') },
        en: { common: require('../../../assets/locales/en/common.json') },
        es: { common: require('../../../assets/locales/es/common.json') },
        de: { common: require('../../../assets/locales/de/common.json') },
        it: { common: require('../../../assets/locales/it/common.json') },
        pt: { common: require('../../../assets/locales/pt/common.json') },
        ar: { common: require('../../../assets/locales/ar/common.json') },
        ja: { common: require('../../../assets/locales/ja/common.json') },
        zh: { common: require('../../../assets/locales/zh/common.json') },
      };
      return Promise.resolve(translations[language]?.[namespace] ?? {});
    })
  );

export async function initI18n(savedLang?: string | null) {
  await i18nInstance.init({
    lng: savedLang ?? defaultLocale,
    fallbackLng: defaultLocale,
    supportedLngs: locales,
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });
  return i18nInstance;
}

export default i18nInstance;
