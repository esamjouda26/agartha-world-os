"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";

import { PageHeader } from "@/components/ui/page-header";
import { StatusTabBar } from "@/components/ui/status-tab-bar";

import { LocationTable } from "@/features/zones/components/location-table";
import { ZoneTable } from "@/features/zones/components/zone-table";
import { LocationCategoryAssignment } from "@/features/zones/components/location-category-assignment";
import type { ZonesPageData } from "@/features/zones/types/zone";

type ZonesPageViewProps = Readonly<{
  data: ZonesPageData;
  canWrite: boolean;
}>;

const ZONE_TABS = ["locations", "zones", "categories"] as const;
type ZoneTabValue = (typeof ZONE_TABS)[number];

export function ZonesPageView({ data, canWrite }: ZonesPageViewProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="zones-page">
      <PageHeader
        title="Zones & Locations"
        description="Manage physical locations, floor zones, and category permissions."
      />

      <StatusTabBar
        tabs={[
          { value: "locations", label: `Locations (${data.locations.length})` },
          { value: "zones", label: `Zones (${data.zones.length})` },
          { value: "categories", label: "Allowed Categories" },
        ]}
        paramKey="tab"
        defaultValue="locations"
        ariaLabel="Zones sections"
        panelIdPrefix="zones-tab"
        data-testid="zones-tabs"
      />
      <ZonesTabContent data={data} canWrite={canWrite} />
    </div>
  );
}

function ZonesTabContent({ data, canWrite }: ZonesPageViewProps) {
  const [tab] = useQueryState(
    "tab",
    parseAsString.withDefault("locations").withOptions({ clearOnDefault: true, history: "replace" }),
  );
  const current: ZoneTabValue = (ZONE_TABS as readonly string[]).includes(tab) ? (tab as ZoneTabValue) : "locations";

  return (
    <div role="tabpanel" id={`zones-tab-${current}`} aria-labelledby={`tab-tab-${current}`} data-testid={`zones-panel-${current}`}>
      {current === "locations" ? (
        <LocationTable locations={data.locations} orgUnits={data.orgUnits} canWrite={canWrite} />
      ) : null}
      {current === "zones" ? (
        <ZoneTable zones={data.zones} locations={data.locations} canWrite={canWrite} />
      ) : null}
      {current === "categories" ? (
        <LocationCategoryAssignment
          locations={data.locations}
          materialCategories={data.materialCategories}
          locationCategories={data.locationCategories}
          canWrite={canWrite}
        />
      ) : null}
    </div>
  );
}
