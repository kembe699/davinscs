import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      navbar: {
        home: 'Home',
        products: 'Products',
        about: 'About',
        contact: 'Contact',
        pos: 'POS',
        admin: 'Admin'
      }
    }
  },
  ar: {
    translation: {
      navbar: {
        home: 'الرئيسية',
        products: 'المنتجات',
        about: 'من نحن',
        contact: 'اتصل بنا',
        pos: 'نقطة البيع',
        admin: 'الإدارة'
      }
    }
  },
  fr: {
    translation: {
      navbar: {
        home: 'Accueil',
        products: 'Produits',
        about: 'À propos',
        contact: 'Contact',
        pos: 'Caisse',
        admin: 'Administration'
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
