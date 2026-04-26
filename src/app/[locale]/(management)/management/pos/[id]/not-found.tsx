import { DetailNotFound } from "@/components/shared/detail-not-found";
import type { Route } from "next";

export default function NotFound() {
  return (
    <DetailNotFound
      resourceNoun="POS point"
      listingHref={"/management/pos" as Route}
      backLabel="Back to POS Points"
      data-testid="pos-point-not-found"
    />
  );
}
