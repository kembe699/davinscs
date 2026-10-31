import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      navbar: { home: 'Home', products: 'Products', about: 'About', contact: 'Contact', pos: 'POS', admin: 'Admin' },
      storefront: {
        hero: {
          brands: 'Brands',
          products: 'Products',
          browse: 'Browse Products'
        },
        shop: {
          searchPlaceholder: 'Search by name, brand, or category...',
          searchBtn: 'Search Products',
          allProducts: 'All Products',
          filters: 'Filters',
          order: 'Order'
        },
        about: {
          title: 'About',
          ourStore: 'Our Store',
          bestQuality: 'Always get the best quality',
          support: '24/7 Expert Support'
        },
        footer: {
          thanks: 'Thank you for shopping at',
          whatsapp: 'WhatsApp Us',
          rights: 'All rights reserved'
        },
        product: {
          inStock: 'IN STOCK',
          outOfStock: 'OUT OF STOCK',
          featuredGear: 'FEATURED GEAR',
          addToCart: 'Add to Cart'
        }
      },
      admin: {
        panel: 'Admin Panel',
        groups: { sales: 'Sales', inventory: 'Inventory', finance: 'Finance', reports: 'Reports', settings: 'Settings' },
        nav: {
          dashboard: 'Dashboard', pos: 'POS', customers: 'Customers', quotations: 'Quotations', invoices: 'Invoices',
          receipts: 'Receipts', tables: 'Tables', qr_menu: 'QR Menu', storage: 'Storage', rooms: 'Rooms',
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
      storefront: {
        hero: {
          brands: 'العلامات التجارية',
          products: 'المنتجات',
          browse: 'تصفح المنتجات'
        },
        shop: {
          searchPlaceholder: 'ابحث بالاسم، العلامة التجارية، أو الفئة...',
          searchBtn: 'بحث',
          allProducts: 'جميع المنتجات',
          filters: 'تصفية',
          order: 'اطلب'
        },
        about: {
          title: 'من نحن',
          ourStore: 'متجرنا',
          bestQuality: 'احصل دائما على أفضل جودة',
          support: 'دعم فني على مدار الساعة'
        },
        footer: {
          thanks: 'شكراً لتسوقكم في',
          whatsapp: 'راسلنا على واتساب',
          rights: 'جميع الحقوق محفوظة'
        },
        product: {
          inStock: 'متوفر في المخزون',
          outOfStock: 'نفد من المخزون',
          featuredGear: 'معدات مميزة',
          addToCart: 'أضف إلى السلة'
        }
      },
      admin: {
        panel: 'لوحة الإدارة',
        groups: { sales: 'المبيعات', inventory: 'المخزون', finance: 'المالية', reports: 'التقارير', settings: 'الإعدادات' },
        nav: {
          dashboard: 'لوحة القيادة', pos: 'نقطة البيع', customers: 'العملاء', quotations: 'عروض الأسعار', invoices: 'الفواتير',
          receipts: 'الإيصالات', tables: 'الطاولات', qr_menu: 'قائمة QR', storage: 'المخازن', rooms: 'الغرف',
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
      storefront: {
        hero: {
          brands: 'Marques',
          products: 'Produits',
          browse: 'Parcourir les Produits'
        },
        shop: {
          searchPlaceholder: 'Recherche par nom, marque ou catégorie...',
          searchBtn: 'Rechercher',
          allProducts: 'Tous les Produits',
          filters: 'Filtres',
          order: 'Commander'
        },
        about: {
          title: 'À propos',
          ourStore: 'Notre Boutique',
          bestQuality: 'Obtenez toujours la meilleure qualité',
          support: 'Support Expert 24/7'
        },
        footer: {
          thanks: 'Merci pour vos achats chez',
          whatsapp: 'Contactez-nous sur WhatsApp',
          rights: 'Tous droits réservés'
        },
        product: {
          inStock: 'EN STOCK',
          outOfStock: 'RUPTURE DE STOCK',
          featuredGear: 'ÉQUIPEMENT VEDETTE',
          addToCart: 'Ajouter au Panier'
        }
      },
      admin: {
        panel: 'Panneau d\'Administration',
        groups: { sales: 'Ventes', inventory: 'Inventaire', finance: 'Finance', reports: 'Rapports', settings: 'Paramètres' },
        nav: {
          dashboard: 'Tableau de bord', pos: 'Caisse', customers: 'Clients', quotations: 'Devis', invoices: 'Factures',
          receipts: 'Reçus', tables: 'Tables', qr_menu: 'Menu QR', storage: 'Stockage', rooms: 'Chambres',
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
