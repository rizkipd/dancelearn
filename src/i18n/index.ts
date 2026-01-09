import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English translations
import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';
import enTraining from './locales/en/training.json';
import enFeedback from './locales/en/feedback.json';
import enAbout from './locales/en/about.json';
import enPrivacy from './locales/en/privacy.json';
import enHowto from './locales/en/howto.json';
import enFaq from './locales/en/faq.json';

// Japanese translations
import jaCommon from './locales/ja/common.json';
import jaHome from './locales/ja/home.json';
import jaTraining from './locales/ja/training.json';
import jaFeedback from './locales/ja/feedback.json';
import jaAbout from './locales/ja/about.json';
import jaPrivacy from './locales/ja/privacy.json';
import jaHowto from './locales/ja/howto.json';
import jaFaq from './locales/ja/faq.json';

// Indonesian translations
import idCommon from './locales/id/common.json';
import idHome from './locales/id/home.json';
import idTraining from './locales/id/training.json';
import idFeedback from './locales/id/feedback.json';
import idAbout from './locales/id/about.json';
import idPrivacy from './locales/id/privacy.json';
import idHowto from './locales/id/howto.json';
import idFaq from './locales/id/faq.json';

const resources = {
  en: {
    common: enCommon,
    home: enHome,
    training: enTraining,
    feedback: enFeedback,
    about: enAbout,
    privacy: enPrivacy,
    howto: enHowto,
    faq: enFaq,
  },
  ja: {
    common: jaCommon,
    home: jaHome,
    training: jaTraining,
    feedback: jaFeedback,
    about: jaAbout,
    privacy: jaPrivacy,
    howto: jaHowto,
    faq: jaFaq,
  },
  id: {
    common: idCommon,
    home: idHome,
    training: idTraining,
    feedback: idFeedback,
    about: idAbout,
    privacy: idPrivacy,
    howto: idHowto,
    faq: idFaq,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'ja', 'id'],
    defaultNS: 'common',
    ns: ['common', 'home', 'training', 'feedback', 'about', 'privacy', 'howto', 'faq'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    load: 'languageOnly',
  });

export default i18n;
