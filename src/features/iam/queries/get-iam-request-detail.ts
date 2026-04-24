import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Result shape for the IAM Request Detail page.
 *
 * Cache model (ADR-0006): React `cache()` only — request-scoped dedup.
 */
export type IamRequestDetail = Readonly<{
  id: string;
  requestType: string;
  status: string;
  hrRemark: string | null;
  itRemark: string | null;
  createdAt: string;
  updatedAt: string | null;
  approvedAt: string | null;
  inviteSentAt: string | null;

  // Staff context
  staffRecordId: string;
  staffName: string;
  personalEmail: string;
  orgUnitName: string | null;
  contractStart: string;
  contractEnd: string | null;

  // Role context
  targetRoleName: string | null;
  currentRoleName: string | null;

  // Approver context
  approvedByName: string | null;
}>;

export const getIamRequestDetail = cache(
  async (client: SupabaseClient<Database>, requestId: string): Promise<IamRequestDetail | null> => {
    const { data, error } = await client
      .from("iam_requests")
      .select(
        `id, request_type, status, hr_remark, it_remark, created_at, updated_at,
         approved_at, invite_sent_at, staff_record_id, approved_by,
         staff_records!iam_requests_staff_record_id_fkey (
           legal_name, personal_email, contract_start, contract_end,
           org_units!staff_records_org_unit_id_fkey ( name )
         ),
         target_role:roles!iam_requests_target_role_id_fkey ( display_name ),
         current_role:roles!iam_requests_current_role_id_fkey ( display_name )`,
      )
      .eq("id", requestId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Resolve approver name via profiles (approved_by → auth.users → profiles)
    let approvedByName: string | null = null;
    if (data.approved_by) {
      const { data: approverProfile } = await client
        .from("profiles")
        .select("display_name")
        .eq("id", data.approved_by)
        .maybeSingle();
      approvedByName = approverProfile?.display_name ?? null;
    }

    // Typed narrowing for Supabase joins
    const staff = data.staff_records as {
      legal_name: string;
      personal_email: string;
      contract_start: string;
      contract_end: string | null;
      org_units: { name: string } | null;
    } | null;

    const targetRole = data.target_role as { display_name: string } | null;
    const currentRole = data.current_role as { display_name: string } | null;

    return {
      id: data.id,
      requestType: data.request_type,
      status: data.status ?? "pending_it",
      hrRemark: data.hr_remark,
      itRemark: data.it_remark,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      approvedAt: data.approved_at,
      inviteSentAt: data.invite_sent_at,

      staffRecordId: data.staff_record_id,
      staffName: staff?.legal_name ?? "Unknown",
      personalEmail: staff?.personal_email ?? "",
      orgUnitName: staff?.org_units?.name ?? null,
      contractStart: staff?.contract_start ?? "",
      contractEnd: staff?.contract_end ?? null,

      targetRoleName: targetRole?.display_name ?? null,
      currentRoleName: currentRole?.display_name ?? null,
      approvedByName,
    };
  },
);
