import { useState, useEffect } from "react";
import { Search, ShoppingCart, CreditCard, Trash2, Plus, Minus, DollarSign, User, Menu, X } from "lucide-react";
import { api, ApiProduct, PaymentType, TaxRate, CashDrawerSession, ApiCurrency, PriceList, PriceListItem } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";

export default function POSMain() {
  const navigate = useNavigate();
  const { baseCurrency } = useCurrency();
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
  const [categories, setCategories] = useState<string[]>([]);
  const [secondaryCurrency, setSecondaryCurrency] = useState<ApiCurrency | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [schemes, setSchemes] = useState<PriceList[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<number | null>(null);
  const [schemeItemMap, setSchemeItemMap] = useState<Map<number, number>>(new Map());
  const selectedScheme = (schemes as any[]).find(s => s.id === selectedSchemeId) ?? null;

  useEffect(() => {
    loadData();
    checkCashDrawer();
    loadCompanyData();
    loadSecondaryCurrency();
    loadSchemes();
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

  useEffect(() => {
    // Extract unique categories from products
    const uniqueCategories = [...new Set(products.map(p => p.category))].filter(Boolean);
    setCategories(uniqueCategories);
  }, [products]);

  const loadSchemes = async () => {
    try {
      const data = await api.priceLists.active();
      setSchemes(data);
    } catch (err) {
      console.error("Failed to load schemes:", err);
    }
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
      // Get first non-base active currency as secondary
      const secondary = currencies.find(c => !c.is_base && c.is_active);
      if (secondary) {
        setSecondaryCurrency(secondary);
        // Get base currency
        const base = currencies.find(c => c.is_base);
        if (base) {
          // Try to get exchange rate from base to secondary
          try {
            const rate = await api.exchangeRates.getActive(base.id, secondary.id);
            setExchangeRate(parseFloat(rate.rate.toString()));
          } catch (err) {
            // If no rate found, calculate from exchange_rate fields
            const calculatedRate = parseFloat(secondary.exchange_rate.toString()) / parseFloat(base.exchange_rate.toString());
            setExchangeRate(calculatedRate);
          }
        }
      }
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
      const [productsData, paymentTypesData, taxData] = await Promise.all([
        api.products.list(),
        api.paymentTypes.active(),
        api.taxRates.default(),
      ]);
      setProducts(productsData);
      setFilteredProducts(productsData);
      setPaymentTypes(paymentTypesData);
      setDefaultTax(taxData);
      if (paymentTypesData.length > 0) {
        setSelectedPaymentType(paymentTypesData[0].id);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  };

  const checkCashDrawer = async () => {
    try {
      const session = await api.cashDrawer.getCurrent();
      setCashDrawerSession(session);
    } catch (err) {
      console.error("No active cash drawer session");
    }
  };

  const addToCart = (product: ApiProduct) => {
    const existing = cart.find(item => item.product.id === product.id);
    const currentQtyInCart = existing ? existing.quantity : 0;
    const availableStock = (product.quantity_on_hand ?? 0) - (product.quantity_reserved ?? 0);
    
    if (currentQtyInCart >= availableStock) {
      alert(`Cannot add more! Only ${availableStock} units available in stock.`);
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
        alert(`Cannot set quantity to ${quantity}! Only ${availableStock} units available in stock.`);
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
    const { subtotal } = calculateTotals();
    if (discountType === "percentage") {
      setCartDiscount(Math.round(subtotal * (discountValue / 100)));
    } else {
      setCartDiscount(discountValue);
    }
    setShowDiscountModal(false);
  };

  const handleHoldSale = async () => {
    if (cart.length === 0) {
      alert("Cart is empty");
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
      
      alert(`Sale ${sale.sale_number} held successfully!`);
    } catch (err: any) {
      alert(err.message || "Failed to hold sale");
    }
  };

  const printSaleOrder = (sale: any) => {
    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Sale Order - ${sale.sale_number}</title>
          <style>
            body { font-family: monospace; padding: 20px; }
            h2 { text-align: center; }
            .line { border-top: 1px solid black; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h2>SALE ORDER</h2>
          <p>Order #: ${sale.sale_number}</p>
          <p>Customer: ${sale.customerName}</p>
          <p>Date: ${new Date().toLocaleString()}</p>
          <div class="line"></div>
          <h3>Items:</h3>
          ${sale.items.map((item: any) => `
            <p>${item.product.name} x ${item.quantity} - ${formatCurrencySync(item.product.price, baseCurrency?.symbol || 'UGX', false)}</p>
          `).join('')}
          <div class="line"></div>
          <p><strong>Total: ${formatCurrencySync(sale.total, baseCurrency?.symbol || 'UGX', false)}</strong></p>
          <p style="text-align: center; margin-top: 20px;">*** HELD - NOT PAID ***</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
      alert('Customer name is required for credit sales');
      return;
    }
    if (cart.length === 0) { alert('Cart is empty'); return; }
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
      alert(`Invoice ${invoice.invoice_number} created! Total: ${formatCurrencySync(total, schemeCurrencySymbol(), false)}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create invoice');
    }
  };

  const handlePayment = async () => {
    if (!selectedPaymentType) {
      alert("Please select a payment type");
      return;
    }

    if (cart.length === 0) {
      alert("Cart is empty");
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
        payment_type_id: selectedPaymentType,
        discount_amount: cartDiscount,
        sale_type: "regular",
        status: "completed",
      };

      const sale = await api.pos.createSale(saleData);
      
      // Store completed sale data for receipt
      setCompletedSale({
        ...sale,
        items: cart,
        subtotal,
        taxAmount,
        total,
        paymentTypeName: paymentTypes.find(pt => pt.id === selectedPaymentType)?.name || 'Cash',
        customerName: customerName || 'Walk-in Customer',
      });
      
      // Clear cart
      setCart([]);
      setCartDiscount(0);
      setShowPaymentModal(false);
      
      // Show receipt
      setShowReceipt(true);
    } catch (err: any) {
      alert(err.message || "Failed to process sale");
    }
  };

  const { subtotal, taxAmount, total, discountAmount } = calculateTotals();

  return (
    <div className="h-screen bg-admin-bg flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-admin-surface border-b border-admin-border p-3 flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <select
            value={selectedSchemeId ?? ""}
            onChange={e => setSelectedSchemeId(e.target.value === "" ? null : Number(e.target.value))}
            className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface"
            title="Pricing Scheme"
          >
            <option value="">Cash (Standard)</option>
            {schemes.map(s => (
              <option key={s.id} value={s.id}>{s.name}{s.currency_code ? ` (${s.currency_code})` : ""}</option>
            ))}
          </select>
          <button 
            onClick={() => setShowCustomerModal(true)}
            className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-2"
          >
            <User size={16} />
            {customerName || "Customer"}
          </button>
          <button 
            onClick={() => setShowDiscountModal(true)}
            className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface"
          >
            Discount {cartDiscount > 0 ? `(-${discountType === 'percentage' ? discountValue + '%' : formatCurrencySync(discountValue, baseCurrency?.symbol || 'UGX', false)})` : ''}
          </button>
          <button 
            onClick={() => { setCart([]); setCartDiscount(0); setCustomerName(""); }}
            className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface"
          >
            New Sale
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0}
            className="px-6 py-2 bg-admin-success text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            F10 Payment
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface"
          >
            <Menu size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Cart */}
        <div className="w-80 bg-admin-surface border-r border-admin-border flex flex-col">
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
                <span className="text-admin-text-secondary">Discount</span>
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
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-admin-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-secondary" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name or barcode"
                className="w-full pl-10 pr-4 py-2 bg-admin-surface border border-admin-border text-admin-text placeholder-admin-text-secondary focus:outline-none focus:border-admin-text"
              />
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
                  {categories.map(category => {
                    const categoryProducts = products.filter(p => p.category === category);
                    const productCount = categoryProducts.length;
                    
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className="bg-admin-surface border-2 border-admin-border p-6 hover:border-admin-text transition-colors flex flex-col items-center justify-center gap-3 min-h-[150px]"
                      >
                        <div className="w-16 h-16 bg-admin-bg rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-admin-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <div className="text-admin-text font-medium capitalize mb-1">
                            {category}
                          </div>
                          <div className="text-xs text-admin-text-secondary">
                            {productCount} product{productCount !== 1 ? 's' : ''}
                          </div>
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
                          {product.image_url && (
                            <div className="w-full h-32 mb-3 bg-admin-bg rounded overflow-hidden">
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
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
                onClick={() => navigate("/admin")}
                className="w-full text-left px-3 py-2 text-sm text-admin-text-secondary hover:text-admin-text hover:bg-admin-bg"
              >
                Management
              </button>
              <button 
                onClick={() => navigate("/pos/sales-history")}
                className="w-full text-left px-3 py-2 text-sm text-admin-text-secondary hover:text-admin-text hover:bg-admin-bg"
              >
                View Sales History
              </button>
              <button 
                onClick={() => navigate("/pos/cash-management")}
                className="w-full text-left px-3 py-2 text-sm text-admin-text-secondary hover:text-admin-text hover:bg-admin-bg"
              >
                Cash In / Out
              </button>
              <button 
                onClick={() => navigate("/pos/end-of-day")}
                className="w-full text-left px-3 py-2 text-sm text-admin-text-secondary hover:text-admin-text hover:bg-admin-bg"
              >
                End of Day
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-admin-surface border border-admin-border p-6 w-[420px] max-h-[90vh] overflow-y-auto">
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
                  <span className="text-admin-text-secondary">Discount</span>
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
                      placeholder="+256..."
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
            <div className="text-center mb-6">
              {companyData?.logo && (
                <div className="flex justify-center mb-2">
                  <img src={companyData.logo} alt={companyData.name} className="h-12 object-contain" />
                </div>
              )}
              <h2 className="text-xl font-bold text-black uppercase">{companyData?.name || "Davin's Camera Store"}</h2>
              <p className="text-xs text-black">{companyData?.address || "Kampala, Uganda"}</p>
              {companyData?.city && <p className="text-xs text-black">{companyData.city}, {companyData.country}</p>}
              <p className="text-xs text-black">Tel: {companyData?.phone || "+256-XXX-XXXXXX"}</p>
              {companyData?.email && <p className="text-xs text-black">Email: {companyData.email}</p>}
              {companyData?.tax_id && <p className="text-xs text-black">Tax ID: {companyData.tax_id}</p>}
              <div className="border-t border-black my-3"></div>
              <p className="text-sm font-bold text-black">SALES RECEIPT</p>
              <p className="text-xs text-black">#{completedSale.sale_number}</p>
              <p className="text-xs text-black">{new Date(completedSale.created_at).toLocaleString()}</p>
              <div className="border-t border-black my-3"></div>
              <p className="text-xs text-black text-left">Customer: {completedSale.customerName}</p>
            </div>

            <div className="mb-4">
              <div className="border-b border-black pb-1 mb-2">
                <div className="flex justify-between text-xs font-bold text-black">
                  <span>ITEM</span>
                  <span>QTY</span>
                  <span>PRICE</span>
                  <span>TOTAL</span>
                </div>
              </div>
              {completedSale.items.map((item: any, idx: number) => (
                <div key={idx} className="mb-2">
                  <div className="text-xs text-black">{item.product.name}</div>
                  <div className="flex justify-between text-xs text-black">
                    <span></span>
                    <span>{item.quantity}</span>
                    <span>{formatCurrencySync(item.unit_price, baseCurrency?.symbol || 'UGX', false)}</span>
                    <span>{formatCurrencySync(item.unit_price * item.quantity - item.discount, baseCurrency?.symbol || 'UGX', false)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-black pt-2 mb-4">
              <div className="flex justify-between text-xs text-black mb-1">
                <span>Subtotal:</span>
                <span>{formatCurrencySync(completedSale.subtotal, baseCurrency?.symbol || 'UGX', false)}</span>
              </div>
              <div className="flex justify-between text-xs text-black mb-1">
                <span>Tax ({defaultTax?.rate}%):</span>
                <span>{formatCurrencySync(completedSale.taxAmount, baseCurrency?.symbol || 'UGX', false)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-black pt-2 mt-2">
                <span className="text-black">TOTAL:</span>
                <span className="text-black">{formatCurrencySync(completedSale.total, baseCurrency?.symbol || 'UGX', false)}</span>
              </div>
              <div className="flex justify-between text-xs text-black mt-3">
                <span>Payment:</span>
                <span>{completedSale.paymentTypeName}</span>
              </div>
            </div>

            <div className="text-center text-xs text-black mb-6 border-t border-black pt-3">
              <p>*** Thank you for your business! ***</p>
              <p>*** Please come again ***</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 px-4 py-2 bg-gray-800 text-white hover:bg-gray-700"
              >
                Print Receipt
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 px-4 py-2 bg-admin-success text-white hover:opacity-90"
              >
                New Sale
              </button>
            </div>
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
    </div>
  );
}
