import { siteCopy as en } from "./en";
import { siteCopy as ptBR } from "./pt-BR";

export const locales = ["en", "pt-BR"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

const copy = { en, "pt-BR": ptBR } as const;

export function getSiteCopy(locale: Locale) {
  return copy[locale];
}

export const localeNames: Record<Locale, string> = {
  en: "English",
  "pt-BR": "Português (Brasil)",
};
