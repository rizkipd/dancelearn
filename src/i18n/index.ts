import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { countryDetector } from './countryDetector';

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

// Korean translations
import koCommon from './locales/ko/common.json';
import koHome from './locales/ko/home.json';
import koTraining from './locales/ko/training.json';
import koFeedback from './locales/ko/feedback.json';
import koAbout from './locales/ko/about.json';
import koPrivacy from './locales/ko/privacy.json';
import koHowto from './locales/ko/howto.json';
import koFaq from './locales/ko/faq.json';

// Chinese translations
import zhCommon from './locales/zh/common.json';
import zhHome from './locales/zh/home.json';
import zhTraining from './locales/zh/training.json';
import zhFeedback from './locales/zh/feedback.json';
import zhAbout from './locales/zh/about.json';
import zhPrivacy from './locales/zh/privacy.json';
import zhHowto from './locales/zh/howto.json';
import zhFaq from './locales/zh/faq.json';

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
  ko: {
    common: koCommon,
    home: koHome,
    training: koTraining,
    feedback: koFeedback,
    about: koAbout,
    privacy: koPrivacy,
    howto: koHowto,
    faq: koFaq,
  },
  zh: {
    common: zhCommon,
    home: zhHome,
    training: zhTraining,
    feedback: zhFeedback,
    about: zhAbout,
    privacy: zhPrivacy,
    howto: zhHowto,
    faq: zhFaq,
  },
};

// Create language detector instance and add custom country detector
const languageDetector = new LanguageDetector();
languageDetector.addDetector(countryDetector);

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'ja', 'id', 'ko', 'zh'],
    defaultNS: 'common',
    ns: ['common', 'home', 'training', 'feedback', 'about', 'privacy', 'howto', 'faq'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'countryDetector'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    load: 'languageOnly',
  });

export default i18n;
