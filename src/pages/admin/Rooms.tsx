import { useEffect, useMemo, useRef, useState } from "react";
import { api, RestaurantTable, POSSale } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import AdminLayout from "./AdminLayout";
import { BedDouble, Pencil, Plus, Trash2, X } from "lucide-react";

// Offered as one-click chips in the room form; anything else can be typed.
const COMMON_AMENITIES = [
  "Wi-Fi", "Air conditioning", "TV", "Minibar", "Fridge", "Safe", "Kettle", "Hair dryer",
  "Private bathroom", "Bathtub", "Balcony", "Sea view", "Room service", "Desk", "Iron",
];

type Form = { label: string; location: string; amenities: string[]; description: string };
const EMPTY_FORM: Form = { label: "", location: "", amenities: [], description: "" };

/**
 * Hotel rooms. A room is like a table for ordering: guests scan its QR code
 * (Sales → QR Menu), see the room's details and order room service, and the
 * order lands in the POS on that room. Further orders are added to the room's
 * open order, so the stay's room service is settled together.
 */
export default function Rooms() {
  const { toast } = useToast();
  const { baseCurrency } = useCurrency();
  const [rooms, setRooms] = useState<RestaurantTable[]>([]);
  const [heldSales, setHeldSales] = useState<POSSale[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [amenityInput, setAmenityInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const labelRef = useRef<HTMLInputElement>(null);

  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.tables.list(), api.pos.getHeldSales()])
      .then(([t, s]) => { setRooms(t.filter((x) => x.kind === "room")); setHeldSales(s); })
      .catch(() => toast("Failed to load rooms", "error", "Error"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Room id -> its open room-service order, from the held sales.
  const occupancy = useMemo(() => {
    const map = new Map<number, { items: number; total: number }>();
    for (const sale of heldSales) {
      if (!sale.table_id) continue;
      const items = (sale.items || []).reduce((n, it) => n + it.quantity, 0);
      map.set(sale.table_id, { items, total: Number(sale.total_amount) });
    }
    return map;
  }, [heldSales]);

  const groups = useMemo(() => {
    const byLocation = new Map<string, RestaurantTable[]>();
    for (const r of rooms) {
      if (!byLocation.has(r.location)) byLocation.set(r.location, []);
      byLocation.get(r.location)!.push(r);
    }
    return Array.from(byLocation.entries());
  }, [rooms]);

  const locations = useMemo(() => Array.from(new Set(rooms.map((r) => r.location))), [rooms]);

  const openModal = (room: RestaurantTable | null) => {
    setEditing(room);
    setForm(room ? { label: room.label, location: room.location, amenities: room.amenities || [], description: room.description || "" } : { ...EMPTY_FORM, location: locations[0] || "" });
    setAmenityInput("");
    setError("");
    setModalOpen(true);
    setTimeout(() => labelRef.current?.focus(), 40);
  };
  const closeModal = () => { setModalOpen(false); setError(""); };

  const toggleAmenity = (amenity: string) =>
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(amenity) ? f.amenities.filter((a) => a !== amenity) : [...f.amenities, amenity],
    }));

  const addTypedAmenity = () => {
    const value = amenityInput.trim();
    if (value && !form.amenities.includes(value)) setForm((f) => ({ ...f, amenities: [...f.amenities, value] }));
    setAmenityInput("");
  };

  const handleSave = async () => {
    if (!form.label.trim() || !form.location.trim()) return;
    setSaving(true);
    setError("");
    try {
      const payload = { label: form.label.trim(), location: form.location.trim(), amenities: form.amenities, description: form.description.trim() };
      if (editing) {
        const updated = await api.tables.updateRoom(editing.id, payload);
        setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await api.tables.createRoom(payload);
        setRooms((prev) => [...prev, created]);
      }
      toast(editing ? "Room updated" : `${payload.label} added`, "success", "Saved");
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.tables.delete(id);
      setRooms((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Delete failed", "error", "Error");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const inputClass = "w-full h-10 px-3 bg-transparent border border-border-subtle text-sm text-foreground focus:outline-none focus:border-primary";

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8 w-full">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Hotel</p>
            <h1 className="text-2xl font-bold text-foreground">Rooms</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Guests scan the room's QR code (Sales → QR Menu) to see the room's details and order room service. Orders arrive in the POS on the
              room, and further orders are added to the same open bill.
            </p>
          </div>
          <button
            onClick={() => openModal(null)}
            className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} /> Add Room
          </button>
        </div>

        {loading ? (
          <p className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">Loading…</p>
        ) : rooms.length === 0 ? (
          <div className="border border-dashed border-border-subtle p-12 text-center">
            <BedDouble className="mx-auto mb-3 text-muted-foreground" size={28} />
            <p className="text-sm text-muted-foreground">No rooms yet. Add your first room, e.g. "Room 101" on "First Floor", with its amenities.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(([loc, locRooms]) => (
              <div key={loc} className="border border-border-subtle overflow-hidden">
                <div className="px-4 py-2.5 bg-chassis border-b border-border-subtle">
                  <h2 className="text-sm font-bold text-foreground">{loc}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                  {locRooms.map((room) => {
                    const order = occupancy.get(room.id);
                    return (
                      <div key={room.id} className={`relative border p-4 ${order ? "border-amber-500/40 bg-amber-500/5" : "border-border-subtle"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-foreground">{room.label}</p>
                          <div className="flex gap-1.5">
                            <button onClick={() => openModal(room)} className="text-muted-foreground hover:text-primary transition-colors" title="Edit room">
                              <Pencil size={13} />
                            </button>
                            {!order && (
                              <button onClick={() => setConfirmId(room.id)} className="text-muted-foreground/60 hover:text-red-400 transition-colors" title="Delete room">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        {order ? (
                          <p className="text-[11px] text-amber-500 mt-1">
                            Open order · {order.items} item(s) · {baseCurrency?.symbol || ""} {order.total.toFixed(2)}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground mt-1">No open order</p>
                        )}
                        {room.description && <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">{room.description}</p>}
                        {room.amenities?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {room.amenities.map((a) => (
                              <span key={a} className="px-2 py-0.5 text-[10px] border border-border-subtle text-foreground">{a}</span>
                            ))}
                          </div>
                        )}
                        {confirmId === room.id && (
                          <div className="flex gap-1 mt-3">
                            <button
                              onClick={() => handleDelete(room.id)}
                              disabled={deletingId === room.id}
                              className="px-2 py-1 text-[10px] bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                              {deletingId === room.id ? "…" : "Delete room"}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="px-2 py-1 text-[10px] border border-border-subtle text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest mt-4">
          {rooms.length} room(s) · QR codes under Sales → QR Menu
        </p>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-background border border-border-subtle w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
              <div>
                <p className="font-mono-tech text-[9px] text-primary tracking-[0.4em] uppercase mb-0.5">{editing ? "Edit" : "New"}</p>
                <h2 className="text-base font-bold text-foreground">{editing ? editing.label : "Add Room"}</h2>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Room name / number *</label>
                  <input ref={labelRef} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Room 101" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Floor / wing *</label>
                  <input list="room-locations" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="First Floor" className={inputClass} />
                  <datalist id="room-locations">
                    {locations.map((l) => <option key={l} value={l} />)}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Deluxe double room, king-size bed, garden view"
                  rows={3}
                  className="w-full px-3 py-2 bg-transparent border border-border-subtle text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Amenities</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[...COMMON_AMENITIES, ...form.amenities.filter((a) => !COMMON_AMENITIES.includes(a))].map((a) => {
                    const on = form.amenities.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAmenity(a)}
                        className={`px-2.5 py-1 text-xs border transition-colors ${on ? "border-primary bg-primary text-background" : "border-border-subtle text-muted-foreground hover:text-foreground"}`}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    value={amenityInput}
                    onChange={(e) => setAmenityInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTypedAmenity(); } }}
                    placeholder="Add another amenity…"
                    className={inputClass}
                  />
                  <button type="button" onClick={addTypedAmenity} className="h-10 px-3 border border-border-subtle text-sm text-foreground hover:border-primary">
                    Add
                  </button>
                </div>
              </div>

              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3">{error}</div>}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border-subtle">
              <button onClick={closeModal} className="h-10 px-4 border border-border-subtle text-sm text-muted-foreground hover:text-foreground">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.label.trim() || !form.location.trim()}
                className="h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving…" : editing ? "Save Room" : "Add Room"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
