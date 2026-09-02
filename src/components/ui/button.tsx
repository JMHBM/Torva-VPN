import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-[color,background-color,box-shadow,transform,opacity] duration-(--motion-quick) ease-(--ease-out) disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:ring-2 focus-visible:ring-ring/50 active:enabled:scale-[0.96]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-[var(--shadow-border)]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        outline:
          "bg-transparent shadow-[var(--shadow-border)] hover:bg-accent",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        connected:
          "bg-connected text-connected-foreground hover:bg-connected/90",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 rounded-sm px-3 text-xs",
        lg: "h-11 rounded-lg px-5",
        icon: "size-10",
        "icon-sm": "size-8 rounded-sm",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
