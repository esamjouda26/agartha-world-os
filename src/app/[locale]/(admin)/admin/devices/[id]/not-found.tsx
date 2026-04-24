import { DetailNotFound } from "@/components/shared/detail-not-found";

export default function NotFound() {
  return (
    <DetailNotFound
      resourceNoun="device"
      listingHref={"/admin/devices" as never}
      backLabel="Back to Device Registry"
    />
  );
}
