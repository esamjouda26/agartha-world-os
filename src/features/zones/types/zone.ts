/** View-model types for the Zones/Locations admin page. */

export type LocationRow = Readonly<{
  id: string;
  name: string;
  orgUnitId: string | null;
  orgUnitName: string | null;
  isActive: boolean;
  createdAt: string;
}>;

export type ZoneRow = Readonly<{
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  locationId: string;
  locationName: string;
  isActive: boolean;
  createdAt: string;
}>;

export type OrgUnitOption = Readonly<{
  id: string;
  name: string;
  code: string;
}>;

export type MaterialCategoryOption = Readonly<{
  id: string;
  name: string;
  code: string | null;
  depth: number;
}>;

export type LocationCategoryEntry = Readonly<{
  locationId: string;
  categoryIds: ReadonlyArray<string>;
}>;

export type ZonesPageData = Readonly<{
  locations: ReadonlyArray<LocationRow>;
  zones: ReadonlyArray<ZoneRow>;
  orgUnits: ReadonlyArray<OrgUnitOption>;
  materialCategories: ReadonlyArray<MaterialCategoryOption>;
  locationCategories: ReadonlyArray<LocationCategoryEntry>;
}>;
