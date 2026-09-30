import { getCollection, type CollectionEntry } from "astro:content";
import { defaultLocale, type Locale } from "../i18n";

export const difficultyLevels = {
  foundational: {
    label: "Foundational",
    shortDescription: "No prior machine-learning knowledge required",
    description:
      "Starts from familiar ideas and introduces the machine-learning concepts it uses.",
    order: 1,
  },
  intermediate: {
    label: "Intermediate",
    shortDescription: "Builds on core machine-learning ideas",
    description:
      "Assumes the reader can already reason about a fitted model, training data, and evaluation.",
    order: 2,
  },
  advanced: {
    label: "Advanced",
    shortDescription: "Combines several models or domains",
    description:
      "Assumes strong foundations and develops a specialized, mathematical, or cross-domain application.",
    order: 3,
  },
} as const;

const difficultyLevelTranslations = {
  "pt-BR": {
    foundational: {
      label: "Fundamental",
      shortDescription: "Não exige conhecimento prévio de aprendizado de máquina",
      description:
        "Parte de ideias familiares e apresenta os conceitos de aprendizado de máquina utilizados.",
    },
    intermediate: {
      label: "Intermediário",
      shortDescription: "Parte dos conceitos centrais de aprendizado de máquina",
      description:
        "Pressupõe que a pessoa leitora já saiba raciocinar sobre um modelo ajustado, dados de treino e avaliação.",
    },
    advanced: {
      label: "Avançado",
      shortDescription: "Combina vários modelos ou áreas",
      description:
        "Pressupõe uma base sólida e desenvolve uma aplicação especializada, matemática ou multidisciplinar.",
    },
  },
} as const;

export type ArticleDifficulty = keyof typeof difficultyLevels;
export type ArticleId = string;
type ArticleEntry = CollectionEntry<"articles">;

export type Article = Omit<ArticleEntry["data"], "articleId"> & {
  id: ArticleId;
};

const allEntries = await getCollection("articles");
const includeDrafts = import.meta.env.DEV || import.meta.env.SHOW_DRAFTS === "true";
const isVisible = (entry: ArticleEntry) =>
  entry.data.status === "published" || includeDrafts;
const entryKey = (articleId: ArticleId, locale: Locale) => `${locale}:${articleId}`;
const canonicalArticleHref = (href: string) =>
  href.endsWith("/") ? href : `${href}/`;
const toArticle = (entry: ArticleEntry): Article => {
  const { articleId, ...data } = entry.data;
  return { ...data, href: canonicalArticleHref(data.href), id: articleId };
};

const entriesByLocaleAndId = new Map<string, ArticleEntry>();
for (const entry of allEntries) {
  const key = entryKey(entry.data.articleId, entry.data.locale);
  if (entriesByLocaleAndId.has(key)) {
    throw new Error(
      `Article "${entry.data.articleId}" has more than one ${entry.data.locale} entry.`,
    );
  }
  entriesByLocaleAndId.set(key, entry);
}

const defaultEntries = allEntries.filter(
  (entry) => entry.data.locale === defaultLocale,
);
const allDefaultIds = new Set(defaultEntries.map((entry) => entry.data.articleId));
const visibleDefaultIds = new Set(
  defaultEntries.filter(isVisible).map((entry) => entry.data.articleId),
);

for (const entry of allEntries) {
  if (
    entry.data.locale !== defaultLocale &&
    !allDefaultIds.has(entry.data.articleId)
  ) {
    throw new Error(
      `Translation "${entry.id}" has no ${defaultLocale} source article.`,
    );
  }
}

/**
 * Published default-locale articles are the public catalog. Drafts join the
 * catalog during local development or when SHOW_DRAFTS=true is set explicitly.
 */
export const articles: readonly Article[] = defaultEntries
  .filter(isVisible)
  .map(toArticle)
  .sort((left, right) =>
    (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0),
  );

const articlesById = new Map<ArticleId, Article>(
  articles.map((article) => [article.id, article]),
);

function assertValidCatalog(): void {
  if (articlesById.size !== articles.length) {
    throw new Error("Every Aflora article must have a unique id.");
  }

  const hrefs = new Set<string>();

  for (const entry of allEntries.filter(isVisible)) {
    const { href, articleId: id } = entry.data;
    if (hrefs.has(href)) {
      throw new Error(`More than one Aflora article uses the href "${href}".`);
    }
    hrefs.add(href);

    const targetIds = [...entry.data.prerequisites, ...entry.data.related];
    if (new Set(targetIds).size !== targetIds.length) {
      throw new Error(`Article "${id}" declares the same relationship more than once.`);
    }

    for (const targetId of targetIds) {
      if (targetId === id) {
        throw new Error(`Article "${id}" cannot reference itself.`);
      }
      if (!visibleDefaultIds.has(targetId)) {
        throw new Error(
          `Article "${id}" references unknown or unpublished article "${targetId}".`,
        );
      }
    }
  }
}

