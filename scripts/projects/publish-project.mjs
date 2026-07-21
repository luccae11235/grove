#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { exportProject, loadProject, validateProject } from "./project-registry.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.project || !args["site-url"] || args.confirm !== `PUBLISH:${args.project}`) {
  throw new Error("Publishing requires --project <id> --site-url <https-origin> --confirm PUBLISH:<id>.");
}
const project = await loadProject(args.project);
const remote = args.remote ?? project.repository;
if (!remote || !isGitHubRemote(remote)) {
  throw new Error("Configure a GitHub repository in projects/manifest.json or pass --remote.");
}
if (project.status !== "ready-to-publish") {
  throw new Error(`${project.id} status must be ready-to-publish before mirroring.`);
}
const validationErrors = await validateProject(project);
if (validationErrors.length) throw new Error(validationErrors.join("\n"));

const temporary = await mkdtemp(join(tmpdir(), "grove-project-publish-"));
const clone = join(temporary, "repository");
const exported = join(temporary, "exported");
try {
  run("git", ["clone", remote, clone]);
  await exportProject(project, exported, args["site-url"]);
  for (const entry of await readdir(clone)) {
    if (entry !== ".git") await rm(resolve(clone, entry), { recursive: true, force: true });
  }
  run("cp", ["-R", `${exported}/.`, clone]);
  run(project.validationCommand[0], project.validationCommand.slice(1), clone, { PYTHONPATH: "." });
  run("git", ["add", "--all"], clone);
  const diff = spawnSync("git", ["diff", "--cached", "--quiet"], { cwd: clone });
  if (diff.status === 0) {
    process.stdout.write(`${project.id} is already synchronized; nothing to publish.\n`);
  } else {
    run("git", ["commit", "-m", `Publish ${project.name} from Grove`], clone);
    run("git", ["push", "origin", `HEAD:${project.defaultBranch}`], clone);
    process.stdout.write(`Published ${project.id} to ${remote}\n`);
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}

function run(command, commandArgs, cwd, environment = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...environment },
  });
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}.`);
}

function isGitHubRemote(remote) {
  return /^git@github\.com:[\w.-]+\/[\w.-]+(?:\.git)?$/.test(remote)
    || /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/.test(remote);
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    if (values[index]?.startsWith("--")) parsed[values[index].slice(2)] = values[++index];
  }
  return parsed;
}
