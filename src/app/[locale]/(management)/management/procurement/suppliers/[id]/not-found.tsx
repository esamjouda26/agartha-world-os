import type { Route } from "next";
import { DetailNotFound } from "@/components/shared/detail-not-found";

export default function NotFound() {
  return (
    <DetailNotFound
      resourceNoun="supplier"
      listingHref={"/management/procurement/suppliers" as Route}
    />
  );
}
