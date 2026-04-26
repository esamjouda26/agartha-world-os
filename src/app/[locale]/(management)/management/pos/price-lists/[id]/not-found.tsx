import { DetailNotFound } from "@/components/shared/detail-not-found";
import type { Route } from "next";

export default function NotFound() {
  return (
    <DetailNotFound
      resourceNoun="price list"
      listingHref={"/management/pos/price-lists" as Route}
      backLabel="Back to Price Lists"
      data-testid="price-list-not-found"
    />
  );
}