assertValidCatalog();

export function getArticle(articleId: ArticleId): Article {
  const article = articlesById.get(articleId);
  if (!article) {
    throw new Error(`Unknown or unpublished Aflora article "${articleId}".`);
  }
  return article;
}

/** Returns whether an article id exists, including authored drafts. */
export function hasArticleDefinition(articleId: ArticleId): boolean {
  return allDefaultIds.has(articleId);
}

export function getLocalizedArticle(
  articleId: ArticleId,
  locale: Locale = defaultLocale,
): Article {
  const localizedEntry = entriesByLocaleAndId.get(entryKey(articleId, locale));
  if (localizedEntry && isVisible(localizedEntry)) {
    return toArticle(localizedEntry);
  }
  return getArticle(articleId);
}

export function getDifficultyLevel(
  difficulty: ArticleDifficulty,
  locale: Locale = defaultLocale,
) {
  const level = difficultyLevels[difficulty];
  return {
    ...level,
    ...difficultyLevelTranslations[locale as "pt-BR"]?.[difficulty],
  };
}

export function articleHref(
  articleId: ArticleId,
  anchor?: string,
  base = "",
  locale: Locale = defaultLocale,
): string {
  const href = getLocalizedArticle(articleId, locale).href;
  const normalizedBase = base.replace(/\/$/, "");
  const fragment = anchor ? `#${anchor.replace(/^#/, "")}` : "";
  return `${normalizedBase}${href}${fragment}`;
}

export interface ArticleConnections {
  prerequisites: Article[];
  buildsFromHere: Article[];
  related: Article[];
}

/**
 * Resolves authored edges and automatic backlinks in the requested locale.
 * Related links behave symmetrically even when declared on only one entry.
 */
export function getArticleConnections(
  articleId: ArticleId,
  locale: Locale = defaultLocale,
): ArticleConnections {
  const article = getLocalizedArticle(articleId, locale);
  const prerequisites = article.prerequisites.map((id) => getLocalizedArticle(id, locale));
  const buildsFromHere = articles
    .filter((candidate) => candidate.prerequisites.includes(articleId))
    .map((candidate) => getLocalizedArticle(candidate.id, locale));
  const relatedIds = new Set<ArticleId>(article.related);

  for (const candidate of articles) {
    if (candidate.related.includes(articleId)) {
      relatedIds.add(candidate.id);
    }
  }

  return {
    prerequisites,
    buildsFromHere,
    related: [...relatedIds].map((id) => getLocalizedArticle(id, locale)),
  };
}

export function getArticleAreas(locale: Locale = defaultLocale) {
  const localizedArticles = articles.map((article) =>
    getLocalizedArticle(article.id, locale),
  );
  return Array.from(
    localizedArticles.reduce((areas, article) => {
      const areaArticles = areas.get(article.area) ?? [];
      areaArticles.push(article);
      areas.set(article.area, areaArticles);
      return areas;
    }, new Map<string, Article[]>()),
    ([label, areaArticles]) => ({ label, articles: areaArticles }),
  );
}

export function getPublishedArticles(locale: Locale = defaultLocale): Article[] {
  return allEntries
    .filter((entry) =>
      entry.data.locale === locale && entry.data.status === "published",
    )
    .map(toArticle)
    .sort((left, right) =>
      (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0),
    );
}

/** Includes authored drafts only in development or an explicit draft preview. */
export function getVisibleArticles(locale: Locale = defaultLocale): Article[] {
  return allEntries
    .filter((entry) => entry.data.locale === locale && isVisible(entry))
    .map(toArticle)
    .sort((left, right) =>
      (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0),
    );
}

/**
 * Returns the complete authored catalog for editorial discovery surfaces.
 * Drafts remain explicitly labeled by consumers rather than silently omitted.
 */
export function getAuthoredArticles(locale: Locale = defaultLocale): Article[] {
  return allEntries
    .filter((entry) => entry.data.locale === locale)
    .map(toArticle)
    .sort((left, right) => {
      const dateDifference =
        (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0);
      if (dateDifference !== 0) return dateDifference;
      if (left.status !== right.status) return left.status === "published" ? -1 : 1;
      return left.title.localeCompare(right.title);
    });
}
