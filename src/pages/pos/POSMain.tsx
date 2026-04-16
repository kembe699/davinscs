import { useState, useEffect } from "react";
import { Search, ShoppingCart, CreditCard, Trash2, Plus, Minus, DollarSign, User, Menu, X } from "lucide-react";
import { api, ApiProduct, PaymentType, TaxRate, CashDrawerSession } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export default function POSMain() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ApiProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Array<{ product: ApiProduct; quantity: number; discount: number }>>([]);
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

  useEffect(() => {
    loadData();
    checkCashDrawer();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
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
    const availableStock = product.quantity_on_hand - product.quantity_reserved;
    
    if (currentQtyInCart >= availableStock) {
      alert(`Cannot add more! Only ${availableStock} units available in stock.`);
      return;
    }
    
    if (existing) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1, discount: 0 }]);
    }
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    const cartItem = cart.find(item => item.product.id === productId);
    if (cartItem) {
      const availableStock = cartItem.product.quantity_on_hand - cartItem.product.quantity_reserved;
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
      return sum + (item.product.price * item.quantity) - item.discount;
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
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
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
            <p>${item.product.name} x ${item.quantity} - UGX ${(item.product.price / 100).toFixed(0)}</p>
          `).join('')}
          <div class="line"></div>
          <p><strong>Total: UGX ${(sale.total / 100).toFixed(0)}</strong></p>
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
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
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
            Discount {cartDiscount > 0 ? `(-${discountType === 'percentage' ? discountValue + '%' : 'UGX ' + (discountValue/100).toFixed(0)})` : ''}
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
                    <span className="text-admin-text font-mono">
                      {((item.product.price * item.quantity - item.discount) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Totals */}
          <div className="border-t border-admin-border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-admin-text-secondary">Subtotal</span>
              <span className="text-admin-text font-mono">UGX {(subtotal / 100).toFixed(0)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-admin-text-secondary">Discount</span>
                <span className="text-admin-danger font-mono">-UGX {(discountAmount / 100).toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-admin-text-secondary">Tax ({defaultTax?.rate}%)</span>
              <span className="text-admin-text font-mono">UGX {(taxAmount / 100).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-admin-border pt-2">
              <span className="text-admin-text">Total</span>
              <span className="text-admin-text font-mono">UGX {(total / 100).toFixed(0)}</span>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map(product => {
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
                        UGX {(product.price / 100).toFixed(0)}
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
          <div className="bg-admin-surface border border-admin-border p-6 w-96">
            <h2 className="text-xl font-bold text-admin-text mb-4">Process Payment</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-admin-text-secondary mb-2">Payment Type</label>
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

              <div className="bg-admin-bg border border-admin-border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-admin-text-secondary">Subtotal</span>
                  <span className="text-admin-text font-mono">{(subtotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-admin-text-secondary">Tax ({defaultTax?.rate}%)</span>
                  <span className="text-admin-text font-mono">{(taxAmount / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-admin-border pt-2">
                  <span className="text-admin-text">Total</span>
                  <span className="text-admin-text font-mono">{(total / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-surface"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                className="flex-1 px-4 py-2 bg-admin-success text-white hover:opacity-90"
              >
                Complete Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && completedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 w-96 max-h-[90vh] overflow-y-auto font-mono">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-black uppercase">Davin's Camera Store</h2>
              <p className="text-xs text-black">Kampala, Uganda</p>
              <p className="text-xs text-black">Tel: +256-XXX-XXXXXX</p>
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
                    <span>UGX {(item.product.price / 100).toFixed(0)}</span>
                    <span>UGX {((item.product.price * item.quantity - item.discount) / 100).toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-black pt-2 mb-4">
              <div className="flex justify-between text-xs text-black mb-1">
                <span>Subtotal:</span>
                <span>UGX {(completedSale.subtotal / 100).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-xs text-black mb-1">
                <span>Tax ({defaultTax?.rate}%):</span>
                <span>UGX {(completedSale.taxAmount / 100).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-black pt-2 mt-2">
                <span className="text-black">TOTAL:</span>
                <span className="text-black">UGX {(completedSale.total / 100).toFixed(0)}</span>
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
                    Amount (UGX)
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
                        UGX {(sale.total / 100).toFixed(0)}
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
