import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

/**
 * OtpVerifyForm integration test (Plan §C3).
 *
 * Covers the high-value behaviours the audit specifically called out:
 *   - Auto-submit when the 6th digit is entered (no Submit click required).
 *   - Field-level error mapping when the action returns
 *     `fields.otp_code` (e.g. RPC OTP_INVALID).
 *   - Form-level error mapping when the action returns `fields.form`
 *     (e.g. RPC OTP_LOCKED).
 *   - Resend success surfaces a toast title from the catalog.
 *
 * The two Server Actions (`verifyOtpAction`, `resendOtpAction`) are
 * mocked at the module boundary so the test exercises real component
 * orchestration without invoking server-only modules under jsdom.
 */

// vi.mock is hoisted to file top — use vi.hoisted() so the spy
// references are created before the factory bodies execute.
const { verifyOtpAction, resendOtpAction, toastSuccess, toastError } = vi.hoisted(() => ({
  verifyOtpAction: vi.fn(),
  resendOtpAction: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/features/booking/actions/verify-otp", () => ({ verifyOtpAction }));
vi.mock("@/features/booking/actions/resend-otp", () => ({ resendOtpAction }));
vi.mock("@/components/ui/toast-helpers", () => ({
  toastSuccess,
  toastError,
}));

// Catalog snapshot — only the keys this test reads. Real ms.json mirrors
// en, so binding to en here is enough to verify the t() shape.
import enMessages from "../../../../messages/en.json";

import { OtpVerifyForm } from "@/features/booking/components/otp-verify-form";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Asia/Kuala_Lumpur">
      {ui}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  verifyOtpAction.mockReset();
  resendOtpAction.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("OtpVerifyForm", () => {
  it("auto-submits the action when the 6th digit is entered", async () => {
    verifyOtpAction.mockResolvedValueOnce({ success: false, error: "INTERNAL" });
    const user = userEvent.setup();
    renderWithIntl(<OtpVerifyForm bookingRef="AG-ABCDEF-1234" />);

    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('[data-testid^="otp-input-box-"]'),
    );
    expect(inputs.length).toBe(6);

    await user.click(inputs[0]!);
    await user.keyboard("123456");

    await waitFor(() => {
      expect(verifyOtpAction).toHaveBeenCalledTimes(1);
      expect(verifyOtpAction).toHaveBeenCalledWith({ otp_code: "123456" });
    });
  });

  it("renders the field-level error returned by the action", async () => {
    verifyOtpAction.mockResolvedValueOnce({
      success: false,
      error: "VALIDATION_FAILED",
      fields: { otp_code: "That code didn't match. Try again." },
    });
    const user = userEvent.setup();
    renderWithIntl(<OtpVerifyForm bookingRef="AG-ABCDEF-1234" />);

    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('[data-testid^="otp-input-box-"]'),
    );
    await user.click(inputs[0]!);
    await user.keyboard("000000");

    await waitFor(() => {
      expect(screen.getByTestId("otp-verify-field-error")).toHaveTextContent(
        "That code didn't match. Try again.",
      );
    });
  });

  it("renders the form-level error inside the destructive Alert", async () => {
    verifyOtpAction.mockResolvedValueOnce({
      success: false,
      error: "FORBIDDEN",
      fields: { form: "Too many wrong attempts. Please request a new code." },
    });
    const user = userEvent.setup();
    renderWithIntl(<OtpVerifyForm bookingRef="AG-ABCDEF-1234" />);

    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('[data-testid^="otp-input-box-"]'),
    );
    await user.click(inputs[0]!);
    await user.keyboard("999999");

    await waitFor(() => {
      const alert = screen.getByTestId("otp-verify-form-error");
      expect(alert).toHaveTextContent("Too many wrong attempts. Please request a new code.");
      // The alert title is sourced from the en catalog ("We couldn't sign you in").
      expect(alert).toHaveTextContent("We couldn't sign you in");
    });
  });

  it("toasts the resend success title from the catalog", async () => {
    resendOtpAction.mockResolvedValueOnce({
      success: true,
      data: { masked_email: "j**n@example.com" },
    });
    const user = userEvent.setup();
    renderWithIntl(<OtpVerifyForm bookingRef="AG-ABCDEF-1234" />);

    await user.click(screen.getByTestId("otp-verify-resend"));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledTimes(1);
      const [title, opts] = toastSuccess.mock.calls[0]!;
      expect(title).toBe("Code sent");
      expect((opts as { description: string }).description).toContain("j**n@example.com");
    });
  });
});
