/** View-model types for the Cost & Waste dashboard. */

export type WasteReasonItem = Readonly<{
  reason: string;
  label: string;
  totalCost: number;
  quantity: number;
}>;

export type WastedMaterialItem = Readonly<{
  materialId: string;
  materialName: string;
  totalCost: number;
  quantity: number;
}>;

export type DailyWaste = Readonly<{
  date: string;
  totalCost: number;
}>;

export type StockByLocation = Readonly<{
  locationId: string;
  locationName: string;
  stockValue: number;
}>;

export type StockByType = Readonly<{
  materialType: string;
  label: string;
  stockValue: number;
}>;

export type CostsDashboardData = Readonly<{
  periodFrom: string;
  periodTo: string;

  // KPIs
  totalStockValue: number;
  totalCogs: number;
  totalWasteCost: number;
  wasteToCogsPct: number | null;

  // Waste breakdown
  wasteByReason: ReadonlyArray<WasteReasonItem>;
  topWastedMaterials: ReadonlyArray<WastedMaterialItem>;
  wasteTrend: ReadonlyArray<DailyWaste>;

  // Inventory composition
  stockByLocation: ReadonlyArray<StockByLocation>;
  stockByType: ReadonlyArray<StockByType>;
}>;
