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
    } else {
      setCart(cart.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity) - item.discount;
    }, 0);
    
    const taxRate = defaultTax?.rate || 0;
    const taxAmount = Math.round(subtotal * (taxRate / 100));
    const total = subtotal + taxAmount - cartDiscount;

    return { subtotal, taxAmount, total };
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
      const { subtotal, taxAmount, total } = calculateTotals();
      
      const saleData = {
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
          discount_amount: item.discount,
        })),
        payment_type_id: selectedPaymentType,
        discount_amount: cartDiscount,
        sale_type: "regular",
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

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="h-screen bg-admin-bg flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-admin-surface border-b border-admin-border p-3 flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <button className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-2">
            <Search size={16} />
            Search
          </button>
          <button className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-2">
            <User size={16} />
            Customer
          </button>
          <button className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface">
            Discount
          </button>
          <button 
            onClick={() => { setCart([]); setCartDiscount(0); }}
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
          <button className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface">
            F12 Cash
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
          <div className="p-3 border-b border-admin-border flex gap-2">
            <button className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface">
              <Trash2 size={14} className="inline mr-1" />
              Delete
            </button>
            <button className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface">
              Quantity
            </button>
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
              <span className="text-admin-text font-mono">{(subtotal / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-admin-text-secondary">Tax</span>
              <span className="text-admin-text font-mono">{(taxAmount / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-admin-border pt-2">
              <span className="text-admin-text">Total</span>
              <span className="text-admin-text font-mono">{(total / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="p-3 border-t border-admin-border flex gap-2">
            <button
              onClick={() => setCart([])}
              className="flex-1 px-3 py-2 bg-admin-danger text-white text-sm hover:opacity-90"
            >
              Void Order
            </button>
          </div>
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
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={!product.in_stock}
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
                  <div className="text-admin-text font-mono text-lg font-bold">
                    UGX {(product.price / 100).toFixed(0)}
                  </div>
                  {!product.in_stock && (
                    <div className="text-admin-danger text-xs mt-1">Out of stock</div>
                  )}
                </button>
              ))}
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
              <button className="w-full text-left px-3 py-2 text-sm text-admin-text-secondary hover:text-admin-text hover:bg-admin-bg">
                View Sales History
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-admin-text-secondary hover:text-admin-text hover:bg-admin-bg">
                Cash In / Out
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-admin-text-secondary hover:text-admin-text hover:bg-admin-bg">
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
          <div className="bg-white p-8 w-96 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Davin's Camera Store</h2>
              <p className="text-sm text-gray-600">Kampala, Uganda</p>
              <p className="text-sm text-gray-600">+256-XXX-XXXXXX</p>
              <div className="border-t border-gray-300 my-4"></div>
              <p className="text-lg font-bold">SALES RECEIPT</p>
              <p className="text-sm text-gray-600">#{completedSale.sale_number}</p>
              <p className="text-xs text-gray-500">{new Date(completedSale.created_at).toLocaleString()}</p>
            </div>

            <div className="mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2">Item</th>
                    <th className="text-center py-2">Qty</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSale.items.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-2">{item.product.name}</td>
                      <td className="text-center py-2">{item.quantity}</td>
                      <td className="text-right py-2">UGX {(item.product.price / 100).toFixed(0)}</td>
                      <td className="text-right py-2">UGX {((item.product.price * item.quantity - item.discount) / 100).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-mono">UGX {(completedSale.subtotal / 100).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax ({defaultTax?.rate}%):</span>
                <span className="font-mono">UGX {(completedSale.taxAmount / 100).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                <span>TOTAL:</span>
                <span className="font-mono">UGX {(completedSale.total / 100).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm mt-4">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-semibold">{completedSale.paymentTypeName}</span>
              </div>
            </div>

            <div className="text-center text-xs text-gray-500 mb-6">
              <p>Thank you for your business!</p>
              <p>Please come again</p>
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
    </div>
  );
}
