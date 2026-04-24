import { useState, useEffect } from "react";
import { Search, ShoppingCart, CreditCard, Trash2, Plus, Minus, DollarSign, User, Menu, X, Barcode, Lock, Bell, AlertTriangle, PackageX, Clock } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { api, ApiProduct, ApiCategory, PaymentType, TaxRate, CashDrawerSession, ApiCurrency, PriceList, PriceListItem, Promotion } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useTenantPath } from "@/contexts/TenantContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrencySync } from "@/utils/currency";
import { openPrintWindow, printDocument, printThermal } from "@/utils/printUtils";
import { buildThermalReceipt } from "@/utils/receiptUtils";

export default function POSMain() {
  const navigate = useNavigate();
  const tp = useTenantPath();
  const { baseCurrency } = useCurrency();
  const { user } = useAuth();
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
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "amount">("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [heldSales, setHeldSales] = useState<Array<any>>([]);
  const [showHeldSales, setShowHeldSales] = useState(false);
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
  const { toast } = useToast();

  type StockAlert = { product: ApiProduct; kind: "expired" | "out_of_stock" | "low_stock" };
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [showStockAlerts, setShowStockAlerts] = useState(false);

  useEffect(() => {
    loadData();
    checkCashDrawer();
    loadCompanyData();
    loadSecondaryCurrency();
    loadSchemes();
    loadPromotions();
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
      if (alerts.length > 0) setShowStockAlerts(true);
    } catch (err) {
      console.error("Failed to load data:", err);
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

    try {
      const { subtotal, taxAmount, total, discountAmount } = calculateTotals();
      
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
      };

      const sale = await api.pos.createSale(saleData);
      
      // Store held sale locally
      const heldSale = {
        ...sale,
        items: cart,
        customerName: customerName || 'Walk-in Customer',
        subtotal,
        taxAmount,
        total,
      };
      
      setHeldSales([...heldSales, heldSale]);
      
      // Clear current cart
      setCart([]);
      setCartDiscount(0);
      setCustomerName("");
      
      // Print sale order
      printSaleOrder(heldSale);
      
      toast(`Sale ${sale.sale_number} held successfully`, "success", "Sale Held");
    } catch (err: any) {
      toast(err.message || "Failed to hold sale", "error", "Error");
    }
  };

  const printSaleOrder = (sale: any) => {
    const s = baseCurrency?.symbol || 'UGX';
    const fmt = (n: number) => `${s} ${Number(n || 0).toLocaleString()}`;
    const itemRows = sale.items.map((item: any) => `
      <tr>
        <td>${item.product.name}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${fmt(item.product.price)}</td>
        <td class="num">${fmt(item.product.price * item.quantity)}</td>
      </tr>`).join('');
    const body = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #2980b9;padding-bottom:14px;margin-bottom:14px;">
        <div>
          <div style="font-size:18px;font-weight:bold;color:#2c3e50;">HELD SALE ORDER</div>
          <div style="font-size:10px;color:#666;margin-top:4px;">*** NOT PAID — HELD FOR LATER ***</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:22px;font-weight:bold;color:#2980b9;letter-spacing:2px;">HOLD</div>
          <div style="font-size:13px;color:#2c3e50;font-weight:bold;margin-top:4px;">${sale.sale_number}</div>
          <div style="font-size:10px;color:#666;margin-top:2px;">Date: ${new Date().toLocaleDateString()}</div>
        </div>
      </div>
      <div style="background:#f7f9fb;border:1px solid #dce3ea;padding:10px 14px;margin:14px 0;">
        <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Customer</div>
        <div style="font-size:13px;font-weight:bold;color:#2c3e50;">${sale.customerName || 'Walk-in Customer'}</div>
      </div>
      <div style="font-size:11px;font-weight:bold;color:#2c3e50;margin:16px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px;text-transform:uppercase;letter-spacing:1px;">Items</div>
      <table>
        <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
        <tfoot><tr><td colspan="3" class="num">Total</td><td class="num">${fmt(sale.total)}</td></tr></tfoot>
      </table>
      <div style="margin-top:20px;padding:10px;background:#fff3e0;border:1px solid #f59e0b;font-size:11px;text-align:center;color:#92400e;font-weight:bold;">
        *** HELD SALE — NOT YET PAID ***
      </div>
      <div style="margin-top:20px;padding-top:10px;border-top:1px solid #ddd;font-size:9px;color:#888;text-align:center;">
        Printed on ${new Date().toLocaleString()}
      </div>`;
    openPrintWindow(`Held Sale — ${sale.sale_number}`, body);
  };

  const buildReceiptBody = (sale: any): string => {
    const items = (sale.items || []).map((item: any) => ({
      name:       item.product?.name || item.product_name || '',
      quantity:   item.quantity,
      unit_price: item.unit_price,
      total:      item.unit_price * item.quantity - (item.discount || 0),
    }));
    return buildThermalReceipt({
      sale,
      items,
      companyData,
      baseCurrencySymbol: baseCurrency?.symbol || 'UGX',
      baseCurrencyCode:   baseCurrency?.code   || 'UGX',
      secondaryCurrency:  secondaryCurrency ? { id: secondaryCurrency.id, code: secondaryCurrency.code, symbol: secondaryCurrency.symbol } : null,
      exchangeRate,
    });
  };


  const loadHeldSale = (heldSale: any) => {
    setCart(heldSale.items);
    setCustomerName(heldSale.customerName);
    setCartDiscount(heldSale.items.reduce((sum: number, item: any) => sum + item.discount, 0));
    setHeldSales(heldSales.filter(s => s.id !== heldSale.id));
    setShowHeldSales(false);
  };

  const handleCreditPayment = async () => {
    if (!creditCustomerName.trim()) {
      toast('Customer name is required for credit sales', 'warning', 'Required');
      return;
    }
    if (cart.length === 0) { toast('Cart is empty', 'warning', 'Empty Cart'); return; }
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

    try {
      const { subtotal, taxAmount, total, discountAmount } = calculateTotals();
      
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

      // Store completed sale data for receipt modal
      setCompletedSale(completedSaleData);

      // Fetch currency data fresh for print (avoids any stale-state issue)
      let printSecondary: { id: number; code: string; symbol: string } | null = null;
      let printRate: number | null = null;
      try {
        const allCurrencies = await api.currencies.list();
        const printBase = allCurrencies.find((c: ApiCurrency) => c.is_base);
        const printSec  = allCurrencies.find((c: ApiCurrency) => !c.is_base && c.is_active);
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
        name:       item.product.name,
        quantity:   item.quantity,
        unit_price: item.unit_price,
        total:      item.unit_price * item.quantity - (item.discount || 0),
      }));
      const html = buildThermalReceipt({
        sale: completedSaleData,
        items: receiptItems,
        companyData,
        baseCurrencySymbol: baseCurrency?.symbol || 'SSP',
        baseCurrencyCode:   baseCurrency?.code   || 'SSP',
        secondaryCurrency:  printSecondary,
        exchangeRate:       printRate,
      });
      printThermal(`Receipt_${completedSaleData.sale_number}`, html);

      // Clear cart
      setCart([]);
      setCartDiscount(0);
      setAppliedPromotion(null);
      setDiscountValue(0);
      setShowPaymentModal(false);

      // Show receipt modal
      setShowReceipt(true);
    } catch (err: any) {
      toast(err.message || "Failed to process sale", "error", "Payment Failed");
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
    <div className="h-screen bg-admin-bg flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-admin-surface border-b border-admin-border p-2 sm:p-3 flex items-center gap-2 overflow-x-auto shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <select
            value={selectedSchemeId ?? ""}
            onChange={e => setSelectedSchemeId(e.target.value === "" ? null : Number(e.target.value))}
            className="px-2 sm:px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-xs sm:text-sm hover:bg-admin-surface shrink-0"
            title="Pricing Scheme"
          >
            <option value="">Cash (Standard)</option>
            {schemes.map(s => (
              <option key={s.id} value={s.id}>{s.name}{s.currency_code ? ` (${s.currency_code})` : ""}</option>
            ))}
          </select>
          <button 
            onClick={() => setShowCustomerModal(true)}
            className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-2 shrink-0 whitespace-nowrap"
          >
            <User size={16} />
            {customerName || "Customer"}
          </button>
          <button 
            onClick={() => setShowDiscountModal(true)}
            className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface shrink-0 whitespace-nowrap"
          >
            Discount {cartDiscount > 0 && !appliedPromotion ? `(-${discountType === 'percentage' ? discountValue + '%' : formatCurrencySync(discountValue, baseCurrency?.symbol || 'UGX', false)})` : ''}
          </button>
          <button
            onClick={() => setShowPromoModal(true)}
            className={`px-4 py-2 text-sm border transition-colors shrink-0 whitespace-nowrap ${
              appliedPromotion
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-admin-bg border-admin-border text-admin-text hover:bg-admin-surface'
            }`}
          >
            {appliedPromotion ? `🏷 ${appliedPromotion.name}` : 'Promo'}
          </button>
          <button 
            onClick={() => { setCart([]); setCartDiscount(0); setCustomerName(""); }}
            className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface shrink-0 whitespace-nowrap"
          >
            New Sale
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0}
            className="px-6 py-2 bg-admin-success text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0 whitespace-nowrap"
          >
            F10 Payment
          </button>
          {stockAlerts.length > 0 && (
            <button
              onClick={() => setShowStockAlerts(true)}
              className="relative px-4 py-2 bg-admin-bg border border-admin-border text-amber-400 text-sm hover:bg-admin-surface shrink-0"
              title="Stock Alerts"
            >
              <Bell size={16} />
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                {stockAlerts.length}
              </span>
            </button>
          )}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface shrink-0"
          >
            <Menu size={16} />
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Cart (desktop: always visible, mobile: tab) */}
        <div className="lg:w-80 lg:flex hidden bg-admin-surface border-r border-admin-border flex-col">
          <div className="p-3 border-b border-admin-border">
            <h3 className="text-admin-text font-medium text-sm">Shopping Cart</h3>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <p className="text-center text-admin-text-secondary text-sm mt-8">No items</p>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="bg-admin-bg border border-admin-border p-3 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-admin-text text-sm font-medium">{item.product.name}</span>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-admin-danger hover:opacity-80"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 bg-admin-surface border border-admin-border text-admin-text flex items-center justify-center hover:bg-admin-bg"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-admin-text text-sm w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-6 h-6 bg-admin-surface border border-admin-border text-admin-text flex items-center justify-center hover:bg-admin-bg"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-admin-text font-mono">
                        {formatCurrencySync(item.unit_price * item.quantity - item.discount, schemeCurrencySymbol(), false)}
                      </div>
                      {secondaryCurrency && exchangeRate && (
                        <div className="text-xs text-admin-text-secondary font-mono">
                          {formatCurrencySync(Math.round((item.unit_price * item.quantity - item.discount) * exchangeRate), secondaryCurrency.symbol, false)}
                        </div>
                      )}
                      {selectedSchemeId !== null && schemeItemMap.has(item.product.id) && (
                        <div className="text-xs text-admin-text-secondary line-through">
                          {formatCurrencySync(item.product.price, baseCurrency?.symbol || 'UGX', false)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Totals */}
          <div className="border-t border-admin-border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-admin-text-secondary">Subtotal</span>
              <div className="text-right">
                <div className="text-admin-text font-mono">{formatCurrencySync(subtotal, schemeCurrencySymbol(), false)}</div>
                {secondaryCurrency && exchangeRate && (
                  <div className="text-xs text-admin-text-secondary font-mono">
                    {formatCurrencySync(Math.round(subtotal * exchangeRate), secondaryCurrency.symbol, false)}
                  </div>
                )}
              </div>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-admin-text-secondary">
                  {appliedPromotion ? `Promo: ${appliedPromotion.name}` : 'Discount'}
                </span>
                <div className="text-right">
                  <div className="text-admin-danger font-mono">-{formatCurrencySync(discountAmount, schemeCurrencySymbol(), false)}</div>
                  {secondaryCurrency && exchangeRate && (
                    <div className="text-xs text-admin-text-secondary font-mono">
                      -{formatCurrencySync(Math.round(discountAmount * exchangeRate), secondaryCurrency.symbol, false)}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-admin-text-secondary">Tax ({defaultTax?.rate}%)</span>
              <div className="text-right">
                <div className="text-admin-text font-mono">{formatCurrencySync(taxAmount, schemeCurrencySymbol(), false)}</div>
                {secondaryCurrency && exchangeRate && (
                  <div className="text-xs text-admin-text-secondary font-mono">
                    {formatCurrencySync(Math.round(taxAmount * exchangeRate), secondaryCurrency.symbol, false)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-admin-border pt-2">
              <span className="text-admin-text">Total</span>
              <div className="text-right">
                <div className="text-admin-text font-mono">{formatCurrencySync(total, schemeCurrencySymbol(), false)}</div>
                {secondaryCurrency && exchangeRate && (
                  <div className="text-sm text-admin-text-secondary font-mono">
                    {formatCurrencySync(Math.round(total * exchangeRate), secondaryCurrency.symbol, false)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-admin-border flex gap-2">
            <button
              onClick={handleHoldSale}
              className="flex-1 px-3 py-2 bg-yellow-600 text-white text-sm hover:opacity-90"
            >
              Lock Sale
            </button>
            <button
              onClick={() => setCart([])}
              className="flex-1 px-3 py-2 bg-admin-danger text-white text-sm hover:opacity-90"
            >
              Void Order
            </button>
          </div>
          {heldSales.length > 0 && (
            <div className="p-3 border-t border-admin-border">
              <button
                onClick={() => setShowHeldSales(true)}
                className="w-full px-3 py-2 bg-admin-text text-admin-bg text-sm hover:opacity-90"
              >
                View Held Sales ({heldSales.length})
              </button>
            </div>
          )}
        </div>

        {/* Right Panel - Products */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-3 sm:p-4 border-b border-admin-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-secondary" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or barcode…"
                className="w-full pl-10 pr-10 py-2 bg-admin-surface border border-admin-border text-admin-text placeholder-admin-text-secondary focus:outline-none focus:border-admin-text"
              />
              <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-secondary" size={18} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!selectedCategory ? (
              // Show category folders
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-admin-text font-medium">Categories</h3>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="text-xs text-admin-text-secondary hover:text-admin-text"
                  >
                    View All Products
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categories.map(cat => {
                    const productCount = products.filter(p => p.category === cat.slug).length;
                    return (
                      <button
                        key={cat.slug}
                        onClick={() => setSelectedCategory(cat.slug)}
                        className="bg-admin-surface border-2 border-admin-border hover:border-primary transition-colors flex flex-col items-center overflow-hidden min-h-[150px] rounded"
                      >
                        {cat.image_url ? (
                          <div className="w-full h-24 overflow-hidden">
                            <img
                              src={cat.image_url}
                              alt={cat.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-24 bg-admin-bg flex items-center justify-center">
                            <svg className="w-8 h-8 text-admin-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="p-2 text-center">
                          <div className="text-admin-text font-medium text-sm mb-0.5">{cat.name}</div>
                          <div className="text-xs text-admin-text-secondary">{productCount} product{productCount !== 1 ? 's' : ''}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Show products in selected category
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-admin-text-secondary hover:text-admin-text"
                  >
                    ← Back to Categories
                  </button>
                  <h3 className="text-admin-text font-medium capitalize">
                    {selectedCategory === 'all' ? 'All Products' : selectedCategory}
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredProducts
                    .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
                    .map(product => {
                      const availableStock = product.quantity_on_hand - product.quantity_reserved;
                      const inCart = cart.find(item => item.product.id === product.id);
                      const qtyInCart = inCart ? inCart.quantity : 0;
                      const remainingStock = availableStock - qtyInCart;
                      
                      return (
                        <button
                          key={product.id}
                          onClick={() => addToCart(product)}
                          disabled={!product.in_stock || availableStock <= 0}
                          className="bg-admin-surface border border-admin-border p-3 text-left hover:bg-admin-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col"
                        >
                          {product.image_url ? (
                            <div className="w-full h-32 mb-3 bg-admin-bg rounded overflow-hidden">
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                          ) : (
                            <div className="w-full h-32 mb-3 bg-admin-bg rounded flex items-center justify-center">
                              <svg className="w-10 h-10 text-admin-text-secondary opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                          )}
                          <div className="text-admin-text font-medium text-sm mb-2 line-clamp-2">
                            {product.name}
                          </div>
                          <div className="flex justify-between items-center mb-1">
                            <div className="text-admin-text font-mono text-lg font-bold">
                              {formatCurrencySync(getEffectivePrice(product), schemeCurrencySymbol(), false)}
                              {selectedSchemeId !== null && schemeItemMap.has(product.id) && (
                                <span className="text-xs text-admin-text-secondary line-through ml-1">
                                  {formatCurrencySync(product.price, baseCurrency?.symbol || 'UGX', false)}
                                </span>
                              )}
                            </div>
                            <div className={`text-xs font-bold ${
                              remainingStock <= 0 ? 'text-admin-danger' : 
                              remainingStock <= 5 ? 'text-yellow-600' : 
                              'text-admin-success'
                            }`}>
                              Stock: {remainingStock}
                            </div>
                          </div>
                          {qtyInCart > 0 && (
                            <div className="text-xs text-blue-600 mt-1">
                              {qtyInCart} in cart
                            </div>
                          )}
                          {(!product.in_stock || availableStock <= 0) && (
                            <div className="text-admin-danger text-xs mt-1">Out of stock</div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side Menu */}
        {showMenu && (
          <div className="w-64 bg-admin-surface border-l border-admin-border p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-admin-text font-medium">POS Menu</h3>
              <button onClick={() => setShowMenu(false)}>
                <X size={18} className="text-admin-text-secondary" />
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => navigate(tp("/admin"))}
                className="w-full text-left px-3 py-2 text-sm text-admin-text-secondary hover:text-admin-text hover:bg-admin-bg"
              >
                Management
              </button>
              <button 
                onClick={() => navigate(tp("/pos/sales-history"))}
                className="w-full text-left px-3 py-2 text-sm text-admin-text-secondary hover:text-admin-text hover:bg-admin-bg"
              >
                View Sales History
              </button>
              <button 
                onClick={() => navigate(tp("/pos/cash-management"))}
                className="w-full text-left px-3 py-2 text-sm text-admin-text-secondary hover:text-admin-text hover:bg-admin-bg"
              >
                Cash In / Out
              </button>
              <button 
                onClick={() => navigate(tp("/pos/end-of-day"))}
                className="w-full text-left px-3 py-2 text-sm text-admin-text-secondary hover:text-admin-text hover:bg-admin-bg"
              >
                End of Day
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile floating cart button */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-3 px-5 py-3 bg-admin-success text-white shadow-2xl text-sm font-bold"
          >
            <ShoppingCart size={18} />
            {cart.length} item{cart.length !== 1 ? 's' : ''} — Pay {formatCurrencySync(total, baseCurrency?.symbol || 'UGX', false)}
          </button>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-admin-surface border border-admin-border p-4 sm:p-6 w-full sm:w-[420px] max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-admin-text mb-4">Process Payment</h2>

            {/* Mode tabs */}
            <div className="flex gap-1 mb-4 bg-admin-bg border border-admin-border p-1">
              <button
                onClick={() => setPaymentMode('cash')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  paymentMode === 'cash' ? 'bg-admin-text text-admin-bg' : 'text-admin-text-secondary hover:text-admin-text'
                }`}
              >Cash / Card</button>
              <button
                onClick={() => setPaymentMode('credit')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  paymentMode === 'credit' ? 'bg-orange-500 text-white' : 'text-admin-text-secondary hover:text-admin-text'
                }`}
              >Credit (Invoice)</button>
            </div>

            {/* Order summary */}
            <div className="bg-admin-bg border border-admin-border p-4 space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-admin-text-secondary">Subtotal</span>
                <span className="text-admin-text font-mono">{formatCurrencySync(subtotal, schemeCurrencySymbol(), false)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-admin-text-secondary">
                    {appliedPromotion ? `🏷 ${appliedPromotion.name}` : 'Discount'}
                  </span>
                  <span className="text-red-400 font-mono">-{formatCurrencySync(discountAmount, schemeCurrencySymbol(), false)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-admin-text-secondary">Tax ({defaultTax?.rate}%)</span>
                <span className="text-admin-text font-mono">{formatCurrencySync(taxAmount, schemeCurrencySymbol(), false)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-admin-border pt-2">
                <span className="text-admin-text">Total</span>
                <span className="text-admin-text font-mono">{formatCurrencySync(total, schemeCurrencySymbol(), false)}</span>
              </div>
            </div>

            {paymentMode === 'cash' ? (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm text-admin-text-secondary mb-1">Payment Type</label>
                  <select
                    value={selectedPaymentType || ""}
                    onChange={(e) => setSelectedPaymentType(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text"
                  >
                    {paymentTypes.map(pt => (
                      <option key={pt.id} value={pt.id}>{pt.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                <p className="text-xs text-orange-400 bg-orange-400/10 border border-orange-400/20 px-3 py-2">
                  Credit sale — an invoice will be created and payment tracked separately.
                </p>
                <div>
                  <label className="block text-sm text-admin-text-secondary mb-1">Customer Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={creditCustomerName}
                    onChange={e => setCreditCustomerName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm text-admin-text-secondary mb-1">Phone</label>
                    <input
                      type="text"
                      value={creditCustomerPhone}
                      onChange={e => setCreditCustomerPhone(e.target.value)}
                      placeholder="+211..."
                      className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-admin-text-secondary mb-1">Email</label>
                    <input
                      type="email"
                      value={creditCustomerEmail}
                      onChange={e => setCreditCustomerEmail(e.target.value)}
                      placeholder="email@..."
                      className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-admin-text-secondary mb-1">Due Date</label>
                  <input
                    type="date"
                    value={creditDueDate}
                    onChange={e => setCreditDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowPaymentModal(false); setPaymentMode('cash'); }}
                className="flex-1 px-4 py-2 bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-surface"
              >
                Cancel
              </button>
              {paymentMode === 'cash' ? (
                <button onClick={handlePayment} className="flex-1 px-4 py-2 bg-admin-success text-white hover:opacity-90">
                  Complete Sale
                </button>
              ) : (
                <button onClick={handleCreditPayment} className="flex-1 px-4 py-2 bg-orange-500 text-white hover:opacity-90">
                  Create Invoice
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && completedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 w-96 max-h-[90vh] overflow-y-auto font-mono">
            <div className="bg-white shadow-xl mb-6 flex justify-center" style={{ minHeight: '100mm' }}>
              <div 
                style={{ width: '80mm', backgroundColor: 'white', padding: '0', margin: '0' }}
                dangerouslySetInnerHTML={{ __html: buildReceiptBody(completedSale) }} 
              />
            </div>

            <button
              onClick={() => {
                setShowReceipt(false);
                setCart([]);
                setCartDiscount(0);
                setCustomerName('');
                setAppliedPromotion(null);
              }}
              className="w-full px-4 py-2 bg-admin-success text-white hover:opacity-90 text-sm font-semibold"
            >
              New Sale
            </button>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-admin-surface border border-admin-border p-6 w-96">
            <h2 className="text-xl font-bold text-admin-text mb-4">Customer Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-admin-text-secondary mb-2">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text placeholder-admin-text-secondary"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="flex-1 px-4 py-2 bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-surface"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="flex-1 px-4 py-2 bg-admin-text text-admin-bg hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promotion Picker Modal */}
      {showPromoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-admin-surface border border-admin-border p-6 w-[460px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-admin-text">Apply Promotion</h2>
              <button onClick={() => setShowPromoModal(false)}><X size={18} className="text-admin-text-secondary" /></button>
            </div>
            {activePromotions.length === 0 ? (
              <p className="text-admin-text-secondary text-sm py-4 text-center">No active promotions available.</p>
            ) : (
              <div className="overflow-y-auto space-y-2 flex-1">
                {activePromotions.map(promo => (
                  <button
                    key={promo.id}
                    onClick={() => applyPromotion(appliedPromotion?.id === promo.id ? null : promo)}
                    className={`w-full text-left p-4 border transition-colors ${
                      appliedPromotion?.id === promo.id
                        ? 'bg-emerald-600/20 border-emerald-500 text-admin-text'
                        : 'bg-admin-bg border-admin-border text-admin-text hover:bg-admin-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{promo.name}</div>
                        {promo.description && (
                          <div className="text-xs text-admin-text-secondary mt-0.5">{promo.description}</div>
                        )}
                        <div className="text-xs text-admin-text-secondary mt-1">
                          {promo.end_date ? `Valid until ${new Date(promo.end_date).toLocaleDateString('en-GB')}` : 'No expiry'}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold font-mono text-emerald-400">
                          {promo.discount_type === 'percentage' ? `${promo.discount_value}% OFF` : `UGX ${Number(promo.discount_value).toLocaleString()} OFF`}
                        </div>
                        {appliedPromotion?.id === promo.id && (
                          <div className="text-xs text-emerald-400 mt-1">✓ Applied</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {appliedPromotion && (
              <button
                onClick={() => applyPromotion(null)}
                className="mt-4 w-full px-4 py-2 bg-admin-bg border border-admin-border text-admin-text-secondary text-sm hover:text-admin-text hover:bg-admin-surface"
              >
                Remove Promotion
              </button>
            )}
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-admin-surface border border-admin-border p-6 w-96">
            <h2 className="text-xl font-bold text-admin-text mb-4">Apply Discount</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-admin-text-secondary mb-2">Discount Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDiscountType("percentage")}
                    className={`flex-1 px-4 py-2 text-sm ${
                      discountType === "percentage"
                        ? "bg-admin-text text-admin-bg"
                        : "bg-admin-bg border border-admin-border text-admin-text"
                    }`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    onClick={() => setDiscountType("amount")}
                    className={`flex-1 px-4 py-2 text-sm ${
                      discountType === "amount"
                        ? "bg-admin-text text-admin-bg"
                        : "bg-admin-bg border border-admin-border text-admin-text"
                    }`}
                  >
                    Amount ({baseCurrency?.symbol || 'UGX'})
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-admin-text-secondary mb-2">
                  {discountType === "percentage" ? "Percentage" : "Amount (in cents)"}
                </label>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  placeholder={discountType === "percentage" ? "Enter percentage" : "Enter amount"}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text placeholder-admin-text-secondary"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDiscountModal(false);
                  setDiscountValue(0);
                  setCartDiscount(0);
                }}
                className="flex-1 px-4 py-2 bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-surface"
              >
                Clear
              </button>
              <button
                onClick={applyDiscount}
                className="flex-1 px-4 py-2 bg-admin-text text-admin-bg hover:opacity-90"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Held Sales Modal */}
      {showHeldSales && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-admin-surface border border-admin-border p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-admin-text">Held Sales</h2>
              <button
                onClick={() => setShowHeldSales(false)}
                className="text-admin-text-secondary hover:text-admin-text"
              >
                <X size={20} />
              </button>
            </div>
            
            {heldSales.length === 0 ? (
              <p className="text-center text-admin-text-secondary py-8">No held sales</p>
            ) : (
              <div className="space-y-3">
                {heldSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="bg-admin-bg border border-admin-border p-4 hover:bg-admin-surface cursor-pointer"
                    onClick={() => loadHeldSale(sale)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-bold text-admin-text">{sale.sale_number}</p>
                        <p className="text-xs text-admin-text-secondary">{sale.customerName}</p>
                      </div>
                      <p className="text-sm font-bold text-admin-text font-mono">
                        {formatCurrencySync(sale.total, baseCurrency?.symbol || 'UGX', false)}
                      </p>
                    </div>
                    <div className="text-xs text-admin-text-secondary">
                      {sale.items.length} item(s) • {new Date(sale.created_at).toLocaleString()}
                    </div>
                    <div className="mt-2 text-xs text-yellow-600">
                      Click to load and continue
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── Stock Alert Panel ── */}
      {showStockAlerts && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-admin-surface border border-admin-border w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-admin-border bg-admin-bg">
              <div className="flex items-center gap-3">
                <AlertTriangle size={16} className="text-amber-400" />
                <div>
                  <p className="font-mono-tech text-[9px] text-amber-400 uppercase tracking-widest">Inventory</p>
                  <h2 className="text-sm font-bold text-admin-text">Stock Alerts</h2>
                </div>
                <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {stockAlerts.length}
                </span>
              </div>
              <button onClick={() => setShowStockAlerts(false)} className="text-admin-text-secondary hover:text-admin-text">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-admin-border">
              {(["expired", "out_of_stock", "low_stock"] as const).map(kind => {
                const group = stockAlerts.filter(a => a.kind === kind);
                if (!group.length) return null;
                const meta = {
                  expired:     { icon: <Clock size={13} className="text-red-400" />,     label: "Expired",       color: "text-red-400",   bg: "bg-red-500/10" },
                  out_of_stock:{ icon: <PackageX size={13} className="text-orange-400" />, label: "Out of Stock",  color: "text-orange-400", bg: "bg-orange-500/10" },
                  low_stock:   { icon: <AlertTriangle size={13} className="text-amber-400" />, label: "Low Stock",  color: "text-amber-400",  bg: "bg-amber-500/10" },
                }[kind];
                return (
                  <div key={kind}>
                    <div className={`px-5 py-2 ${meta.bg} flex items-center gap-2`}>
                      {meta.icon}
                      <span className={`font-mono-tech text-[9px] uppercase tracking-widest font-bold ${meta.color}`}>
                        {meta.label} — {group.length} item{group.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    {group.map(({ product }) => (
                      <div key={product.id} className="px-5 py-2.5 flex items-center justify-between hover:bg-admin-bg">
                        <div>
                          <p className="text-sm text-admin-text font-medium">{product.name}</p>
                          <p className="text-xs text-admin-text-secondary font-mono-tech">
                            {product.brand} · {product.category}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          {kind === "expired" && (
                            <p className="text-xs text-red-400 font-mono-tech">
                              Exp: {new Date((product as any).expiry_date).toLocaleDateString()}
                            </p>
                          )}
                          {kind !== "expired" && (
                            <p className="text-xs font-mono-tech text-admin-text-secondary">
                              Qty: {product.quantity_on_hand ?? 0}
                              {(product as any).reorder_level > 0 && ` / Min ${(product as any).reorder_level}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-admin-border bg-admin-bg flex justify-between items-center">
              <p className="font-mono-tech text-[9px] text-admin-text-secondary uppercase tracking-widest">
                Update stock in Admin → Products
              </p>
              <button
                onClick={() => setShowStockAlerts(false)}
                className="px-4 py-1.5 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
