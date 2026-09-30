import assert from "node:assert/strict";
import test from "node:test";
import { groupArticlesBySeries } from "../content/article-library";

test("groups articles in editorial order while preserving order within a section", () => {
  const articles = [
    { id: "latest-tree", series: "tree-based-machine-learning" },
    { id: "time", series: "time-series" },
    { id: "older-tree", series: "tree-based-machine-learning" },
    { id: "reinforcement", series: "reinforcement-learning" },
  ];

  const sections = groupArticlesBySeries(articles, "en");

  assert.deepEqual(sections.map((section) => section.id), [
    "tree-based-machine-learning",
    "reinforcement-learning",
    "time-series",
  ]);
  assert.deepEqual(
    sections[0]?.articles.map((article) => article.id),
    ["latest-tree", "older-tree"],
  );
});

test("places missing and unknown series in the localized fallback section", () => {
  const sections = groupArticlesBySeries(
    [{ id: "unassigned" }, { id: "future", series: "future-series" }],
    "pt-BR",
  );

  assert.equal(sections.length, 1);
  assert.equal(sections[0]?.id, "other");
  assert.equal(sections[0]?.label, "Fundamentos e avaliação");
  assert.deepEqual(
    sections[0]?.articles.map((article) => article.id),
    ["unassigned", "future"],
  );
});
