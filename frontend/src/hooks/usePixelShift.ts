import { useEffect, useState } from 'react';

export interface PixelShiftConfig {
  pixel_shift_enabled: boolean;
  pixel_shift_amplitude_px: number;
  pixel_shift_interval_ms: number;
  pixel_shift_transition_ms: number;
}

interface Offset {
  x: number;
  y: number;
}

/**
 * Slowly drifts an {x, y} pixel offset within +/- amplitude using a random
 * walk, so a fixed-position layout doesn't keep the same pixels lit for
 * hours on an always-on display (LED/OLED burn-in mitigation).
 */
export function usePixelShift(config: PixelShiftConfig): Offset {
  const { pixel_shift_enabled, pixel_shift_amplitude_px, pixel_shift_interval_ms } = config;
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });

  useEffect(() => {
    if (!pixel_shift_enabled || pixel_shift_amplitude_px <= 0) {
      setOffset({ x: 0, y: 0 });
      return;
    }

    const intervalId = setInterval(() => {
      setOffset((prev) => ({
        x: clamp(prev.x + (Math.random() - 0.5) * pixel_shift_amplitude_px, -pixel_shift_amplitude_px, pixel_shift_amplitude_px),
        y: clamp(prev.y + (Math.random() - 0.5) * pixel_shift_amplitude_px, -pixel_shift_amplitude_px, pixel_shift_amplitude_px),
      }));
    }, pixel_shift_interval_ms);

    return () => clearInterval(intervalId);
  }, [pixel_shift_enabled, pixel_shift_amplitude_px, pixel_shift_interval_ms]);

  return offset;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
