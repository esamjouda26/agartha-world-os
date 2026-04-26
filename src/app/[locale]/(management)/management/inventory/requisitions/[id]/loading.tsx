import { TableSkeleton, DetailSkeleton } from "@/components/ui/skeleton-kit";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <DetailSkeleton data-testid="inventory-requisition-detail-skeleton" />
      <TableSkeleton
        rows={4}
        data-testid="inventory-requisition-detail-items-skeleton"
      />
    </div>
  );
}
