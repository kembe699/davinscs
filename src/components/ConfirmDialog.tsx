import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = "Confirm Action",
  message,
  confirmLabel = "Confirm",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]">
      <div className="bg-admin-surface border border-admin-border w-[380px] shadow-2xl">
        <div className="flex items-start gap-3 p-5">
          <AlertTriangle
            size={18}
            className={`shrink-0 mt-0.5 ${variant === "danger" ? "text-red-400" : "text-amber-400"}`}
          />
          <div>
            <p className="font-semibold text-admin-text text-sm">{title}</p>
            <p className="text-admin-text-secondary text-sm mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-admin-border text-admin-text-secondary hover:bg-admin-bg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onConfirm(); onCancel(); }}
            className={`px-4 py-2 text-sm font-medium text-white transition-colors ${
              variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
