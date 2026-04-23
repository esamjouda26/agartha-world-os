import { describe, expect, it } from "vitest";

import {
  AVATAR_ALLOWED_MIME,
  AVATAR_MAX_BYTES,
  avatarFileSchema,
} from "@/features/settings/schemas/profile";

function makeFile(size: number, type: string, name = "avatar.png"): File {
  const payload = new Uint8Array(size).fill(0x61);
  return new File([payload], name, { type });
}

describe("avatarFileSchema", () => {
  it("accepts a well-formed PNG under the size cap", () => {
    const file = makeFile(1024, "image/png");
    const result = avatarFileSchema.safeParse(file);
    expect(result.success).toBe(true);
  });

  it.each(AVATAR_ALLOWED_MIME)("accepts a %s file", (mime) => {
    const file = makeFile(2048, mime);
    const result = avatarFileSchema.safeParse(file);
    expect(result.success).toBe(true);
  });

  it("rejects an empty file", () => {
    const file = makeFile(0, "image/png");
    const result = avatarFileSchema.safeParse(file);
    expect(result.success).toBe(false);
  });

  it("rejects a file larger than AVATAR_MAX_BYTES", () => {
    const file = makeFile(AVATAR_MAX_BYTES + 1, "image/png");
    const result = avatarFileSchema.safeParse(file);
    expect(result.success).toBe(false);
  });

  it("rejects an unsupported MIME (GIF)", () => {
    const file = makeFile(1024, "image/gif");
    const result = avatarFileSchema.safeParse(file);
    expect(result.success).toBe(false);
  });

  it("rejects a non-File input", () => {
    const result = avatarFileSchema.safeParse({
      name: "avatar.png",
      size: 1024,
      type: "image/png",
    });
    expect(result.success).toBe(false);
  });
});
