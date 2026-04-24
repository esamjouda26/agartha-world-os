/** View-model types for the Permissions admin page. */

export type AccessLevel = "admin" | "manager" | "crew";

export type RoleRow = Readonly<{
  id: string;
  name: string;
  displayName: string;
  accessLevel: AccessLevel;
}>;

export type PermissionDomainRow = Readonly<{
  id: string;
  code: string;
  name: string;
  description: string | null;
}>;

export type PermissionRow = Readonly<{
  id: string;
  roleId: string;
  domainId: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}>;

export type PermissionsPageData = Readonly<{
  roles: ReadonlyArray<RoleRow>;
  domains: ReadonlyArray<PermissionDomainRow>;
  permissions: ReadonlyArray<PermissionRow>;
}>;
