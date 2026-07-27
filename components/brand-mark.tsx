import Image from "next/image";
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
      <Image
        alt=""
        aria-hidden="true"
        className="size-9 shrink-0"
        height={36}
        priority
        src="/brand/restrocost-mark.png"
        width={36}
      />
      {!compact && (
        <span className="text-[15px] font-semibold tracking-[-0.02em]">
          RestroCost
        </span>
      )}
    </div>
  );
}
