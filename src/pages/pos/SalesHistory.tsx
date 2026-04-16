import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

export default function SalesHistory() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const data = await api.pos.getSales();
      setSales(data);
    } catch (err) {
      console.error("Failed to load sales:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-admin-bg p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate("/pos")}
          className="px-4 py-2 bg-admin-surface border border-admin-border text-admin-text hover:bg-admin-bg flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back to POS
        </button>
        <h1 className="text-2xl font-bold text-admin-text">Sales History</h1>
      </div>

      <div className="bg-admin-surface border border-admin-border">
        {loading ? (
          <div className="p-8 text-center text-admin-text-secondary">Loading...</div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-admin-text-secondary">No sales found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-admin-bg border-b border-admin-border">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-admin-text">Sale #</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-admin-text">Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-admin-text">Customer</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-admin-text">Total</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-admin-text">Payment</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-admin-text">Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b border-admin-border hover:bg-admin-bg">
                  <td className="px-4 py-3 text-sm text-admin-text font-mono">{sale.sale_number}</td>
                  <td className="px-4 py-3 text-sm text-admin-text">
                    {new Date(sale.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-admin-text">
                    {sale.customer_id ? `Customer #${sale.customer_id}` : 'Walk-in'}
                  </td>
                  <td className="px-4 py-3 text-sm text-admin-text text-right font-mono">
                    UGX {(sale.total_amount / 100).toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-admin-text-secondary">
                    {sale.payment_type_id === 1 ? 'Cash' : sale.payment_type_id === 2 ? 'Card' : 'Other'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs ${
                      sale.voided 
                        ? 'bg-admin-danger text-white' 
                        : 'bg-admin-success text-white'
                    }`}>
                      {sale.voided ? 'Voided' : 'Completed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
