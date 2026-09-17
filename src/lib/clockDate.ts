import { loadLang } from "./i18n";

const LOCALE_FOR_LANG: Record<string, string> = {
  ru: "ru-RU",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  zh: "zh-CN",
};

/** The current app language as a BCP47 locale — for any other Intl
 * formatting a widget needs (e.g. a forecast row's weekday labels). */
export function currentLocale(): string {
  return LOCALE_FOR_LANG[loadLang()] ?? "ru-RU";
}

/** Widget windows don't mount the app's LangContext (kept intentionally
 * bare) — reading the persisted language directly keeps the date on a
 * clock widget matching whatever language the user picked in Settings. */
export function formatClockDate(now: Date, format: "long" | "short"): string {
  const locale = LOCALE_FOR_LANG[loadLang()] ?? "ru-RU";
  const options: Intl.DateTimeFormatOptions =
    format === "long" ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "numeric", month: "short" };
  return new Intl.DateTimeFormat(locale, options).format(now);
}
