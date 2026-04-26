import type { Route } from "next";
import { DetailNotFound } from "@/components/shared/detail-not-found";

export default function RequisitionNotFound() {
  return (
    <DetailNotFound
      resourceNoun="requisition"
      listingHref={"/management/inventory/requisitions" as Route}
      data-testid="inventory-requisition-detail-not-found"
    />
  );
}
