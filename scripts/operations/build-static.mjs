import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
// Explicit values override inherited Railway/preview variables. Static publishing
// must never depend on a database, provider credentials or a draft switch.
const env = {
  ...process.env,
  SITE_URL: process.env.SITE_URL || "https://aflora.page",
  BASE_PATH: process.env.BASE_PATH || "/",
  SHOW_DRAFTS: "false",
  PUBLIC_STATIC_SITE: "true",
  PUBLIC_NEWSLETTER_API_URL: "",
  PUBLIC_OBSERVABILITY_ENABLED: "false",
  PUBLIC_FEEDBACK_ENABLED: "false",
  PUBLIC_OBSERVABILITY_API_URL: "",
  NEWSLETTER_POSTAL_ADDRESS: "",
};
const site = new URL(env.SITE_URL);
if (!/^https?:$/.test(site.protocol) || site.pathname !== "/" || site.search || site.hash) {
  throw new Error("SITE_URL must be an HTTP(S) origin; set the path in BASE_PATH.");
}
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(env.BASE_PATH)) {
  throw new Error("BASE_PATH must start and end with /, for example / or /grove/.");
}
const result = spawnSync("pnpm", ["build"], { cwd: root, env, stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
writeFileSync(new URL("../../apps/web/dist/.nojekyll", import.meta.url), "");
