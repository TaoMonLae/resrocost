import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow)] hover:opacity-90 active:opacity-80",
        outline:
          "border bg-card text-foreground shadow-[var(--shadow)] hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:brightness-95",
        ghost: "text-foreground hover:bg-muted",
        destructive:
          "bg-destructive text-white hover:opacity-90 dark:text-[#151515]",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 min-h-8 rounded-md px-3 text-xs",
        lg: "h-11 px-5",
        icon: "size-10 min-h-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
