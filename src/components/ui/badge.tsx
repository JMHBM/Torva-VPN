import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium tracking-wide uppercase",
  {
    variants: {
      variant: {
        muted: "bg-secondary text-muted-foreground",
        connected: "bg-connected/15 text-connected",
        caution: "bg-caution/15 text-caution",
        danger: "bg-destructive/15 text-destructive",
        outline: "shadow-[var(--shadow-border)] text-muted-foreground",
      },
    },
    defaultVariants: { variant: "muted" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
