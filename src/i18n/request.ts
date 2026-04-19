import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing, type AppLocale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: AppLocale = hasLocale(routing.locales, requested)
    ? (requested as AppLocale)
    : routing.defaultLocale;

  const messages = (await import(`../../messages/${locale}.json`)).default as Record<
    string,
    unknown
  >;

  return { locale, messages };
});
