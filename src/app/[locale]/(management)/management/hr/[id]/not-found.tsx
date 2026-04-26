import { DetailNotFound } from "@/components/shared/detail-not-found";
import type { Route } from "next";

export default function NotFound() {
  return (
    <DetailNotFound
      resourceNoun="staff record"
      listingHref={"/management/hr" as Route}
      backLabel="Back to Staff Management"
      data-testid="hr-detail-not-found"
    />
  );
}
