import { DetailSkeleton } from "@/components/ui/skeleton-kit";

/**
 * `/admin/devices/[id]` loading skeleton.
 * Header + info card + two list sections.
 */
export default function Loading() {
  return <DetailSkeleton data-testid="device-detail-skeleton" />;
}
