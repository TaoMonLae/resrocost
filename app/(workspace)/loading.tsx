import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspaceLoading() {
  return (
    <main className="min-h-screen p-5 sm:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-7 w-56" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton className="h-32" key={index} />
        ))}
      </div>
      <div className="mt-7 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </main>
  );
}
