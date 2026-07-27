import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[color-mix(in_srgb,var(--hairline)_70%,transparent)]",
        className,
      )}
      {...props}
    />
  );
}
