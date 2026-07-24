import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

export async function runSmoke(arguments_, dependencies = {}) {
  if (!arguments_.webUrl || !arguments_.apiUrl) {
    throw new Error(
      "Usage: pnpm operations:smoke --web-url <origin> --api-url <origin> " +
      "[--expect-signup-form enabled|disabled|either] " +
      "[--expect-audience restricted|public|either] " +
      "[--expect-release-sha <sha>] [--wait-seconds <seconds>]",
    );
  }

  const request = dependencies.request ?? defaultRequest;
  const wait = dependencies.delay ?? delay;
  const now = dependencies.now ?? Date.now;
  const webUrl = normalizeOrigin(arguments_.webUrl, "--web-url");
  const apiUrl = normalizeOrigin(arguments_.apiUrl, "--api-url");
  const checks = [];

  if (arguments_.expectedReleaseSha) {
    await waitForRelease({
      apiUrl,
      expectedReleaseSha: arguments_.expectedReleaseSha,
      request,
      wait,
      now,
      waitSeconds: arguments_.waitSeconds,
      webUrl,
    });
  }

  let health;
  await check(checks, "API health reaches PostgreSQL", async () => {
    const response = await request(`${apiUrl}/health`);
    assertStatus(response, 200);
    health = await response.json();
    if (health.status !== "ok") {
      throw new Error(`expected status ok, received ${JSON.stringify(health)}`);
    }
    if (
      arguments_.expectedReleaseSha &&
      health.releaseSha !== arguments_.expectedReleaseSha
    ) {
      throw new Error(
        `expected release ${arguments_.expectedReleaseSha}, received ${health.releaseSha ?? "none"}`,
      );
    }
  });

  if (arguments_.expectedReleaseSha) {
    await check(checks, "website serves the expected release", async () => {
      const version = await readWebVersion(webUrl, request);
      if (version.releaseSha !== arguments_.expectedReleaseSha) {
        throw new Error(
          `expected release ${arguments_.expectedReleaseSha}, received ${version.releaseSha ?? "none"}`,
        );
      }
    });
  }

  await check(checks, "website home is public", async () => {
    const response = await request(`${webUrl}/`);
    assertStatus(response, 200);
    assertHtml(response);
    const body = await response.text();
    if (!body.toLowerCase().includes("<html")) throw new Error("response is not an HTML document");
    if (!body.includes('rel="icon"') || !body.includes("/brand/aflora-mark.svg")) {
      throw new Error("Aflora favicon metadata is missing");
    }
  });

  await check(checks, "Aflora brand mark is available", async () => {
    const response = await request(`${webUrl}/brand/aflora-mark.svg`);
    assertStatus(response, 200);
    if (!response.headers.get("content-type")?.includes("image/svg+xml")) {
      throw new Error(
        `expected image/svg+xml, received ${response.headers.get("content-type") ?? "none"}`,
      );
    }
  });

  await check(checks, "robots points to the production sitemap", async () => {
    const response = await request(`${webUrl}/robots.txt`);
    assertStatus(response, 200);
    const body = await response.text();
    const expected = `Sitemap: ${webUrl}/sitemap-index.xml`;
    if (!body.includes(expected)) throw new Error(`missing ${expected}`);
  });

  await check(checks, "sitemap is available", async () => {
    const response = await request(`${webUrl}/sitemap-index.xml`);
    assertStatus(response, 200);
    const body = await response.text();
    if (!body.includes("<sitemapindex")) throw new Error("response is not a sitemap index");
  });

  await check(checks, "newsletter CORS accepts only the website origin", async () => {
    const allowed = await request(`${apiUrl}/v1/subscriptions`, {
      method: "OPTIONS",
      headers: {
        Origin: webUrl,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });
    if (allowed.headers.get("access-control-allow-origin") !== webUrl) {
      throw new Error("configured website origin was not allowed");
    }

    const rejectedOrigin = "https://untrusted.invalid";
    const rejected = await request(`${apiUrl}/v1/subscriptions`, {
      method: "OPTIONS",
      headers: {
        Origin: rejectedOrigin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });
    if (rejected.headers.get("access-control-allow-origin")) {
      throw new Error("an untrusted origin received an allow-origin header");
    }
  });

  await check(checks, "newsletter form visibility matches the web configuration", async () => {
    const response = await request(`${webUrl}/newsletter/`);
    assertStatus(response, 200);
    const body = await response.text();
    const endpoint = `${apiUrl}/v1/subscriptions`;
    const enabled = body.includes(endpoint);
    if (arguments_.expectedSignupForm === "enabled" && !enabled) {
      throw new Error("signup form was expected to be enabled but the API endpoint is absent");
    }
    if (arguments_.expectedSignupForm === "disabled" && enabled) {
      throw new Error("signup form was expected to be disabled but the API endpoint is embedded");
    }
  });

  if (arguments_.expectedAudience !== "either") {
    await check(checks, "newsletter audience policy matches the API configuration", async () => {
      if (health.audienceMode !== arguments_.expectedAudience) {
        throw new Error(
          `expected ${arguments_.expectedAudience} audience, received ${health.audienceMode ?? "unknown"}`,
        );
      }
    });
  }

  return { ok: true, webUrl, apiUrl, checks };
}

export function parseArguments(values) {
  const result = {
    expectedAudience: "either",
    expectedSignupForm: "either",
    waitSeconds: 0,
  };
  for (let index = 0; index < values.length; index += 1) {
    const argument = values[index];
    if (argument === "--web-url") result.webUrl = requiredValue(values, ++index, argument);
    else if (argument === "--api-url") result.apiUrl = requiredValue(values, ++index, argument);
    else if (argument === "--expect-signup-form" || argument === "--expect-signup") {
      result.expectedSignupForm = requiredValue(values, ++index, argument);
    } else if (argument === "--expect-audience") {
      result.expectedAudience = requiredValue(values, ++index, argument);
    } else if (argument === "--expect-release-sha") {
      result.expectedReleaseSha = requiredValue(values, ++index, argument);
    } else if (argument === "--wait-seconds") {
      result.waitSeconds = parseNonNegativeNumber(requiredValue(values, ++index, argument), argument);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  assertChoice(
    result.expectedSignupForm,
    ["enabled", "disabled", "either"],
    "--expect-signup-form",
  );
  assertChoice(
    result.expectedAudience,
    ["restricted", "public", "either"],
    "--expect-audience",
  );
  return result;
}

async function waitForRelease({
  apiUrl,
  expectedReleaseSha,
  request,
  wait,
  now,
  waitSeconds,
  webUrl,
}) {
  const deadline = now() + waitSeconds * 1000;
  let lastError;
  do {
    try {
      const [healthResponse, version] = await Promise.all([
        request(`${apiUrl}/health`),
        readWebVersion(webUrl, request),
      ]);
      assertStatus(healthResponse, 200);
      const health = await healthResponse.json();
      if (health.releaseSha !== expectedReleaseSha || version.releaseSha !== expectedReleaseSha) {
        throw new Error(
          `release pending: API=${health.releaseSha ?? "none"}, web=${version.releaseSha ?? "none"}`,
        );
      }
      return;
    } catch (error) {
      lastError = error;
    }
    if (now() >= deadline) break;
    await wait(Math.min(10_000, Math.max(0, deadline - now())));
  } while (now() <= deadline);

  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`expected release ${expectedReleaseSha} was not ready: ${detail}`);
}

async function readWebVersion(webUrl, request) {
  const response = await request(`${webUrl}/version.json`);
  assertStatus(response, 200);
  return response.json();
}

async function check(checks, name, operation) {
  try {
    await operation();
    checks.push({ name, status: "passed" });
  } catch (error) {
    checks.push({ name, status: "failed" });
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${name}: ${detail}`);
  }
}

async function defaultRequest(url, init) {
  return fetch(url, {
    ...init,
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
}

function assertStatus(response, expected) {
  if (response.status !== expected) {
    throw new Error(`expected HTTP ${expected}, received ${response.status} from ${response.url}`);
  }
}

function assertHtml(response) {
  if (!response.headers.get("content-type")?.includes("text/html")) {
    throw new Error(`expected text/html, received ${response.headers.get("content-type") ?? "none"}`);
  }
}

function normalizeOrigin(value, name) {
  const url = new URL(value);
  if (url.origin !== value.replace(/\/$/, "")) throw new Error(`${name} must be an origin without a path`);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error(`${name} must use HTTPS outside local development`);
  }
  return url.origin;
}

function requiredValue(values, index, argument) {
  const value = values[index];
  if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value`);
  return value;
}

function assertChoice(value, choices, argument) {
  if (!choices.includes(value)) {
    throw new Error(`${argument} must be one of: ${choices.join(", ")}`);
  }
}

function parseNonNegativeNumber(value, argument) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${argument} must be a non-negative number`);
  }
  return number;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (import.meta.url === invokedPath) {
  runSmoke(parseArguments(process.argv.slice(2)))
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
      process.exitCode = 1;
    });
}
