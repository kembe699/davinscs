import { useEffect, useRef, useState, useCallback } from "react";

interface UseIdleTimeoutOptions {
  /** Total idle time before logout (ms). Default 5 minutes. */
  timeoutMs?: number;
  /** How long before logout to show the warning (ms). Default 60 seconds. */
  warningMs?: number;
  /** Called when the idle timeout expires. */
  onTimeout: () => void;
}

interface UseIdleTimeoutReturn {
  /** Whether the warning modal should be visible. */
  showWarning: boolean;
  /** Seconds remaining until auto-logout (only meaningful while showWarning === true). */
  secondsLeft: number;
  /** Resets the idle timer — call this when the user clicks "Stay Logged In". */
  resetTimer: () => void;
}

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

export function useIdleTimeout({
  timeoutMs = 5 * 60 * 1000,
  warningMs = 60 * 1000,
  onTimeout,
}: UseIdleTimeoutOptions): UseIdleTimeoutReturn {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(warningMs / 1000));

  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    warnTimerRef.current = null;
    logoutTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const startCountdown = useCallback(() => {
    const totalSecs = Math.floor(warningMs / 1000);
    setSecondsLeft(totalSecs);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [warningMs]);

  const resetTimer = useCallback(() => {
    clearAll();
    setShowWarning(false);
    setSecondsLeft(Math.floor(warningMs / 1000));

    warnTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      startCountdown();
    }, timeoutMs - warningMs);

    logoutTimerRef.current = setTimeout(() => {
      setShowWarning(false);
      onTimeout();
    }, timeoutMs);
  }, [clearAll, timeoutMs, warningMs, startCountdown, onTimeout]);

  useEffect(() => {
    const handleActivity = () => {
      if (!showWarning) {
        resetTimer();
      }
    };

    ACTIVITY_EVENTS.forEach(evt =>
      window.addEventListener(evt, handleActivity, { passive: true })
    );

    resetTimer();

    return () => {
      ACTIVITY_EVENTS.forEach(evt =>
        window.removeEventListener(evt, handleActivity)
      );
      clearAll();
    };
  }, []);

  return { showWarning, secondsLeft, resetTimer };
}
