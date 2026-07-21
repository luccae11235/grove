import type { NewsletterIssue } from "./issues";

export const POSTAL_ADDRESS_PLACEHOLDER = "[POSTAL ADDRESS REQUIRED BEFORE SENDING]";

export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/^---[\s\S]*?---\s*/u, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderIssueText(options: {
  issue: NewsletterIssue;
  markdown: string;
  site: URL;
  base: string;
  postalAddress?: string;
}): string {
  const { issue, markdown, site, base } = options;
  const articleUrl = new URL(`${base}${issue.cta.href}`, site);
  const webUrl = new URL(`${base}${issue.href}`, site);
  const postalAddress = options.postalAddress || POSTAL_ADDRESS_PLACEHOLDER;

  return [
    `GROVE · ISSUE ${String(issue.issueNumber).padStart(3, "0")}`,
    "Ideas, made interactive.",
    "",
    markdownToPlainText(markdown),
    "",
    `${issue.cta.label}: ${articleUrl}`,
    `Read this issue on the web: ${webUrl}`,
    "Unsubscribe or change preferences: {{{RESEND_UNSUBSCRIBE_URL}}}",
    postalAddress,
    "",
  ].join("\n");
}
