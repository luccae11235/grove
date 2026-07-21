#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { validateProject } from "./project-registry.mjs";

const registry = JSON.parse(await readFile(resolve("projects/manifest.json"), "utf8"));
const errors = [];
const ids = new Set();
for (const project of registry.projects ?? []) {
  if (ids.has(project.id)) errors.push(`Duplicate project id: ${project.id}`);
  ids.add(project.id);
  errors.push(...await validateProject(project));
  if (!Array.isArray(project.validationCommand) || !project.validationCommand.length) {
    errors.push(`${project.id}: validationCommand is required.`);
    continue;
  }
  const [command, ...args] = project.validationCommand;
  const result = spawnSync(command, args, {
    cwd: resolve(project.sourceDirectory),
    stdio: "inherit",
    env: { ...process.env, PYTHONPATH: "." },
  });
  if (result.status !== 0) errors.push(`${project.id}: validation command failed.`);
}
if (errors.length) {
  process.stderr.write(`${errors.map((error) => `- ${error}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Validated ${ids.size} standalone project(s).\n`);
}
