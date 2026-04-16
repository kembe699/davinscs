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

  useEffect(() => {
    loadData();
  }, []);

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

  const filteredSales = sales.filter(sale => {
    if (startDate && new Date(sale.created_at) < new Date(startDate)) return false;
    if (endDate && new Date(sale.created_at) > new Date(endDate)) return false;
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
          <button className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface">
            Show all users
          </button>
          <button className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-2">
            <User size={14} />
            Customer
          </button>
          <button className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-2">
            <Printer size={14} />
            Print
          </button>
          <button className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-2">
            <FileText size={14} />
            Save as PDF
          </button>
          <button className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-2">
            <FileText size={14} />
            Receipt
          </button>
          <button className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-2">
            <Mail size={14} />
            Send email
          </button>
          <button className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface">
            Refund
          </button>
          <button className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-2">
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
    </div>
  );
}
