"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="grid min-h-screen place-items-center p-6">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-medium">RestroCost needs a refresh</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              An unexpected error interrupted this page. No changes were made.
            </p>
            <Button className="mt-5" onClick={reset}>
              Reload view
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
