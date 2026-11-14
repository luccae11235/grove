import type { APIRoute } from "astro";

export const GET: APIRoute = () => {
  return new Response(JSON.stringify({
    status: "ok",
    mode: import.meta.env.PUBLIC_STATIC_SITE === "true" ? "static" : "services",
    releaseSha: process.env.RELEASE_SHA ?? "development",
  }, null, 2), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};
