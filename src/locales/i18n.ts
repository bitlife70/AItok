import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslations from './en.json';
import koTranslations from './ko.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      ko: {
        translation: koTranslations,
      },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;