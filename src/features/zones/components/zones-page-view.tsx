"use client";

import * as React from "react";

import { PageHeader } from "@/components/ui/page-header";
import { UrlTabPanel } from "@/components/shared/url-tab-panel";

import { LocationTable } from "@/features/zones/components/location-table";
import { ZoneTable } from "@/features/zones/components/zone-table";
import { LocationCategoryAssignment } from "@/features/zones/components/location-category-assignment";
import type { ZonesPageData } from "@/features/zones/types/zone";

type ZonesPageViewProps = Readonly<{
  data: ZonesPageData;
  canWrite: boolean;
}>;

export function ZonesPageView({ data, canWrite }: ZonesPageViewProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="zones-page">
      <PageHeader
        title="Zones & Locations"
        description="Manage physical locations, floor zones, and category permissions."
      />

      <UrlTabPanel
        param="tab"
        defaultTabId="locations"
        data-testid="zones-tabs"
        tabs={[
          {
            id: "locations",
            label: `Locations (${data.locations.length})`,
            "data-testid": "zones-tab-locations",
            content: (
              <LocationTable
                locations={data.locations}
                orgUnits={data.orgUnits}
                canWrite={canWrite}
              />
            ),
          },
          {
            id: "zones",
            label: `Zones (${data.zones.length})`,
            "data-testid": "zones-tab-zones",
            content: (
              <ZoneTable zones={data.zones} locations={data.locations} canWrite={canWrite} />
            ),
          },
          {
            id: "categories",
            label: "Allowed Categories",
            "data-testid": "zones-tab-categories",
            content: (
              <LocationCategoryAssignment
                locations={data.locations}
                materialCategories={data.materialCategories}
                locationCategories={data.locationCategories}
                canWrite={canWrite}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
