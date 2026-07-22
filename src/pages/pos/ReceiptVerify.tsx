import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { buildThermalReceipt, generateReceiptQrDataUrl } from "@/utils/receiptUtils";

export default function ReceiptVerify() {
  // tenantSlug comes from the URL: /:tenantSlug/verify/:saleNumber
  const { saleNumber, tenantSlug } = useParams<{ saleNumber: string; tenantSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function verifySale() {
      try {
        if (!saleNumber) throw new Error("No sale number in URL");

        // Build URL — pass tenant_slug so the backend can resolve the schema
        // without requiring a logged-in session (public QR scan)
        const params = new URLSearchParams();
        if (tenantSlug) params.set("tenant_slug", tenantSlug);

        const res = await fetch(`/api/pos/verify/${encodeURIComponent(saleNumber)}?${params.toString()}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to verify receipt");
        }

        // Build HTML
        const qrDataUrl = await generateReceiptQrDataUrl(data.sale.sale_number);
        const html = buildThermalReceipt({
          sale: data.sale,
          items: data.items.map((i: any) => ({
            name: i.product_name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            total: i.subtotal
          })),
          companyData: data.company,
          baseCurrencySymbol: data.company?.currency || "UGX",
          qrDataUrl,
        });

        setHtmlContent(html);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (saleNumber) {
      verifySale();
    }
  }, [saleNumber, tenantSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-mono">
        <div className="animate-pulse">Verifying receipt...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-red-500 max-w-md w-full">
          <h2 className="text-xl font-bold text-red-600 mb-2">Invalid Receipt</h2>
          <p className="text-slate-600 font-mono text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 flex flex-col items-center py-10 px-4">
      <div className="mb-4 bg-green-500 text-white px-4 py-2 rounded shadow-sm font-bold text-sm tracking-widest uppercase flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Verified Official Receipt
      </div>
      
      {/* Receipt renders inside an isolated iframe — the receipt's own <style>
          (fixed 74mm body width, universal margin/padding reset, etc.) is meant
          for a private print document. Rendering it via dangerouslySetInnerHTML
          directly on the page would leak those rules onto the whole document,
          breaking layout and overriding text color/contrast site-wide. */}
      <iframe
        ref={iframeRef}
        title="Receipt"
        srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#fff;">${htmlContent}</body></html>`}
        onLoad={() => {
          const doc = iframeRef.current?.contentDocument;
          if (doc && iframeRef.current) {
            iframeRef.current.style.height = `${doc.documentElement.scrollHeight}px`;
          }
        }}
        className="bg-white shadow-2xl border-0 w-full"
        style={{ maxWidth: '80mm', minHeight: '100mm' }}
      />
      
      <div className="mt-8 text-xs text-slate-400 font-mono text-center">
        Scanned at {new Date().toLocaleString()}<br/>
        Powered by FlippedPOS
      </div>
    </div>
  );
}
