import { TableSkeleton, DetailSkeleton } from "@/components/ui/skeleton-kit";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <DetailSkeleton data-testid="inventory-reconciliation-detail-skeleton" />
      <TableSkeleton
        rows={6}
        data-testid="inventory-reconciliation-detail-items-skeleton"
      />
    </div>
  );
}
