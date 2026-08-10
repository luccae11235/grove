import assert from "node:assert/strict";
import { test } from "node:test";
import { parseArguments, runSmoke } from "./smoke-platform.mjs";

test("smoke arguments distinguish form, audience, and release expectations", () => {
  assert.deepEqual(parseArguments([
    "--web-url", "https://aflora.page",
    "--api-url", "https://api.aflora.page",
    "--expect-signup-form", "disabled",
    "--expect-feedback", "enabled",
    "--expect-audience", "restricted",
    "--expect-release-sha", "abc123",
    "--wait-seconds", "600",
  ]), {
    apiUrl: "https://api.aflora.page",
    expectedAudience: "restricted",
    expectedFeedback: "enabled",
    expectedObservability: "either",
    expectedReleaseSha: "abc123",
    expectedSignupForm: "disabled",
    waitSeconds: 600,
    webUrl: "https://aflora.page",
  });
});

test("legacy signup argument remains supported", () => {
  const parsed = parseArguments(["--expect-signup", "enabled"]);
  assert.equal(parsed.expectedSignupForm, "enabled");
});

test("invalid expectations fail before making requests", () => {
  assert.throws(
    () => parseArguments(["--expect-audience", "allowlist"]),
    /--expect-audience must be one of/,
  );
  assert.throws(
    () => parseArguments(["--wait-seconds", "-1"]),
    /--wait-seconds must be a non-negative number/,
  );
});

test("smoke proves release identity, restricted audience, and visible staging form", async () => {
  const releaseSha = "0123456789abcdef0123456789abcdef01234567";
  const result = await runSmoke({
    apiUrl: "https://api.example",
    expectedAudience: "restricted",
    expectedFeedback: "enabled",
    expectedReleaseSha: releaseSha,
    expectedSignupForm: "enabled",
    waitSeconds: 0,
    webUrl: "https://web.example",
  }, {
    request: fixtureRequest({ releaseSha }),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.checks.map((check) => check.name), [
    "API health reaches PostgreSQL",
    "website serves the expected release",
    "website home is public",
    "Brazilian Portuguese reading flow is public",
    "Aflora brand mark is available",
    "robots points to the production sitemap",
    "sitemap is available",
    "newsletter CORS accepts only the website origin",
    "newsletter form visibility matches the web configuration",
    "subscription recovery pages and safe API boundaries are available",
    "article feedback switch matches configuration",
    "newsletter audience policy matches the API configuration",
  ]);
});

test("smoke rejects a deployment whose services do not share the expected release", async () => {
  await assert.rejects(
    runSmoke({
      apiUrl: "https://api.example",
      expectedAudience: "restricted",
      expectedReleaseSha: "expected",
      expectedSignupForm: "enabled",
      waitSeconds: 0,
      webUrl: "https://web.example",
    }, {
      request: fixtureRequest({ releaseSha: "other" }),
    }),
    /expected release expected was not ready/,
  );
});

function fixtureRequest({ releaseSha }) {
  return async (url, init = {}) => {
    const parsed = new URL(url);
    if (parsed.hostname === "api.example" && parsed.pathname === "/health") {
      return Response.json({ status: "ok", releaseSha, audienceMode: "restricted" });
    }
    if (parsed.hostname === "web.example" && parsed.pathname === "/version.json") {
      return Response.json({ status: "ok", releaseSha });
    }
    if (parsed.hostname === "web.example" && parsed.pathname === "/") {
      return new Response(
        '<html><head><link rel="icon" href="/brand/aflora-mark.svg"></head><body>Aflora</body></html>',
        {
          headers: { "Content-Type": "text/html" },
        },
      );
    }
    if (parsed.hostname === "web.example") {
      const portuguesePages = {
        "/pt-br/": "Todos os artigos",
        "/pt-br/learn/decision-trees/": "Dois loops e uma memória",
        "/pt-br/learn/regression-trees/": "Como árvores de decisão aprendem a prever números",
      };
      const expectedText = portuguesePages[parsed.pathname];
      if (expectedText) {
        return new Response(`<html><body>English Português (Brasil) ${expectedText}</body></html>`, {
          headers: { "Content-Type": "text/html" },
        });
      }
    }
    if (parsed.hostname === "web.example" && parsed.pathname === "/brand/aflora-mark.svg") {
      return new Response("<svg></svg>", {
        headers: { "Content-Type": "image/svg+xml" },
      });
    }
    if (parsed.hostname === "web.example" && parsed.pathname === "/robots.txt") {
      return new Response("Sitemap: https://web.example/sitemap-index.xml\n");
    }
    if (parsed.hostname === "web.example" && parsed.pathname === "/sitemap-index.xml") {
      return new Response("<sitemapindex></sitemapindex>");
    }
    if (
      parsed.hostname === "api.example" &&
      parsed.pathname === "/v1/subscriptions" &&
      init.method === "OPTIONS"
    ) {
      const origin = init.headers.Origin;
      return new Response(null, {
        headers: origin === "https://web.example"
          ? { "Access-Control-Allow-Origin": origin }
          : {},
      });
    }
    if (parsed.hostname === "web.example" && parsed.pathname === "/newsletter/") {
      return new Response("https://api.example/v1/subscriptions");
    }
    if (parsed.hostname === "web.example" && parsed.pathname === "/learn/decision-trees/") {
      return new Response('<section data-article-feedback></section>');
    }
    if (
      parsed.hostname === "web.example" &&
      [
        "/newsletter/manage/",
        "/newsletter/unsubscribe/",
        "/pt-br/newsletter/",
        "/pt-br/newsletter/manage/",
        "/pt-br/newsletter/unsubscribe/",
      ].includes(parsed.pathname)
    ) {
      return new Response("https://api.example/v1/subscriptions/manage", {
        headers: { "Content-Type": "text/html" },
      });
    }
    if (
      parsed.hostname === "api.example" &&
      ["/v1/subscriptions", "/v1/subscriptions/manage"].includes(parsed.pathname) &&
      init.method === "POST"
    ) {
      return Response.json({ ok: true }, { status: 202 });
    }
    if (
      parsed.hostname === "api.example" &&
      parsed.pathname === "/v1/subscriptions/unsubscribe" &&
      init.method === "POST"
    ) {
      return Response.json({ ok: false, status: "invalid" }, { status: 400 });
    }
    return new Response("not found", { status: 404 });
  };
}
