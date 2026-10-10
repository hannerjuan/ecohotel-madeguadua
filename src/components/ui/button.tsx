import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-wide transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-olive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-olive text-white hover:opacity-90 shadow-sm',
        outline: 'border border-white/50 text-white backdrop-blur-md hover:bg-white/20',
        ghost: 'text-ink/70 hover:text-olive',
        subtle: 'bg-olive/10 text-olive hover:bg-olive/20',
        link: 'text-olive underline-offset-4 hover:underline p-0 h-auto rounded-none',
        destructive: 'bg-red-50 text-red-600 hover:bg-red-100',
      },
      size: {
        default: 'h-12 px-6 py-3',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-14 px-10 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
