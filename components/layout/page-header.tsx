import type { LucideIcon } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <header className="sticky top-16 z-30 border-b bg-card/95 backdrop-blur lg:top-0">
      <div className="flex min-h-[84px] items-center justify-between gap-5 px-5 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className="hidden size-10 shrink-0 place-items-center rounded-lg bg-[var(--forest-soft)] text-[var(--forest)] sm:grid">
              <Icon className="size-4.5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
              {eyebrow}
            </p>
            <h1 className="mt-1 truncate text-xl font-medium tracking-[-0.025em]">
              {title}
            </h1>
            {description && (
              <p className="mt-1 hidden text-xs text-muted-foreground md:block">
                {description}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
    </header>
  );
}
