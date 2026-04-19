import { CardSkeleton } from "@/components/ui/skeleton-kit";

export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <CardSkeleton />
    </div>
  );
}
