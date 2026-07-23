const arguments_ = parseArguments(process.argv.slice(2));

if (!arguments_.webUrl || !arguments_.apiUrl) {
  throw new Error(
    "Usage: pnpm operations:smoke --web-url <origin> --api-url <origin> [--expect-signup enabled|disabled]",
  );
}

const webUrl = normalizeOrigin(arguments_.webUrl, "--web-url");
const apiUrl = normalizeOrigin(arguments_.apiUrl, "--api-url");
const checks = [];

await check("API health reaches PostgreSQL", async () => {
  const response = await request(`${apiUrl}/health`);
  assertStatus(response, 200);
  const body = await response.json();
  if (body.status !== "ok") throw new Error(`expected status ok, received ${JSON.stringify(body)}`);
});

await check("website home is public", async () => {
  const response = await request(`${webUrl}/`);
  assertStatus(response, 200);
  assertHtml(response);
  const body = await response.text();
  if (!body.toLowerCase().includes("<html")) throw new Error("response is not an HTML document");
});

await check("robots points to the production sitemap", async () => {
  const response = await request(`${webUrl}/robots.txt`);
  assertStatus(response, 200);
  const body = await response.text();
  const expected = `Sitemap: ${webUrl}/sitemap-index.xml`;
  if (!body.includes(expected)) throw new Error(`missing ${expected}`);
});

await check("sitemap is available", async () => {
  const response = await request(`${webUrl}/sitemap-index.xml`);
  assertStatus(response, 200);
  const body = await response.text();
  if (!body.includes("<sitemapindex")) throw new Error("response is not a sitemap index");
});

await check("newsletter CORS accepts only the website origin", async () => {
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

await check("newsletter page matches the signup launch switch", async () => {
  const response = await request(`${webUrl}/newsletter/`);
  assertStatus(response, 200);
  const body = await response.text();
  const endpoint = `${apiUrl}/v1/subscriptions`;
  const enabled = body.includes(endpoint);
  if (arguments_.expectSignup === "enabled" && !enabled) {
    throw new Error("signup was expected to be enabled but the API endpoint is absent");
  }
  if (arguments_.expectSignup === "disabled" && enabled) {
    throw new Error("signup was expected to be disabled but the API endpoint is public");
  }
});

process.stdout.write(`${JSON.stringify({ ok: true, webUrl, apiUrl, checks }, null, 2)}\n`);

async function check(name, operation) {
  try {
    await operation();
    checks.push({ name, status: "passed" });
  } catch (error) {
    checks.push({ name, status: "failed" });
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${name}: ${detail}`);
  }
}

async function request(url, init) {
  const response = await fetch(url, {
    ...init,
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  return response;
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

function parseArguments(values) {
  const result = { expectSignup: "either" };
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === "--web-url") result.webUrl = values[++index];
    else if (values[index] === "--api-url") result.apiUrl = values[++index];
    else if (values[index] === "--expect-signup") result.expectSignup = values[++index];
    else throw new Error(`Unknown argument: ${values[index]}`);
  }
  if (!["enabled", "disabled", "either"].includes(result.expectSignup)) {
    throw new Error("--expect-signup must be enabled or disabled");
  }
  return result;
}
