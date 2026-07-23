import rss from "@astrojs/rss";
import { getPublishedArticles } from "../content/articles";

export function GET(context: { site?: URL }) {
  const site = context.site ?? new URL("http://localhost:4321");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  return rss({
    title: "Aflora — Ideas, brought to life.",
    description:
      "Visual explanations, interactive experiments, and difficult ideas taken apart.",
    site: new URL(`${base}/`, site),
    items: getPublishedArticles("en").map((article) => ({
      title: article.title,
      description: article.summary,
      pubDate: article.publishedAt,
      link: new URL(`${base}${article.href}`, site).toString(),
      categories: [article.area, article.topic, article.difficulty],
    })),
    customData: "<language>en</language>",
  });
}
