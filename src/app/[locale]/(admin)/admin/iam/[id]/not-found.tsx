import type { Route } from "next";

import { DetailNotFound } from "@/components/shared/detail-not-found";

export default function NotFound() {
  return (
    <DetailNotFound
      resourceNoun="IAM request"
      listingHref={"/admin/iam" as Route}
      backLabel="Back to IAM Requests"
      data-testid="iam-detail-not-found"
    />
  );
}
