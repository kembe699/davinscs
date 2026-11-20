import { useEffect, useState } from "react";

const REMIND_EVERY_MS = 10 * 60 * 1000;

/**
 * Centred payment reminder over a blurred screen. Closing it lets the user carry
 * on working; it comes back 10 minutes later until the subscription is paid
 * (paying clears the tenant's payment notice on the server).
 */
export function PaymentReminder({ tenantSlug }: { tenantSlug: string }) {
  const storageKey = `payment_notice_closed_${tenantSlug}`;
  const due = () => {
    try {
      const closedAt = Number(localStorage.getItem(storageKey) || 0);
      return Date.now() - closedAt >= REMIND_EVERY_MS;
    } catch {
      return true;
    }
  };
  const [open, setOpen] = useState(due);

  useEffect(() => {
    const timer = setInterval(() => {
      if (due()) setOpen(true);
    }, 15_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  if (!open) return null;

  const close = () => {
    try {
      localStorage.setItem(storageKey, String(Date.now()));
    } catch {}
    setOpen(false);
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="payment-reminder-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-md"
    >
      <div className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-2xl">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 id="payment-reminder-title" className="text-xl font-bold text-gray-900">
          Subscription payment due
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Please pay your subscription fee within the next 24 hours. If payment is not received, your system will be suspended and
          access to the admin panel and POS will stop until it is paid.
        </p>
        <div className="mt-7 flex flex-col gap-3">
          <a
            href="https://flippedpos.com/account"
            className="flex w-full items-center justify-center rounded bg-[#f97316] py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#ea580c]"
          >
            Pay subscription
          </a>
          <button
            type="button"
            onClick={close}
            className="w-full rounded border border-gray-300 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
