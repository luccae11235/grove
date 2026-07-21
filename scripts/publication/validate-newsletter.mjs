#!/usr/bin/env node
import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));
const manifestPath = resolve(args.manifest ?? "apps/web/dist/newsletter/manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const ids = new Set();
const numbers = new Set();
const errors = [];

for (const issue of manifest.issues ?? []) {
  if (ids.has(issue.id)) errors.push(`Duplicate issue id: ${issue.id}`);
  if (numbers.has(issue.issueNumber)) errors.push(`Duplicate issue number: ${issue.issueNumber}`);
  ids.add(issue.id);
  numbers.add(issue.issueNumber);
  const htmlPath = artifactPath(manifestPath, issue.htmlPath, true);
  const textPath = artifactPath(manifestPath, issue.textPath, false);
  for (const path of [htmlPath, textPath]) {
    try {
      await access(path, constants.R_OK);
    } catch {
      errors.push(`Missing artifact: ${path}`);
    }
  }
  if (errors.length) continue;
  const [html, text, htmlInfo] = await Promise.all([
    readFile(htmlPath, "utf8"),
    readFile(textPath, "utf8"),
    stat(htmlPath),
  ]);
  if (!html.includes("{{{RESEND_UNSUBSCRIBE_URL}}}")) errors.push(`${issue.id}: HTML lacks unsubscribe placeholder.`);
  if (!text.includes("{{{RESEND_UNSUBSCRIBE_URL}}}")) errors.push(`${issue.id}: text lacks unsubscribe placeholder.`);
  if (htmlInfo.size > 500_000) errors.push(`${issue.id}: HTML exceeds 500 KB.`);
  if (!text.trim()) errors.push(`${issue.id}: text alternative is empty.`);
}

if (args["send-ready"]) {
  const issue = manifest.issues?.find((candidate) => candidate.id === args["send-ready"]);
  if (!issue) errors.push(`Send-ready issue not found: ${args["send-ready"]}`);
  else if (issue.status !== "published") errors.push(`${issue.id}: status must be published before sending.`);
  if (!manifest.postalAddressReady) errors.push("NEWSLETTER_POSTAL_ADDRESS is required before sending.");
}

if (errors.length) {
  process.stderr.write(`${errors.map((error) => `- ${error}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Validated ${manifest.issues.length} newsletter issue artifact set(s).\n`);
}

function artifactPath(manifest, publicPath, directoryIndex) {
  const dist = resolve(dirname(manifest), "..");
  const relative = publicPath.replace(/^\//, "");
  return directoryIndex && relative.endsWith("/")
    ? resolve(dist, relative, "index.html")
    : resolve(dist, relative);
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value?.startsWith("--")) parsed[value.slice(2)] = values[index + 1]?.startsWith("--") ? true : values[++index];
  }
  return parsed;
}
