import { cn } from "@/lib/utils";

export function BrandMark({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--ink)] text-sm font-semibold text-[var(--surface)]"
      >
        R
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-[-0.02em]">
          RestroCost
        </span>
      )}
    </div>
  );
}
