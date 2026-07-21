import { access, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, relative, resolve, sep } from "node:path";

export async function loadProject(projectId) {
  const registry = JSON.parse(await readFile(resolve("projects/manifest.json"), "utf8"));
  const project = registry.projects?.find((candidate) => candidate.id === projectId);
  if (!project) throw new Error(`Unknown project "${projectId}".`);
  return project;
}

export async function exportProject(project, outputDirectory, siteUrl) {
  if (!siteUrl || !/^https:\/\//.test(siteUrl)) {
    throw new Error("--site-url must be the public HTTPS origin of Grove.");
  }
  const source = resolve(project.sourceDirectory);
  const output = resolve(outputDirectory);
  await assertDirectoryDoesNotExist(output);
  await mkdir(output, { recursive: false });
  await cp(source, output, {
    recursive: true,
    filter: (path) => !isExcluded(path, source, project.excludedPaths ?? []),
  });
  const readmePath = resolve(output, "README.md");
  const readme = await readFile(readmePath, "utf8");
  const canonicalUrl = new URL(project.canonicalArticlePath, `${siteUrl.replace(/\/$/, "")}/`).toString();
  if (!readme.includes("{{CANONICAL_ARTICLE_URL}}")) {
    throw new Error(`${project.id} README is missing the canonical article placeholder.`);
  }
  await writeFile(readmePath, readme.replaceAll("{{CANONICAL_ARTICLE_URL}}", canonicalUrl));
  await writeFile(resolve(output, ".grove-source.json"), `${JSON.stringify({
    projectId: project.id,
    articleId: project.articleId,
    canonicalArticleUrl: canonicalUrl,
    sourceDirectory: project.sourceDirectory,
  }, null, 2)}\n`);
  return output;
}

export async function validateProject(project, root = resolve(project.sourceDirectory)) {
  const errors = [];
  for (const required of project.requiredFiles ?? []) {
    try {
      await access(resolve(root, required), constants.R_OK);
    } catch {
      errors.push(`${project.id}: missing ${required}`);
    }
  }
  return errors;
}

async function assertDirectoryDoesNotExist(path) {
  try {
    await access(path, constants.F_OK);
    throw new Error(`Refusing to overwrite existing export directory: ${path}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Refusing")) throw error;
  }
}

function isExcluded(path, sourceRoot, projectExclusions) {
  if (path === sourceRoot) return false;
  const relativePath = relative(sourceRoot, path);
  const parts = relativePath.split(sep);
  const name = basename(path);
  return projectExclusions.includes(relativePath)
    || parts.some((part) => [".git", "node_modules", "__pycache__", ".pytest_cache", ".venv", "venv", "dist", "build"].includes(part))
    || name.endsWith(".pyc")
    || name === ".DS_Store";
}
