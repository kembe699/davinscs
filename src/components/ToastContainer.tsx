import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { useToast, ToastItem, ToastType } from "@/contexts/ToastContext";

const CONFIG: Record<ToastType, { icon: React.ReactNode; bar: string; border: string; label: string }> = {
  success: {
    icon: <CheckCircle size={16} className="text-emerald-400 shrink-0" />,
    bar: "bg-emerald-400",
    border: "border-l-emerald-400",
    label: "Success",
  },
  error: {
    icon: <XCircle size={16} className="text-red-400 shrink-0" />,
    bar: "bg-red-400",
    border: "border-l-red-400",
    label: "Error",
  },
  warning: {
    icon: <AlertTriangle size={16} className="text-amber-400 shrink-0" />,
    bar: "bg-amber-400",
    border: "border-l-amber-400",
    label: "Warning",
  },
  info: {
    icon: <Info size={16} className="text-blue-400 shrink-0" />,
    bar: "bg-blue-400",
    border: "border-l-blue-400",
    label: "Info",
  },
};

function ToastCard({ toast }: { toast: ToastItem }) {
  const { dismiss } = useToast();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const cfg = CONFIG[toast.type];

  useEffect(() => {
    const show = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(show);
  }, []);

  useEffect(() => {
    if (toast.duration <= 0) return;
    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(pct);
      if (pct === 0) clearInterval(tick);
    }, 50);
    return () => clearInterval(tick);
  }, [toast.duration]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => dismiss(toast.id), 300);
  };

  return (
    <div
      style={{
        transform: visible ? "translateX(0)" : "translateX(110%)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s",
      }}
      className={`relative w-80 bg-admin-surface border border-admin-border border-l-4 ${cfg.border} shadow-2xl overflow-hidden`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="mt-0.5">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">
            {toast.title || cfg.label}
          </p>
          <p className="text-sm text-foreground leading-snug break-words">{toast.message}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
        >
          <X size={13} />
        </button>
      </div>
      {toast.duration > 0 && (
        <div className="h-0.5 bg-border-subtle">
          <div
            className={`h-full ${cfg.bar} transition-none`}
            style={{ width: `${progress}%`, transition: "width 0.05s linear" }}
          />
        </div>
      )}
    </div>
  );
}

export default function ToastContainer() {
  const { toasts } = useToast();
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard toast={t} />
        </div>
      ))}
    </div>
  );
}
