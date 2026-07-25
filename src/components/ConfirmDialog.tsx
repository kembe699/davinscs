import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
  /** When true, a reason textarea is shown and Confirm stays disabled until it's filled in. */
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = "Confirm Action",
  message,
  confirmLabel = "Confirm",
  variant = "danger",
  requireReason = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "Why is this being done?",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");

  // Reset whenever the dialog is (re)opened so a leftover reason from a
  // previous confirmation never silently carries over to the next one.
  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  if (!open) return null;
  const reasonMissing = requireReason && !reason.trim();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]">
      <div className="bg-admin-surface border border-admin-border w-[380px] shadow-2xl">
        <div className="flex items-start gap-3 p-5">
          <AlertTriangle
            size={18}
            className={`shrink-0 mt-0.5 ${variant === "danger" ? "text-red-400" : "text-amber-400"}`}
          />
          <div className="flex-1">
            <p className="font-semibold text-admin-text text-sm">{title}</p>
            <p className="text-admin-text-secondary text-sm mt-1 leading-relaxed">{message}</p>
            {requireReason && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-admin-text-secondary uppercase tracking-wide mb-1">
                  {reasonLabel} <span className="text-red-400">*</span>
                </label>
                <textarea
                  autoFocus
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={reasonPlaceholder}
                  rows={2}
                  className="w-full text-sm border border-admin-border bg-admin-bg text-admin-text px-2.5 py-2 outline-none focus:border-admin-accent resize-none"
                />
              </div>
            )}
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
            disabled={reasonMissing}
            onClick={() => { onConfirm(requireReason ? reason.trim() : undefined); onCancel(); }}
            className={`px-4 py-2 text-sm font-medium text-white transition-colors ${
              reasonMissing
                ? "bg-gray-400 cursor-not-allowed"
                : variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
