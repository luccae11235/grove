import rss from "@astrojs/rss";
import { getPublishedArticles } from "../../content/articles";

export function GET(context: { site?: URL }) {
  const site = context.site ?? new URL("http://localhost:4321");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  return rss({
    title: "Aflora — Ideias que ganham vida.",
    description:
      "Explicações visuais, experimentos interativos e ideias difíceis desmontadas por dentro.",
    site: new URL(`${base}/pt-br/`, site),
    items: getPublishedArticles("pt-BR").map((article) => ({
      title: article.title,
      description: article.summary,
      pubDate: article.publishedAt,
      link: new URL(`${base}${article.href}`, site).toString(),
      categories: [article.area, article.topic, article.difficulty],
    })),
    customData: "<language>pt-BR</language>",
  });
}
