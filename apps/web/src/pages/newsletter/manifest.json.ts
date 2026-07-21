import type { APIRoute } from "astro";
import { getNewsletterIssues } from "../../content/issues";
import { POSTAL_ADDRESS_PLACEHOLDER } from "../../content/newsletterArtifacts";

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const publicSite = site ?? new URL("http://localhost:4321");
  const postalAddress = import.meta.env.NEWSLETTER_POSTAL_ADDRESS?.trim() || POSTAL_ADDRESS_PLACEHOLDER;
  const issues = getNewsletterIssues("en").map((issue) => ({
    id: issue.id,
    issueNumber: issue.issueNumber,
    locale: issue.locale,
    subject: issue.subject,
    preheader: issue.preheader,
    status: issue.status,
    publishedAt: issue.publishedAt?.toISOString(),
    featuredArticles: issue.featuredArticles,
    htmlPath: `/newsletter/email/${issue.routeSlug}/`,
    textPath: `/newsletter/email/${issue.routeSlug}.txt`,
    webUrl: new URL(`${base}${issue.href}`, publicSite).toString(),
    ctaUrl: new URL(`${base}${issue.cta.href}`, publicSite).toString(),
  }));

  return new Response(JSON.stringify({
    generatedAt: new Date().toISOString(),
    postalAddressReady: postalAddress !== POSTAL_ADDRESS_PLACEHOLDER,
    issues,
  }, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
