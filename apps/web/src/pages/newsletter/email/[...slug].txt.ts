import type { GetStaticPaths, APIRoute } from "astro";
import {
  getNewsletterIssueEntry,
  getNewsletterIssues,
  type NewsletterIssue,
} from "../../../content/issues";
import { renderIssueText } from "../../../content/newsletterArtifacts";

export const getStaticPaths = (() =>
  (import.meta.env.PUBLIC_STATIC_SITE === "true" ? [] : getNewsletterIssues("en")).map((issue) => ({
    params: { slug: issue.routeSlug },
    props: { issue },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props, site }) => {
  const issue = props.issue as NewsletterIssue;
  const entry = getNewsletterIssueEntry(issue);
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const body = renderIssueText({
    issue,
    markdown: entry.body ?? "",
    site: site ?? new URL("http://localhost:4321"),
    base,
    postalAddress: import.meta.env.NEWSLETTER_POSTAL_ADDRESS,
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
