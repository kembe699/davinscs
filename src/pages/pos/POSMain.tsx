import { useState, useEffect, useCallback, useRef } from "react";
import { Search, ShoppingCart, CreditCard, Trash2, Plus, Minus, DollarSign, User, Menu, X, Barcode, Lock, Bell, AlertTriangle, PackageX, Clock, Sun, Moon, Home, LayoutGrid, List, UtensilsCrossed } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { api, ApiProduct, ApiCategory, PaymentType, TaxRate, CashDrawerSession, ApiCurrency, PriceList, PriceListItem, Promotion, RestaurantTable } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useTenantPath } from "@/contexts/TenantContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrencySync } from "@/utils/currency";
import { printDocument, printThermal } from "@/utils/printUtils";
import { buildThermalReceipt, generateReceiptQrDataUrl } from "@/utils/receiptUtils";
import { useTheme } from "@/contexts/ThemeContext";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import IdleWarningModal from "@/components/IdleWarningModal";

export default function POSMain() {
  const navigate = useNavigate();
  const tp = useTenantPath();
  const { baseCurrency } = useCurrency();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ApiProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Array<{ product: ApiProduct; quantity: number; discount: number; unit_price: number }>>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [defaultTax, setDefaultTax] = useState<TaxRate | null>(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState<number | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cartDiscount, setCartDiscount] = useState(0);
  const [cashDrawerSession, setCashDrawerSession] = useState<CashDrawerSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "amount">("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [heldSales, setHeldSales] = useState<Array<any>>([]);
  const [showHeldSales, setShowHeldSales] = useState(false);
  const [confirmingHeldSaleId, setConfirmingHeldSaleId] = useState<number | null>(null);
  const [confirmPaymentTypeId, setConfirmPaymentTypeId] = useState<number | null>(null);
  const [processingHold, setProcessingHold] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [holdingCart, setHoldingCart] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'credit'>('cash');
  const [creditCustomerName, setCreditCustomerName] = useState('');
  const [creditCustomerEmail, setCreditCustomerEmail] = useState('');
  const [creditCustomerPhone, setCreditCustomerPhone] = useState('');
  const [creditDueDate, setCreditDueDate] = useState('');
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [secondaryCurrency, setSecondaryCurrency] = useState<ApiCurrency | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [schemes, setSchemes] = useState<PriceList[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<number | null>(null);
  const [schemeItemMap, setSchemeItemMap] = useState<Map<number, number>>(new Map());
  const selectedScheme = (schemes as any[]).find(s => s.id === selectedSchemeId) ?? null;
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { toast } = useToast();

  // ── Restaurant tables (only meaningful when company.business_type === 'food') ──
  const isFoodBusiness = companyData?.business_type === 'food';
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [activeTable, setActiveTable] = useState<RestaurantTable | null>(null);
  const [resumingHeldSaleId, setResumingHeldSaleId] = useState<number | null>(null);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const exactMatch = products.find(p => p.barcode?.toLowerCase() === q || p.sku?.toLowerCase() === q);
      if (exactMatch) {
        addToCart(exactMatch);
        setSearchQuery("");
      }
    }
  };

  const posLogout = useCallback(() => {
    logout();
    navigate(tp("/admin/login"), { replace: true });
  }, [logout, navigate]);

  const { showWarning: showIdleWarning, secondsLeft, resetTimer } = useIdleTimeout({
    timeoutMs: 5 * 60 * 1000,
    warningMs: 60 * 1000,
    onTimeout: posLogout,
  });

  type StockAlert = { product: ApiProduct; kind: "expired" | "out_of_stock" | "low_stock" };
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [showStockAlerts, setShowStockAlerts] = useState(false);
  // Only auto-pop the alert panel once per POS session (first load) — later
  // polls just keep the badge count fresh instead of reopening the modal.
  const stockAlertsShownRef = useRef(false);

  useEffect(() => {
    loadData();
    checkCashDrawer();
    loadCompanyData();
    loadSecondaryCurrency();
    loadSchemes();
    loadPromotions();
    loadHeldSales();
    loadTables();

    const intervalId = setInterval(() => {
      loadData();
      checkCashDrawer();
      loadSchemes();
      loadPromotions();
      loadHeldSales();
      loadTables();
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (selectedSchemeId === null) {
      setSchemeItemMap(new Map());
      return;
    }
    api.priceLists.items(selectedSchemeId).then(items => {
      const m = new Map<number, number>();
      items.forEach((it: PriceListItem) => m.set(it.product_id, it.price));
      setSchemeItemMap(m);
    }).catch(err => {
      console.error("Failed to load scheme prices:", err);
      setSchemeItemMap(new Map());
    });
  }, [selectedSchemeId]);

  // Reprice existing cart items whenever the scheme map changes
  useEffect(() => {
    if (cart.length === 0) return;
    setCart(prev => prev.map(item => ({
      ...item,
      unit_price: schemeItemMap.get(item.product.id) ?? item.product.price,
    })));
  }, [schemeItemMap]);


  const loadSchemes = async () => {
    try {
      const data = await api.priceLists.active();
      setSchemes(data);
    } catch (err) {
      console.error("Failed to load schemes:", err);
    }
  };

  const loadPromotions = async () => {
    try {
      const data = await api.promotions.active();
      setActivePromotions(data);
    } catch (err) {
      console.error("Failed to load promotions:", err);
    }
  };

  const applyPromotion = (promo: Promotion | null) => {
    setAppliedPromotion(promo);
    if (!promo) {
      setCartDiscount(0);
      setDiscountType("percentage");
      setDiscountValue(0);
      setShowPromoModal(false);
      return;
    }
    const { subtotal } = calculateTotalsRaw();
    if (promo.discount_type === "percentage") {
      setDiscountType("percentage");
      setDiscountValue(promo.discount_value);
      setCartDiscount(Math.round(subtotal * (promo.discount_value / 100)));
    } else {
      setDiscountType("amount");
      setDiscountValue(promo.discount_value);
      setCartDiscount(promo.discount_value);
    }
    setShowPromoModal(false);
  };

  const getEffectivePrice = (product: ApiProduct): number => {
    return schemeItemMap.get(product.id) ?? product.price;
  };

  const schemeCurrencySymbol = (): string => {
    if (selectedScheme?.currency_symbol) return selectedScheme.currency_symbol;
    return baseCurrency?.symbol || 'UGX';
  };

  const loadSecondaryCurrency = async () => {
    try {
      const currencies = await api.currencies.list();
      const secondary = currencies.find((c: ApiCurrency) => !c.is_base && c.is_active);
      if (!secondary) return;
      setSecondaryCurrency(secondary);
      const base = currencies.find((c: ApiCurrency) => c.is_base);
      if (!base) return;
      // Try base→secondary direction first, then reverse with inversion
      let resolvedRate: number | null = null;
      try {
        const r = await api.exchangeRates.getActive(base.id, secondary.id);
        if (r) resolvedRate = parseFloat(r.rate.toString());
      } catch { /* not found in this direction */ }
      if (!resolvedRate) {
        try {
          const r = await api.exchangeRates.getActive(secondary.id, base.id);
          if (r) resolvedRate = 1 / parseFloat(r.rate.toString());
        } catch { /* not found in reverse either */ }
      }
      if (resolvedRate && resolvedRate > 0) setExchangeRate(resolvedRate);
    } catch (err) {
      console.error("Error loading secondary currency:", err);
    }
  };

  const loadCompanyData = async () => {
    try {
      const data = await api.company.get();
      setCompanyData(data);
    } catch (err) {
      console.error("Failed to load company data:", err);
    }
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
      // Auto-switch to 'all' view when searching
      if (filtered.length > 0 && !selectedCategory) {
        setSelectedCategory('all');
      }
    } else {
      setFilteredProducts(products);
    }
  }, [searchQuery, products]);

  const loadData = async () => {
    try {
      const [productsData, paymentTypesData, taxData, catsData] = await Promise.all([
        api.products.list(),
        api.paymentTypes.active(),
        api.taxRates.default(),
        api.categories.list(),
      ]);
      setProducts(productsData);
      setFilteredProducts(productsData);
      setPaymentTypes(paymentTypesData);
      setDefaultTax(taxData);
      setCategories(catsData);
      if (paymentTypesData.length > 0) {
        setSelectedPaymentType(paymentTypesData[0].id);
      }
      // Stock alerts
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const alerts: StockAlert[] = [];
      for (const p of productsData) {
        if ((p as any).expiry_date && new Date((p as any).expiry_date) < today) {
          alerts.push({ product: p, kind: "expired" });
        } else if (!p.in_stock || (p.quantity_on_hand ?? 0) <= 0) {
          alerts.push({ product: p, kind: "out_of_stock" });
        } else if ((p.quantity_on_hand ?? 0) <= ((p as any).reorder_level ?? 0) && (p as any).reorder_level > 0) {
          alerts.push({ product: p, kind: "low_stock" });
        }
      }
      setStockAlerts(alerts);
      if (alerts.length > 0 && !stockAlertsShownRef.current) {
        setShowStockAlerts(true);
        stockAlertsShownRef.current = true;
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  };

  const loadHeldSales = async () => {
    try {
      setHeldSales(await api.pos.getHeldSales());
    } catch (err) {
      console.error("Failed to load held sales:", err);
    }
  };

  const loadTables = async () => {
    try {
      setTables(await api.tables.list());
    } catch (err) {
      console.error("Failed to load tables:", err);
    }
  };

  // A table's running order, if any — derived from the held sales list rather
  // than any stored "occupied" flag, so it can never drift out of sync.
  const heldSaleForTable = (tableId: number) =>
    heldSales.find((s: any) => s.table_id === tableId);

  const selectTable = (table: RestaurantTable) => {
    const sale = heldSaleForTable(table.id);
    setActiveTable(table);
    if (sale) {
      setResumingHeldSaleId(sale.id);
      setCart((sale.items || []).map((item: any) => ({
        product: products.find(p => p.id === item.product_id) ?? ({
          id: item.product_id,
          name: item.product_name,
          price: item.unit_price,
        } as ApiProduct),
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount_amount || 0,
      })));
      setCustomerName(sale.customer_name && sale.customer_name !== 'Walk-in Customer' ? sale.customer_name : "");
    } else {
      setResumingHeldSaleId(null);
      setCart([]);
      setCartDiscount(0);
      setCustomerName("");
    }
    setShowTablePicker(false);
  };

  const payTableNow = (sale: any) => {
    // Paying directly from the table picker always supersedes whatever the
    // working cart currently holds for that table.
    if (activeTable && sale.table_id === activeTable.id) {
      setCart([]);
      setCartDiscount(0);
      setCustomerName("");
      setActiveTable(null);
      setResumingHeldSaleId(null);
    }
    setShowTablePicker(false);
    setShowHeldSales(true);
    setConfirmingHeldSaleId(sale.id);
    setConfirmPaymentTypeId(paymentTypes[0]?.id ?? null);
  };

  const leaveTable = () => {
    setActiveTable(null);
    setResumingHeldSaleId(null);
    setCart([]);
    setCartDiscount(0);
    setCustomerName("");
  };

  const clearTable = async () => {
    if (!activeTable) return;
    const sale = resumingHeldSaleId ? { id: resumingHeldSaleId } : heldSaleForTable(activeTable.id);
    if (sale && !confirm(`Clear ${activeTable.label}? Any reserved stock for its order will be released.`)) return;
    try {
      if (sale) await api.pos.cancelHeldSale(sale.id);
      await loadHeldSales();
      toast(`${activeTable.label} cleared`, "success", "Table Cleared");
    } catch (err: any) {
      toast(err.message || "Failed to clear table", "error", "Error");
    } finally {
      leaveTable();
    }
  };

  const checkCashDrawer = async () => {
    try {
      const session = await api.cashDrawer.getCurrent();
      setCashDrawerSession(session);
    } catch (err) {
      setCashDrawerSession(null);
    } finally {
      setSessionChecked(true);
    }
  };

  const addToCart = (product: ApiProduct) => {
    const existing = cart.find(item => item.product.id === product.id);
    const currentQtyInCart = existing ? existing.quantity : 0;
    const isService = (product as any).product_type === 'service';
    const availableStock = (product.quantity_on_hand ?? 0) - (product.quantity_reserved ?? 0);

    if (!isService && currentQtyInCart >= availableStock) {
      toast(`Only ${availableStock} units available in stock`, "warning", "Stock Limit");
      return;
    }

    const effectivePrice = getEffectivePrice(product);
    if (existing) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1, unit_price: effectivePrice }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1, discount: 0, unit_price: effectivePrice }]);
    }
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const cartItem = cart.find(item => item.product.id === productId);
    if (cartItem) {
      const availableStock = (cartItem.product.quantity_on_hand ?? 0) - (cartItem.product.quantity_reserved ?? 0);
      if (quantity > availableStock) {
        toast(`Only ${availableStock} units available in stock`, "warning", "Stock Limit");
        return;
      }
    }

    setCart(cart.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    ));
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const calculateTotalsRaw = () => {
    const subtotal = cart.reduce((sum, item) => {
      return sum + (item.unit_price * item.quantity) - item.discount;
    }, 0);
    return { subtotal };
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => {
      return sum + (item.unit_price * item.quantity) - item.discount;
    }, 0);

    // Apply cart-level discount
    let discountAmount = cartDiscount;
    if (discountType === "percentage" && discountValue > 0) {
      discountAmount = Math.round(subtotal * (discountValue / 100));
    } else if (discountType === "amount" && discountValue > 0) {
      discountAmount = discountValue;
    }

    const afterDiscount = subtotal - discountAmount;
    const taxRate = defaultTax?.rate || 0;
    const taxAmount = Math.round(afterDiscount * (taxRate / 100));
    const total = afterDiscount + taxAmount;

    return { subtotal, taxAmount, total, discountAmount };
  };

  const applyDiscount = () => {
    setAppliedPromotion(null);
    const { subtotal } = calculateTotalsRaw();
    if (discountType === "percentage") {
      setCartDiscount(Math.round(subtotal * (discountValue / 100)));
    } else {
      setCartDiscount(discountValue);
    }
    setShowDiscountModal(false);
  };

  const handleHoldSale = async () => {
    if (cart.length === 0) {
      toast("Cart is empty", "warning", "Empty Cart");
      return;
    }

    setHoldingCart(true);
    try {
      // Resuming a table that already had a held order — replace it with the
      // merged item list rather than creating a second hold for the same table.
      if (resumingHeldSaleId) {
        await api.pos.cancelHeldSale(resumingHeldSaleId);
      }

      const saleData = {
        customer_name: customerName || 'Walk-in Customer',
        price_list_id: selectedSchemeId || undefined,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount,
        })),
        payment_type_id: selectedPaymentType || 1,
        discount_amount: cartDiscount,
        sale_type: "regular",
        status: "held",
        table_id: activeTable?.id || undefined,
      };

      const sale = await api.pos.createSale(saleData);

      // Refresh from the backend so the Held Sales list stays authoritative
      await loadHeldSales();

      // Clear current cart
      setCart([]);
      setCartDiscount(0);
      setCustomerName("");
      setActiveTable(null);
      setResumingHeldSaleId(null);

      toast(`Sale ${sale.sale_number} held successfully`, "success", "Sale Held");
    } catch (err: any) {
      toast(err.message || "Failed to hold sale", "error", "Error");
    } finally {
      setHoldingCart(false);
    }
  };

  const buildReceiptBody = async (sale: any): Promise<string> => {
    const items = (sale.items || []).map((item: any) => ({
      name: item.product?.name || item.product_name || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.unit_price * item.quantity - (item.discount || 0),
    }));
    const qrDataUrl = await generateReceiptQrDataUrl(sale.sale_number);
    return buildThermalReceipt({
      sale,
      items,
      companyData,
      baseCurrencySymbol: baseCurrency?.symbol || 'UGX',
      baseCurrencyCode: baseCurrency?.code || 'UGX',
      secondaryCurrency: secondaryCurrency ? { id: secondaryCurrency.id, code: secondaryCurrency.code, symbol: secondaryCurrency.symbol } : null,
      exchangeRate,
      qrDataUrl,
    });
  };

  const handleConfirmHeldSale = async (sale: any) => {
    if (!confirmPaymentTypeId) {
      toast("Please select a payment type", "warning", "Required");
      return;
    }
    setProcessingHold(true);
    try {
      const completed = await api.pos.completeHeldSale(sale.id, confirmPaymentTypeId);

      const completedSaleData = {
        ...completed,
        items: (completed.items || []).map((item: any) => ({
          product: { name: item.product_name },
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount_amount,
        })),
        customerName: completed.customer_name || 'Walk-in Customer',
        subtotal: completed.subtotal,
        taxAmount: completed.tax_amount,
        total: completed.total_amount,
        discountAmount: completed.discount_amount,
        paymentTypeName: paymentTypes.find(pt => pt.id === confirmPaymentTypeId)?.name || 'Cash',
      };

      const html = await buildReceiptBody(completedSaleData);
      printThermal(`Receipt_${completed.sale_number}`, html);

      await loadHeldSales();
      setConfirmingHeldSaleId(null);
      setConfirmPaymentTypeId(null);
      setShowHeldSales(false);
      toast(`Sale ${completed.sale_number} completed`, "success", "Payment Confirmed");
    } catch (err: any) {
      toast(err.message || "Failed to confirm payment", "error", "Error");
    } finally {
      setProcessingHold(false);
    }
  };

  const handleCancelHeldSale = async (sale: any) => {
    if (!confirm(`Cancel held sale ${sale.sale_number}? Reserved stock will be released.`)) return;
    setProcessingHold(true);
    try {
      await api.pos.cancelHeldSale(sale.id);
      await loadHeldSales();
      toast(`Held sale ${sale.sale_number} cancelled`, "success", "Cancelled");
    } catch (err: any) {
      toast(err.message || "Failed to cancel held sale", "error", "Error");
    } finally {
      setProcessingHold(false);
    }
  };

  const handleCreditPayment = async () => {
    if (!creditCustomerName.trim()) {
      toast('Customer name is required for credit sales', 'warning', 'Required');
      return;
    }
    if (cart.length === 0) { toast('Cart is empty', 'warning', 'Empty Cart'); return; }
    setProcessingPayment(true);
    try {
      const { subtotal, taxAmount, total, discountAmount } = calculateTotals();
      const invoice = await api.invoices.create({
        customer_name: creditCustomerName.trim(),
        customer_email: creditCustomerEmail || undefined,
        customer_phone: creditCustomerPhone || undefined,
        price_list_id: selectedSchemeId || undefined,
        subtotal, tax_amount: taxAmount, discount_amount: discountAmount, total_amount: total,
        due_date: creditDueDate || undefined,
        items: cart.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount,
        })),
      });
      setCreatedInvoice(invoice);
      setCart([]);
      setCartDiscount(0);
      setCustomerName('');
      setCreditCustomerName('');
      setCreditCustomerEmail('');
      setCreditCustomerPhone('');
      setCreditDueDate('');
      setPaymentMode('cash');
      setShowPaymentModal(false);
      toast(`Invoice ${invoice.invoice_number} created`, 'success', 'Invoice Created');
    } catch (err: any) {
      toast(err.message || 'Failed to create invoice', 'error', 'Error');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedPaymentType) {
      toast("Please select a payment type", "warning", "Required");
      return;
    }

    if (cart.length === 0) {
      toast("Cart is empty", "warning", "Empty Cart");
      return;
    }

    setProcessingPayment(true);
    try {
      const { subtotal, taxAmount, total, discountAmount } = calculateTotals();

      // Paying out a table that had items added on top of an existing held
      // order — release that old hold now that it's being superseded by this
      // completed sale (which carries the merged item list).
      if (resumingHeldSaleId) {
        await api.pos.cancelHeldSale(resumingHeldSaleId);
      }

      const saleData = {
        customer_name: customerName || 'Walk-in Customer',
        price_list_id: selectedSchemeId || undefined,
        promotion_id: appliedPromotion?.id || undefined,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount,
        })),
        payment_type_id: selectedPaymentType,
        discount_amount: discountAmount,
        sale_type: "regular",
        status: "completed",
        table_id: activeTable?.id || undefined,
      };

      const sale = await api.pos.createSale(saleData);

      const completedSaleData = {
        ...sale,
        items: cart,
        subtotal,
        taxAmount,
        total,
        discountAmount,
        promotionName: appliedPromotion?.name || null,
        paymentTypeName: paymentTypes.find(pt => pt.id === selectedPaymentType)?.name || 'Cash',
        customerName: customerName || 'Walk-in Customer',
      };

      // Fetch currency data fresh for print (avoids any stale-state issue)
      let printSecondary: { id: number; code: string; symbol: string } | null = null;
      let printRate: number | null = null;
      try {
        const allCurrencies = await api.currencies.list();
        const printBase = allCurrencies.find((c: ApiCurrency) => c.is_base);
        const printSec = allCurrencies.find((c: ApiCurrency) => !c.is_base && c.is_active);
        if (printBase && printSec) {
          printSecondary = { id: printSec.id, code: printSec.code, symbol: printSec.symbol };
          try {
            const r = await api.exchangeRates.getActive(printBase.id, printSec.id);
            if (r) printRate = parseFloat(r.rate.toString());
          } catch { /* try reverse */ }
          if (!printRate) {
            try {
              const r = await api.exchangeRates.getActive(printSec.id, printBase.id);
              if (r) printRate = 1 / parseFloat(r.rate.toString());
            } catch { /* no rate */ }
          }
        }
      } catch { /* use state fallback */ }

      const receiptItems = cart.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.unit_price * item.quantity - (item.discount || 0),
      }));
      const qrDataUrl = await generateReceiptQrDataUrl(completedSaleData.sale_number);
      const html = buildThermalReceipt({
        sale: completedSaleData,
        items: receiptItems,
        companyData,
        baseCurrencySymbol: baseCurrency?.symbol || 'SSP',
        baseCurrencyCode: baseCurrency?.code || 'SSP',
        secondaryCurrency: printSecondary,
        exchangeRate: printRate,
        qrDataUrl,
      });
      printThermal(`Receipt_${completedSaleData.sale_number}`, html);

      // Clear cart, ready for the next sale
      setCart([]);
      setCartDiscount(0);
      setAppliedPromotion(null);
      setDiscountValue(0);
      setCustomerName('');
      setShowPaymentModal(false);
      setActiveTable(null);
      setResumingHeldSaleId(null);

      toast(`Sale ${completedSaleData.sale_number} completed`, "success", "Payment Successful");
    } catch (err: any) {
      toast(err.message || "Failed to process sale", "error", "Payment Failed");
    } finally {
      setProcessingPayment(false);
    }
  };

  const { subtotal, taxAmount, total, discountAmount } = calculateTotals();

  // Session gate — show blocking screen until check resolves
  if (!sessionChecked) {
    return (
      <div className="h-screen bg-admin-bg flex items-center justify-center">
        <div className="text-admin-text-secondary text-sm">Checking session…</div>
      </div>
    );
  }

  if (!cashDrawerSession) {
    return (
      <div className="h-screen bg-admin-bg flex items-center justify-center">
        <div className="bg-admin-surface border border-admin-border p-10 max-w-md w-full text-center space-y-5">
          <div className="flex justify-center">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-full p-4">
              <Lock size={32} className="text-yellow-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-admin-text">Session Required</h2>
          <p className="text-sm text-admin-text-secondary leading-relaxed">
            You must open a cash drawer session before you can start selling.
            {user?.email && <><br /><span className="text-admin-text font-medium">{user.email}</span></>}
          </p>
          <button
            onClick={() => navigate(tp("/pos/cash-management"))}
            className="w-full py-3 bg-admin-success text-white font-semibold hover:opacity-90 text-sm"
          >
            Open Session in Cash Management
          </button>
          <button
            onClick={checkCashDrawer}
            className="w-full py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F8F9FA] dark:bg-gray-900 flex flex-col font-sans text-[#1A1A2E] dark:text-gray-100">
      {showIdleWarning && (
        <IdleWarningModal
          secondsLeft={secondsLeft}
          onStay={resetTimer}
          onLogout={posLogout}
        />
      )}
      {/* Top Navigation Bar */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-14 md:h-16 flex items-center justify-between px-2 md:px-4 sm:px-6 shrink-0 z-10 relative">
        {/* Left Side */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0 lg:w-[280px]">
          <div className="font-bold text-base md:text-xl tracking-tight text-[#1A1A2E] dark:text-gray-100 truncate max-w-[120px] md:max-w-none">
            {companyData?.name || "FlippedPOS"}
          </div>
          {/* Price List Selection */}
          <select
            value={selectedSchemeId ?? ""}
            onChange={e => setSelectedSchemeId(e.target.value === "" ? null : Number(e.target.value))}
            className="hidden lg:block ml-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-[#10B981] w-[140px]"
          >
            <option value="">Standard Pricing</option>
            {schemes.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {isFoodBusiness && (
            <button
              onClick={() => setShowTablePicker(true)}
              className="hidden lg:flex items-center gap-1.5 ml-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-md hover:border-[#10B981] transition-colors"
            >
              <UtensilsCrossed size={14} />
              {activeTable ? activeTable.label : "Tables"}
            </button>
          )}
        </div>

        {/* Center: Search (Desktop) */}
        <div className="hidden md:flex flex-1 justify-center px-4 max-w-2xl">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search or scan barcode..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-full text-sm text-[#1A1A2E] dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center justify-end gap-1 md:gap-3 shrink-0 lg:w-[280px]">
          {/* Stock Alerts */}
          {stockAlerts.length > 0 && (
            <button
              onClick={() => setShowStockAlerts(true)}
              className="relative p-1.5 md:p-2 text-amber-500 hover:bg-amber-50 rounded-full transition-colors"
            >
              <Bell size={18} className="md:w-5 md:h-5" />
              <span className="absolute top-0 right-0 min-w-[14px] md:min-w-[16px] h-3.5 md:h-4 bg-red-500 text-white text-[8px] md:text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
                {stockAlerts.length}
              </span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 md:p-2 text-gray-600 dark:text-gray-300 hover:text-[#10B981] hover:bg-[#10B981]/10 dark:bg-[#10B981]/20 rounded-full transition-colors"
          >
            {theme === 'dark' ? <Sun size={18} className="md:w-5 md:h-5" /> : <Moon size={18} className="md:w-5 md:h-5" />}
          </button>

          {/* View Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="hidden md:block p-1.5 md:p-2 text-gray-600 dark:text-gray-300 hover:text-[#10B981] hover:bg-[#10B981]/10 dark:bg-[#10B981]/20 rounded-full transition-colors"
          >
            {viewMode === 'grid' ? <List size={18} className="md:w-5 md:h-5" /> : <LayoutGrid size={18} className="md:w-5 md:h-5" />}
          </button>

          {/* Menu */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="hidden md:block p-1.5 md:p-2 text-gray-600 dark:text-gray-300 hover:text-[#10B981] hover:bg-[#10B981]/10 dark:bg-[#10B981]/20 rounded-full transition-colors"
          >
            <Menu size={18} className="md:w-5 md:h-5" />
          </button>
        </div>
      </header>

      {/* Main Area: Three Panels */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* LEFT: Categories Sidebar */}
        <div className="hidden md:flex w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col shrink-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto py-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`w-full px-1.5 md:px-4 py-2 md:py-4 text-center md:text-left font-medium text-[10px] md:text-base transition-colors flex flex-col md:flex-row items-center md:items-start ${
                !selectedCategory || selectedCategory === 'all'
                  ? 'pos-accent-border-l pos-accent-tint pos-accent-text'
                  : 'border-l-2 md:border-l-4 border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800/50 hover:text-gray-900'
              }`}
              style={{ minHeight: '48px' }}
            >
              <span className="w-full truncate md:whitespace-nowrap break-words whitespace-normal leading-tight">All Products</span>
            </button>
            {categories.map(cat => (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`w-full px-1.5 md:px-4 py-2 md:py-4 text-center md:text-left font-medium text-[10px] md:text-base transition-colors flex flex-col md:flex-row items-center md:items-start ${
                  selectedCategory === cat.slug
                    ? 'pos-accent-border-l pos-accent-tint pos-accent-text'
                    : 'border-l-2 md:border-l-4 border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800/50 hover:text-gray-900'
                }`}
                style={{ minHeight: '48px' }}
              >
                <span className="w-full truncate md:whitespace-nowrap break-words whitespace-normal leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
          <div className="p-4 border-t border-gray-100 dark:border-gray-700/50 flex justify-center shrink-0 mt-auto bg-gray-50/50 dark:bg-gray-800/30">
            <img
              src="/logo.png"
              alt="FlippedPOS Logo"
              className="w-full h-auto object-contain opacity-60 hover:opacity-100 transition-opacity drop-shadow-sm"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        </div>

        {/* CENTER: Product Grid */}
        <div className="flex-1 bg-[#F8F9FA] dark:bg-gray-900 p-2 md:p-6 pb-20 overflow-y-auto">
          {/* Mobile Category Chips & View Toggle */}
          <div className="md:hidden flex items-center gap-2 pb-3 mb-2 -mx-2 px-2">
            <div className="flex-1 flex overflow-x-auto gap-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors border shadow-sm ${!selectedCategory || selectedCategory === 'all' ? 'bg-[#10B981] text-white border-[#10B981]' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'}`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.slug}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors border shadow-sm ${selectedCategory === cat.slug ? 'bg-[#10B981] text-white border-[#10B981]' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 shadow-sm shrink-0"
            >
              {viewMode === 'grid' ? <List size={18} /> : <LayoutGrid size={18} />}
            </button>
          </div>

          {/* Mobile Search */}
          <div className="mb-4 relative md:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
            <input
              id="mobile-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search or scan barcode..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-[11px] md:text-sm text-[#1A1A2E] dark:text-gray-100 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
            />
          </div>

          {(() => {
            const visibleProducts = filteredProducts.filter(p => !selectedCategory || selectedCategory === 'all' || p.category === selectedCategory);
            
            if (visibleProducts.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
                  <PackageX size={32} className="mb-3 opacity-50 md:w-12 md:h-12" />
                  <p className="text-sm md:text-lg font-medium text-gray-500 dark:text-gray-400">No products found</p>
                  <p className="text-[10px] md:text-sm mt-1 text-center">Try selecting a different category or clearing your search.</p>
                </div>
              );
            }

            return (
              <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-6 pb-24 lg:pb-0" : "flex flex-col gap-2 md:gap-3 pb-24 lg:pb-0"}>
                {visibleProducts.map(product => {
                  const availableStock = product.quantity_on_hand - (product.quantity_reserved ?? 0);
                  const qtyInCart = cart.find(item => item.product.id === product.id)?.quantity || 0;
                  const remainingStock = availableStock - qtyInCart;
                  const outOfStock = !product.in_stock || availableStock <= 0;

                  if (viewMode === 'list') {
                    return (
                      <div key={product.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700/50 p-2 md:p-3 flex items-center gap-3 md:gap-4 transition-all duration-200 ${outOfStock ? 'opacity-50' : 'hover:shadow-md'}`}>
                        <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-1" />
                          ) : (
                            <PackageX className="w-8 h-8 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[#1A1A2E] dark:text-gray-100 font-medium text-xs md:text-sm truncate">{product.name}</h3>
                          <div className="text-[10px] md:text-xs text-gray-500 mt-0.5">{product.category}</div>
                          <div className="pos-price-gradient text-sm md:text-base font-bold mt-1">
                            {formatCurrencySync(getEffectivePrice(product), schemeCurrencySymbol(), false)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {outOfStock ? (
                            <span className="text-[10px] md:text-xs font-bold text-red-500">Out</span>
                          ) : (
                            <span className={`text-[10px] md:text-xs font-medium ${remainingStock <= 5 ? 'text-amber-500' : 'text-gray-400'}`}>
                              {remainingStock} left
                            </span>
                          )}
                          <button
                            onClick={() => addToCart(product)}
                            disabled={outOfStock}
                            className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-colors ${outOfStock ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981] hover:text-white'}`}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={outOfStock}
                      className={`bg-white dark:bg-gray-800 rounded-lg md:rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col text-left relative group ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1'}`}
                    >
                      <div className="w-full h-24 md:h-32 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center relative overflow-hidden border-b border-gray-50">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <PackageX className="w-8 h-8 md:w-12 md:h-12 text-gray-300" />
                      )}

                      {qtyInCart > 0 && (
                        <div className="pos-badge-gradient absolute top-1 right-1 md:top-2 md:right-2 text-[9px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded shadow-sm">
                          {qtyInCart} in cart
                        </div>
                      )}
                    </div>

                    <div className="p-2 md:p-4 flex-1 flex flex-col">
                      <div className="text-[#1A1A2E] dark:text-gray-100 font-medium text-[11px] md:text-sm mb-1 line-clamp-2 md:min-h-[40px] leading-tight md:leading-normal">
                        {product.name}
                      </div>

                      <div className="mt-auto flex justify-between items-end pt-1 md:pt-0">
                        <div className="pos-price-gradient text-xs md:text-base truncate mr-1">
                          {formatCurrencySync(getEffectivePrice(product), schemeCurrencySymbol(), false)}
                        </div>
                        {outOfStock ? (
                          <span className="text-[9px] md:text-xs font-bold text-red-500 shrink-0">Out</span>
                        ) : (
                          <span className={`text-[9px] md:text-xs font-medium shrink-0 ${remainingStock <= 5 ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}>
                            {remainingStock} left
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            );
          })()}
        </div>

        {/* RIGHT: Order Summary */}
        <div className={`
          ${showMobileCart ? 'fixed inset-0 z-50 flex' : 'hidden lg:flex'}
          w-full lg:w-[380px] bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex-col shrink-0 lg:z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]
        `}>
          {/* Header & Customer */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 space-y-3 relative">
            {showMobileCart && (
              <button 
                onClick={() => setShowMobileCart(false)}
                className="lg:hidden absolute top-4 right-4 p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X size={20} />
              </button>
            )}
            <div className="flex justify-between items-center pr-10 lg:pr-0">
              <h2 className="font-bold text-lg text-[#1A1A2E] dark:text-gray-100">Current Order</h2>
              <button
                onClick={() => { setCart([]); setCartDiscount(0); setCustomerName(""); }}
                className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors px-2 py-1 rounded"
              >
                Clear All
              </button>
            </div>

            {activeTable && (
              <div className="flex items-center justify-between px-3 py-2 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg">
                <div className="flex items-center gap-1.5 text-sm font-medium text-[#10B981]">
                  <UtensilsCrossed size={14} />
                  {activeTable.label} · {activeTable.location}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={leaveTable} className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                    Leave
                  </button>
                  <button onClick={clearTable} className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors">
                    Clear Table
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowCustomerModal(true)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-[#1A1A2E] dark:text-gray-100 text-sm font-medium flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <User size={16} className="text-[#10B981]" />
                {customerName || "Add Customer"}
              </div>
              <span className="text-gray-400 dark:text-gray-500 text-xs">Edit</span>
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-3 bg-gray-50/50 dark:bg-gray-800/30">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <ShoppingCart size={32} className="mb-2 md:mb-4 opacity-20 md:w-12 md:h-12" />
                <p className="text-sm md:text-base">Your cart is empty</p>
                <p className="text-[10px] md:text-xs mt-1">Tap products to add them</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 p-2 md:p-3 rounded-lg md:rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2 md:mb-3">
                    <span className="text-[#1A1A2E] dark:text-gray-100 text-[11px] md:text-sm font-medium pr-2 md:pr-4 line-clamp-2 leading-tight">{item.product.name}</span>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors p-1 md:-mr-1"
                    >
                      <X size={14} className="md:w-4 md:h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center bg-gray-50 dark:bg-gray-800/50 rounded-md md:rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:bg-gray-600 transition-colors"
                      >
                        <Minus size={12} className="md:w-[14px] md:h-[14px]" />
                      </button>
                      <span className="w-8 md:w-10 text-center text-xs md:text-sm font-bold text-[#1A1A2E] dark:text-gray-100">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:bg-gray-600 transition-colors"
                      >
                        <Plus size={12} className="md:w-[14px] md:h-[14px]" />
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-[#1A1A2E] dark:text-gray-100 font-bold text-xs md:text-base">
                        {formatCurrencySync(item.unit_price * item.quantity - item.discount, schemeCurrencySymbol(), false)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Totals & Checkout */}
          <div className="p-3 md:p-5 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="space-y-2 md:space-y-3 mb-3 md:mb-4">
              {/* Discount/Promo Row */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowDiscountModal(true)}
                  className="px-2 md:px-3 py-1.5 md:py-2 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-md md:rounded-lg text-[10px] md:text-xs font-medium text-gray-700 dark:text-gray-200 transition-colors"
                >
                  Discount {cartDiscount > 0 && !appliedPromotion ? `(-${discountType === 'percentage' ? discountValue + '%' : formatCurrencySync(discountValue, baseCurrency?.symbol || 'UGX', false)})` : ''}
                </button>
                <button
                  onClick={() => setShowPromoModal(true)}
                  className={`px-2 md:px-3 py-1.5 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-medium transition-colors border ${
                    appliedPromotion
                      ? 'pos-accent-tint border-[#00A896] pos-accent-text'
                      : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {appliedPromotion ? `Promo: ${appliedPromotion.name}` : 'Apply Promo'}
                </button>
              </div>

              {/* Numbers */}
              <div className="space-y-1 md:space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                <div className="flex justify-between text-xs md:text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-[#1A1A2E] dark:text-gray-100">{formatCurrencySync(subtotal, schemeCurrencySymbol(), false)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="pos-price-gradient">{appliedPromotion ? `Promo: ${appliedPromotion.name}` : 'Discount'}</span>
                    <span className="pos-price-gradient">-{formatCurrencySync(discountAmount, schemeCurrencySymbol(), false)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs md:text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  <span>Tax ({defaultTax?.rate}%)</span>
                  <span className="font-medium text-[#1A1A2E] dark:text-gray-100">{formatCurrencySync(taxAmount, schemeCurrencySymbol(), false)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 md:pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-base md:text-xl font-bold text-[#1A1A2E] dark:text-gray-100">Total</span>
                <div className="text-right">
                  <span className="pos-price-gradient text-lg md:text-2xl">
                    {formatCurrencySync(total, schemeCurrencySymbol(), false)}
                  </span>
                  {secondaryCurrency && exchangeRate && (
                    <div className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mt-0.5 md:mt-1">
                      ≈ {formatCurrencySync(Math.round(total * exchangeRate), secondaryCurrency.symbol, false)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className="pos-accent-bg w-full py-3 md:py-4 disabled:opacity-50 disabled:cursor-not-allowed font-bold rounded-lg md:rounded-xl text-sm md:text-lg transition-all shadow-lg flex items-center justify-center gap-2"
            >
              Checkout
            </button>

            <div className="flex gap-2 mt-2 md:mt-3">
              <button
                onClick={handleHoldSale}
                disabled={cart.length === 0 || holdingCart}
                className="flex-1 py-2 md:py-3 bg-white dark:bg-gray-800 border-2 text-[#00A896] font-semibold rounded-lg md:rounded-xl text-[11px] md:text-sm hover:bg-[#00A896]/5 transition-colors disabled:opacity-50 disabled:text-gray-400 flex items-center justify-center gap-2"
                style={{ borderColor: '#00A896' }}
              >
                {holdingCart && <span className="size-3.5 border-2 border-[#00A896]/40 border-t-[#00A896] rounded-full animate-spin" />}
                {holdingCart ? "Holding…" : "Hold"}
              </button>
              {heldSales.length > 0 && (
                <button
                  onClick={() => setShowHeldSales(true)}
                  className="flex-1 py-2 md:py-3 bg-gray-800 text-white font-semibold rounded-lg md:rounded-xl text-[11px] md:text-sm hover:bg-gray-900 transition-colors relative"
                >
                  Recall
                  <span className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 bg-red-500 text-white text-[10px] md:text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {heldSales.length}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Side Menu Overlay */}
        {showMenu && (
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-800 shadow-2xl z-40 flex flex-col border-l border-gray-200 dark:border-gray-700 transform transition-transform">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-bold text-[#1A1A2E] dark:text-gray-100">Menu</h3>
              <button onClick={() => setShowMenu(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:text-gray-100 p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {user?.role_name?.toLowerCase() !== 'cashier' && (
                <button
                  onClick={() => navigate(tp("/admin"))}
                  className="w-full text-left px-4 py-4 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-[#10B981] hover:bg-[#10B981]/5 rounded-xl transition-colors"
                >
                  Dashboard Management
                </button>
              )}
              <button
                onClick={() => navigate(tp("/pos/sales-history"))}
                className="w-full text-left px-4 py-4 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-[#10B981] hover:bg-[#10B981]/5 rounded-xl transition-colors"
              >
                View Sales History
              </button>
              <button
                onClick={() => navigate(tp("/pos/cash-management"))}
                className="w-full text-left px-4 py-4 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-[#10B981] hover:bg-[#10B981]/5 rounded-xl transition-colors"
              >
                Cash In / Out
              </button>
              <button
                onClick={() => navigate(tp("/pos/end-of-day"))}
                className="w-full text-left px-4 py-4 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-[#10B981] hover:bg-[#10B981]/5 rounded-xl transition-colors"
              >
                End of Day
              </button>
            </div>
            {user?.role_name?.toLowerCase() === 'cashier' && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-700/50">
                <button
                  onClick={() => {
                    logout();
                    window.location.replace(tp("/admin/login") + "?view=pin");
                  }}
                  className="w-full px-4 py-4 text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full sm:w-[480px] max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur z-10">
              <h2 className="text-2xl font-bold text-[#1A1A2E] dark:text-gray-100">Process Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:text-gray-100 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-6">
              {/* Mode tabs */}
              <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
                <button
                  onClick={() => setPaymentMode('cash')}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${paymentMode === 'cash' ? 'bg-white dark:bg-gray-800 text-[#1A1A2E] dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-200'
                    }`}
                >Cash / Card</button>
                <button
                  onClick={() => setPaymentMode('credit')}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${paymentMode === 'credit' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-200'
                    }`}
                >Credit / Invoice</button>
              </div>

              {/* Order summary */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 space-y-3">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                  <span>Subtotal</span>
                  <span className="font-medium text-[#1A1A2E] dark:text-gray-100">{formatCurrencySync(subtotal, schemeCurrencySymbol(), false)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-[#10B981]">
                    <span>Discount</span>
                    <span className="font-medium">-{formatCurrencySync(discountAmount, schemeCurrencySymbol(), false)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                  <span>Tax</span>
                  <span className="font-medium text-[#1A1A2E] dark:text-gray-100">{formatCurrencySync(taxAmount, schemeCurrencySymbol(), false)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                  <span className="text-[#1A1A2E] dark:text-gray-100">Total to Pay</span>
                  <span className="text-[#10B981]">{formatCurrencySync(total, schemeCurrencySymbol(), false)}</span>
                </div>
              </div>

              {paymentMode === 'cash' ? (
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Payment Method</label>
                  <select
                    value={selectedPaymentType || ""}
                    onChange={(e) => setSelectedPaymentType(Number(e.target.value))}
                    className="w-full px-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[#1A1A2E] dark:text-gray-100 focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none shadow-sm"
                  >
                    {paymentTypes.map(pt => (
                      <option key={pt.id} value={pt.id}>{pt.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-amber-800">
                      Creating a credit invoice. Payment will not be recorded in today's cash drawer until paid separately.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Customer Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={creditCustomerName}
                      onChange={e => setCreditCustomerName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[#1A1A2E] dark:text-gray-100 focus:ring-2 focus:ring-[#10B981] outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Phone</label>
                      <input
                        type="text"
                        value={creditCustomerPhone}
                        onChange={e => setCreditCustomerPhone(e.target.value)}
                        placeholder="Optional"
                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[#1A1A2E] dark:text-gray-100 focus:ring-2 focus:ring-[#10B981] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Email</label>
                      <input
                        type="email"
                        value={creditCustomerEmail}
                        onChange={e => setCreditCustomerEmail(e.target.value)}
                        placeholder="Optional"
                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[#1A1A2E] dark:text-gray-100 focus:ring-2 focus:ring-[#10B981] outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={creditDueDate}
                      onChange={e => setCreditDueDate(e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[#1A1A2E] dark:text-gray-100 focus:ring-2 focus:ring-[#10B981] outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50 flex gap-4 sticky bottom-0 z-10">
              <button
                onClick={() => { setShowPaymentModal(false); setPaymentMode('cash'); }}
                disabled={processingPayment}
                className="flex-1 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-50 dark:bg-gray-800/50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              {paymentMode === 'cash' ? (
                <button
                  onClick={handlePayment}
                  disabled={processingPayment}
                  className="flex-[2] py-4 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#10B981]/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingPayment && <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {processingPayment ? "Processing…" : "Confirm Payment"}
                </button>
              ) : (
                <button
                  onClick={handleCreditPayment}
                  disabled={processingPayment}
                  className="flex-[2] py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingPayment && <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {processingPayment ? "Processing…" : "Create Invoice"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-gray-100">Add Customer</h2>
              <button onClick={() => setShowCustomerModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="E.g. John Doe"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[#1A1A2E] dark:text-gray-100 focus:ring-2 focus:ring-[#10B981] outline-none shadow-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="flex-1 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-50 dark:bg-gray-800/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="flex-1 py-3 bg-[#1A1A2E] hover:bg-gray-800 text-white font-bold rounded-xl transition-colors shadow-md"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promo Modal */}
      {showPromoModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-gray-100">Promotions</h2>
              <button onClick={() => setShowPromoModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300"><X size={20} /></button>
            </div>
            {activePromotions.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <PackageX size={48} className="mb-4 opacity-20" />
                <p>No active promotions.</p>
              </div>
            ) : (
              <div className="overflow-y-auto space-y-3 flex-1 px-1">
                {activePromotions.map(promo => (
                  <button
                    key={promo.id}
                    onClick={() => applyPromotion(appliedPromotion?.id === promo.id ? null : promo)}
                    className={`w-full text-left p-5 rounded-xl border-2 transition-all ${appliedPromotion?.id === promo.id
                        ? 'bg-[#10B981]/10 dark:bg-[#10B981]/20 border-[#10B981] shadow-sm'
                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/50 hover:border-gray-200 dark:border-gray-700 hover:shadow-sm'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`font-bold text-lg ${appliedPromotion?.id === promo.id ? 'text-[#10B981]' : 'text-[#1A1A2E] dark:text-gray-100'}`}>{promo.name}</div>
                        {promo.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">{promo.description}</div>
                        )}
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <div className="text-xl font-black text-[#10B981] bg-[#10B981]/10 dark:bg-[#10B981]/20 px-3 py-1 rounded-lg">
                          {promo.discount_type === 'percentage' ? `${promo.discount_value}% OFF` : `-${formatCurrencySync(promo.discount_value, baseCurrency?.symbol || 'UGX', false)}`}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {appliedPromotion && (
              <button
                onClick={() => applyPromotion(null)}
                className="mt-6 w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"
              >
                Remove Promotion
              </button>
            )}
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-gray-100">Manual Discount</h2>
              <button onClick={() => setShowDiscountModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300"><X size={20} /></button>
            </div>
            <div className="space-y-6">
              <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
                <button
                  onClick={() => setDiscountType("percentage")}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${discountType === "percentage" ? 'bg-white dark:bg-gray-800 text-[#1A1A2E] dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-200'
                    }`}
                >
                  Percentage (%)
                </button>
                <button
                  onClick={() => setDiscountType("amount")}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${discountType === "amount" ? 'bg-white dark:bg-gray-800 text-[#1A1A2E] dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-200'
                    }`}
                >
                  Amount
                </button>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                  {discountType === "percentage" ? "Discount Percentage" : `Discount Amount (${baseCurrency?.symbol || 'UGX'})`}
                </label>
                <input
                  type="number"
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-2xl font-bold text-[#1A1A2E] dark:text-gray-100 text-center focus:ring-2 focus:ring-[#10B981] outline-none shadow-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setShowDiscountModal(false); setDiscountValue(0); setCartDiscount(0); }}
                className="flex-1 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-50 dark:bg-gray-800/50 transition-colors shadow-sm"
              >
                Clear
              </button>
              <button
                onClick={applyDiscount}
                className="flex-[2] py-4 bg-[#1A1A2E] hover:bg-gray-800 text-white font-bold rounded-xl transition-all shadow-md"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Picker Modal */}
      {showTablePicker && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-700/50">
              <h2 className="text-2xl font-bold text-[#1A1A2E] dark:text-gray-100">Tables</h2>
              <button onClick={() => setShowTablePicker(false)} className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-800 dark:text-gray-100 rounded-full"><X size={20} /></button>
            </div>

            {tables.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <UtensilsCrossed size={48} className="mb-4 opacity-20" />
                <p>No tables set up yet — add some from Admin → Tables.</p>
              </div>
            ) : (
              Array.from(new Set(tables.map(t => t.location))).map(loc => (
                <div key={loc} className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">{loc}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {tables.filter(t => t.location === loc).map(t => {
                      const sale = heldSaleForTable(t.id);
                      const occupied = !!sale;
                      const itemCount = sale ? (sale.items || []).reduce((n: number, it: any) => n + it.quantity, 0) : 0;
                      return (
                        <div
                          key={t.id}
                          className={`border-2 rounded-xl p-3 text-left transition-colors ${
                            occupied ? "border-amber-400/60 bg-amber-50 dark:bg-amber-500/10" : "border-gray-100 dark:border-gray-700/50 hover:border-[#10B981]"
                          }`}
                        >
                          <button onClick={() => selectTable(t)} className="w-full text-left">
                            <p className="font-bold text-[#1A1A2E] dark:text-gray-100 text-sm">{t.label}</p>
                            {occupied ? (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                                {itemCount} item(s) · {formatCurrencySync(sale.total_amount, baseCurrency?.symbol || 'UGX', false)}
                              </p>
                            ) : (
                              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Available</p>
                            )}
                          </button>
                          {occupied && (
                            <button
                              onClick={() => payTableNow(sale)}
                              className="mt-2 w-full text-[11px] font-bold text-[#10B981] hover:text-[#0ea472] transition-colors"
                            >
                              Pay Now →
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Held Sales Modal */}
      {showHeldSales && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-700/50">
              <h2 className="text-2xl font-bold text-[#1A1A2E] dark:text-gray-100">Held Sales</h2>
              <button onClick={() => { setShowHeldSales(false); setConfirmingHeldSaleId(null); }} className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:text-gray-100 rounded-full"><X size={20} /></button>
            </div>

            {heldSales.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <Clock size={48} className="mb-4 opacity-20" />
                <p>No sales currently on hold.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {heldSales.map((sale) => {
                  const isConfirming = confirmingHeldSaleId === sale.id;
                  return (
                    <div
                      key={sale.id}
                      className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700/50 rounded-xl p-5 flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-1">{sale.sale_number}</p>
                          <p className="font-bold text-[#1A1A2E] dark:text-gray-100 flex items-center gap-2">
                            <User size={16} className="text-gray-400 dark:text-gray-500" />
                            {sale.customer_name || 'Walk-in Customer'}
                          </p>
                        </div>
                        <div className="w-10 h-10 bg-[#10B981]/10 dark:bg-[#10B981]/20 rounded-full flex items-center justify-center">
                          <ShoppingCart size={18} className="text-[#10B981]" />
                        </div>
                      </div>

                      {/* Read-only line items */}
                      <div className="text-sm text-gray-500 dark:text-gray-400 space-y-0.5 mb-3">
                        {(sale.items || []).map((item: any) => (
                          <div key={item.id} className="flex justify-between">
                            <span>{item.quantity} × {item.product_name}</span>
                            <span>{formatCurrencySync(item.subtotal, baseCurrency?.symbol || 'UGX', false)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-gray-50 dark:border-gray-700/50 flex justify-between items-end mb-3">
                        <span className="text-xs opacity-70 text-gray-500 dark:text-gray-400">
                          {new Date(sale.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <p className="text-xl font-bold text-[#10B981]">
                          {formatCurrencySync(sale.total_amount, baseCurrency?.symbol || 'UGX', false)}
                        </p>
                      </div>

                      {isConfirming ? (
                        <div className="space-y-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3">
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-200">Payment Method</label>
                          <select
                            value={confirmPaymentTypeId || ""}
                            onChange={(e) => setConfirmPaymentTypeId(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[#1A1A2E] dark:text-gray-100 outline-none"
                          >
                            <option value="" disabled>Select payment type…</option>
                            {paymentTypes.map(pt => (
                              <option key={pt.id} value={pt.id}>{pt.name}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirmHeldSale(sale)}
                              disabled={processingHold || !confirmPaymentTypeId}
                              className="flex-1 py-2 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-lg transition-all disabled:opacity-50"
                            >
                              {processingHold ? "Processing…" : "Complete Sale"}
                            </button>
                            <button
                              onClick={() => { setConfirmingHeldSaleId(null); setConfirmPaymentTypeId(null); }}
                              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-lg"
                            >
                              Back
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setConfirmingHeldSaleId(sale.id); setConfirmPaymentTypeId(paymentTypes[0]?.id ?? null); }}
                            disabled={processingHold}
                            className="flex-1 py-2 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-lg transition-all disabled:opacity-50"
                          >
                            Confirm Payment
                          </button>
                          <button
                            onClick={() => handleCancelHeldSale(sale)}
                            disabled={processingHold}
                            className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-lg hover:bg-red-100 disabled:opacity-50"
                          >
                            Cancel Hold
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stock Alerts Panel */}
      {showStockAlerts && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 bg-amber-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-full">
                  <AlertTriangle size={24} className="text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-amber-900">Stock Alerts</h2>
                  <p className="text-sm text-amber-700 font-medium">{stockAlerts.length} items require attention</p>
                </div>
              </div>
              <button onClick={() => setShowStockAlerts(false)} className="text-amber-700 hover:text-amber-900 p-2"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {(["expired", "out_of_stock", "low_stock"] as const).map(kind => {
                const group = stockAlerts.filter(a => a.kind === kind);
                if (!group.length) return null;
                const meta = {
                  expired: { icon: <Clock size={16} className="text-red-500" />, label: "Expired", color: "text-red-700", bg: "bg-red-50" },
                  out_of_stock: { icon: <PackageX size={16} className="text-orange-500" />, label: "Out of Stock", color: "text-orange-700", bg: "bg-orange-50" },
                  low_stock: { icon: <AlertTriangle size={16} className="text-amber-500" />, label: "Low Stock", color: "text-amber-700", bg: "bg-amber-50" },
                }[kind];
                return (
                  <div key={kind} className="mb-4">
                    <div className={`mx-4 mt-4 px-4 py-2 ${meta.bg} rounded-xl flex items-center gap-2 mb-2`}>
                      {meta.icon}
                      <span className={`font-bold text-sm ${meta.color}`}>
                        {meta.label} ({group.length})
                      </span>
                    </div>
                    <div className="px-4 space-y-2">
                      {group.map(({ product }) => (
                        <div key={product.id} className="p-4 border border-gray-100 dark:border-gray-700/50 rounded-xl flex justify-between items-center bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
                          <div>
                            <p className="font-bold text-[#1A1A2E] dark:text-gray-100">{product.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mt-1">
                              {product.category}
                            </p>
                          </div>
                          <div className="text-right">
                            {kind === "expired" && (
                              <p className="text-sm font-bold text-red-500 bg-red-50 px-2 py-1 rounded">
                                Exp: {new Date((product as any).expiry_date).toLocaleDateString()}
                              </p>
                            )}
                            {kind !== "expired" && (
                              <div className="flex flex-col items-end">
                                <span className={`text-lg font-black ${kind === 'out_of_stock' ? 'text-red-500' : 'text-amber-500'}`}>
                                  {product.quantity_on_hand ?? 0}
                                </span>
                                {(product as any).reorder_level > 0 && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">Min: {(product as any).reorder_level}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50">
              <button onClick={() => setShowStockAlerts(false)} className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:bg-gray-700 transition-colors shadow-sm">
                Dismiss Alerts
              </button>
            </div>
          </div>
        </div>
      )}
    {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around items-center h-16 z-40 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-[#10B981] transition-colors">
          <Home size={20} />
          <span className="text-[10px] mt-1 font-medium">Home</span>
        </button>
        <button onClick={() => { document.getElementById('mobile-search')?.focus(); }} className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-[#10B981] transition-colors">
          <Search size={20} />
          <span className="text-[10px] mt-1 font-medium">Search</span>
        </button>
        <button onClick={() => setShowMobileCart(true)} className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-[#10B981] transition-colors relative">
          <div className="relative">
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 border-2 border-white">
                {cart.length}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-medium">Cart</span>
        </button>
        <button onClick={() => setShowMenu(true)} className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-[#10B981] transition-colors">
          <Menu size={20} />
          <span className="text-[10px] mt-1 font-medium">Menu</span>
        </button>
      </div>

    </div>
  );
}
