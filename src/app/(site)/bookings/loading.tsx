import { Skeleton } from "@/components/ui/misc";

export default function LoadingBookings() {
  return (
    <div className="container py-8 space-y-4">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-9 w-96" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}
