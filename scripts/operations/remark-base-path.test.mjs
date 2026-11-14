import assert from "node:assert/strict";
import test from "node:test";
import remarkBasePath from "../../apps/web/remark-base-path.mjs";

test("prefixes Markdown, raw HTML and MDX assets without duplicating bases", () => {
  const tree = { children: [
    { type: "image", url: "/articles/chart.png" },
    { type: "link", url: "/grove/already/" },
    { type: "html", value: '<picture><source srcset="/articles/mobile.png 1x, /articles/large.png 2x"><img src="/articles/chart.png"></picture>' },
    { type: "mdxJsxFlowElement", attributes: [{ type: "mdxJsxAttribute", name: "src", value: "/articles/mdx.png" }] },
    { type: "link", url: "//example.com/path" },
    { type: "link", url: "https://example.com/path" },
  ] };
  remarkBasePath({ base: "/grove/" })(tree);
  assert.equal(tree.children[0].url, "/grove/articles/chart.png");
  assert.equal(tree.children[1].url, "/grove/already/");
  assert.match(tree.children[2].value, /srcset="\/grove\/articles\/mobile.png 1x, \/grove\/articles\/large.png 2x"/);
  assert.match(tree.children[2].value, /src="\/grove\/articles\/chart.png"/);
  assert.equal(tree.children[3].attributes[0].value, "/grove/articles/mdx.png");
  assert.equal(tree.children[4].url, "//example.com/path");
  assert.equal(tree.children[5].url, "https://example.com/path");
});

test("root deployment leaves source paths intact", () => {
  const tree = { children: [{ type: "image", url: "/articles/chart.png" }] };
  remarkBasePath({ base: "/" })(tree);
  assert.equal(tree.children[0].url, "/articles/chart.png");
});
