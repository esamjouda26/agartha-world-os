import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  PermissionsPageData,
  RoleRow,
  PermissionDomainRow,
  PermissionRow,
  AccessLevel,
} from "@/features/permissions/types/permission";

/**
 * RSC query — all data for /admin/permissions.
 * Parallel fetch of roles, domains, and the full permission matrix.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 */
export const getPermissionsPage = cache(
  async (client: SupabaseClient<Database>): Promise<PermissionsPageData> => {
    const [rolesResult, domainsResult, permissionsResult] = await Promise.all([
      client
        .from("roles")
        .select("id, name, display_name, access_level")
        .order("access_level", { ascending: true })
        .order("name", { ascending: true }),

      client
        .from("permission_domains")
        .select("id, code, name, description")
        .order("code", { ascending: true }),

      client
        .from("role_domain_permissions")
        .select("id, role_id, domain_id, can_create, can_read, can_update, can_delete"),
    ]);

    if (rolesResult.error) throw rolesResult.error;
    if (domainsResult.error) throw domainsResult.error;
    if (permissionsResult.error) throw permissionsResult.error;

    const roles: RoleRow[] = (rolesResult.data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      displayName: r.display_name,
      accessLevel: (r.access_level ?? "crew") as AccessLevel,
    }));

    const domains: PermissionDomainRow[] = (domainsResult.data ?? []).map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      description: d.description ?? null,
    }));

    const permissions: PermissionRow[] = (permissionsResult.data ?? []).map((p) => ({
      id: p.id,
      roleId: p.role_id,
      domainId: p.domain_id,
      canCreate: p.can_create ?? false,
      canRead: p.can_read ?? false,
      canUpdate: p.can_update ?? false,
      canDelete: p.can_delete ?? false,
    }));

    return { roles, domains, permissions };
  },
);
