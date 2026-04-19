import { useEffect, useState } from "react";
import { api, ApiCustomerOrder } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { ShoppingBag, X, Check, Package, Truck, CheckCircle, XCircle, Edit2, Save } from "lucide-react";

type StatusFilter = "all" | "pending" | "processing" | "shipped" | "delivered" | "cancelled";

export default function Orders() {
  const [orders, setOrders] = useState<ApiCustomerOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ApiCustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [updating, setUpdating] = useState(false);
  
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    shipping_address: "",
    shipping_city: "",
    shipping_postal_code: "",
    shipping_country: "",
    customer_phone: "",
    tracking_number: "",
    notes: ""
  });

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const params: any = { limit: 100 };
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;
      
      const data = await api.customerOrders.list(params);
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleSearch = () => {
    loadOrders();
  };

  const handleViewOrder = async (orderId: number) => {
    try {
      const order = await api.customerOrders.get(orderId);
      setSelectedOrder(order);
      setEditForm({
        shipping_address: order.shipping_address || "",
        shipping_city: order.shipping_city || "",
        shipping_postal_code: order.shipping_postal_code || "",
        shipping_country: order.shipping_country || "",
        customer_phone: order.customer_phone || "",
        tracking_number: order.tracking_number || "",
        notes: order.notes || ""
      });
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order details");
    }
  };

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    if (!confirm(`Change order status to ${newStatus}?`)) return;
    
    setUpdating(true);
    setError("");
    try {
      await api.customerOrders.updateStatus(orderId, newStatus);
      await loadOrders();
      if (selectedOrder?.id === orderId) {
        await handleViewOrder(orderId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!selectedOrder) return;
    
    setUpdating(true);
    setError("");
    try {
      await api.customerOrders.update(selectedOrder.id, editForm);
      await loadOrders();
      await handleViewOrder(selectedOrder.id);
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm("Cancel this order? This will release reserved inventory.")) return;
    
    setUpdating(true);
    setError("");
    try {
      await api.customerOrders.cancel(orderId);
      await loadOrders();
      if (selectedOrder?.id === orderId) {
        await handleViewOrder(orderId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "border-blue-500/30 text-blue-500 bg-blue-500/5",
      processing: "border-yellow-500/30 text-yellow-500 bg-yellow-500/5",
      shipped: "border-purple-500/30 text-purple-500 bg-purple-500/5",
      delivered: "border-green-500/30 text-green-500 bg-green-500/5",
      cancelled: "border-red-500/30 text-red-500 bg-red-500/5"
    };
    
    return (
      <span className={`font-mono-tech text-[10px] uppercase tracking-widest px-2 py-1 border ${styles[status] || styles.pending}`}>
        {status}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <ShoppingBag size={16} className="text-blue-500" />;
      case "processing": return <Package size={16} className="text-yellow-500" />;
      case "shipped": return <Truck size={16} className="text-purple-500" />;
      case "delivered": return <CheckCircle size={16} className="text-green-500" />;
      case "cancelled": return <XCircle size={16} className="text-red-500" />;
      default: return <ShoppingBag size={16} />;
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">E-Commerce</p>
          <h1 className="text-2xl font-bold text-foreground">Customer Orders</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech mb-4">
            {error}
          </div>
        )}

        <div className="mb-6 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-1">Search</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Order number, customer name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 px-3 py-2 bg-background border border-border-subtle text-xs"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90"
              >
                Search
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 bg-background border border-border-subtle text-xs"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="border border-border-subtle overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-chassis">
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Order #</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Customer</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Date</th>
                    <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Items</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Total</th>
                    <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Loading orders...
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => handleViewOrder(order.id)}
                        className={`cursor-pointer hover:bg-chassis/50 transition-colors ${
                          selectedOrder?.id === order.id ? "bg-chassis" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-mono-tech text-foreground">{order.order_number}</td>
                        <td className="px-4 py-3 text-foreground">{order.customer_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-center font-mono-tech text-muted-foreground">{order.item_count || 0}</td>
                        <td className="px-4 py-3 text-right font-mono-tech text-foreground">{Number(order.total).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(order.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selectedOrder && (
            <div className="lg:col-span-1">
              <div className="border border-border-subtle bg-chassis p-6 sticky top-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-foreground">Order Details</h3>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-1">Order Number</p>
                    <p className="font-mono-tech text-foreground">{selectedOrder.order_number}</p>
                  </div>

                  <div>
                    <p className="text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedOrder.status)}
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                  </div>

                  {selectedOrder.status !== "cancelled" && selectedOrder.status !== "delivered" && (
                    <div>
                      <p className="text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-2">Update Status</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedOrder.status !== "processing" && (
                          <button
                            onClick={() => handleUpdateStatus(selectedOrder.id, "processing")}
                            disabled={updating}
                            className="px-3 py-1 text-xs border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 disabled:opacity-50"
                          >
                            Processing
                          </button>
                        )}
                        {selectedOrder.status !== "shipped" && (
                          <button
                            onClick={() => handleUpdateStatus(selectedOrder.id, "shipped")}
                            disabled={updating}
                            className="px-3 py-1 text-xs border border-purple-500/30 text-purple-500 hover:bg-purple-500/10 disabled:opacity-50"
                          >
                            Shipped
                          </button>
                        )}
                        {selectedOrder.status !== "delivered" && (
                          <button
                            onClick={() => handleUpdateStatus(selectedOrder.id, "delivered")}
                            disabled={updating}
                            className="px-3 py-1 text-xs border border-green-500/30 text-green-500 hover:bg-green-500/10 disabled:opacity-50"
                          >
                            Delivered
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-border-subtle pt-4">
                    <p className="text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-2">Customer</p>
                    <p className="text-sm text-foreground">{selectedOrder.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedOrder.customer_email}</p>
                    {editMode ? (
                      <input
                        type="tel"
                        value={editForm.customer_phone}
                        onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                        className="mt-1 w-full px-2 py-1 bg-background border border-border-subtle text-xs"
                        placeholder="Phone"
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground">{selectedOrder.customer_phone || "—"}</p>
                    )}
                  </div>

                  <div className="border-t border-border-subtle pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-mono-tech text-muted-foreground uppercase tracking-widest">Shipping Address</p>
                      {!editMode && selectedOrder.status !== "cancelled" && (
                        <button
                          onClick={() => setEditMode(true)}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                      )}
                    </div>
                    {editMode ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editForm.shipping_address}
                          onChange={(e) => setEditForm({ ...editForm, shipping_address: e.target.value })}
                          className="w-full px-2 py-1 bg-background border border-border-subtle text-xs"
                          placeholder="Address"
                        />
                        <input
                          type="text"
                          value={editForm.shipping_city}
                          onChange={(e) => setEditForm({ ...editForm, shipping_city: e.target.value })}
                          className="w-full px-2 py-1 bg-background border border-border-subtle text-xs"
                          placeholder="City"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editForm.shipping_postal_code}
                            onChange={(e) => setEditForm({ ...editForm, shipping_postal_code: e.target.value })}
                            className="px-2 py-1 bg-background border border-border-subtle text-xs"
                            placeholder="Postal Code"
                          />
                          <input
                            type="text"
                            value={editForm.shipping_country}
                            onChange={(e) => setEditForm({ ...editForm, shipping_country: e.target.value })}
                            className="px-2 py-1 bg-background border border-border-subtle text-xs"
                            placeholder="Country"
                          />
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={handleSaveDetails}
                            disabled={updating}
                            className="flex-1 px-3 py-1 bg-primary text-background text-xs font-bold uppercase hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <Save size={12} /> Save
                          </button>
                          <button
                            onClick={() => setEditMode(false)}
                            className="px-3 py-1 border border-border-subtle text-xs text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-foreground">
                        <p>{selectedOrder.shipping_address}</p>
                        <p>{selectedOrder.shipping_city}, {selectedOrder.shipping_postal_code}</p>
                        <p>{selectedOrder.shipping_country}</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border-subtle pt-4">
                    <p className="text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-2">Tracking Number</p>
                    {editMode ? (
                      <input
                        type="text"
                        value={editForm.tracking_number}
                        onChange={(e) => setEditForm({ ...editForm, tracking_number: e.target.value })}
                        className="w-full px-2 py-1 bg-background border border-border-subtle text-xs"
                        placeholder="Enter tracking number"
                      />
                    ) : (
                      <p className="text-sm text-foreground font-mono-tech">{selectedOrder.tracking_number || "—"}</p>
                    )}
                  </div>

                  <div className="border-t border-border-subtle pt-4">
                    <p className="text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-2">Order Items</p>
                    <div className="space-y-2">
                      {selectedOrder.items?.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-foreground">{item.product_name} × {item.quantity}</span>
                          <span className="font-mono-tech text-muted-foreground">{Number(item.subtotal).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border-subtle pt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-mono-tech text-foreground">{Number(selectedOrder.subtotal).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Shipping:</span>
                      <span className="font-mono-tech text-foreground">{Number(selectedOrder.shipping_cost).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-border-subtle pt-2 mt-2">
                      <span className="text-foreground">Total:</span>
                      <span className="font-mono-tech text-primary">{Number(selectedOrder.total).toLocaleString()}</span>
                    </div>
                  </div>

                  {selectedOrder.notes && (
                    <div className="border-t border-border-subtle pt-4">
                      <p className="text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-1">Notes</p>
                      <p className="text-sm text-foreground">{selectedOrder.notes}</p>
                    </div>
                  )}

                  {selectedOrder.status !== "cancelled" && selectedOrder.status !== "delivered" && (
                    <div className="border-t border-border-subtle pt-4">
                      <button
                        onClick={() => handleCancelOrder(selectedOrder.id)}
                        disabled={updating}
                        className="w-full px-4 py-2 border border-red-500/30 text-red-500 text-xs font-bold uppercase tracking-widest hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Cancel Order
                      </button>
                    </div>
                  )}

                  <div className="border-t border-border-subtle pt-4">
                    <p className="text-xs font-mono-tech text-muted-foreground">
                      Created: {new Date(selectedOrder.created_at).toLocaleString()}
                    </p>
                    <p className="text-xs font-mono-tech text-muted-foreground">
                      Updated: {new Date(selectedOrder.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
