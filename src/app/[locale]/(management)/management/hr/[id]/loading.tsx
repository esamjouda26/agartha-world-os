import { DetailSkeleton } from "@/components/ui/skeleton-kit";

/** `/management/hr/[id]` loading skeleton — detail header + section cards. */
export default function Loading() {
  return <DetailSkeleton sections={3} data-testid="hr-detail-skeleton" />;
}
