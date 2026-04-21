import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { api, PaymentType } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function PaymentTypes() {
  const { toast } = useToast();
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; action: () => void } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    loadPaymentTypes();
  }, []);

  const loadPaymentTypes = async () => {
    try {
      const data = await api.paymentTypes.list();
      setPaymentTypes(data);
    } catch (err) {
      console.error("Failed to load payment types:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.paymentTypes.update(editingId, formData);
      } else {
        await api.paymentTypes.create(formData);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ name: "", code: "", is_active: true, sort_order: 0 });
      loadPaymentTypes();
    } catch (err: any) {
      toast(err.message || "Failed to save payment type", "error", "Error");
    }
  };

  const handleEdit = (pt: PaymentType) => {
    setEditingId(pt.id);
    setFormData({
      name: pt.name,
      code: pt.code,
      is_active: pt.is_active,
      sort_order: pt.sort_order,
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    setPendingConfirm({
      message: "Are you sure you want to delete this payment type?",
      action: async () => {
        try {
          await api.paymentTypes.delete(id);
          loadPaymentTypes();
        } catch (err: any) {
          toast(err.message || "Failed to delete payment type", "error", "Error");
        }
      },
    });
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-admin-text">Payment Types</h1>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "", code: "", is_active: true, sort_order: 0 });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-admin-text text-admin-bg hover:opacity-90 flex items-center gap-2"
        >
          <Plus size={16} />
          New Payment Type
        </button>
      </div>

      <div className="bg-admin-surface border border-admin-border">
        <table className="w-full">
          <thead className="bg-admin-bg border-b border-admin-border">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-admin-text">Name</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-admin-text">Code</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-admin-text">Sort Order</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-admin-text">Status</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-admin-text">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paymentTypes.map((pt) => (
              <tr key={pt.id} className="border-b border-admin-border hover:bg-admin-bg">
                <td className="px-4 py-3 text-sm text-admin-text">{pt.name}</td>
                <td className="px-4 py-3 text-sm text-admin-text-secondary font-mono">{pt.code}</td>
                <td className="px-4 py-3 text-sm text-admin-text-secondary">{pt.sort_order}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 text-xs ${pt.is_active ? 'bg-admin-success text-white' : 'bg-admin-border text-admin-text-secondary'}`}>
                    {pt.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <button
                    onClick={() => handleEdit(pt)}
                    className="text-admin-text-secondary hover:text-admin-text mr-3"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(pt.id)}
                    className="text-admin-text-secondary hover:text-admin-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-admin-surface border border-admin-border p-6 w-96">
            <h2 className="text-xl font-bold text-admin-text mb-4">
              {editingId ? 'Edit Payment Type' : 'New Payment Type'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-admin-text-secondary mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text"
                />
              </div>
              <div>
                <label className="block text-sm text-admin-text-secondary mb-2">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text"
                />
              </div>
              <div>
                <label className="block text-sm text-admin-text-secondary mb-2">Sort Order</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm text-admin-text">Active</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-admin-text text-admin-bg hover:opacity-90"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
      <ConfirmDialog
        open={!!pendingConfirm}
        title="Delete Payment Type"
        message={pendingConfirm?.message || ""}
        confirmLabel="Delete"
        onConfirm={() => pendingConfirm?.action()}
        onCancel={() => setPendingConfirm(null)}
      />
    </AdminLayout>
  );
}
