"use client";

import * as React from "react";

import { PageHeader } from "@/components/ui/page-header";
import { UrlTabPanel } from "@/components/shared/url-tab-panel";

import { RolesTable } from "@/features/permissions/components/roles-table";
import { PermissionDomainsTable } from "@/features/permissions/components/permission-domains-table";
import { PermissionMatrix } from "@/features/permissions/components/permission-matrix";
import type { PermissionsPageData } from "@/features/permissions/types/permission";

type PermissionsPageViewProps = Readonly<{
  data: PermissionsPageData;
  canWrite: boolean;
}>;

export function PermissionsPageView({ data, canWrite }: PermissionsPageViewProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="permissions-page">
      <PageHeader
        title="Permissions"
        description="Manage roles and the domain permission matrix that controls all RBAC across the system."
      />

      <UrlTabPanel
        param="tab"
        defaultTabId="matrix"
        data-testid="permissions-tabs"
        tabs={[
          {
            id: "matrix",
            label: "Role Permissions",
            "data-testid": "permissions-tab-matrix",
            content: (
              <PermissionMatrix
                roles={data.roles}
                domains={data.domains}
                permissions={data.permissions}
                canWrite={canWrite}
              />
            ),
          },
          {
            id: "roles",
            label: `Roles (${data.roles.length})`,
            "data-testid": "permissions-tab-roles",
            content: <RolesTable roles={data.roles} canWrite={canWrite} />,
          },
          {
            id: "domains",
            label: `Domains (${data.domains.length})`,
            "data-testid": "permissions-tab-domains",
            content: <PermissionDomainsTable domains={data.domains} />,
          },
        ]}
      />
    </div>
  );
}
