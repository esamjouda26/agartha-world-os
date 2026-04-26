import type { Route } from "next";
import { DetailNotFound } from "@/components/shared/detail-not-found";

export default function MaterialNotFound() {
  return (
    <DetailNotFound
      resourceNoun="material"
      listingHref={"/management/procurement" as Route}
    />
  );
}
