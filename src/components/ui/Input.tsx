import * as React from 'react';
import { cn } from '@/lib/utils';

const fieldBase =
  'w-full rounded-xl border bg-card px-4 text-sm text-foreground shadow-soft ' +
  'placeholder:text-muted-foreground/70 transition-all duration-200 outline-none ' +
  'focus:border-primary/50 focus:ring-4 focus:ring-primary/10 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, leftIcon, ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        aria-invalid={invalid}
        className={cn(
          fieldBase,
          'h-11',
          leftIcon && 'pl-11',
          invalid && 'border-red-400 focus:border-red-500 focus:ring-red-500/15',
          className
        )}
        {...props}
      />
    );

    if (!leftIcon) return input;

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          {leftIcon}
        </span>
        {input}
      </div>
    );
  }
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={invalid}
    className={cn(
      fieldBase,
      'min-h-[96px] resize-y py-3 leading-relaxed',
      invalid && 'border-red-400 focus:border-red-500 focus:ring-red-500/15',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(({ className, invalid, children, ...props }, ref) => (
  <select
    ref={ref}
    aria-invalid={invalid}
    className={cn(
      fieldBase,
      'h-11 cursor-pointer appearance-none bg-[length:18px] bg-[right_0.85rem_center] bg-no-repeat pr-10',
      "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")]",
      invalid && 'border-red-400 focus:border-red-500 focus:ring-red-500/15',
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';
