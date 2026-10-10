import * as React from 'react';
import { cn } from '../../lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex w-full rounded-2xl bg-white border border-olive/10 p-4 text-sm outline-none transition-shadow resize-none',
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
Textarea.displayName = 'Textarea';

export { Textarea };
