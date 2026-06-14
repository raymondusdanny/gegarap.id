'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Segmented OTP entry (one box per digit) like Gojek/Tokopedia: auto-advance,
 * backspace-to-previous, full-code paste, and arrow-key navigation. Calls
 * `onComplete` once all boxes are filled. Bump `resetSignal` to clear + refocus.
 */
export function OtpInput({
  length = 6,
  onComplete,
  disabled = false,
  invalid = false,
  resetSignal = 0,
}: {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  resetSignal?: number;
}) {
  const [vals, setVals] = React.useState<string[]>(() => Array(length).fill(''));
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  React.useEffect(() => {
    setVals(Array(length).fill(''));
    refs.current[0]?.focus();
  }, [resetSignal, length]);

  const fire = (next: string[]) => {
    if (next.every((d) => d !== '')) onComplete(next.join(''));
  };

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (!digit) return;
    const next = [...vals];
    next[i] = digit;
    setVals(next);
    if (i < length - 1) refs.current[i + 1]?.focus();
    fire(next);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...vals];
      if (next[i]) {
        next[i] = '';
        setVals(next);
      } else if (i > 0) {
        next[i - 1] = '';
        setVals(next);
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!text) return;
    e.preventDefault();
    const next = Array.from({ length }, (_, idx) => text[idx] ?? '');
    setVals(next);
    refs.current[Math.min(text.length, length - 1)]?.focus();
    fire(next);
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {vals.map((v, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={v}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit OTP ke-${i + 1}`}
          className={cn(
            'h-12 w-11 rounded-xl border bg-card text-center text-xl font-bold text-foreground shadow-soft outline-none transition-all sm:h-14 sm:w-12',
            'focus:border-primary/50 focus:ring-4 focus:ring-primary/10',
            'disabled:cursor-not-allowed disabled:opacity-60',
            invalid ? 'border-red-400' : 'border-border'
          )}
        />
      ))}
    </div>
  );
}
