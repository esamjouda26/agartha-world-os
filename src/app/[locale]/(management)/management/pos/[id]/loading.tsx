import { DetailSkeleton } from "@/components/ui/skeleton-kit";

/** `/management/pos/[id]` loading skeleton — detail header + tabs + table. */
export default function Loading() {
  return <DetailSkeleton sections={2} data-testid="pos-point-detail-skeleton" />;
}
