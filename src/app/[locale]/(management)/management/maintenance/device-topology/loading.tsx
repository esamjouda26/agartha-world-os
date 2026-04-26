import { Skeleton } from "@/components/ui/skeleton";

export default function MaintenanceDeviceTopologyLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-6">
        <div
          className="flex flex-col gap-2 rounded-xl border p-3"
          data-testid="maintenance-device-topology-loading-sidebar"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-6">
          <div
            className="flex flex-col gap-1 rounded-xl border p-3"
            data-testid="maintenance-device-topology-loading-tree"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
          <div
            className="flex flex-col gap-3 rounded-xl border p-4"
            data-testid="maintenance-device-topology-loading-panel"
          >
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
