#!/usr/bin/env node
import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));
for (const name of ["issue", "subject", "article"]) {
  if (!args[name]) {
    throw new Error("Usage: pnpm newsletter:new-issue --issue 2026-002 --subject \"Subject\" --article article-id [--slug route-slug]");
  }
}
if (!/^\d{4}-\d{3}$/.test(args.issue)) {
  throw new Error("--issue must use YYYY-NNN, for example 2026-002.");
}
const issueNumber = Number(args.issue.split("-")[1]);
const slug = args.slug ?? slugify(args.subject);
const path = resolve(`apps/web/src/content/issues/en/${args.issue}-${slug}.mdx`);
try {
  await access(path, constants.F_OK);
  throw new Error(`Refusing to overwrite existing issue: ${path}`);
} catch (error) {
  if (error instanceof Error && error.message.startsWith("Refusing")) throw error;
}
await mkdir(resolve("apps/web/src/content/issues/en"), { recursive: true });
const source = `---
issueId: "${args.issue}"
locale: en
issueNumber: ${issueNumber}
routeSlug: "${slug}"
href: "/newsletter/${args.issue.replace("-", "/")}/${slug}"
subject: "${escapeYaml(args.subject)}"
preheader: "TODO: one concrete promise that complements the subject line."
summary: "TODO: two sentences describing the issue for the web archive."
status: draft
featuredArticles:
  - "${escapeYaml(args.article)}"
tags:
  - "TODO"
cta:
  label: "Explore the interactive article"
  href: "/TODO"
---

Begin with a concrete scene, prediction, or tension—not the finished terminology.

Explain what the reader will manipulate or notice in the interactive article.

End with the mental model they should carry into the next problem.
`;
await writeFile(path, source, { encoding: "utf8", flag: "wx" });
process.stdout.write(`Created ${path}\n`);

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    if (key?.startsWith("--")) parsed[key.slice(2)] = values[++index];
  }
  return parsed;
}

function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
}

function escapeYaml(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}
