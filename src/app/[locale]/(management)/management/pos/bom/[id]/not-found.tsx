import { DetailNotFound } from "@/components/shared/detail-not-found";
import type { Route } from "next";

export default function NotFound() {
  return (
    <DetailNotFound
      resourceNoun="BOM"
      listingHref={"/management/pos/bom" as Route}
      backLabel="Back to Bill of Materials"
      data-testid="bom-not-found"
    />
  );
}
