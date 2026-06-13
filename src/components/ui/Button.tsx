import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'dark';
type Size = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold ' +
  'transition-all duration-200 ease-out select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-55 active:scale-[0.98]';

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-glow hover:bg-primary-hover hover:shadow-elevated',
  secondary: 'bg-primary-light text-primary-800 hover:bg-primary-200',
  outline:
    'border border-border bg-card text-foreground shadow-soft hover:border-primary/40 hover:bg-muted/50',
  ghost: 'text-foreground hover:bg-muted',
  destructive: 'bg-red-600 text-white shadow-soft hover:bg-red-700',
  dark: 'bg-slate-900 text-white shadow-soft hover:bg-slate-800',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
  xl: 'h-14 px-8 text-base sm:text-lg',
  icon: 'h-11 w-11',
};

export function buttonVariants({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', loading = false, children, disabled, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={buttonVariants({ variant, size, className })}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
