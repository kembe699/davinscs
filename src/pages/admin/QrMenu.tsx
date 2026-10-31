import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";
import { api, RestaurantTable } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import AdminLayout from "./AdminLayout";
import { Copy, Download, ExternalLink, Printer, QrCode, UtensilsCrossed } from "lucide-react";

/**
 * QR codes for table ordering. The general code opens the public menu
 * (/:tenantSlug/menu) where the diner picks their table; each table's own
 * code opens it with that table already chosen (?table=<id>), so the card
 * on a table is all a diner needs. Orders land in the POS as held sales on
 * that table — see server/routes/menu.js.
 */
export default function QrMenu() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { toast } = useToast();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState<Record<string, string>>({});

  const menuUrl = `${window.location.origin}/${tenantSlug}/menu`;
  const tableUrl = (t: RestaurantTable) => `${menuUrl}?table=${t.id}`;

  useEffect(() => {
    Promise.all([api.tables.list(), api.company.get().catch(() => null)])
      .then(([t, company]) => {
        setTables(t);
        setCompanyName(company?.name || "");
      })
      .catch(() => toast("Could not load tables", "error", "Error"))
      .finally(() => setLoading(false));
  }, []);

  // On-screen previews: the general menu code plus one per table.
  useEffect(() => {
    const urls = [menuUrl, ...tables.map(tableUrl)];
    Promise.all(urls.map((url) => QRCode.toDataURL(url, { width: 240, margin: 1, errorCorrectionLevel: "M" })))
      .then((images) => setCodes(Object.fromEntries(urls.map((url, i) => [url, images[i]]))));
  }, [menuUrl, tables]);

  const groups = useMemo(() => {
    const byLocation = new Map<string, RestaurantTable[]>();
    for (const t of tables) {
      if (!byLocation.has(t.location)) byLocation.set(t.location, []);
      byLocation.get(t.location)!.push(t);
    }
    return Array.from(byLocation.entries());
  }, [tables]);

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied", "success", "Copied");
    } catch {
      toast(url, "info", "Copy this link");
    }
  };

  const download = async (url: string, title: string, fileName: string) => {
    const image = await labelledQr(url, title, companyName);
    const a = document.createElement("a");
    a.href = image;
    a.download = fileName;
    a.click();
  };

  const printCards = async () => {
    const cards = await Promise.all(
      (tables.length ? tables : [null]).map(async (t) => ({
        title: t ? `${t.location} · ${t.label}` : "Scan to order",
        image: await QRCode.toDataURL(t ? tableUrl(t) : menuUrl, { width: 480, margin: 1, errorCorrectionLevel: "M" }),
      }))
    );
    const win = window.open("", "_blank");
    if (!win) {
      toast("Allow pop-ups to print the table cards", "error", "Blocked");
      return;
    }
    win.document.write(`<!doctype html><html><head><title>Table QR cards</title><style>
      body{font-family:system-ui,sans-serif;margin:0;padding:16px}
      .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
      .card{border:1px dashed #999;border-radius:12px;padding:20px;text-align:center;page-break-inside:avoid}
      .card img{width:220px;height:220px}
      .company{font-size:14px;color:#555;margin:0 0 4px}
      .table{font-size:22px;font-weight:800;margin:8px 0 2px}
      .hint{font-size:13px;color:#333;margin:0}
    </style></head><body><div class="grid">${cards
      .map(
        (c) => `<div class="card">${companyName ? `<p class="company">${escapeHtml(companyName)}</p>` : ""}<img src="${c.image}" alt="" />
          <p class="table">${escapeHtml(c.title)}</p><p class="hint">Scan with your phone camera to see the menu and order</p></div>`
      )
      .join("")}</div><script>window.onload=()=>{window.print()}</script></body></html>`);
    win.document.close();
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8 w-full">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Restaurant</p>
            <h1 className="text-2xl font-bold text-foreground">QR Menu</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Put these codes on your tables. Customers scan with their phone, browse the menu and send their order. It appears in the POS as a held
              order on that table, ready to serve and take payment.
            </p>
          </div>
          <button
            onClick={printCards}
            disabled={loading}
            className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Printer size={14} /> Print table cards
          </button>
        </div>

        {/* General menu code */}
        <div className="border border-border-subtle p-5 mb-6 flex flex-col sm:flex-row gap-5 items-start">
          <div className="bg-white p-2 shrink-0">
            {codes[menuUrl] ? <img src={codes[menuUrl]} alt="Menu QR code" className="w-40 h-40" /> : <div className="w-40 h-40" />}
          </div>
          <div className="space-y-3 min-w-0">
            <div>
              <h2 className="text-base font-bold text-foreground">Menu (any table)</h2>
              <p className="text-sm text-muted-foreground">One code for the whole restaurant: customers choose their table before sending the order.</p>
            </div>
            <p className="font-mono-tech text-xs text-foreground break-all">{menuUrl}</p>
            <div className="flex flex-wrap gap-2">
              <ActionButton icon={Download} label="Download" onClick={() => download(menuUrl, "Scan to order", `${tenantSlug}-menu-qr.png`)} />
              <ActionButton icon={Copy} label="Copy link" onClick={() => copyLink(menuUrl)} />
              <ActionButton icon={ExternalLink} label="Open menu" onClick={() => window.open(menuUrl, "_blank")} />
            </div>
          </div>
        </div>

        {/* One code per table */}
        <h2 className="text-sm font-bold text-foreground mb-1">Table codes</h2>
        <p className="text-sm text-muted-foreground mb-4">Each opens the menu with its table already chosen.</p>

        {loading ? (
          <p className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">Loading…</p>
        ) : tables.length === 0 ? (
          <div className="border border-dashed border-border-subtle p-12 text-center">
            <UtensilsCrossed className="mx-auto mb-3 text-muted-foreground" size={28} />
            <p className="text-sm text-muted-foreground">
              No tables yet. Add them under Sales → Tables and their codes will appear here. The menu code above works without them.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(([loc, locTables]) => (
              <div key={loc} className="border border-border-subtle overflow-hidden">
                <div className="px-4 py-2.5 bg-chassis border-b border-border-subtle">
                  <h3 className="text-sm font-bold text-foreground">{loc}</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
                  {locTables.map((t) => {
                    const url = tableUrl(t);
                    return (
                      <div key={t.id} className="border border-border-subtle p-3 flex flex-col items-center gap-2">
                        <div className="bg-white p-1.5">
                          {codes[url] ? <img src={codes[url]} alt={`QR code for ${t.label}`} className="w-28 h-28" /> : <div className="w-28 h-28" />}
                        </div>
                        <p className="font-medium text-foreground text-sm text-center">{t.label}</p>
                        <div className="flex gap-1">
                          <IconButton icon={Download} title="Download" onClick={() => download(url, `${t.location} · ${t.label}`, `${tenantSlug}-${slugify(t.location)}-${slugify(t.label)}-qr.png`)} />
                          <IconButton icon={Copy} title="Copy link" onClick={() => copyLink(url)} />
                          <IconButton icon={ExternalLink} title="Open" onClick={() => window.open(url, "_blank")} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest mt-4 flex items-center gap-1.5">
          <QrCode size={11} /> {tables.length} table code(s) · orders arrive in POS as held table orders
        </p>
      </div>
    </AdminLayout>
  );
}

function ActionButton({ icon: Icon, label, onClick }: { icon: typeof Download; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 h-8 px-3 border border-border-subtle text-xs text-foreground hover:border-primary hover:text-primary transition-colors"
    >
      <Icon size={13} /> {label}
    </button>
  );
}

function IconButton({ icon: Icon, title, onClick }: { icon: typeof Download; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title} className="p-1.5 border border-border-subtle text-muted-foreground hover:text-primary hover:border-primary transition-colors">
      <Icon size={12} />
    </button>
  );
}

/** A printable PNG: the QR code with the table name (and restaurant name) under it. */
async function labelledQr(url: string, title: string, subtitle: string): Promise<string> {
  const size = 600;
  const qr = await QRCode.toDataURL(url, { width: size, margin: 2, errorCorrectionLevel: "M" });
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = qr;
  });

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size + 130;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, size, size);
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.fillText(title, size / 2, size + 50, size - 40);
  ctx.font = "24px system-ui, sans-serif";
  ctx.fillStyle = "#555555";
  ctx.fillText(subtitle ? `${subtitle} · Scan to order` : "Scan to order", size / 2, size + 95, size - 40);
  return canvas.toDataURL("image/png");
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}
