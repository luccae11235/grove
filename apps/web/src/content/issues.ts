import { getCollection, type CollectionEntry } from "astro:content";
import { defaultLocale, type Locale } from "../i18n";
import { hasArticleDefinition } from "./articles";

type IssueEntry = CollectionEntry<"issues">;

export type NewsletterIssue = Omit<IssueEntry["data"], "issueId"> & {
  id: string;
  entryId: string;
};

const allEntries = await getCollection("issues");
const includeDrafts = import.meta.env.DEV || import.meta.env.SHOW_DRAFTS === "true";
const isVisible = (entry: IssueEntry) =>
  entry.data.status === "published" || includeDrafts;
const toIssue = (entry: IssueEntry): NewsletterIssue => {
  const { issueId, ...data } = entry.data;
  return { ...data, id: issueId, entryId: entry.id };
};

const entriesByIdAndLocale = new Map<string, IssueEntry>();
for (const entry of allEntries) {
  const key = `${entry.data.locale}:${entry.data.issueId}`;
  if (entriesByIdAndLocale.has(key)) {
    throw new Error(
      `Newsletter issue "${entry.data.issueId}" has more than one ${entry.data.locale} entry.`,
    );
  }
  entriesByIdAndLocale.set(key, entry);

  for (const articleId of entry.data.featuredArticles) {
    if (!hasArticleDefinition(articleId)) {
      throw new Error(
        `Newsletter issue "${entry.data.issueId}" references unknown article "${articleId}".`,
      );
    }
  }
}

export function getNewsletterIssues(
  locale: Locale = defaultLocale,
): NewsletterIssue[] {
  return allEntries
    .filter((entry) => entry.data.locale === locale && isVisible(entry))
    .map(toIssue)
    .sort((left, right) => right.issueNumber - left.issueNumber);
}

export function getPublishedNewsletterIssues(
  locale: Locale = defaultLocale,
): NewsletterIssue[] {
  return allEntries
    .filter(
      (entry) =>
        entry.data.locale === locale && entry.data.status === "published",
    )
    .map(toIssue)
    .sort((left, right) => right.issueNumber - left.issueNumber);
}

export function getNewsletterIssue(
  issueId: string,
  locale: Locale = defaultLocale,
): NewsletterIssue {
  const entry = entriesByIdAndLocale.get(`${locale}:${issueId}`);
  if (!entry || !isVisible(entry)) {
    throw new Error(`Unknown or unpublished newsletter issue "${issueId}".`);
  }
  return toIssue(entry);
}

export function getNewsletterIssueEntry(issue: NewsletterIssue): IssueEntry {
  const entry = entriesByIdAndLocale.get(`${issue.locale}:${issue.id}`);
  if (!entry) {
    throw new Error(`Missing content entry for newsletter issue "${issue.id}".`);
  }
  return entry;
}
