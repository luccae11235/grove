#!/usr/bin/env node
import { resolve } from "node:path";
import { exportProject, loadProject, validateProject } from "./project-registry.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.project || !args.output || !args["site-url"]) {
  throw new Error("Usage: pnpm projects:export --project <id> --site-url <https-origin> --output <empty-path>");
}
const project = await loadProject(args.project);
const errors = await validateProject(project);
if (errors.length) throw new Error(errors.join("\n"));
const output = await exportProject(project, resolve(args.output), args["site-url"]);
process.stdout.write(`Exported ${project.id} to ${output}\n`);

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    if (values[index]?.startsWith("--")) parsed[values[index].slice(2)] = values[++index];
  }
  return parsed;
}
