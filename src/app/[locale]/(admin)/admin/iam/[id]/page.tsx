import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Route } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DetailPageShell } from "@/components/shared/detail-page-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { getIamRequestDetail } from "@/features/iam/queries/get-iam-request-detail";
import { IamRequestDetailView } from "@/features/iam/components/iam-request-detail-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `IAM Request ${id.slice(0, 8)} | Admin`,
    description: "IAM request detail — review staff context, role changes, and take action.",
  };
}

/**
 * `/admin/iam/[id]` — IAM Request Detail (Pattern C).
 *
 * Fetches the single request with full JOINs, checks write permission,
 * and renders via DetailPageShell + IamRequestDetailView.
 */
export default async function AdminIamDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [
    request,
    {
      data: { user },
    },
  ] = await Promise.all([getIamRequestDetail(supabase, id), supabase.auth.getUser()]);

  if (!request) notFound();

  const appMeta = (user?.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const canWrite = (appMeta.domains?.hr ?? []).includes("u");

  return (
    <DetailPageShell
      breadcrumb={[
        { label: "Admin", href: "/admin/it" as Route },
        { label: "IAM Requests", href: "/admin/iam" as Route },
        { label: request.staffName, current: true },
      ]}
      header={{
        title: request.staffName,
        eyebrow: `IAM · ${request.requestType.toUpperCase()}`,
        status: <StatusBadge status={request.status} data-testid="iam-detail-status" />,
        metadata: [
          {
            label: "Type",
            value: (
              <StatusBadge
                status={request.requestType}
                tone={
                  request.requestType === "provisioning"
                    ? "info"
                    : request.requestType === "transfer"
                      ? "accent"
                      : request.requestType === "termination"
                        ? "danger"
                        : "neutral"
                }
                data-testid="iam-detail-type-badge"
              />
            ),
          },
          {
            label: "Submitted",
            value: new Date(request.createdAt).toLocaleDateString("en-MY", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          },
        ],
        "data-testid": "iam-detail-header",
      }}
      data-testid="iam-detail-shell"
    >
      <IamRequestDetailView request={request} canWrite={canWrite} />
    </DetailPageShell>
  );
}
