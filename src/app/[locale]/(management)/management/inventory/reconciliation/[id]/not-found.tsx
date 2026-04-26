import type { Route } from "next";
import { DetailNotFound } from "@/components/shared/detail-not-found";

export default function ReconciliationNotFound() {
  return (
    <DetailNotFound
      resourceNoun="reconciliation"
      listingHref={"/management/inventory/reconciliation" as Route}
      data-testid="inventory-reconciliation-detail-not-found"
    />
  );
}
