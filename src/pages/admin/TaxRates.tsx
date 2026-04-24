import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { api, TaxRate } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function TaxRates() {
  const { toast } = useToast();
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; action: () => void } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    rate: 0,
    is_active: true,
    is_default: false,
  });

  useEffect(() => {
    loadTaxRates();
  }, []);

  const loadTaxRates = async () => {
    try {
      const data = await api.taxRates.list();
      setTaxRates(data);
    } catch (err) {
      console.error("Failed to load tax rates:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.taxRates.update(editingId, formData);
        toast("Tax rate updated successfully!", "success", "Saved");
      } else {
        await api.taxRates.create(formData);
        toast("Tax rate created successfully!", "success", "Saved");
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ name: "", rate: 0, is_active: true, is_default: false });
      loadTaxRates();
    } catch (err: any) {
      toast(err.message || "Failed to save tax rate", "error", "Error");
    }
  };

  const handleEdit = (tr: TaxRate) => {
    setEditingId(tr.id);
    setFormData({
      name: tr.name,
      rate: tr.rate,
      is_active: tr.is_active,
      is_default: tr.is_default,
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    setPendingConfirm({
      message: "Are you sure you want to delete this tax rate?",
      action: async () => {
        try {
          await api.taxRates.delete(id);
          loadTaxRates();
        } catch (err: any) {
          toast(err.message || "Failed to delete tax rate", "error", "Error");
        }
      },
    });
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-admin-text">Tax Rates</h1>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "", rate: 0, is_active: true, is_default: false });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-admin-text text-admin-bg hover:opacity-90 flex items-center gap-2"
        >
          <Plus size={16} />
          New Tax Rate
        </button>
      </div>

      <div className="bg-admin-surface border border-admin-border">
        <table className="w-full">
          <thead className="bg-admin-bg border-b border-admin-border">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-admin-text">Name</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-admin-text">Rate (%)</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-admin-text">Status</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-admin-text">Default</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-admin-text">Actions</th>
            </tr>
          </thead>
          <tbody>
            {taxRates.map((tr) => (
              <tr key={tr.id} className="border-b border-admin-border hover:bg-admin-bg">
                <td className="px-4 py-3 text-sm text-admin-text">{tr.name}</td>
                <td className="px-4 py-3 text-sm text-admin-text font-mono">{tr.rate}%</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 text-xs ${tr.is_active ? 'bg-admin-success text-white' : 'bg-admin-border text-admin-text-secondary'}`}>
                    {tr.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {tr.is_default && (
                    <span className="px-2 py-1 text-xs bg-admin-text text-admin-bg">Default</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <button
                    onClick={() => handleEdit(tr)}
                    className="text-admin-text-secondary hover:text-admin-text mr-3"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(tr.id)}
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
              {editingId ? 'Edit Tax Rate' : 'New Tax Rate'}
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
                <label className="block text-sm text-admin-text-secondary mb-2">Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })}
                  required
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
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm text-admin-text">Set as Default</label>
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
        title="Delete Tax Rate"
        message={pendingConfirm?.message || ""}
        confirmLabel="Delete"
        onConfirm={() => pendingConfirm?.action()}
        onCancel={() => setPendingConfirm(null)}
      />
    </AdminLayout>
  );
}
