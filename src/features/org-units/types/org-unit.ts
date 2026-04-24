/** View-model types for the Org Units admin page. */

export type UnitType = "company" | "division" | "department";

export type OrgUnitRow = Readonly<{
  id: string;
  parentId: string | null;
  unitType: UnitType;
  code: string;
  name: string;
  /** ltree path string, e.g. "company.finance.payroll" */
  path: string;
  isActive: boolean;
  staffCount: number;
}>;

export type OrgUnitNode = OrgUnitRow & {
  children: OrgUnitNode[];
};
