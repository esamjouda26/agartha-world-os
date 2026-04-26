import type { Route } from "next";
import { DetailNotFound } from "@/components/shared/detail-not-found";

export default function NotFound() {
  return (
    <DetailNotFound
      resourceNoun="purchase order"
      listingHref={"/management/procurement/purchase-orders" as Route}
    />
  );
}
