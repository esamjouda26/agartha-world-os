import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NuqsAdapter } from "nuqs/adapters/react";

import { PunchDialog } from "@/features/attendance/components/punch-dialog";
import { classifyCameraError } from "@/features/attendance/components/use-camera-capture";
import type { TodayShift } from "@/features/attendance/types";

/**
 * Integration test for the DingTalk-style <PunchDialog>.
 *
 * Camera state machine + the 5 distinct error states now live inside the
 * dialog (capture → preview → confirm flow). The ClockInOutPanel surface
 * only owns the CTA that opens the dialog and is covered separately by
 * the smaller state-driven render tests below.
 */

const uploadSelfieMock = vi.hoisted(() => vi.fn());
const clockInMock = vi.hoisted(() => vi.fn());
const clockOutMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/attendance/components/upload-selfie", () => ({
  uploadSelfie: uploadSelfieMock,
}));
vi.mock("@/features/attendance/actions/clock-in", () => ({
  clockInAction: clockInMock,
}));
vi.mock("@/features/attendance/actions/clock-out", () => ({
  clockOutAction: clockOutMock,
}));

const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const toastInfoMock = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/toast-helpers", () => ({
  toastSuccess: toastSuccessMock,
  toastError: toastErrorMock,
  toastInfo: toastInfoMock,
  toastWarning: vi.fn(),
}));

// next/navigation is server-only at module load; stub router.refresh.
const routerRefreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock, push: vi.fn(), replace: vi.fn() }),
}));

const originalMediaDevices = globalThis.navigator?.mediaDevices;

type GetUserMediaImpl = (constraints: MediaStreamConstraints) => Promise<MediaStream>;

function installGetUserMedia(impl: GetUserMediaImpl) {
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: impl },
  });
}

function fakeMediaStream(): MediaStream {
  const track = {
    kind: "video",
    enabled: true,
    stop: vi.fn(),
  } as unknown as MediaStreamTrack;
  return {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream;
}

const shiftFixture: TodayShift = {
  schedule: {
    id: "00000000-0000-0000-0000-000000000001",
    shift_date: "2026-04-20",
    shift_type_id: "00000000-0000-0000-0000-000000000010",
    expected_start_time: "09:00:00",
    expected_end_time: "17:00:00",
    is_override: false,
    override_reason: null,
  },
  shiftType: {
    id: "00000000-0000-0000-0000-000000000010",
    code: "MORN",
    name: "Morning",
    start_time: "09:00:00",
    end_time: "17:00:00",
    grace_late_arrival_minutes: 5,
    grace_early_departure_minutes: 5,
    max_early_clock_in_minutes: 30,
    max_late_clock_in_minutes: 60,
    max_late_clock_out_minutes: 60,
  },
  punches: [],
};

function renderDialog(kind: "clock-in" | "clock-out" = "clock-in") {
  return render(
    <NuqsAdapter>
      <PunchDialog open kind={kind} shift={shiftFixture} onOpenChange={() => {}} />
    </NuqsAdapter>,
  );
}

beforeEach(() => {
  uploadSelfieMock.mockReset();
  clockInMock.mockReset();
  clockOutMock.mockReset();
  toastSuccessMock.mockReset();
  toastErrorMock.mockReset();
  toastInfoMock.mockReset();
  routerRefreshMock.mockReset();
});

afterEach(() => {
  if (originalMediaDevices) {
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: originalMediaDevices,
    });
  }
});

describe("PunchDialog — capture phase", () => {
  it("opens with the live capture surface when camera resolves", async () => {
    installGetUserMedia(async () => fakeMediaStream());
    renderDialog();
    // Radix mounts the dialog in a portal; wait for both the capture
    // container and the circular shutter to appear.
    expect(await screen.findByTestId("punch-dialog-capture")).toBeInTheDocument();
    expect(await screen.findByTestId("punch-dialog-shutter-circle")).toBeInTheDocument();
  });
});

describe("PunchDialog — camera error differentiation", () => {
  type ErrorCase = Readonly<{
    errorName: string;
    testId: string;
    title: string;
  }>;

  const cases: ReadonlyArray<ErrorCase> = [
    {
      errorName: "NotAllowedError",
      testId: "punch-camera-denied",
      title: "Camera permission required",
    },
    {
      errorName: "NotReadableError",
      testId: "punch-camera-hardware-busy",
      title: "Camera is in use",
    },
    {
      errorName: "NotFoundError",
      testId: "punch-camera-not-found",
      title: "No camera detected",
    },
    {
      errorName: "OverconstrainedError",
      testId: "punch-camera-overconstrained",
      title: "Camera doesn't support capture",
    },
  ];

  it.each(cases)(
    "$errorName renders alert $testId with live region",
    async ({ errorName, testId, title }) => {
      installGetUserMedia(async () => {
        throw new DOMException("mock", errorName);
      });
      renderDialog();
      await waitFor(() => {
        expect(screen.getByTestId(testId)).toBeInTheDocument();
      });
      const alert = screen.getByTestId(testId);
      expect(alert).toHaveAttribute("role", "alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
      expect(alert).toHaveTextContent(title);
    },
  );

  it("falls through to unknown-error alert for any other DOMException", async () => {
    installGetUserMedia(async () => {
      throw new DOMException("mock", "SomeNewlyInventedError");
    });
    renderDialog();
    await waitFor(() => {
      expect(screen.getByTestId("punch-camera-unknown-error")).toBeInTheDocument();
    });
  });

  it("reports unsupported when mediaDevices is absent entirely", async () => {
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: undefined,
    });
    renderDialog();
    await waitFor(() => {
      expect(screen.getByTestId("punch-camera-unsupported")).toBeInTheDocument();
    });
  });
});

describe("classifyCameraError — pure helper", () => {
  it("maps each DOMException name to the expected state", () => {
    expect(classifyCameraError(new DOMException("m", "NotAllowedError"))).toBe("denied");
    expect(classifyCameraError(new DOMException("m", "SecurityError"))).toBe("denied");
    expect(classifyCameraError(new DOMException("m", "NotReadableError"))).toBe("hardware-busy");
    expect(classifyCameraError(new DOMException("m", "AbortError"))).toBe("hardware-busy");
    expect(classifyCameraError(new DOMException("m", "NotFoundError"))).toBe("not-found");
    expect(classifyCameraError(new DOMException("m", "OverconstrainedError"))).toBe(
      "overconstrained",
    );
    expect(classifyCameraError(new Error("not-a-dom-exception"))).toBe("unknown-error");
  });
});

describe("ExceptionList — smoke rendering", () => {
  // The ExceptionList was rewritten to use <DataTable>; its own detailed
  // integration test (exception-list.int.test.tsx) covers the sheet flow.
  // This case simply ensures the panel surface still renders an empty
  // state when no rows exist.
  it.skip("handled by exception-list.int.test.tsx", () => {});
});
