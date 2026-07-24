import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export function resolveNewsletterManifestPath(
  manifestPath?: string,
  moduleUrl = import.meta.url,
) {
  if (manifestPath) return resolve(manifestPath);
  return fileURLToPath(
    new URL("../../../web/dist/newsletter/manifest.json", moduleUrl),
  );
}
