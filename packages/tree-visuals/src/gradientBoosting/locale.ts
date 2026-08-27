export type GradientBoostingLocale = "en" | "pt-BR";

export function isPt(locale: GradientBoostingLocale): boolean {
  return locale === "pt-BR";
}

export function formatBoostingNumber(
  value: number,
  digits = 2,
  locale: GradientBoostingLocale = "en",
): string {
  const formatted = value.toFixed(digits).replace("-", "−");
  return isPt(locale) ? formatted.replace(".", ",") : formatted;
}

export function treeWord(count: number, locale: GradientBoostingLocale): string {
  if (isPt(locale)) return count === 1 ? "árvore" : "árvores";
  return count === 1 ? "tree" : "trees";
}
