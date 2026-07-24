import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import { resolveNewsletterManifestPath } from "./manifestPath.js";

test("default manifest path is independent of the package working directory", () => {
  const path = resolveNewsletterManifestPath();
  assert.match(
    path,
    /apps\/web\/dist\/newsletter\/manifest\.json$/,
  );
  assert.doesNotMatch(
    path,
    /apps\/newsletter-api\/apps\/web/,
  );
});

test("explicit manifest paths remain relative to the caller working directory", () => {
  assert.equal(
    resolveNewsletterManifestPath("custom/manifest.json"),
    resolve("custom/manifest.json"),
  );
});
