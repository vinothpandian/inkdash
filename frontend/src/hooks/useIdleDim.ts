import { useEffect, useRef, useState } from 'react';

export interface IdleDimConfig {
  idle_dim_enabled: boolean;
  idle_dim_timeout_ms: number;
  /** Consumed by the overlay that renders isIdle, not by this hook. */
  idle_dim_opacity: number;
  idle_dim_fade_ms: number;
}

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'touchstart', 'keydown', 'wheel'] as const;

/**
 * Tracks user activity (mouse/touch/keyboard) and reports whether the app
 * has been idle longer than idle_dim_timeout_ms, so the UI can dim to
 * reduce static-brightness burn-in risk on an always-on display.
 */
export function useIdleDim(config: IdleDimConfig): boolean {
  const { idle_dim_enabled, idle_dim_timeout_ms } = config;
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!idle_dim_enabled) {
      setIsIdle(false);
      return;
    }

    const resetTimer = () => {
      setIsIdle(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setIsIdle(true), idle_dim_timeout_ms);
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [idle_dim_enabled, idle_dim_timeout_ms]);

  return isIdle;
}
