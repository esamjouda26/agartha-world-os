import type { Database } from "@/types/database";

export type CrewZone = Database["public"]["Tables"]["crew_zones"]["Row"];
export type Zone = Database["public"]["Tables"]["zones"]["Row"];

export type ZoneEntry = Readonly<{
  id: string;
  zoneName: string;
  scannedAt: string;
  leftAt: string | null;
}>;

export type ZoneScanContext = Readonly<{
  staffRecordId: string;
  currentZone: ZoneEntry | null;
  recentEntries: ReadonlyArray<ZoneEntry>;
}>;
