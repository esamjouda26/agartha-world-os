import "server-only";

import { cookies } from "next/headers";

import { THEME_COOKIE, VALID_THEMES, type ThemePreference } from "./theme-constants";

export async function getThemeCookie(): Promise<ThemePreference> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return VALID_THEMES.includes(value as ThemePreference) ? (value as ThemePreference) : "system";
}
