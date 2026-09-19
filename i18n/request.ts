import type { AbstractIntlMessages } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { defaultLocale, isLocale } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocale(requested) ? requested : defaultLocale;

  let messages: AbstractIntlMessages;
  try {
    messages = (await import(`../messages/${locale}.json`)).default as AbstractIntlMessages;
  } catch {
    notFound();
  }

  return {
    locale,
    messages,
  };
});
