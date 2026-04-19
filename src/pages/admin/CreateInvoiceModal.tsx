import { useState, useEffect } from "react";
import { X, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
function fmt(n: number | string, sym = "UGX") {
  return `${sym} ${Math.round(parseFloat(String(n))).toLocaleString("en-US")}`;
}
type Line = { product_id: number|null; product_name: string; quantity: number; unit_price: number; discount_amount: number };
type Props = { onClose: () => void; onCreated: () => void };

export default function CreateInvoiceModal({ onClose, onCreated }: Props) {
  const { baseCurrency } = useCurrency();
  const sym = baseCurrency?.symbol || "UGX";
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({ customer_name:'', customer_email:'', customer_phone:'', due_date:'', notes:'', discount_amount:0 });
  const [items, setItems] = useState<Line[]>([]);
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.customers.list().then(setCustomers).catch(()=>{});
    api.products.list().then(setProducts).catch(()=>{});
  }, []);
  const pickCustomer = (id: string) => {
    const c = customers.find(x => String(x.id)===id);
    if (c) setForm(f=>({...f,customer_name:c.name,customer_email:c.email||'',customer_phone:c.phone||''}));
  };
  const addItem = (p: any) => {
    setItems(prev=>{
      const ei=prev.findIndex(i=>i.product_id===p.id);
      if(ei>=0) return prev.map((it,i)=>i===ei?{...it,quantity:it.quantity+1}:it);
      return [...prev,{product_id:p.id,product_name:p.name,quantity:1,unit_price:p.price,discount_amount:0}];
    });
    setQ('');
  };
  const upd=(idx:number,f:string,v:any)=>setItems(p=>p.map((it,i)=>i===idx?{...it,[f]:Number(v)||0}:it));
  const del=(idx:number)=>setItems(p=>p.filter((_,i)=>i!==idx));
  const sub=items.reduce((s,it)=>s+it.quantity*it.unit_price-it.discount_amount,0);
  const tot=sub-form.discount_amount;
  const handleSave = async () => {
    if (!form.customer_name.trim()) { alert('Customer name is required'); return; }
    if (!items.length) { alert('Add at least one item'); return; }
    setSaving(true);
    try {
      await api.invoices.create({
        customer_name: form.customer_name,
        customer_email: form.customer_email||undefined,
        customer_phone: form.customer_phone||undefined,
        subtotal: sub, tax_amount: 0,
        discount_amount: form.discount_amount,
        total_amount: tot,
        due_date: form.due_date||undefined,
        notes: form.notes||undefined,
        items,
      });
      onCreated();
    } catch(e:any) { alert(e.message||'Failed'); }
    finally { setSaving(false); }
  };
  const filtered = q.trim() ? products.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())||(p.barcode||'').includes(q)).slice(0,12) : [];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-admin-surface border border-admin-border w-full max-w-4xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-admin-border bg-admin-bg shrink-0">
          <h3 className="text-base font-bold text-admin-text">New Invoice</h3>
          <button onClick={onClose}><X size={16} className="text-admin-text-secondary" /></button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* CUSTOMER */}
          <section>
            <p className="text-[10px] font-semibold text-admin-text-secondary uppercase tracking-widest mb-3">Customer</p>
            {customers.length>0&&(
              <select onChange={e=>pickCustomer(e.target.value)} defaultValue=""
                className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm mb-3">
                <option value="">— Select existing customer (optional) —</option>
                {customers.map(c=><option key={c.id} value={c.id}>{c.name}{c.phone?` · ${c.phone}`:''}</option>)}
              </select>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-admin-text-secondary mb-1">Name <span className="text-red-400">*</span></label>
                <input value={form.customer_name} onChange={e=>setForm(f=>({...f,customer_name:e.target.value}))}
                  placeholder="Customer name" className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"/>
              </div>
              <div>
                <label className="block text-xs text-admin-text-secondary mb-1">Phone</label>
                <input value={form.customer_phone} onChange={e=>setForm(f=>({...f,customer_phone:e.target.value}))}
                  placeholder="Phone" className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"/>
              </div>
              <div>
                <label className="block text-xs text-admin-text-secondary mb-1">Email</label>
                <input value={form.customer_email} onChange={e=>setForm(f=>({...f,customer_email:e.target.value}))}
                  placeholder="Email" className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"/>
              </div>
            </div>
          </section>
          {/* ITEMS */}
          <section>
            <p className="text-[10px] font-semibold text-admin-text-secondary uppercase tracking-widest mb-3">Items</p>
            <div className="relative mb-3">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-secondary pointer-events-none"/>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products to add…"
                className="w-full pl-8 pr-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"/>
              {filtered.length>0&&(
                <div className="absolute top-full left-0 right-0 bg-admin-surface border border-admin-border shadow-xl z-20 max-h-48 overflow-y-auto">
                  {filtered.map(p=>(
                    <button key={p.id} type="button" onClick={()=>addItem(p)}
                      className="w-full text-left px-3 py-2 hover:bg-admin-bg text-sm text-admin-text border-b border-admin-border/40 flex justify-between items-center gap-4">
                      <span>{p.name}</span>
                      <span className="font-mono text-xs text-admin-text-secondary shrink-0">{fmt(p.price,sym)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {items.length===0?(
              <div className="border border-dashed border-admin-border p-8 text-center text-admin-text-secondary text-sm">
                Search and select products above to add line items
              </div>
            ):(
              <div className="border border-admin-border overflow-auto">
                <table className="w-full text-sm min-w-[620px]">
                  <thead className="bg-admin-bg border-b border-admin-border">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-admin-text-secondary font-medium">Product</th>
                      <th className="px-3 py-2 text-right text-xs text-admin-text-secondary font-medium w-20">Qty</th>
                      <th className="px-3 py-2 text-right text-xs text-admin-text-secondary font-medium w-32">Unit Price</th>
                      <th className="px-3 py-2 text-right text-xs text-admin-text-secondary font-medium w-28">Discount</th>
                      <th className="px-3 py-2 text-right text-xs text-admin-text-secondary font-medium w-32">Line Total</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it,idx)=>{
                      const lt=it.quantity*it.unit_price-it.discount_amount;
                      return(
                        <tr key={idx} className="border-t border-admin-border">
                          <td className="px-3 py-2 text-admin-text">{it.product_name}</td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="1" value={it.quantity} onChange={e=>upd(idx,'quantity',e.target.value)}
                              className="w-full px-2 py-1 text-right bg-admin-bg border border-admin-border text-admin-text text-xs"/>
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="0" value={it.unit_price} onChange={e=>upd(idx,'unit_price',e.target.value)}
                              className="w-full px-2 py-1 text-right bg-admin-bg border border-admin-border text-admin-text text-xs"/>
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="0" value={it.discount_amount} onChange={e=>upd(idx,'discount_amount',e.target.value)}
                              className="w-full px-2 py-1 text-right bg-admin-bg border border-admin-border text-admin-text text-xs"/>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-admin-text text-xs">{fmt(lt,sym)}</td>
                          <td className="px-2 py-2 text-center">
                            <button onClick={()=>del(idx)} className="text-red-400 hover:text-red-300"><Trash2 size={13}/></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {/* TOTALS + META */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-admin-text-secondary mb-1">Due Date</label>
                <input type="date" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"/>
              </div>
              <div>
                <label className="block text-xs text-admin-text-secondary mb-1">Invoice Discount ({sym})</label>
                <input type="number" min="0" value={form.discount_amount} onChange={e=>setForm(f=>({...f,discount_amount:Number(e.target.value)||0}))}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"/>
              </div>
              <div>
                <label className="block text-xs text-admin-text-secondary mb-1">Notes</label>
                <textarea rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm resize-none"/>
              </div>
            </div>
            <div className="bg-admin-bg border border-admin-border p-4 space-y-2 self-start rounded-sm">
              <div className="flex justify-between text-sm">
                <span className="text-admin-text-secondary">Subtotal</span>
                <span className="font-mono text-admin-text">{fmt(sub,sym)}</span>
              </div>
              {form.discount_amount>0&&(
                <div className="flex justify-between text-sm">
                  <span className="text-admin-text-secondary">Discount</span>
                  <span className="font-mono text-red-400">-{fmt(form.discount_amount,sym)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-admin-border pt-2 mt-1">
                <span className="text-admin-text">Total Due</span>
                <span className="font-mono text-admin-text">{fmt(tot,sym)}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-admin-border bg-admin-bg shrink-0">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-admin-border text-admin-text text-sm hover:bg-admin-surface">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2 bg-admin-text text-admin-bg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
            {saving?'Creating…':'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}