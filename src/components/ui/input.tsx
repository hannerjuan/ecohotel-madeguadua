import * as React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex w-full rounded-2xl bg-cream border border-transparent p-4 text-sm outline-none transition-shadow',
          'focus:ring-2 focus:ring-olive/20 focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'placeholder:text-ink/40',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
