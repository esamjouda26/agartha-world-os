import { DetailSkeleton } from "@/components/ui/skeleton-kit";

export default function Loading() {
  return <DetailSkeleton sections={2} data-testid="price-list-detail-skeleton" />;
}
