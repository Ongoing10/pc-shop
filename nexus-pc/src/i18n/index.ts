import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi.json';
import en from './locales/en.json';
// khu admin: khóa admin.*, tách file riêng cho dễ quản lý
import adminVi from './locales/admin/vi.json';
import adminEn from './locales/admin/en.json';

const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('nexus_lang') || 'vi' : 'vi';

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: { ...vi, admin: adminVi } },
    en: { translation: { ...en, admin: adminEn } },
  },
  lng: savedLanguage,
  fallbackLng: 'vi',
  interpolation: {
    escapeValue: false, // React already escapes XSS
  },
});

export default i18n;
