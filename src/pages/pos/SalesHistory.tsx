import { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, User, Printer, Mail, Trash2, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

export default function SalesHistory() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentTypes, setPaymentTypes] = useState<any[]>([]);
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);

  useEffect(() => {
    loadData();
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      const data = await api.company.get();
      setCompanyData(data);
    } catch (err) {
      console.error("Failed to load company data:", err);
    }
  };

  const loadData = async () => {
    try {
      const [salesData, paymentTypesData] = await Promise.all([
        api.pos.getSales(),
        api.paymentTypes.active(),
      ]);
      setSales(salesData);
      setPaymentTypes(paymentTypesData);
    } catch (err) {
      console.error("Failed to load sales:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSaleDetails = async (saleId: number) => {
    try {
      const sale = await api.pos.getSale(saleId);
      setSelectedSale(sale);
      setSaleItems(sale.items || []);
    } catch (err) {
      console.error("Failed to load sale details:", err);
    }
  };

  const getPaymentTypeName = (paymentTypeId: number) => {
    const pt = paymentTypes.find(p => p.id === paymentTypeId);
    return pt?.name || 'Unknown';
  };

  const handleRefresh = () => {
    setLoading(true);
    loadData();
  };

  const handlePrint = () => {
    if (!selectedSale) {
      alert("Please select a sale to print");
      return;
    }
    setReceiptData(selectedSale);
    setShowReceiptModal(true);
  };

  const handleRefund = async () => {
    if (!selectedSale) {
      alert("Please select a sale to refund");
      return;
    }
    if (selectedSale.voided) {
      alert("This sale has already been refunded");
      return;
    }
    if (!confirm(`Are you sure you want to refund sale ${selectedSale.sale_number}?`)) return;
    
    try {
      await api.pos.voidSale(selectedSale.id);
      alert("Sale refunded successfully");
      loadData();
      setSelectedSale(null);
    } catch (err: any) {
      alert(err.message || "Failed to refund sale");
    }
  };

  const handleDelete = async () => {
    if (!selectedSale) {
      alert("Please select a sale to delete");
      return;
    }
    if (!confirm(`Are you sure you want to delete sale ${selectedSale.sale_number}? This action cannot be undone.`)) return;
    
    try {
      await api.pos.voidSale(selectedSale.id);
      alert("Sale deleted successfully");
      loadData();
      setSelectedSale(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete sale");
    }
  };

  const filteredSales = sales.filter(sale => {
    if (startDate && new Date(sale.created_at) < new Date(startDate)) return false;
    if (endDate && new Date(sale.created_at) > new Date(endDate)) return false;
    if (filterCustomer && !sale.customer_id) return false;
    if (filterUser && filterUser !== "all") return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-admin-bg">
      {/* Header */}
      <div className="bg-admin-surface border-b border-admin-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/pos")}
              className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-surface flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to POS
            </button>
            <h1 className="text-xl font-bold text-admin-text">Sales history</h1>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <select className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm">
            <option>POS</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
          />
          <span className="text-admin-text-secondary">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
          />
          <button
            onClick={handleRefresh}
            className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button 
            onClick={() => setFilterUser(filterUser === "all" ? "" : "all")}
            className={`px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface ${
              filterUser === "all" ? "bg-admin-text text-admin-bg" : ""
            }`}
          >
            Show all users
          </button>
          <button 
            onClick={() => setFilterCustomer(filterCustomer ? "" : "customer")}
            className={`px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-2 ${
              filterCustomer ? "bg-admin-text text-admin-bg" : ""
            }`}
          >
            <User size={14} />
            Customer
          </button>
          <button 
            onClick={handlePrint}
            className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-2"
          >
            <Printer size={14} />
            Print
          </button>
          <button 
            onClick={() => window.print()}
            className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-2"
          >
            <Mail size={14} />
            Send email
          </button>
          <button 
            onClick={handleRefund}
            className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface"
          >
            Refund
          </button>
          <button 
            onClick={handleDelete}
            className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-danger text-sm hover:bg-admin-surface flex items-center gap-2"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="p-4">
        <div className="bg-admin-surface border border-admin-border mb-4">
          <div className="bg-admin-bg px-4 py-2 border-b border-admin-border">
            <h3 className="text-sm font-medium text-admin-text">Documents</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-admin-text-secondary">Loading...</div>
          ) : filteredSales.length === 0 ? (
            <div className="p-8 text-center text-admin-text-secondary">No sales found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-admin-bg border-b border-admin-border">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">ID</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Document type</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">User</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Number</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">External...</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Customer</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Date</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Created</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">POS</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Ord...</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Payment...</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Discount</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-admin-text">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale, index) => (
                    <tr
                      key={sale.id}
                      onClick={() => loadSaleDetails(sale.id)}
                      className={`border-b border-admin-border cursor-pointer hover:bg-admin-bg ${
                        selectedSale?.id === sale.id ? 'bg-admin-bg' : ''
                      } ${sale.voided ? 'text-admin-danger' : 'text-admin-text'}`}
                    >
                      <td className="px-3 py-2 text-xs">{index + 1}</td>
                      <td className="px-3 py-2 text-xs">{sale.voided ? 'Refund' : 'Sales'}</td>
                      <td className="px-3 py-2 text-xs">levi</td>
                      <td className="px-3 py-2 text-xs">{sale.sale_number}</td>
                      <td className="px-3 py-2 text-xs">{sale.sale_number}</td>
                      <td className="px-3 py-2 text-xs">Walk-in customer</td>
                      <td className="px-3 py-2 text-xs">{new Date(sale.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-xs">{new Date(sale.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs">N/A</td>
                      <td className="px-3 py-2 text-xs">{index + 1}</td>
                      <td className="px-3 py-2 text-xs">{getPaymentTypeName(sale.payment_type_id)}</td>
                      <td className="px-3 py-2 text-xs">{sale.discount_amount > 0 ? `${((sale.discount_amount / sale.subtotal) * 100).toFixed(0)}%` : '0%'}</td>
                      <td className="px-3 py-2 text-xs text-right font-mono">{(sale.total_amount / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Document Items Table */}
        <div className="bg-admin-surface border border-admin-border">
          <div className="bg-admin-bg px-4 py-2 border-b border-admin-border">
            <h3 className="text-sm font-medium text-admin-text">Document items</h3>
          </div>
          {selectedSale ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-admin-bg border-b border-admin-border">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">ID</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Code</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Name</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Unit of measure</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-admin-text">Quantity</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-admin-text">Price before tax</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-admin-text">Tax</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-admin-text">Price</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-admin-text">Total before discount</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-admin-text">Discount</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-admin-text">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {saleItems.map((item, index) => (
                    <tr key={item.id} className="border-b border-admin-border text-admin-text">
                      <td className="px-3 py-2 text-xs">{index + 1}</td>
                      <td className="px-3 py-2 text-xs">{item.product_id}</td>
                      <td className="px-3 py-2 text-xs">{item.product_name}</td>
                      <td className="px-3 py-2 text-xs">pcs</td>
                      <td className="px-3 py-2 text-xs text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-xs text-right">{(item.unit_price / 100).toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs text-right">{(item.tax_amount / 100).toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs text-right">{((item.unit_price + item.tax_amount) / 100).toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs text-right">{(item.subtotal / 100).toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs text-right">{(item.discount_amount / 100).toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs text-right font-mono">{((item.subtotal - item.discount_amount) / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-admin-text-secondary text-xs">
              Select a sale to view items
            </div>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && receiptData && (
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
              <p className="text-xs text-black">#{receiptData.sale_number}</p>
              <p className="text-xs text-black">{new Date(receiptData.created_at).toLocaleString()}</p>
              <div className="border-t border-black my-3"></div>
              <p className="text-xs text-black text-left">Customer: {receiptData.customer_name || 'Walk-in Customer'}</p>
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
              {saleItems.map((item: any, idx: number) => (
                <div key={idx} className="mb-2">
                  <div className="text-xs text-black">{item.product_name}</div>
                  <div className="flex justify-between text-xs text-black">
                    <span></span>
                    <span>{item.quantity}</span>
                    <span>UGX {(item.unit_price / 100).toFixed(0)}</span>
                    <span>UGX {(item.subtotal / 100).toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-black pt-2 mb-4">
              <div className="flex justify-between text-xs text-black mb-1">
                <span>Subtotal:</span>
                <span>UGX {(receiptData.subtotal / 100).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-xs text-black mb-1">
                <span>Tax (18%):</span>
                <span>UGX {(receiptData.tax_amount / 100).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-black pt-2 mt-2">
                <span className="text-black">TOTAL:</span>
                <span className="text-black">UGX {(receiptData.total_amount / 100).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-xs text-black mt-3">
                <span>Payment:</span>
                <span>{getPaymentTypeName(receiptData.payment_type_id)}</span>
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
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 px-4 py-2 bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-surface"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
