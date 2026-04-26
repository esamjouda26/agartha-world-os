"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";

import { PageHeader } from "@/components/ui/page-header";
import { StatusTabBar } from "@/components/ui/status-tab-bar";

import { RolesTable } from "@/features/permissions/components/roles-table";
import { PermissionDomainsTable } from "@/features/permissions/components/permission-domains-table";
import { PermissionMatrix } from "@/features/permissions/components/permission-matrix";
import type { PermissionsPageData } from "@/features/permissions/types/permission";

type PermissionsPageViewProps = Readonly<{
  data: PermissionsPageData;
  canWrite: boolean;
}>;

const PERM_TABS = ["matrix", "roles", "domains"] as const;
type PermTabValue = (typeof PERM_TABS)[number];

export function PermissionsPageView({ data, canWrite }: PermissionsPageViewProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="permissions-page">
      <PageHeader
        title="Permissions"
        description="Manage roles and the domain permission matrix that controls all RBAC across the system."
      />

      <StatusTabBar
        tabs={[
          { value: "matrix", label: "Role Permissions" },
          { value: "roles", label: `Roles (${data.roles.length})` },
          { value: "domains", label: `Domains (${data.domains.length})` },
        ]}
        paramKey="tab"
        defaultValue="matrix"
        ariaLabel="Permissions sections"
        panelIdPrefix="permissions-tab"
        data-testid="permissions-tabs"
      />
      <PermissionsTabContent data={data} canWrite={canWrite} />
    </div>
  );
}

function PermissionsTabContent({ data, canWrite }: PermissionsPageViewProps) {
  const [tab] = useQueryState(
    "tab",
    parseAsString.withDefault("matrix").withOptions({ clearOnDefault: true, history: "replace" }),
  );
  const current: PermTabValue = (PERM_TABS as readonly string[]).includes(tab) ? (tab as PermTabValue) : "matrix";

  return (
    <div role="tabpanel" id={`permissions-tab-${current}`} aria-labelledby={`tab-tab-${current}`} data-testid={`permissions-panel-${current}`}>
      {current === "matrix" ? (
        <PermissionMatrix roles={data.roles} domains={data.domains} permissions={data.permissions} canWrite={canWrite} />
      ) : null}
      {current === "roles" ? (
        <RolesTable roles={data.roles} canWrite={canWrite} />
      ) : null}
      {current === "domains" ? (
        <PermissionDomainsTable domains={data.domains} />
      ) : null}
    </div>
  );
}
