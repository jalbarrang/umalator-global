import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import React, { useMemo } from 'react';

const floatingButtonVariants = cva(
  'rounded-full shadow-lg transition-all hover:shadow-xl active:shadow-md active:scale-95 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] inline-flex items-center justify-center outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-border bg-background text-foreground hover:bg-muted'
      },
      size: {
        default: "size-14 [&_svg:not([class*='size-'])]:size-6",
        sm: "size-10 [&_svg:not([class*='size-'])]:size-4",
        lg: "size-16 [&_svg:not([class*='size-'])]:size-7",
        extended: "h-14 gap-3 px-6 text-sm font-medium [&_svg:not([class*='size-'])]:size-5"
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export type FloatingButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof floatingButtonVariants>;

const FloatingButton = React.memo(
  ({ className, variant = 'default', size = 'default', ...props }: FloatingButtonProps) => {
    const classNameObject = useMemo(() => {
      return cn(floatingButtonVariants({ variant, size, className }));
    }, [variant, size, className]);

    return <ButtonPrimitive data-slot="floating-button" className={classNameObject} {...props} />;
  }
);

export { FloatingButton, floatingButtonVariants };
