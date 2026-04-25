import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      navbar: { home: 'Home', products: 'Products', about: 'About', contact: 'Contact', pos: 'POS', admin: 'Admin' },
      admin: {
        panel: 'Admin Panel',
        groups: { sales: 'Sales', inventory: 'Inventory', finance: 'Finance', reports: 'Reports', settings: 'Settings' },
        nav: {
          dashboard: 'Dashboard', pos: 'POS', customers: 'Customers', quotations: 'Quotations', invoices: 'Invoices',
          orders: 'Orders', products: 'Products', categories: 'Categories', stock: 'Stock', procurement: 'Procurement',
          accounting: 'Accounting', cashflow: 'Cashflow', currencies: 'Currencies', payment_types: 'Payment Types',
          tax_rates: 'Tax Rates', price_lists: 'Price Lists', promotions: 'Promotions', reports: 'Reports',
          audit_trail: 'Audit Trail', my_company: 'My Company', users: 'Users'
        },
        quotes: {
          title: 'Quotations', new_quote: 'New Quote', quote_number: 'Quote #', customer: 'Customer',
          date: 'Date', valid_until: 'Valid Until', status: 'Status', total: 'Total'
        }
      }
    }
  },
  ar: {
    translation: {
      navbar: { home: 'الرئيسية', products: 'المنتجات', about: 'من نحن', contact: 'اتصل بنا', pos: 'نقطة البيع', admin: 'الإدارة' },
      admin: {
        panel: 'لوحة الإدارة',
        groups: { sales: 'المبيعات', inventory: 'المخزون', finance: 'المالية', reports: 'التقارير', settings: 'الإعدادات' },
        nav: {
          dashboard: 'لوحة القيادة', pos: 'نقطة البيع', customers: 'العملاء', quotations: 'عروض الأسعار', invoices: 'الفواتير',
          orders: 'الطلبات', products: 'المنتجات', categories: 'الفئات', stock: 'المخزون', procurement: 'المشتريات',
          accounting: 'المحاسبة', cashflow: 'التدفق النقدي', currencies: 'العملات', payment_types: 'أنواع الدفع',
          tax_rates: 'معدلات الضريبة', price_lists: 'قوائم الأسعار', promotions: 'العروض', reports: 'التقارير',
          audit_trail: 'سجل النشاطات', my_company: 'شركتي', users: 'المستخدمين'
        },
        quotes: {
          title: 'عروض الأسعار', new_quote: 'عرض سعر جديد', quote_number: 'رقم العرض', customer: 'العميل',
          date: 'التاريخ', valid_until: 'صالح حتى', status: 'الحالة', total: 'الإجمالي'
        }
      }
    }
  },
  fr: {
    translation: {
      navbar: { home: 'Accueil', products: 'Produits', about: 'À propos', contact: 'Contact', pos: 'Caisse', admin: 'Administration' },
      admin: {
        panel: 'Panneau d\'Administration',
        groups: { sales: 'Ventes', inventory: 'Inventaire', finance: 'Finance', reports: 'Rapports', settings: 'Paramètres' },
        nav: {
          dashboard: 'Tableau de bord', pos: 'Caisse', customers: 'Clients', quotations: 'Devis', invoices: 'Factures',
          orders: 'Commandes', products: 'Produits', categories: 'Catégories', stock: 'Stock', procurement: 'Achats',
          accounting: 'Comptabilité', cashflow: 'Trésorerie', currencies: 'Devises', payment_types: 'Moyens de Paiement',
          tax_rates: 'Taux de Taxes', price_lists: 'Listes de Prix', promotions: 'Promotions', reports: 'Rapports',
          audit_trail: 'Piste d\'Audit', my_company: 'Mon Entreprise', users: 'Utilisateurs'
        },
        quotes: {
          title: 'Devis', new_quote: 'Nouveau Devis', quote_number: 'N° Devis', customer: 'Client',
          date: 'Date', valid_until: 'Valide Jusqu\'au', status: 'Statut', total: 'Total'
        }
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
