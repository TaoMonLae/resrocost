import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="text-center">
        <BrandMark className="mb-10 justify-center" />
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          404
        </p>
        <h1 className="mt-3 text-3xl font-normal tracking-[-0.03em]">
          This page isn’t on the menu.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The page may belong to a later build phase or may have moved.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/dashboard">
            <ArrowLeft />
            Return to dashboard
          </Link>
        </Button>
      </div>
    </main>
  );
}
