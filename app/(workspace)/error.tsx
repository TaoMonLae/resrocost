"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-[var(--coral-soft)] text-[var(--coral)]">
          <AlertTriangle />
        </span>
        <h1 className="mt-5 text-xl font-medium">We couldn’t load this view</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The database may be unavailable, or one of the restaurant queries
          could not complete. No data was changed.
        </p>
        <Button className="mt-5" onClick={reset}>
          <RotateCcw />
          Try again
        </Button>
      </div>
    </main>
  );
}
