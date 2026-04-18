import "server-only";
import crypto from "node:crypto";
import { env } from "@/lib/env";

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = env.PAYMENT_WEBHOOK_SECRET;

  if (!secret) {
    if (env.NODE_ENV === "development") {
      console.warn(
        "[payments] PAYMENT_WEBHOOK_SECRET unset — bypassing signature check (dev only).",
      );
      return true;
    }
    throw new Error("PAYMENT_WEBHOOK_SECRET must be set outside development.");
  }

  if (!signatureHeader) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
