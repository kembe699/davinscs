import { LogOut, Clock } from "lucide-react";

interface Props {
  secondsLeft: number;
  onStay: () => void;
  onLogout: () => void;
}

export default function IdleWarningModal({ secondsLeft, onStay, onLogout }: Props) {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const display = mins > 0
    ? `${mins}:${String(secs).padStart(2, "0")}`
    : `${secs}s`;

  const urgency = secondsLeft <= 10;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-admin-bg border border-admin-border shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col items-center gap-5">
        {/* Icon */}
        <div className={`w-14 h-14 flex items-center justify-center border ${urgency ? "border-red-500/40 bg-red-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
          <Clock size={28} className={urgency ? "text-red-400" : "text-amber-400"} />
        </div>

        {/* Heading */}
        <div className="text-center">
          <p className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-admin-text-secondary mb-1">
            Session Timeout
          </p>
          <h2 className="text-lg font-bold text-admin-text">
            Still there?
          </h2>
          <p className="text-sm text-admin-text-secondary mt-1">
            You'll be signed out due to inactivity.
          </p>
        </div>

        {/* Countdown */}
        <div className={`font-mono-tech text-4xl font-bold tabular-nums ${urgency ? "text-red-400" : "text-amber-400"}`}>
          {display}
        </div>

        {/* Actions */}
        <div className="flex gap-3 w-full">
          <button
            onClick={onLogout}
            className="flex-1 h-10 flex items-center justify-center gap-2 border border-admin-border text-admin-text-secondary hover:text-admin-danger hover:border-admin-danger text-xs font-mono-tech uppercase tracking-widest transition-colors"
          >
            <LogOut size={13} />
            Sign Out
          </button>
          <button
            onClick={onStay}
            className="flex-1 h-10 bg-primary hover:bg-primary/90 text-background text-xs font-mono-tech font-bold uppercase tracking-widest transition-colors"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
