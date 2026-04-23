import { z } from "zod";

/**
 * Zod schemas for profile mutations on `/settings`. Matches the column
 * constraints in `public.profiles`
 * ([init_schema.sql:313-332](../../../../supabase/migrations/20260417064731_init_schema.sql#L313)).
 *
 * Note on scope: `profiles.display_name` is intentionally NOT user-editable
 * in this app. `profiles_update` RLS requires `hr:u`
 * ([init_schema.sql:937-939](../../../../supabase/migrations/20260417064731_init_schema.sql#L937))
 * and no `rpc_update_own_display_name` RPC exists. Only the avatar is
 * user-mutable (via `rpc_update_own_avatar`); theme is client-side.
 * `frontend_spec.md:4065` carries stale wording — migrations take precedence.
 */

/** Avatars bucket is `public=TRUE`, file_size_limit = 2 MiB,
 *  allowed_mime_types = jpeg/png/webp
 *  ([init_schema.sql:7034-7035](../../../../supabase/migrations/20260417064731_init_schema.sql#L7034)). */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type AvatarMime = (typeof AVATAR_ALLOWED_MIME)[number];

/**
 * Avatar upload is submitted as a FormData blob (Server Action convention).
 * We validate the file metadata here; the Server Action performs the
 * authenticated upload and calls `rpc_update_own_avatar(p_avatar_url)`.
 */
export const avatarFileSchema = z
  .instanceof(File, { message: "Select an image file to upload." })
  .refine((file) => file.size > 0, "The selected file is empty.")
  .refine(
    (file) => file.size <= AVATAR_MAX_BYTES,
    `Avatar must be ${Math.round(AVATAR_MAX_BYTES / 1024 / 1024)} MB or smaller.`,
  )
  .refine(
    (file) => (AVATAR_ALLOWED_MIME as readonly string[]).includes(file.type),
    "Avatar must be a JPEG, PNG, or WebP image.",
  );

export type AvatarFile = z.infer<typeof avatarFileSchema>;
