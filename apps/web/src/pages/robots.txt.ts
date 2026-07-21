export function GET(context: { site?: URL }) {
  const site = context.site ?? new URL("http://localhost:4321");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const sitemap = new URL(`${base}/sitemap-index.xml`, site);

  return new Response(`User-agent: *\nAllow: /\nSitemap: ${sitemap}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
