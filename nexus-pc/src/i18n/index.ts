import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi.json';
import en from './locales/en.json';

const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('nexus_lang') || 'vi' : 'vi';

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: savedLanguage,
  fallbackLng: 'vi',
  interpolation: {
    escapeValue: false, // React already escapes XSS
  },
});

export default i18n;
